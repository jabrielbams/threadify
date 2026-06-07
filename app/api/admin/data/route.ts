import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/data
 * Fetches all appeals and reports for the moderator dashboard.
 * Uses service role to bypass RLS.
 * Protected by session check in the dashboard component.
 */
export async function GET(): Promise<NextResponse> {
  const admin = createAdminClient();

  const { data: appeals } = await admin
    .from("appeals")
    .select("id, reason, status, created_at, strike_id, strikes(ai_reason, ai_confidence, content_type, strike_number, content_id), profiles(username, display_name)")
    .order("created_at", { ascending: false });

  const { data: reports } = await admin
    .from("reports")
    .select("id, category, description, status, created_at, post_id, posts(content, author_id), profiles(username, display_name)")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    appeals: appeals ?? [],
    reports: reports ?? [],
  });
}
