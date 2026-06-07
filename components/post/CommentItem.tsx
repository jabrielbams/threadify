"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Trash2, Pencil, Check, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime, formatRelativeTimeShort } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { CommentWithProfile } from "@/types/app";

interface CommentItemProps {
  comment: CommentWithProfile;
  currentUserId: string | null;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, newContent: string) => Promise<boolean>;
}

/**
 * Single comment item with author info, content, edit/delete options for the author.
 * Shows "(diedit Xj lalu)" badge if the comment was edited.
 */
export function CommentItem({ comment, currentUserId, onDelete, onEdit }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [displayContent, setDisplayContent] = useState(comment.content);
  const [editedAt, setEditedAt] = useState<string | null>(comment.updated_at !== comment.created_at ? comment.updated_at : null);

  const profile = comment.profiles;
  const displayName = profile?.display_name ?? "Pengguna";
  const username = profile?.username ?? "user";
  const isAuthor = currentUserId === comment.author_id;
  const wasEdited = editedAt !== null;

  async function handleSaveEdit(): Promise<void> {
    const trimmed = editContent.trim();
    if (trimmed.length === 0 || trimmed === displayContent) {
      setIsEditing(false);
      setEditContent(displayContent);
      return;
    }

    setIsSaving(true);
    const success = await onEdit(comment.id, trimmed);
    setIsSaving(false);

    if (success) {
      setDisplayContent(trimmed);
      setEditedAt(new Date().toISOString());
      setIsEditing(false);
    }
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditContent(displayContent);
  }

  return (
    <article className="flex items-start gap-3 py-4">
      <Avatar src={profile?.avatar_url ?? null} displayName={displayName} />
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${username}`}
              className="truncate text-label-md font-bold text-on-surface"
            >
              {displayName}
            </Link>
            <span className="text-label-xs text-on-surface-variant">
              · {formatRelativeTime(comment.created_at)}
            </span>
            {wasEdited && (
              <span className="text-label-xs italic text-on-surface-variant/60">
                (diedit {formatRelativeTimeShort(editedAt)})
              </span>
            )}
          </div>
          {isAuthor && !isEditing && (
            <details className="relative">
              <summary className="list-none rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
                <span className="sr-only">Opsi komentar</span>
                <MoreHorizontal className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 z-10 mt-1 w-32 rounded-xl border border-outline-variant bg-surface-container-lowest p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-body-sm text-on-surface transition-colors hover:bg-surface-container"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-body-sm text-error transition-colors hover:bg-error-container"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </button>
              </div>
            </details>
          )}
        </header>

        {/* Content or Edit Mode */}
        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={300}
              rows={2}
              className="w-full resize-none rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={isSaving}
              autoFocus
            />
            <div className="mt-1.5 flex items-center justify-between">
              <span className={cn(
                "text-label-xs text-on-surface-variant",
                editContent.length > 270 && "text-error",
              )}>
                {editContent.length}/300
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex items-center gap-1 rounded-full px-3 py-1 text-label-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  <X className="h-3 w-3" />
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving || editContent.trim().length === 0}
                  className={cn(
                    "flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-label-xs font-bold text-on-primary transition-all",
                    isSaving ? "opacity-60" : "hover:brightness-110 active:scale-95",
                  )}
                >
                  {isSaving ? (
                    <span className="flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-current" />
                    </span>
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      Simpan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-body-sm text-on-surface">
            {displayContent}
          </p>
        )}
      </div>
    </article>
  );
}
