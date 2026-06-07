"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import Image from "next/image";
import { ImagePlus, Shield, Send, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { ModerationFeedback } from "@/components/moderation/ModerationFeedback";
import { StrikeWarningModal } from "@/components/moderation/StrikeWarningModal";
import { MODERATION_TIMEOUT_MS } from "@/constants/moderation";
import { emitPostCreated, uploadPostImages } from "@/lib/post-composer";
import { cn } from "@/lib/utils/cn";
import type { ApiError, ModerationApiResponse, StrikeInfo } from "@/types/app";

const MAX_CHARACTERS = 500;
const MAX_IMAGES = 4;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type FeedbackState =
  | { type: "idle" }
  | { type: "scanning" }
  | { type: "safe"; message: string }
  | { type: "pending"; message: string }
  | { type: "blocked"; message: string }
  | { type: "error"; message: string };

interface FloatingComposerProps {
  currentUserId: string | null;
  avatarUrl?: string | null;
  displayName?: string;
}

/**
 * Floating bottom composer with image upload and emoji picker.
 * Hides on scroll down, shows on scroll up. Expands on focus.
 */
export function FloatingComposer({
  currentUserId,
  avatarUrl,
  displayName = "Pengguna",
}: FloatingComposerProps) {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({ type: "idle" });
  const [strike, setStrike] = useState<StrikeInfo | null>(null);
  const [isStrikeOpen, setIsStrikeOpen] = useState(false);
  const [blockedContentText, setBlockedContentText] = useState("");
  const lastScrollY = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = content.length;
  const canPost = content.trim().length > 0 || files.length > 0;
  const totalImages = files.length;

  // Scroll direction detection
  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;

      if (!isExpanded) {
        if (delta > 10) setIsVisible(false);
        else if (delta < -10) setIsVisible(true);
      }

      lastScrollY.current = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isExpanded]);

  function handleFocus() {
    setIsExpanded(true);
    setIsVisible(true);
  }

  function handleBlur() {
    if (content.trim().length === 0 && files.length === 0 && feedback.type === "idle") {
      setTimeout(() => setIsExpanded(false), 200);
    }
  }

  function handleEmojiSelect(emoji: string) {
    if (content.length + emoji.length <= MAX_CHARACTERS) {
      setContent((prev) => prev + emoji);
      textareaRef.current?.focus();
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? [])
      .filter((f) => ACCEPTED_TYPES.includes(f.type))
      .slice(0, MAX_IMAGES - files.length);

    if (newFiles.length === 0) return;

    const newUrls = newFiles.map((f) => URL.createObjectURL(f));
    setFiles((prev) => [...prev, ...newFiles]);
    setPreviewUrls((prev) => [...prev, ...newUrls]);
    setIsExpanded(true);
    e.target.value = "";
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previewUrls[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function resetComposer() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setContent("");
    setFiles([]);
    setPreviewUrls([]);
  }

  function clearFeedbackAfterDelay(delay = 4000): void {
    setTimeout(() => {
      setFeedback({ type: "idle" });
      setIsExpanded(false);
    }, delay);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFeedback({ type: "idle" });

    if (!currentUserId) {
      setFeedback({ type: "error", message: "Sesi berakhir. Silakan login ulang." });
      return;
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 && files.length === 0) {
      setFeedback({ type: "error", message: "Tulis sesuatu atau tambah gambar." });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ type: "scanning" });

    const timeoutId = window.setTimeout(() => {
      setIsSubmitting(false);
      setFeedback({ type: "pending", message: "Pemeriksaan memakan waktu lebih lama. Ditinjau manual." });
      resetComposer();
      clearFeedbackAfterDelay(6000);
    }, MODERATION_TIMEOUT_MS);

    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (files.length > 0) {
        try {
          imageUrls = await uploadPostImages(currentUserId, files);
        } catch (uploadErr) {
          setFeedback({
            type: "error",
            message: "Gagal mengunggah gambar. Pastikan ukuran file tidak melebihi 5MB dan format yang didukung (JPEG, PNG, WebP).",
          });
          return;
        }
      }

      const response = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, imageUrls }),
      });
      const payload = (await response.json()) as ModerationApiResponse | ApiError;

      if ("error" in payload) {
        setFeedback({ type: "error", message: payload.error });
        return;
      }

      if (!response.ok) {
        setFeedback({ type: "error", message: "Terjadi gangguan server. Coba lagi nanti." });
        return;
      }

      if (payload.status === "published") {
        emitPostCreated(payload.post);
        resetComposer();
        setFeedback({ type: "safe", message: "Postingan dipublikasikan! ✓" });
        clearFeedbackAfterDelay();
        return;
      }

      if (payload.status === "blocked") {
        setStrike(payload.strike);
        setBlockedContentText(content);
        setFeedback({ type: "blocked", message: `Konten melanggar panduan: ${payload.reason}` });
        setIsStrikeOpen(true);
        resetComposer();
        return;
      }

      resetComposer();
      setFeedback({ type: "pending", message: "Postingan sedang ditinjau." });
      clearFeedbackAfterDelay(6000);
    } catch {
      setFeedback({ type: "error", message: "Koneksi terputus. Coba lagi." });
    } finally {
      clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  if (!currentUserId) return null;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-16 left-0 right-0 z-30 transition-transform duration-300 ease-in-out lg:bottom-0 lg:left-52",
          isVisible ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto max-w-[600px]">
          <div className={cn(
            "rounded-t-xl border border-b-0 border-outline-variant/40 bg-surface/95 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-200",
            isExpanded ? "px-4 pb-4 pt-3" : "px-4 py-3",
          )}>
            <form onSubmit={handleSubmit}>
              <div className="flex gap-3">
                <Avatar
                  src={avatarUrl ?? null}
                  displayName={displayName}
                  size="sm"
                  className="mt-1 shrink-0"
                />
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    maxLength={MAX_CHARACTERS}
                    onChange={(e) => {
                      setContent(e.target.value);
                      if (feedback.type !== "idle" && feedback.type !== "scanning") {
                        setFeedback({ type: "idle" });
                      }
                    }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    placeholder="Apa yang sedang terjadi?"
                    rows={isExpanded ? 3 : 1}
                    className={cn(
                      "w-full resize-none border-none bg-transparent text-body-sm placeholder:text-on-surface-variant focus:ring-0 transition-all",
                      isExpanded ? "min-h-[72px]" : "min-h-[24px]",
                    )}
                    disabled={isSubmitting}
                    aria-label="Tulis postingan"
                  />

                  {/* Image Previews */}
                  {previewUrls.length > 0 && isExpanded && (
                    <div className="mb-2 flex gap-2 overflow-x-auto py-1">
                      {previewUrls.map((url, index) => (
                        <div
                          key={url}
                          className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-outline-variant/30"
                        >
                          <Image src={url} alt="" fill className="object-cover" sizes="64px" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute right-0.5 top-0.5 rounded-full bg-on-surface/60 p-0.5 text-white"
                            aria-label={`Hapus gambar ${index + 1}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Feedback */}
                  {feedback.type !== "idle" && isExpanded && (
                    <div className="mb-2">
                      <ModerationFeedback
                        type={feedback.type}
                        message={feedback.type === "scanning" ? undefined : feedback.message}
                      />
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {/* Image upload button with label */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={totalImages >= MAX_IMAGES || isSubmitting}
                        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-primary transition-colors hover:bg-surface-container disabled:opacity-40"
                        aria-label="Tambah gambar"
                      >
                        <ImagePlus className="h-4 w-4" />
                        {isExpanded && (
                          <span className="text-label-xs font-medium">
                            {totalImages > 0 ? `${totalImages}/${MAX_IMAGES}` : "Gambar"}
                          </span>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_TYPES.join(",")}
                        multiple
                        className="sr-only"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                      />

                      {/* Emoji picker */}
                      <EmojiPicker onSelect={handleEmojiSelect} disabled={isSubmitting} />

                      {/* Char count */}
                      {isExpanded && (
                        <span className={cn(
                          "ml-1 text-label-xs text-on-surface-variant",
                          charCount > 450 && "text-error",
                        )}>
                          {charCount}/{MAX_CHARACTERS}
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!canPost || isSubmitting}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-label-md font-bold text-on-primary transition-all",
                        canPost && !isSubmitting
                          ? "hover:brightness-110 active:scale-95"
                          : "cursor-not-allowed opacity-40",
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Shield className="h-3.5 w-3.5 animate-pulse" />
                          <span className="hidden sm:inline">Memeriksa</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Post</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      <StrikeWarningModal
        isOpen={isStrikeOpen}
        onClose={() => {
          setIsStrikeOpen(false);
          setFeedback({ type: "idle" });
          setIsExpanded(false);
        }}
        strike={strike}
        blockedContent={blockedContentText}
      />
    </>
  );
}
