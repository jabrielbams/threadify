import { BLOCKLIST } from "@/constants/moderation";

/**
 * Result of the Layer 1 rule-based content filter.
 */
export interface RuleFilterResult {
  triggered: boolean;
  matchedWord?: string;
}

/**
 * Normalizes content for consistent blocklist matching.
 * Lowercases, trims, and collapses extra whitespace.
 *
 * @param input - Raw content string
 * @returns Normalized string
 */
function normalizeContent(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Layer 1 rule-based content filter.
 * Checks normalized content against the BLOCKLIST before calling the AI layer.
 * Running this first avoids unnecessary AI API calls for obvious violations.
 *
 * @param content - User-generated text content to check
 * @returns RuleFilterResult indicating whether a blocklisted word was found
 */
export function applyRuleFilter(content: string): RuleFilterResult {
  if (BLOCKLIST.length === 0) {
    return { triggered: false };
  }

  const normalized = normalizeContent(content);

  for (const word of BLOCKLIST) {
    const normalizedWord = normalizeContent(word);
    if (normalizedWord.length > 0 && normalized.includes(normalizedWord)) {
      return { triggered: true, matchedWord: word };
    }
  }

  return { triggered: false };
}
