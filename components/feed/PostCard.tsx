"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flag, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { PostActions } from "@/components/post/PostActions";
import { ReportModal } from "@/components/moderation/ReportModal";
import { cn } from "@/lib/utils/cn";
import { formatRelativeTime, formatRelativeTimeShort } from "@/lib/utils/format";
import type { PostWithProfile } from "@/types/app";

interface PostCardProps {
  post: PostWithProfile;
  currentUserId: string | null;
  onDelete: (postId: string) => void;
  onLikeToggle: (postId: string, isNowLiked: boolean) => void;
}

/**
 * Feed post card matching Threadify Hyper-Minimalist design.
 * No background fill — separated by bottom border.
 * Report flag appears on hover (group), opens ReportModal on click.
 */
export function PostCard({
  post,
  currentUserId,
  onDelete,
  onLikeToggle,
}: PostCardProps) {
  const [isReportOpen, setIsReportOpen] = useState(false);
  const profile = post.profiles;
  const displayName = profile?.display_name ?? "Pengguna";
  const username = profile?.username ?? "user";
  const images = post.image_urls ?? [];
  const isAuthor = currentUserId === post.author_id;
  const wasEdited = post.updated_at !== post.created_at;

  return (
    <article className="group relative p-sm transition-colors hover:bg-surface-container-lowest md:p-md">
      <div className="flex gap-4">
        <Link href={`/profile/${username}`} className="shrink-0">
          <Avatar src={profile?.avatar_url ?? null} displayName={displayName} />
        </Link>

        <div className="min-w-0 flex-1">
          {/* Header: name, username, time, report/options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Link
                href={`/profile/${username}`}
                className="text-label-md font-bold text-on-surface"
              >
                {displayName}
              </Link>
              <span className="text-label-xs text-on-surface-variant">
                @{username} · {formatRelativeTime(post.created_at)}
              </span>
              {wasEdited && (
                <span className="text-label-xs italic text-on-surface-variant/60">
                  (diedit {formatRelativeTimeShort(post.updated_at)})
                </span>
              )}
            </div>

            {/* Report button (non-author) or options menu (author) */}
            {isAuthor ? (
              <details className="relative">
                <summary className="list-none rounded-lg p-1 text-on-surface-variant opacity-0 transition-opacity hover:text-error group-hover:opacity-100">
                  <span className="sr-only">Opsi postingan</span>
                  <MoreHorizontal className="h-4 w-4" />
                </summary>
                <div className="absolute right-0 z-10 mt-2 w-36 rounded-xl border border-outline-variant bg-surface-container-lowest p-1 shadow-lg">
                  <Link
                    href={`/post/${post.id}/edit`}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-body-sm text-on-surface transition-colors hover:bg-surface-container"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(post.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-body-sm text-error transition-colors hover:bg-error-container"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </div>
              </details>
            ) : (
              currentUserId && (
                <button
                  type="button"
                  onClick={() => setIsReportOpen(true)}
                  className="text-on-surface-variant opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                  aria-label="Laporkan postingan"
                >
                  <Flag className="h-4 w-4" />
                </button>
              )
            )}
          </div>

          {/* Content */}
          {post.content && (
            <p className="mt-2 whitespace-pre-wrap text-body-lg text-on-surface">
              {post.content}
            </p>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div
              className={cn(
                "mt-3 grid gap-2",
                images.length > 1 ? "grid-cols-2" : "grid-cols-1",
              )}
            >
              {images.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-high"
                >
                  <Image
                    src={url}
                    alt=""
                    width={600}
                    height={400}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="aspect-video w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <PostActions
            postId={post.id}
            initialLikeCount={post.like_count}
            commentCount={post.comment_count}
            initialIsLiked={false}
            currentUserId={currentUserId}
            isAuthor={isAuthor}
            onLikeToggle={onLikeToggle}
          />
        </div>
      </div>

      {/* Report Modal */}
      {currentUserId && !isAuthor && (
        <ReportModal
          postId={post.id}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </article>
  );
}
