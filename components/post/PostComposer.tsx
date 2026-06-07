"use client";

import { useState, type FormEvent } from "react";
import { ImageIcon, Smile, Shield } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ImageUploadArea } from "@/components/post/ImageUploadArea";
import { ModerationFeedback } from "@/components/moderation/ModerationFeedback";
import { StrikeWarningModal } from "@/components/moderation/StrikeWarningModal";
import { MODERATION_TIMEOUT_MS } from "@/constants/moderation";
import { emitPostCreated, uploadPostImages } from "@/lib/post-composer";
import { cn } from "@/lib/utils/cn";
import type { ApiError, ModerationApiResponse, StrikeInfo } from "@/types/app";

const MAX_CHARACTERS = 500;

type FeedbackState =
  | { type: "idle" }
  | { type: "scanning" }
  | { type: "safe"; message: string }
  | { type: "pending"; message: string }
  | { type: "blocked"; message: string }
  | { type: "error"; message: string };

interface PostComposerProps {
  currentUserId: string | null;
  avatarUrl?: string | null;
  displayName?: string;
}

/**
 * Post composer with rich AI moderation feedback.
 * Shows real-time status during content checking with clear user communication.
 */
export function PostComposer({
  currentUserId,
  avatarUrl,
  displayName = "Pengguna",
}: PostComposerProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: "idle" });
  const [strike, setStrike] = useState<StrikeInfo | null>(null);
  const [isStrikeOpen, setIsStrikeOpen] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const charCount = content.length;
  const isOverLimit = charCount > 450;
  const canPost = content.trim().length > 0 || files.length > 0;

  function resetComposer(): void {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setContent("");
    setFiles([]);
    setPreviewUrls([]);
    setShowImageUpload(false);
  }

  function clearFeedbackAfterDelay(delay = 5000): void {
    setTimeout(() => setFeedback({ type: "idle" }), delay);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFeedback({ type: "idle" });

    if (!currentUserId) {
      setFeedback({ type: "error", message: "Sesi tidak ditemukan. Silakan login ulang." });
      return;
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 && files.length === 0) {
      setFeedback({ type: "error", message: "Tulis sesuatu atau unggah gambar terlebih dahulu." });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "scanning" });

    const timeoutId = window.setTimeout(() => {
      setIsSubmitting(false);
      setFeedback({
        type: "pending",
        message: "Pemeriksaan memakan waktu lebih lama dari biasanya. Postingan Anda akan ditinjau secara manual.",
      });
    }, MODERATION_TIMEOUT_MS);

    try {
      const imageUrls = await uploadPostImages(currentUserId, files);
      const response = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, imageUrls }),
      });
      const payload = (await response.json()) as ModerationApiResponse | ApiError;

      if ("error" in payload) {
        const userMessage = mapErrorToMessage(payload.code, payload.error);
        setFeedback({ type: "error", message: userMessage });
        return;
      }

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: "Terjadi gangguan pada server. Postingan tidak terkirim. Coba lagi nanti.",
        });
        return;
      }

      if (payload.status === "published") {
        emitPostCreated(payload.post);
        setFeedback({
          type: "safe",
          message: "Postingan berhasil dipublikasikan! Konten telah lolos pemeriksaan AI. ✓",
        });
        resetComposer();
        clearFeedbackAfterDelay();
        return;
      }

      if (payload.status === "blocked") {
        setStrike(payload.strike);
        setFeedback({
          type: "blocked",
          message: `Konten terdeteksi melanggar panduan komunitas: ${payload.reason}`,
        });
        setIsStrikeOpen(true);
        resetComposer();
        return;
      }

      // pending_review
      setFeedback({
        type: "pending",
        message: "Postingan Anda berhasil dikirim dan sedang dalam antrian peninjauan. Kami akan memberitahu hasilnya.",
      });
      resetComposer();
      clearFeedbackAfterDelay(8000);
    } catch (error) {
      console.error(
        "[Composer] Failed to submit post:",
        error instanceof Error ? error.message : "Unknown error",
      );
      setFeedback({
        type: "error",
        message: "Koneksi terputus atau server tidak merespons. Periksa koneksi internet Anda dan coba lagi.",
      });
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  return (
    <section className="border-b border-outline-variant p-sm md:p-md">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-4">
          <Avatar
            src={avatarUrl ?? null}
            displayName={displayName}
            size="md"
            className="shrink-0"
          />
          <div className="flex-1">
            <textarea
              id="post-content"
              value={content}
              maxLength={MAX_CHARACTERS}
              onChange={(e) => {
                setContent(e.target.value);
                if (feedback.type !== "idle" && feedback.type !== "scanning") {
                  setFeedback({ type: "idle" });
                }
              }}
              placeholder="Apa yang sedang terjadi?"
              className="min-h-[100px] w-full resize-none border-none bg-transparent text-body-lg placeholder:text-on-surface-variant focus:ring-0"
              disabled={isSubmitting}
              aria-label="Tulis postingan"
            />

            {showImageUpload && (
              <ImageUploadArea
                files={files}
                previewUrls={previewUrls}
                onFilesChange={(nextFiles, nextPreviews) => {
                  setFiles(nextFiles);
                  setPreviewUrls(nextPreviews);
                }}
                disabled={isSubmitting}
              />
            )}

            {/* Moderation Feedback */}
            {feedback.type !== "idle" && (
              <div className="mt-3">
                <ModerationFeedback
                  type={feedback.type}
                  message={feedback.type === "scanning" ? undefined : feedback.message}
                />
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-surface-container-high pt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImageUpload(!showImageUpload)}
                  className="rounded-full p-2 text-primary transition-colors hover:bg-surface-container"
                  aria-label="Tambah gambar"
                  disabled={isSubmitting}
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-primary transition-colors hover:bg-surface-container"
                  aria-label="Tambah emoji"
                  disabled={isSubmitting}
                >
                  <Smile className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center gap-4">
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
                  disabled={!canPost || isSubmitting}
                  className={cn(
                    "flex items-center gap-2 rounded-full bg-primary px-6 py-2 text-label-md font-bold text-on-primary transition-all",
                    canPost && !isSubmitting
                      ? "hover:brightness-110"
                      : "cursor-not-allowed opacity-50",
                  )}
                >
                  {isSubmitting && (
                    <Shield className="h-4 w-4 animate-pulse" />
                  )}
                  {isSubmitting ? "Memeriksa..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      <StrikeWarningModal
        isOpen={isStrikeOpen}
        onClose={() => {
          setIsStrikeOpen(false);
          setFeedback({ type: "idle" });
        }}
        strike={strike}
      />
    </section>
  );
}

/**
 * Maps API error codes to user-friendly Indonesian messages.
 */
function mapErrorToMessage(code: string, fallback: string): string {
  const messages: Record<string, string> = {
    UNAUTHORIZED: "Sesi Anda telah berakhir. Silakan login kembali untuk melanjutkan.",
    RATE_LIMITED: "Anda terlalu sering mengirim postingan. Tunggu sebentar sebelum mencoba lagi.",
    ACCOUNT_SUSPENDED: "Akun Anda sedang dalam masa penangguhan. Anda tidak dapat membuat postingan saat ini.",
    POST_RESTRICTED: "Posting dibatasi sementara akibat pelanggaran sebelumnya. Coba lagi nanti.",
    PROFILE_FETCH_FAILED: "Gagal memverifikasi akun Anda. Coba refresh halaman dan login ulang.",
    POST_INSERT_FAILED: "Gagal menyimpan postingan ke database. Silakan coba beberapa saat lagi.",
    EMPTY_CONTENT: "Postingan tidak boleh kosong. Tulis sesuatu atau tambahkan gambar.",
    INVALID_INPUT: "Format postingan tidak valid. Pastikan teks tidak melebihi 500 karakter.",
  };
  return messages[code] ?? fallback;
}
