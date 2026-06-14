import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { STRIKE_THRESHOLDS } from "@/constants/moderation";

const actionSchema = z.object({
  type: z.enum(["appeal", "report"]),
  id: z.string().uuid(),
  action: z.enum(["approved", "rejected", "resolved", "dismissed"]),
});

type AppealWithStrike = {
  strike_id: string;
  strikes: { user_id: string };
};

/**
 * Updates user profile restrictions based on their active strike count.
 * If strike count is below thresholds, restrictions are removed.
 * If strike count meets thresholds, appropriate restrictions are applied.
 */
async function updateUserRestrictions(
  userId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<void> {
  // Count unresolved (active) strikes
  const { count: activeStrikeCount, error: countError } = await admin
    .from("strikes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_resolved", false);

  if (countError) {
    console.error("[Admin Action] Failed to count active strikes:", countError.message);
    throw new Error("STRIKE_COUNT_FAILED");
  }

  const strikeCount = activeStrikeCount ?? 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let updates: {
    is_banned?: boolean;
    ban_expires_at?: string | null;
    post_restricted_until?: string | null;
  } = {};

  // Determine restrictions based on active strike count
  if (strikeCount >= STRIKE_THRESHOLDS.PERMANENT_BAN) {
    updates = { is_banned: true, ban_expires_at: null };
  } else if (strikeCount >= STRIKE_THRESHOLDS.ACCOUNT_SUSPENSION_72H) {
    updates = {
      is_banned: true,
      ban_expires_at: new Date(now + dayMs * 3).toISOString(),
    };
  } else if (strikeCount >= STRIKE_THRESHOLDS.POST_RESTRICTION_24H) {
    updates = {
      post_restricted_until: new Date(now + dayMs).toISOString(),
    };
  } else {
    // No strikes or below threshold — clear all restrictions
    updates = {
      is_banned: false,
      ban_expires_at: null,
      post_restricted_until: null,
    };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update(updates)
    .eq("user_id", userId);

  if (updateError) {
    console.error("[Admin Action] Failed to update restrictions:", updateError.message);
    throw new Error("RESTRICTION_UPDATE_FAILED");
  }
}

/**
 * POST /api/admin/action
 * Handles moderator actions on appeals and reports.
 * Uses service role to bypass RLS for updates.
 *
 * When an appeal is approved:
 * - Strike is marked as resolved
 * - Active strikes are recalculated
 * - User restrictions are updated based on remaining strikes
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

    // If approved, resolve the associated strike and update restrictions
    if (action === "approved") {
      const { data: appealData, error: fetchError } = await admin
        .from("appeals")
        .select("strike_id, strikes!inner(user_id)")
        .eq("id", id)
        .single();

      if (fetchError || !appealData) {
        return NextResponse.json({ error: "Failed to fetch appeal details" }, { status: 500 });
      }

      const appeal = appealData as AppealWithStrike;

      // Resolve the strike
      const { error: strikeError } = await admin
        .from("strikes")
        .update({ is_resolved: true, resolved_at: now })
        .eq("id", appeal.strike_id);

      if (strikeError) {
        return NextResponse.json({ error: "Failed to resolve strike" }, { status: 500 });
      }

      // Update restrictions based on new active strike count
      try {
        const userId = appeal.strikes.user_id;
        await updateUserRestrictions(userId, admin);
      } catch {
        return NextResponse.json({ error: "Failed to update restrictions" }, { status: 500 });
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
