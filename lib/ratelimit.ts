import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = Redis.fromEnv();
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(6, "1 m"),
      analytics: true,
    });
  }
} catch (error) {
  console.warn("[Ratelimit] Failed to initialize Upstash Redis:", error);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Applies the per-user moderation rate limit.
 * Falls back to allowed (success: true) if Redis is not configured.
 *
 * @param userId - Supabase user ID for the current requester
 * @returns Rate limit status and reset metadata
 */
export async function limitModeration(userId: string): Promise<RateLimitResult> {
  if (!ratelimit) {
    // Fallback for development/testing when Redis is not available
    return {
      success: true,
      limit: 6,
      remaining: 6,
      reset: Date.now() + 60000,
    };
  }
  return ratelimit.limit(`moderation:${userId}`);
}
