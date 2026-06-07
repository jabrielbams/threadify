/**
 * Strike threshold definitions.
 * Each value represents the cumulative strike count that triggers the corresponding action.
 * Referenced by the moderation pipeline — do NOT hardcode these values elsewhere.
 */
export const STRIKE_THRESHOLDS = {
  WARNING: 1,
  POST_RESTRICTION_24H: 2,
  ACCOUNT_SUSPENSION_72H: 3,
  PERMANENT_BAN: 4,
} as const;

export type StrikeThreshold =
  (typeof STRIKE_THRESHOLDS)[keyof typeof STRIKE_THRESHOLDS];

/** Maximum time (ms) allowed for the AI moderation API before fallback to 'pending'. */
export const MODERATION_TIMEOUT_MS = 30000;

/**
 * Layer 1 blocklist of prohibited words and phrases.
 * Populated and maintained by the content moderation team.
 * Words are matched case-insensitively against normalized content.
 *
 * TODO: Content team — add prohibited words here before launch.
 */
export const BLOCKLIST: string[] = [
  // placeholder — to be populated by content team
];
