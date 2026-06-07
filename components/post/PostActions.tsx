"use client";

import { useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/format";
import { ReportModal } from "@/components/moderation/ReportModal";

interface PostActionsProps {
  postId: string;
  initialLikeCount: number;
  commentCount: number;
  initialIsLiked: boolean;
  currentUserId: string | null;
  isAuthor: boolean;
  onLikeToggle: (postId: string, isNowLiked: boolean) => void;
}

/**
 * Like / Comment / Share action bar at the bottom of each PostCard.
 * Matches the Threadify feed design with inline icons and counters.
 */
export function PostActions({
  postId,
  initialLikeCount,
  commentCount,
  initialIsLiked,
  currentUserId,
  isAuthor,
  onLikeToggle,
}: PostActionsProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  async function toggleLike(): Promise<void> {
    if (!currentUserId || isLikeLoading) return;
    setIsLikeLoading(true);

    const nowLiked = !isLiked;
    setIsLiked(nowLiked);
    setLikeCount((c) => c + (nowLiked ? 1 : -1));
    onLikeToggle(postId, nowLiked);

    const response = await fetch("/api/posts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action: nowLiked ? "like" : "unlike" }),
    });

    if (!response.ok) {
      // Rollback optimistic update
      setIsLiked(!nowLiked);
      setLikeCount((c) => c + (nowLiked ? -1 : 1));
      onLikeToggle(postId, !nowLiked);
    }

    setIsLikeLoading(false);
  }

  return (
    <>
      <div className="mt-4 flex items-center gap-8 text-on-surface-variant">
        {/* Comment */}
        <a
          href={`/post/${postId}`}
          className="flex items-center gap-1 transition-colors hover:text-primary"
          aria-label={`${commentCount} komentar`}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-label-xs">{formatCount(commentCount)}</span>
        </a>

        {/* Like */}
        <button
          type="button"
          onClick={toggleLike}
          disabled={!currentUserId || isLikeLoading}
          aria-label={isLiked ? "Batal suka" : "Suka"}
          aria-pressed={isLiked}
          className={cn(
            "flex items-center gap-1 transition-colors",
            isLiked ? "text-error" : "hover:text-error",
            isLikeLoading && "animate-pulse",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
          <span
            className={cn(
              "text-label-xs",
              isLiked && "font-bold text-error",
            )}
          >
            {formatCount(likeCount)}
          </span>
        </button>

        {/* Share */}
        <button
          type="button"
          className="transition-colors hover:text-primary"
          aria-label="Bagikan"
        >
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      {/* Report Modal (for non-authors) */}
      {!isAuthor && currentUserId && (
        <ReportModal
          postId={postId}
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}
    </>
  );
}
