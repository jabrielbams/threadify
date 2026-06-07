"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PostCard } from "@/components/feed/PostCard";
import type { PostWithProfile } from "@/types/app";

interface PostDetailViewProps {
  post: PostWithProfile;
  currentUserId: string | null;
}

/**
 * Client-side wrapper for rendering a single PostCard on the detail page.
 * Handles delete and like toggle actions that require event handlers.
 */
export function PostDetailView({ post, currentUserId }: PostDetailViewProps) {
  const router = useRouter();
  const [currentPost, setCurrentPost] = useState<PostWithProfile>(post);

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
        console.error("[PostDetail] Failed to delete");
        return;
      }

      router.push("/feed");
    },
    [currentUserId, router],
  );

  const handleLikeToggle = useCallback(
    (postId: string, isNowLiked: boolean): void => {
      setCurrentPost((prev) => ({
        ...prev,
        like_count: prev.like_count + (isNowLiked ? 1 : -1),
      }));
    },
    [],
  );

  return (
    <PostCard
      post={currentPost}
      currentUserId={currentUserId}
      onDelete={handleDelete}
      onLikeToggle={handleLikeToggle}
    />
  );
}
