import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types/app";

const reportSchema = z.object({
  postId: z.string().uuid(),
  category: z.enum([
    "hate_speech",
    "sara",
    "nsfw",
    "spam_buzzer",
    "misinformation",
    "other",
  ]),
  description: z.string().max(200, "Deskripsi maksimal 200 karakter.").optional().default(""),
});

function jsonError(error: string, code: string, status: number): NextResponse {
  const payload: ApiError = { error, code };
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createServerClient();
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();

  if (sessionError || !user) {
    return jsonError("Sesi tidak ditemukan.", "UNAUTHORIZED", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Payload tidak valid.", "INVALID_JSON", 400);
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Input tidak valid.", "INVALID_INPUT", 400);
  }

  const { postId, category, description } = parsed.data;

  // Validate post exists and user is not author
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .single();

  if (postError || !post) {
    return jsonError("Postingan tidak ditemukan.", "NOT_FOUND", 404);
  }

  if (post.author_id === user.id) {
    return jsonError("Anda tidak dapat melaporkan postingan sendiri.", "FORBIDDEN", 403);
  }

  // Check if already reported
  const { data: existingReport, error: existingError } = await supabase
    .from("reports")
    .select("id")
    .eq("post_id", postId)
    .eq("reporter_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("[Reports API] Error checking existing report:", existingError.message);
    return jsonError("Terjadi kesalahan sistem.", "INTERNAL_ERROR", 500);
  }

  if (existingReport) {
    return jsonError("Anda sudah melaporkan postingan ini.", "DUPLICATE_REPORT", 409);
  }

  // Insert report
  const { data: newReport, error: insertError } = await supabase
    .from("reports")
    .insert({
      reporter_id: user.id,
      post_id: postId,
      category,
      description: description.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !newReport) {
    console.error("[Reports API] Failed to insert report:", insertError?.message);
    return jsonError("Gagal mengirim laporan.", "INSERT_FAILED", 500);
  }

  return NextResponse.json({ id: newReport.id, success: true }, { status: 201 });
}
