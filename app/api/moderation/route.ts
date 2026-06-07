import { NextResponse } from "next/server";
import { z } from "zod";
import { applyRuleFilter } from "@/lib/ai/rule-filter";
import { moderateContent } from "@/lib/ai/moderator";
import { STRIKE_THRESHOLDS } from "@/constants/moderation";
import {
  FEED_POST_SELECT,
  mapPostWithCounts,
  type PostWithCountsRow,
} from "@/lib/feed";
import { limitModeration } from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { ApiError, ModerationApiResponse, PostWithProfile, StrikeInfo, CommentWithProfile } from "@/types/app";

const MAX_CONTENT_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;
const MAX_IMAGES = 4;

const moderationSchema = z
  .object({
    type: z.enum(["post", "comment"]).default("post"),
    postId: z.string().uuid().optional(),
    content: z.string().max(MAX_CONTENT_LENGTH).optional().default(""),
    imageUrls: z.array(z.string().url()).max(MAX_IMAGES).optional().default([]),
  })
  .refine((data) => {
    if (data.type === "comment" && !data.postId) return false;
    return true;
  }, {
    message: "postId dibutuhkan untuk komentar.",
  })
  .refine((data) => data.content.trim().length > 0 || data.imageUrls.length > 0, {
    message: "Konten harus berisi teks atau gambar.",
  });

function jsonError(error: string, code: string, status: number): NextResponse {
  const payload: ApiError = { error, code };
  return NextResponse.json(payload, { status });
}

function sanitizeContent(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateReason(reason: string): string {
  return reason.length > 100 ? `${reason.slice(0, 97)}...` : reason;
}

async function fetchPostById(
  supabase: ReturnType<typeof createServerClient>,
  postId: string,
): Promise<PostWithProfile | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(FEED_POST_SELECT)
    .eq("id", postId)
    .single();

  if (error || !data) {
    console.error("[Moderation] Failed to load post:", error?.message);
    return null;
  }

  return mapPostWithCounts(data as PostWithCountsRow);
}

async function fetchCommentById(
  supabase: ReturnType<typeof createServerClient>,
  commentId: string,
): Promise<CommentWithProfile | null> {
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("id", commentId)
    .single();

  if (error || !data) {
    console.error("[Moderation] Failed to load comment:", error?.message);
    return null;
  }

  return data as CommentWithProfile;
}

