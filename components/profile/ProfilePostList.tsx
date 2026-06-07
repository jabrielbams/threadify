"use client";

import { useCallback, useMemo, useState } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  FEED_POST_SELECT,
  mapPostWithCounts,
  type PostWithCountsRow,
} from "@/lib/feed";
import type { PostWithProfile } from "@/types/app";

const PAGE_SIZE = 20;

interface ProfilePostListProps {
  initialPosts: PostWithProfile[];
  currentUserId: string | null;
  profileUserId: string;
}

/**
 * Paginated list of posts on a user's profile page.
 * Supports infinite scroll and optimistic like/delete updates.
 */
export function ProfilePostList({
  initialPosts,
  currentUserId,
  profileUserId,
}: ProfilePostListProps) {
  const [posts, setPosts] = useState<PostWithProfile[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length === PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const supabase = useMemo(() => createBrowserClient(), []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const lastPost = posts[posts.length - 1];
    if (!lastPost) return;

    setIsLoadingMore(true);
    const { data, error } = await supabase
      .from("posts")
      .select(FEED_POST_SELECT)
      .eq("author_id", profileUserId)
      .eq("is_published", true)
      .eq("is_deleted", false)
      .lt("created_at", lastPost.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error("[Profile] Failed to load more posts:", error.message);
      setIsLoadingMore(false);
      return;
    }

    const rows = (data ?? []) as PostWithCountsRow[];
    const nextPosts = rows.map(mapPostWithCounts);
    setPosts((prev) => [...prev, ...nextPosts]);
    setHasMore(nextPosts.length === PAGE_SIZE);
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, posts, profileUserId, supabase]);

  const sentinelRef = useIntersectionObserver(() => void loadMore(), {
    rootMargin: "200px",
  });

  const handleDelete = useCallback(
    async (postId: string) => {
      if (!currentUserId) return;
      if (!window.confirm("Hapus postingan ini?")) return;

      const response = await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (!response.ok) {
        console.error("[Profile] Failed to delete post");
        return;
      }
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    },
    [currentUserId],
  );

  const handleLikeToggle = useCallback(
    (postId: string, isNowLiked: boolean): void => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, like_count: p.like_count + (isNowLiked ? 1 : -1) }
            : p,
        ),
      );
    },
    [],
  );

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-xl text-center">
        <p className="text-body-lg text-on-surface-variant">
          Belum ada postingan.
        </p>
      </div>
    );
  }

  return (
    <section className="divide-y divide-outline-variant/20">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={handleDelete}
          onLikeToggle={handleLikeToggle}
        />
      ))}
      <div ref={sentinelRef} className="h-8" aria-hidden="true" />
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </section>
  );
}
