import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const actionSchema = z.object({
  type: z.enum(["appeal", "report"]),
  id: z.string().uuid(),
  action: z.enum(["approved", "rejected", "resolved", "dismissed"]),
});

/**
 * POST /api/admin/action
 * Handles moderator actions on appeals and reports.
 * Uses service role to bypass RLS for updates.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { type, id, action } = parsed.data;
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (type === "appeal") {
    // Update appeal status
    const { error: appealError } = await admin
      .from("appeals")
      .update({ status: action as "approved" | "rejected", reviewed_at: now })
      .eq("id", id);

    if (appealError) {
      return NextResponse.json({ error: "Failed to update appeal" }, { status: 500 });
    }

    // If approved, resolve the associated strike
    if (action === "approved") {
      const { data: appeal } = await admin
        .from("appeals")
        .select("strike_id")
        .eq("id", id)
        .single();

      if (appeal) {
        await admin
          .from("strikes")
          .update({ is_resolved: true, resolved_at: now })
          .eq("id", appeal.strike_id);
      }
    }

    return NextResponse.json({ success: true });
  }

  if (type === "report") {
    const reportStatus = action === "approved" ? "resolved" as const : action as "resolved" | "dismissed";
    const { error: reportError } = await admin
      .from("reports")
      .update({ status: reportStatus, resolved_at: now })
      .eq("id", id);

    if (reportError) {
      return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown type" }, { status: 400 });
}
