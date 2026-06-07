import type { Database } from "@/types/database";
import type { STRIKE_THRESHOLDS } from "@/constants/moderation";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

/**
 * Result returned by the AI content moderation pipeline.
 * - 'safe'    : Content passed all checks; publication allowed.
 * - 'toxic'   : Content flagged; publication blocked, strike issued.
 * - 'pending' : Timed out or service down; held for manual review.
 *               NEVER default to 'safe' on error — always use 'pending'.
 */
export interface ModerationResult {
  verdict: "safe" | "toxic" | "pending";
  /** Confidence score from 0.000 to 1.000 */
  confidence: number;
  /** Brief human-readable explanation of the moderation decision */
  reason: string;
}

/** Union type of all valid strike threshold values. */
export type StrikeThreshold =
  (typeof STRIKE_THRESHOLDS)[keyof typeof STRIKE_THRESHOLDS];

/**
 * Standard error shape returned by all API routes.
 * Keeps error responses consistent and avoids leaking implementation details.
 */
export interface ApiError {
  error: string;
  code: string;
}

// ---------------------------------------------------------------------------
// Feed types
// ---------------------------------------------------------------------------

/** Intermediate shape returned by Supabase when joining profiles to posts. */
export type PostWithProfileRaw = PostRow & {
  profiles: Pick<ProfileRow, "username" | "display_name" | "avatar_url"> | null;
};

/** A feed post — row data + author profile + denormalised engagement counts. */
export type PostWithProfile = PostWithProfileRaw & {
  like_count: number;
  comment_count: number;
};

// ---------------------------------------------------------------------------
// Comment types
// ---------------------------------------------------------------------------

export type CommentWithProfileRaw = CommentRow & {
  profiles: Pick<ProfileRow, "username" | "display_name" | "avatar_url"> | null;
};

export type CommentWithProfile = CommentWithProfileRaw;

// ---------------------------------------------------------------------------
// Moderation / strike types
// ---------------------------------------------------------------------------

/** Strike record info surfaced to the client after a toxic verdict. */
export interface StrikeInfo {
  id: string;
  /** Truncated explanation from the AI (max 100 chars, never full content). */
  reason: string;
  /** Cumulative unresolved strike count for this user, including this one. */
  strike_number: number;
  /** AI confidence score 0.000–1.000 */
  ai_confidence: number;
}

/** Discriminated-union response from POST /api/moderation. */
export type ModerationApiResponse =
  | { status: "published"; post: PostWithProfile }
  | { status: "published_comment"; comment: CommentWithProfile }
  | { status: "blocked"; strike: StrikeInfo; reason: string }
  | { status: "pending_review"; post_id?: string; comment_id?: string };
