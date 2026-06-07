"use client";

import { useState, type FormEvent } from "react";
import { Shield, Send } from "lucide-react";
import { ModerationFeedback } from "@/components/moderation/ModerationFeedback";
import { StrikeWarningModal } from "@/components/moderation/StrikeWarningModal";
import { MODERATION_TIMEOUT_MS } from "@/constants/moderation";
import { cn } from "@/lib/utils/cn";
import type { ApiError, ModerationApiResponse, StrikeInfo, CommentWithProfile } from "@/types/app";

const MAX_CHARACTERS = 300;

type FeedbackState =
  | { type: "idle" }
  | { type: "scanning" }
  | { type: "safe"; message: string }
  | { type: "pending"; message: string }
  | { type: "blocked"; message: string }
  | { type: "error"; message: string };

interface CommentComposerProps {
  postId: string;
  currentUserId: string | null;
  onCommentCreated: (comment: CommentWithProfile) => void;
}

/**
 * Comment composer with rich AI moderation feedback.
 * Shows inline status during moderation and clear outcomes.
 */
export function CommentComposer({ postId, currentUserId, onCommentCreated }: CommentComposerProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: "idle" });
  const [strike, setStrike] = useState<StrikeInfo | null>(null);
  const [isStrikeOpen, setIsStrikeOpen] = useState(false);
  const [blockedText, setBlockedText] = useState("");

  const charCount = content.length;
  const isOverLimit = charCount > 270;
  const canSubmit = content.trim().length > 0;

  function clearFeedbackAfterDelay(delay = 4000): void {
    setTimeout(() => setFeedback({ type: "idle" }), delay);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback({ type: "idle" });

    if (!currentUserId) {
      setFeedback({ type: "error", message: "Sesi berakhir. Silakan login ulang untuk berkomentar." });
      return;
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      setFeedback({ type: "error", message: "Komentar tidak boleh kosong." });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "scanning" });

    const timeoutId = window.setTimeout(() => {
      setIsSubmitting(false);
      setFeedback({
        type: "pending",
        message: "Pemeriksaan memakan waktu lebih lama. Komentar akan ditinjau manual.",
      });
    }, MODERATION_TIMEOUT_MS);

    try {
      const response = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "comment", postId, content: trimmed }),
      });
      const payload = (await response.json()) as ModerationApiResponse | ApiError;

      if ("error" in payload) {
        const userMsg = mapCommentError(payload.code, payload.error);
        setFeedback({ type: "error", message: userMsg });
        return;
      }

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: "Server tidak merespons dengan benar. Coba lagi nanti.",
        });
        return;
      }

      if (payload.status === "published_comment") {
        onCommentCreated(payload.comment);
        setContent("");
        setFeedback({
          type: "safe",
          message: "Komentar berhasil dikirim! ✓",
        });
        clearFeedbackAfterDelay();
        return;
      }

      if (payload.status === "blocked") {
        setBlockedText(content);
        setStrike(payload.strike);
        setFeedback({
          type: "blocked",
          message: `Komentar melanggar panduan komunitas: ${payload.reason}`,
        });
        setIsStrikeOpen(true);
        setContent("");
        return;
      }

      // pending_review
      setFeedback({
        type: "pending",
        message: "Komentar dikirim dan sedang ditinjau. Akan muncul setelah disetujui.",
      });
      setContent("");
      clearFeedbackAfterDelay(6000);
    } catch (error) {
      console.error("[CommentComposer] Failed:", error);
      setFeedback({
        type: "error",
        message: "Koneksi terputus. Periksa internet Anda dan coba lagi.",
      });
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  if (!currentUserId) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 text-center">
        <p className="text-body-sm text-on-surface-variant">
          <a href="/login" className="font-medium text-primary hover:underline">Masuk</a>
          {" "}untuk menulis komentar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <textarea
            value={content}
            maxLength={MAX_CHARACTERS}
            onChange={(e) => {
              setContent(e.target.value);
              if (feedback.type !== "idle" && feedback.type !== "scanning") {
                setFeedback({ type: "idle" });
              }
            }}
            placeholder="Tulis komentar..."
            rows={3}
            className="w-full resize-none rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-body-sm text-on-surface transition-colors placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-label-xs text-on-surface-variant",
              isOverLimit && "text-error",
            )}
          >
            {charCount} / {MAX_CHARACTERS}
          </span>
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className={cn(
              "flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-label-md font-bold text-on-primary transition-all",
              canSubmit && !isSubmitting
                ? "hover:brightness-110 active:scale-95"
                : "cursor-not-allowed opacity-50",
            )}
          >
            {isSubmitting ? (
              <>
                <Shield className="h-3.5 w-3.5 animate-pulse" />
                Memeriksa...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Balas
              </>
            )}
          </button>
        </div>

        {/* Moderation Feedback */}
        {feedback.type !== "idle" && (
          <ModerationFeedback
            type={feedback.type}
            message={feedback.type === "scanning" ? undefined : feedback.message}
          />
        )}
      </form>

      <StrikeWarningModal
        isOpen={isStrikeOpen}
        onClose={() => {
          setIsStrikeOpen(false);
          setFeedback({ type: "idle" });
        }}
        strike={strike}
        blockedContent={blockedText}
        contentType="comment"
      />
    </div>
  );
}

/**
 * Maps API error codes to user-friendly messages for comments.
 */
function mapCommentError(code: string, fallback: string): string {
  const messages: Record<string, string> = {
    UNAUTHORIZED: "Sesi berakhir. Login ulang untuk berkomentar.",
    RATE_LIMITED: "Terlalu banyak komentar. Tunggu sebentar sebelum mencoba lagi.",
    ACCOUNT_SUSPENDED: "Akun Anda sedang ditangguhkan. Tidak dapat berkomentar saat ini.",
    POST_RESTRICTED: "Fitur komentar dibatasi sementara untuk akun Anda.",
    COMMENT_INSERT_FAILED: "Gagal menyimpan komentar. Server mungkin sedang sibuk, coba lagi.",
    EMPTY_CONTENT: "Komentar tidak boleh kosong.",
    INVALID_INPUT: "Komentar terlalu panjang atau format tidak valid.",
  };
  return messages[code] ?? fallback;
}
