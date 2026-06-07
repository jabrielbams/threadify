"use client";

import { useEffect, useMemo } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

interface CountUpdate {
  postId: string;
  type: "like" | "comment";
  delta: 1 | -1;
}

/**
 * Subscribes to Supabase Realtime for likes and comments changes.
 * Calls onCountChange whenever a like/comment is added or removed.
 */
export function useRealtimeCounts(
  onCountChange: (update: CountUpdate) => void,
) {
  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("feed-counts")
      // Listen for new likes
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "likes" },
        (payload) => {
          const postId = (payload.new as { post_id?: string }).post_id;
          if (postId) onCountChange({ postId, type: "like", delta: 1 });
        },
      )
      // Listen for removed likes
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "likes" },
        (payload) => {
          const postId = (payload.old as { post_id?: string }).post_id;
          if (postId) onCountChange({ postId, type: "like", delta: -1 });
        },
      )
      // Listen for new comments
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload) => {
          const postId = (payload.new as { post_id?: string }).post_id;
          if (postId) onCountChange({ postId, type: "comment", delta: 1 });
        },
      )
      // Listen for deleted comments
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "comments" },
        (payload) => {
          const postId = (payload.old as { post_id?: string }).post_id;
          if (postId) onCountChange({ postId, type: "comment", delta: -1 });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, onCountChange]);
}
