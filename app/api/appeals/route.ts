import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types/app";

const appealSchema = z.object({
  strikeId: z.string().uuid(),
  reason: z.string().min(10, "Alasan harus minimal 10 karakter.").max(500, "Alasan maksimal 500 karakter."),
});

function jsonError(error: string, code: string, status: number): NextResponse {
  const payload: ApiError = { error, code };
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = createServerClient();
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user) {
    return jsonError("Sesi tidak ditemukan.", "UNAUTHORIZED", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Payload tidak valid.", "INVALID_JSON", 400);
  }

  const parsed = appealSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Input tidak valid.", "INVALID_INPUT", 400);
  }

  const { strikeId, reason } = parsed.data;

  // 1. Verify strike exists and belongs to the user
  const { data: strike, error: strikeError } = await supabase
    .from("strikes")
    .select("id, is_resolved")
    .eq("id", strikeId)
    .eq("user_id", user.id)
    .single();

  if (strikeError || !strike) {
    return jsonError("Strike tidak ditemukan atau bukan milik Anda.", "NOT_FOUND", 404);
  }

  if (strike.is_resolved) {
    return jsonError("Strike ini sudah diselesaikan.", "ALREADY_RESOLVED", 400);
  }

  // 2. Check if an appeal already exists for this strike
  const { data: existingAppeal, error: existingError } = await supabase
    .from("appeals")
    .select("id")
    .eq("strike_id", strikeId)
    .maybeSingle();

  if (existingError) {
    console.error("[Appeals API] Error checking existing appeal:", existingError.message);
    return jsonError("Terjadi kesalahan sistem.", "INTERNAL_ERROR", 500);
  }

  if (existingAppeal) {
    return jsonError("Anda sudah mengajukan banding untuk strike ini.", "DUPLICATE_APPEAL", 409);
  }

  // 3. Insert the new appeal
  const { data: newAppeal, error: insertError } = await supabase
    .from("appeals")
    .insert({
      user_id: user.id,
      strike_id: strikeId,
      reason: reason.trim(),
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !newAppeal) {
    console.error("[Appeals API] Failed to insert appeal:", insertError?.message);
    return jsonError("Gagal mengirim banding.", "INSERT_FAILED", 500);
  }

  return NextResponse.json({ id: newAppeal.id }, { status: 201 });
}
