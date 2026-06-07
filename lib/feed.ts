import type { PostWithProfile, PostWithProfileRaw } from "@/types/app";

interface CountRow {
  count: number;
}

/** Supabase select string for feed posts with profile and engagement counts. */
export const FEED_POST_SELECT =
  "*, profiles(username, display_name, avatar_url), likes(count), comments(count)";

/** Custom event name used to broadcast newly created posts to the feed. */
export const POST_CREATED_EVENT = "threadify:post-created";

/** Supabase join shape for feed posts with likes/comments counts. */
export type PostWithCountsRow = PostWithProfileRaw & {
  likes: CountRow[] | null;
  comments: CountRow[] | null;
};

/**
 * Maps a Supabase feed row (with count joins) into a PostWithProfile object.
 *
 * @param row - Raw post row with profile and count joins
 * @returns Normalized PostWithProfile for client consumption
 */
export function mapPostWithCounts(row: PostWithCountsRow): PostWithProfile {
  const { likes, comments, ...rest } = row;
  return {
    ...rest,
    like_count: likes?.[0]?.count ?? 0,
    comment_count: comments?.[0]?.count ?? 0,
  };
}
