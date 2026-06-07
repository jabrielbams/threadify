"use client";

import { useState, useEffect, type FormEvent } from "react";
import { X, Flag, Gavel, AlertCircle, UserX, EyeOff, MessageSquareWarning } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ReportModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ReportCategory {
  value: string;
  label: string;
  icon: React.ElementType;
}

const CATEGORIES: ReportCategory[] = [
  { value: "spam_buzzer", label: "Spam", icon: Flag },
  { value: "hate_speech", label: "Ujaran Kebencian", icon: Gavel },
  { value: "misinformation", label: "Misinformasi", icon: AlertCircle },
  { value: "sara", label: "SARA", icon: UserX },
  { value: "nsfw", label: "Konten Tidak Pantas", icon: EyeOff },
  { value: "other", label: "Lainnya", icon: MessageSquareWarning },
];

const MAX_DESCRIPTION = 500;

/**
 * Report post modal — matches Threadify design with radio chip categories,
 * optional description textarea, and character counter.
 */
export function ReportModal({ postId, isOpen, onClose }: ReportModalProps) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, isSubmitting, onClose]);

  function handleClose() {
    if (isSubmitting) return;
    setCategory("");
    setDescription("");
    setFeedback(null);
    onClose();
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!category) {
      setFeedback({ type: "error", message: "Pilih alasan laporan terlebih dahulu." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, category, description: description.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        const messages: Record<string, string> = {
          DUPLICATE_REPORT: "Anda sudah melaporkan postingan ini sebelumnya.",
          FORBIDDEN: "Anda tidak dapat melaporkan postingan sendiri.",
          NOT_FOUND: "Postingan tidak ditemukan.",
        };
        setFeedback({
          type: "error",
          message: messages[data.code] ?? data.error ?? "Gagal mengirim laporan.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "Laporan berhasil dikirim. Terima kasih telah membantu menjaga keamanan Threadify.",
      });
      setTimeout(handleClose, 2500);
    } catch {
      setFeedback({ type: "error", message: "Koneksi terputus. Coba lagi nanti." });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-gutter bg-on-background/10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-md py-sm">
          <h2 id="report-modal-title" className="text-title-md font-semibold text-on-surface">
            Laporkan Postingan
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-container"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-md p-md">
          {/* Success State */}
          {feedback?.type === "success" ? (
            <div className="flex flex-col items-center gap-md py-lg text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Flag className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-body-sm text-on-surface-variant">{feedback.message}</p>
            </div>
          ) : (
            <>
              {/* Category Selection */}
              <div className="space-y-sm">
                <p className="text-label-md font-medium text-on-surface-variant">
                  Mengapa Anda melaporkan postingan ini?
                </p>
                <div className="grid grid-cols-1 gap-xs">
                  {CATEGORIES.map(({ value, label, icon: Icon }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer items-center gap-sm rounded-lg border px-sm py-xs transition-all",
                        category === value
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low",
                      )}
                    >
                      <input
                        type="radio"
                        name="report-category"
                        value={value}
                        checked={category === value}
                        onChange={(e) => setCategory(e.target.value)}
                        className="sr-only"
                        disabled={isSubmitting}
                      />
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-label-md">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-xs">
                <label htmlFor="report-details" className="text-label-md font-medium text-on-surface-variant">
                  Detail Tambahan (opsional)
                </label>
                <textarea
                  id="report-details"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={MAX_DESCRIPTION}
                  rows={3}
                  placeholder="Jelaskan mengapa postingan ini melanggar panduan komunitas..."
                  className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container-low p-sm text-body-sm transition-all placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
                  disabled={isSubmitting}
                />
                <div className="flex justify-end">
                  <span className={cn(
                    "text-label-xs text-outline",
                    description.length > 450 && "text-error",
                  )}>
                    {description.length}/{MAX_DESCRIPTION}
                  </span>
                </div>
              </div>

              {/* Error */}
              {feedback?.type === "error" && (
                <p className="text-body-sm text-error" role="alert">
                  {feedback.message}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-sm pt-sm">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 rounded-full border border-outline-variant py-xs text-label-md font-medium text-on-surface-variant transition-colors hover:bg-surface-container active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!category || isSubmitting}
                  className={cn(
                    "flex-1 rounded-full bg-primary py-xs text-label-md font-medium text-on-primary shadow-sm transition-all hover:bg-primary-container active:scale-95",
                    (!category || isSubmitting) && "cursor-not-allowed opacity-50",
                  )}
                >
                  {isSubmitting ? "Mengirim..." : "Kirim Laporan"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
