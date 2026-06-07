"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";
import { useRealtimeCounts } from "@/hooks/useRealtimeCounts";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  FEED_POST_SELECT,
  POST_CREATED_EVENT,
  mapPostWithCounts,
  type PostWithCountsRow,
} from "@/lib/feed";
import type { PostWithProfile } from "@/types/app";

const PAGE_SIZE = 20;

interface FeedListProps {
  initialPosts: PostWithProfile[];
  currentUserId: string | null;
}

/**
 * Real-time feed list with infinite scroll, optimistic like updates,
 * and Supabase Realtime subscriptions for new posts.
 */
export function FeedList({ initialPosts, currentUserId }: FeedListProps) {
  const [posts, setPosts] = useState<PostWithProfile[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length === PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const supabase = useMemo(() => createBrowserClient(), []);

  const mergePosts = useCallback(
    (incoming: PostWithProfile[], prepend: boolean) => {
      setPosts((prev) => {
        const existing = new Set(prev.map((post) => post.id));
        const filtered = incoming.filter((post) => !existing.has(post.id));
        return prepend ? [...filtered, ...prev] : [...prev, ...filtered];
      });
    },
    [],
  );

  const fetchPostById = useCallback(
    async (postId: string): Promise<PostWithProfile | null> => {
      const { data, error } = await supabase
        .from("posts")
        .select(FEED_POST_SELECT)
        .eq("id", postId)
        .single();

      if (error || !data) {
        console.error("[Feed] Failed to load new post:", error?.message);
        return null;
      }

      return mapPostWithCounts(data as PostWithCountsRow);
    },
    [supabase],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const lastPost = posts[posts.length - 1];
    if (!lastPost) return;

    setIsLoadingMore(true);
    const { data, error } = await supabase
      .from("posts")
      .select(FEED_POST_SELECT)
      .eq("is_published", true)
      .eq("is_deleted", false)
      .lt("created_at", lastPost.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (error) {
      console.error("[Feed] Failed to load more posts:", error.message);
      setIsLoadingMore(false);
      return;
    }

    const rows = (data ?? []) as PostWithCountsRow[];
    const nextPosts = rows.map(mapPostWithCounts);
    mergePosts(nextPosts, false);
    setHasMore(nextPosts.length === PAGE_SIZE);
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, mergePosts, posts, supabase]);

  const sentinelRef = useIntersectionObserver(() => void loadMore(), {
    rootMargin: "200px",
  });

  // Listen for optimistic new post events from PostComposer
  useEffect(() => {
    function handlePostCreated(event: Event) {
      const detail = (event as CustomEvent<PostWithProfile>).detail;
      if (!detail) return;
      mergePosts([detail], true);
    }
    window.addEventListener(POST_CREATED_EVENT, handlePostCreated);
    return () =>
      window.removeEventListener(POST_CREATED_EVENT, handlePostCreated);
  }, [mergePosts]);

  // Supabase Realtime subscription for feed updates
  useEffect(() => {
    const channel = supabase
      .channel("feed-inserts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts",
          filter: "is_published=eq.true",
        },
        async (payload) => {
          const postId = (payload.new as { id?: string }).id;
          if (!postId) return;
          const post = await fetchPostById(postId);
          if (post) mergePosts([post], true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPostById, mergePosts, supabase]);

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
        console.error("[Feed] Failed to delete post");
        return;
      }
      setPosts((prev) => prev.filter((post) => post.id !== postId));
    },
    [currentUserId],
  );

  const handleLikeToggle = useCallback(
    (postId: string, isNowLiked: boolean): void => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                like_count: post.like_count + (isNowLiked ? 1 : -1),
              }
            : post,
        ),
      );
    },
    [],
  );

  // Real-time counter updates from other users
  const handleCountChange = useCallback(
    ({ postId, type, delta }: { postId: string; type: "like" | "comment"; delta: 1 | -1 }) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          if (type === "like") {
            return { ...post, like_count: Math.max(0, post.like_count + delta) };
          }
          return { ...post, comment_count: Math.max(0, post.comment_count + delta) };
        }),
      );
    },
    [],
  );

  useRealtimeCounts(handleCountChange);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-xl text-center">
        <p className="text-body-lg text-on-surface-variant">
          Belum ada postingan.
        </p>
        <p className="mt-2 text-body-sm text-on-surface-variant">
          Jadilah yang pertama membuat postingan!
        </p>
      </div>
    );
  }

  return (
    <section className="divide-y divide-outline-variant">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          onDelete={handleDelete}
          onLikeToggle={handleLikeToggle}
        />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-8" aria-hidden="true" />

      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </section>
  );
}
