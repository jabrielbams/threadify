import { NextResponse } from "next/server";
import { z } from "zod";
import { applyRuleFilter } from "@/lib/ai/rule-filter";
import { moderateContent } from "@/lib/ai/moderator";
import { STRIKE_THRESHOLDS } from "@/constants/moderation";
import { limitModeration } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { ApiError, StrikeInfo } from "@/types/app";

const recheckSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().max(500),
  imageUrls: z.array(z.string().url()).max(4).optional().default([]),
});

function jsonError(error: string, code: string, status: number): NextResponse {
  const payload: ApiError = { error, code };
  return NextResponse.json(payload, { status });
}

function truncateReason(reason: string): string {
  return reason.length > 100 ? `${reason.slice(0, 97)}...` : reason;
}

/**
 * POST /api/moderation/recheck
 * Updates post content and re-runs moderation. Uses admin client to bypass RLS.
 * Per FR-05: Edited posts re-enter moderation before re-publishing.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createServerClient();
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user) {
    return jsonError("Sesi tidak ditemukan.", "UNAUTHORIZED", 401);
  }

  const rateLimit = await limitModeration(user.id);
  if (!rateLimit.success) {
    return jsonError("Terlalu banyak permintaan.", "RATE_LIMITED", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Payload tidak valid.", "INVALID_JSON", 400);
  }

  const parsed = recheckSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Input tidak valid.", "INVALID_INPUT", 400);
  }

  const { postId, content, imageUrls } = parsed.data;
  const admin = createAdminClient();

  // Verify ownership using admin (can see all posts regardless of is_published)
  const { data: post, error: postError } = await admin
    .from("posts")
    .select("id, author_id")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return jsonError("Postingan tidak ditemukan.", "NOT_FOUND", 404);
  }

  if (post.author_id !== user.id) {
    return jsonError("Anda tidak memiliki akses.", "FORBIDDEN", 403);
  }

  // Update post content first
  const { error: updateContentError } = await admin
    .from("posts")
    .update({
      content: content.trim() || null,
      image_urls: imageUrls,
      moderation_status: "pending",
      is_published: false,
    })
    .eq("id", postId);

  if (updateContentError) {
    console.error("[Recheck] Failed to update post content:", updateContentError.message);
    return jsonError("Gagal menyimpan perubahan.", "UPDATE_FAILED", 500);
  }

  // Run moderation pipeline
  const sanitized = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const contentForModeration = sanitized.length > 0 ? sanitized : "[Image-only post]";

  const ruleResult = applyRuleFilter(contentForModeration);
  const moderation = ruleResult.triggered
    ? { verdict: "toxic" as const, confidence: 1, reason: "Kata terlarang terdeteksi." }
    : await moderateContent(contentForModeration);

  if (moderation.verdict === "safe") {
    await admin
      .from("posts")
      .update({ is_published: true, moderation_status: "safe" })
      .eq("id", postId);

    return NextResponse.json({ status: "published", postId });
  }

  if (moderation.verdict === "pending") {
    await admin
      .from("posts")
      .update({ moderation_status: "pending_review", is_published: false })
      .eq("id", postId);

    return NextResponse.json({ status: "pending_review", postId });
  }

  // TOXIC — keep unpublished, issue strike
  await admin
    .from("posts")
    .update({ moderation_status: "toxic", is_published: false })
    .eq("id", postId);

  const { count } = await admin
    .from("strikes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_resolved", false);

  const strikeNumber = (count ?? 0) + 1;
  const strikeReason = truncateReason(moderation.reason);

  const { data: strikeRow, error: strikeError } = await admin
    .from("strikes")
    .insert({
      user_id: user.id,
      content_type: "post",
      content_id: postId,
      layer_triggered: ruleResult.triggered ? 1 : 2,
      ai_verdict: "toxic",
      ai_confidence: moderation.confidence,
      ai_reason: strikeReason,
      strike_number: strikeNumber,
    })
    .select("id, strike_number, ai_confidence")
    .single();

  if (strikeError || !strikeRow) {
    return jsonError("Gagal memproses strike.", "STRIKE_FAILED", 500);
  }

  if (strikeNumber >= STRIKE_THRESHOLDS.PERMANENT_BAN) {
    await admin.from("profiles").update({ is_banned: true, ban_expires_at: null }).eq("user_id", user.id);
  } else if (strikeNumber >= STRIKE_THRESHOLDS.ACCOUNT_SUSPENSION_72H) {
    const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from("profiles").update({ is_banned: true, ban_expires_at: expires }).eq("user_id", user.id);
  } else if (strikeNumber >= STRIKE_THRESHOLDS.POST_RESTRICTION_24H) {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await admin.from("profiles").update({ post_restricted_until: until }).eq("user_id", user.id);
  }

  const strikeInfo: StrikeInfo = {
    id: strikeRow.id,
    reason: strikeReason,
    strike_number: strikeRow.strike_number,
    ai_confidence: strikeRow.ai_confidence ?? 0,
  };

  return NextResponse.json({ status: "blocked", strike: strikeInfo, reason: strikeReason });
}