async function applyStrikeRestrictions(
  userId: string,
  strikeNumber: number,
): Promise<void> {
  const admin = createAdminClient();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let updates: { is_banned?: boolean; ban_expires_at?: string | null; post_restricted_until?: string | null } | null = null;

  if (strikeNumber >= STRIKE_THRESHOLDS.PERMANENT_BAN) {
    updates = { is_banned: true, ban_expires_at: null };
  } else if (strikeNumber >= STRIKE_THRESHOLDS.ACCOUNT_SUSPENSION_72H) {
    updates = {
      is_banned: true,
      ban_expires_at: new Date(now + dayMs * 3).toISOString(),
    };
  } else if (strikeNumber >= STRIKE_THRESHOLDS.POST_RESTRICTION_24H) {
    updates = {
      post_restricted_until: new Date(now + dayMs).toISOString(),
    };
  }

  if (!updates) return;

  const { error } = await admin
    .from("profiles")
    .update(updates)
    .eq("user_id", userId);

  if (error) {
    console.error("[Moderation] Failed to update restrictions:", error.message);
    throw new Error("RESTRICTION_UPDATE_FAILED");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
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
    return jsonError(
      "Terlalu banyak permintaan. Coba lagi sebentar.",
      "RATE_LIMITED",
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Payload tidak valid.", "INVALID_JSON", 400);
  }

  const parsed = moderationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Input tidak valid.", "INVALID_INPUT", 400);
  }

  const isComment = parsed.data.type === "comment";
  const content = sanitizeContent(parsed.data.content ?? "");
  const imageUrls = parsed.data.imageUrls ?? [];

  if (isComment) {
    if (imageUrls.length > 0) {
      return jsonError("Komentar tidak dapat berisi gambar.", "INVALID_INPUT", 400);
    }
    if (content.length > MAX_COMMENT_LENGTH) {
      return jsonError(`Komentar maksimal ${MAX_COMMENT_LENGTH} karakter.`, "INVALID_INPUT", 400);
    }
  }

  if (content.length === 0 && imageUrls.length === 0) {
    return jsonError("Konten harus berisi teks atau gambar.", "EMPTY_CONTENT", 400);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_banned, ban_expires_at, post_restricted_until")
    .eq("user_id", user.id)
    .single();

  if (profileError) {
    console.error("[Moderation] Failed to load profile:", profileError.message);
    return jsonError("Gagal memuat profil.", "PROFILE_FETCH_FAILED", 500);
  }

  const now = new Date();
  if (profile?.is_banned) {
    if (!profile.ban_expires_at || new Date(profile.ban_expires_at) > now) {
      return jsonError("Akun Anda sedang dibatasi.", "ACCOUNT_SUSPENDED", 403);
    }
  }

  if (
    profile?.post_restricted_until &&
    new Date(profile.post_restricted_until) > now
  ) {
    return jsonError("Akun Anda sedang dibatasi.", "POST_RESTRICTED", 403);
  }

  const contentForModeration = content.length > 0 ? content : "[Image-only post]";
  const ruleResult = applyRuleFilter(contentForModeration);
  const moderation = ruleResult.triggered
    ? {
        verdict: "toxic" as const,
        confidence: 1,
        reason: "Kata terlarang terdeteksi.",
      }
    : await moderateContent(contentForModeration);

  const contentValue = content.length > 0 ? content : null;

  if (moderation.verdict === "safe") {
    if (isComment) {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: parsed.data.postId!,
          author_id: user.id,
          content: contentValue!,
          moderation_status: "safe",
        })
        .select("id")
        .single();

      if (error || !data) {
        console.error("[Moderation] Safe comment insert failed:", error?.message, error?.code, error?.details);
        return jsonError("Gagal menyimpan komentar. Coba lagi.", "COMMENT_INSERT_FAILED", 500);
      }

      const comment = await fetchCommentById(supabase, data.id);
      if (!comment) return jsonError("Gagal memuat komentar.", "COMMENT_FETCH_FAILED", 500);

      const payload: ModerationApiResponse = { status: "published_comment", comment };
      return NextResponse.json(payload);
    } else {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          content: contentValue,
          image_urls: imageUrls,
          is_published: true,
          moderation_status: "safe",
        })
        .select("id")
        .single();

      if (error || !data) {
        console.error("[Moderation] Failed to insert post:", error?.message);
        return jsonError("Gagal menyimpan postingan.", "POST_INSERT_FAILED", 500);
      }

      const post = await fetchPostById(supabase, data.id);
      if (!post) return jsonError("Gagal memuat postingan.", "POST_FETCH_FAILED", 500);

      const payload: ModerationApiResponse = { status: "published", post };
      return NextResponse.json(payload);
    }
  }

  if (moderation.verdict === "pending") {
    const adminForPending = createAdminClient();
    if (isComment) {
      const { data, error } = await adminForPending
        .from("comments")
        .insert({
          post_id: parsed.data.postId!,
          author_id: user.id,
          content: contentValue!,
          moderation_status: "pending_review",
        })
        .select("id")
        .single();

      if (error || !data) {
        console.error("[Moderation] Pending comment insert failed:", error?.message, error?.code);
        return jsonError("Komentar Anda sedang ditinjau. Silakan cek kembali nanti.", "COMMENT_PENDING", 202);
      }

      const payload: ModerationApiResponse = { status: "pending_review", comment_id: data.id };
      return NextResponse.json(payload);
    } else {
      const { data, error } = await adminForPending
        .from("posts")
        .insert({
          author_id: user.id,
          content: contentValue,
          image_urls: imageUrls,
          is_published: false,
          moderation_status: "pending_review",
        })
        .select("id")
        .single();

      if (error || !data) {
        console.error("[Moderation] Pending post insert failed:", error?.message, error?.code);
        return jsonError("Postingan sedang ditinjau. Silakan cek kembali nanti.", "POST_PENDING", 202);
      }

      const payload: ModerationApiResponse = { status: "pending_review", post_id: data.id };
      return NextResponse.json(payload);
    }
  }

  // Handle TOXIC verdict — use admin client since the row won't be visible via user RLS
  const admin = createAdminClient();
  let blockedContentId: string;
  if (isComment) {
    const { data, error } = await admin
      .from("comments")
      .insert({
        post_id: parsed.data.postId!,
        author_id: user.id,
        content: contentValue!,
        moderation_status: "toxic",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[Moderation] Toxic comment insert failed:", error?.message);
      return jsonError("Gagal menyimpan komentar.", "COMMENT_INSERT_FAILED", 500);
    }
    blockedContentId = data.id;
  } else {
    const { data, error } = await admin
      .from("posts")
      .insert({
        author_id: user.id,
        content: contentValue,
        image_urls: imageUrls,
        is_published: false,
        moderation_status: "toxic",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error("[Moderation] Toxic post insert failed:", error?.message);
      return jsonError("Gagal menyimpan postingan.", "POST_INSERT_FAILED", 500);
    }
    blockedContentId = data.id;
  }

  const { count, error: countError } = await admin
    .from("strikes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_resolved", false);

  if (countError) return jsonError("Gagal memproses strike.", "STRIKE_COUNT_FAILED", 500);

  const strikeNumber = (count ?? 0) + 1;
  const strikeReason = truncateReason(moderation.reason);
  const { data: strikeRow, error: strikeError } = await admin
    .from("strikes")
    .insert({
      user_id: user.id,
      content_type: isComment ? "comment" : "post",
      content_id: blockedContentId,
      layer_triggered: ruleResult.triggered ? 1 : 2,
      ai_verdict: "toxic",
      ai_confidence: moderation.confidence,
      ai_reason: strikeReason,
      strike_number: strikeNumber,
    })
    .select("id, strike_number, ai_confidence")
    .single();

  if (strikeError || !strikeRow) return jsonError("Gagal memproses strike.", "STRIKE_INSERT_FAILED", 500);

  try {
    await applyStrikeRestrictions(user.id, strikeNumber);
  } catch {
    return jsonError("Gagal memperbarui pembatasan.", "RESTRICTION_FAILED", 500);
  }

  const strikeInfo: StrikeInfo = {
    id: strikeRow.id,
    reason: strikeReason,
    strike_number: strikeRow.strike_number,
    ai_confidence: strikeRow.ai_confidence ?? 0,
  };

  const payload: ModerationApiResponse = {
    status: "blocked",
    strike: strikeInfo,
    reason: strikeReason,
  };
  return NextResponse.json(payload);
  } catch (uncaughtError) {
    console.error(
      "[Moderation] Uncaught error in POST handler:",
      uncaughtError instanceof Error ? uncaughtError.message : uncaughtError,
    );
    return jsonError(
      "Terjadi kesalahan internal. Silakan coba lagi.",
      "INTERNAL_ERROR",
      500,
    );
  }
}
