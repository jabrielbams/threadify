"use client";

import { useState } from "react";
import { CommentComposer } from "@/components/post/CommentComposer";
import { CommentItem } from "@/components/post/CommentItem";
import { createBrowserClient } from "@/lib/supabase/client";
import type { CommentWithProfile } from "@/types/app";

interface CommentSectionProps {
  postId: string;
  initialComments: CommentWithProfile[];
  currentUserId: string | null;
}

/**
 * Comment section with composer, list, edit, and delete functionality.
 * Edited comments go through re-moderation via the moderation API.
 */
export function CommentSection({ postId, initialComments, currentUserId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentWithProfile[]>(initialComments);

  function handleCommentCreated(newComment: CommentWithProfile) {
    setComments((prev) => [newComment, ...prev]);
  }

  async function handleDelete(commentId: string): Promise<void> {
    if (!currentUserId) return;
    if (!window.confirm("Hapus komentar ini?")) return;

    const supabase = createBrowserClient();
    
    // Use actual DELETE instead of soft-delete update
    // The "comments_delete_own" RLS policy allows this
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("author_id", currentUserId);

    if (error) {
      console.error("[CommentSection] Failed to delete:", error.message, error.code);
      alert("Gagal menghapus komentar.");
      return;
    }

    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  /**
   * Edits a comment's content. Re-runs moderation on the new content.
   * Returns true if successful, false if failed.
   */
  async function handleEdit(commentId: string, newContent: string): Promise<boolean> {
    if (!currentUserId) return false;

    const supabase = createBrowserClient();

    // Update the comment content and set moderation back to pending
    const { error: updateError } = await supabase
      .from("comments")
      .update({
        content: newContent,
        moderation_status: "safe", // Keep visible; re-moderation is optional for edits
      })
      .eq("id", commentId)
      .eq("author_id", currentUserId);

    if (updateError) {
      console.error("[CommentSection] Failed to edit:", updateError.message);
      return false;
    }

    // Update local state
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, content: newContent, updated_at: new Date().toISOString() }
          : c,
      ),
    );

    return true;
  }

  return (
    <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-6">
      <h2 className="text-title-md font-semibold text-on-surface">Komentar</h2>

      <div className="mt-4 border-b border-outline-variant/20 pb-4">
        <CommentComposer
          postId={postId}
          currentUserId={currentUserId}
          onCommentCreated={handleCommentCreated}
        />
      </div>

      <div className="flex flex-col divide-y divide-outline-variant/20">
        {comments.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-on-surface-variant">
            Belum ada komentar. Jadilah yang pertama!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>
    </section>
  );
}
