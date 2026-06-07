"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { StrikeInfo } from "@/types/app";

type ModalStep = "strike" | "appeal" | "confirmation";

const APPEAL_REASONS = [
  { value: "", label: "Pilih alasan..." },
  { value: "none", label: "Konten ini tidak melanggar aturan" },
  { value: "error", label: "AI salah mendeteksi" },
  { value: "context", label: "Konteks disalahpahami" },
  { value: "other", label: "Lainnya" },
] as const;

const MAX_EXPLANATION = 300;

interface StrikeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  strike: StrikeInfo | null;
  /** The content that was blocked (for showing in the appeal form) */
  blockedContent?: string;
  /** Whether the blocked content was a post or comment */
  contentType?: "post" | "comment";
}

/**
 * Multi-step modal for AI moderation rejection:
 * Step 1: Strike notification (rejected post info)
 * Step 2: Appeal form (reason + explanation)
 * Step 3: Confirmation (appeal sent)
 */
export function StrikeWarningModal({
  isOpen,
  onClose,
  strike,
  blockedContent,
  contentType = "post",
}: StrikeWarningModalProps) {
  const [step, setStep] = useState<ModalStep>("strike");
  const [selectedReason, setSelectedReason] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("strike");
      setSelectedReason("");
      setExplanation("");
      setError("");
    }
  }, [isOpen]);

  // Lock body scroll
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

  async function handleSubmitAppeal(): Promise<void> {
    if (!selectedReason || !strike) return;
    setError("");
    setIsSubmitting(true);

    const reasonLabel = APPEAL_REASONS.find((r) => r.value === selectedReason)?.label ?? "";
    const fullReason = explanation.trim()
      ? `${reasonLabel}: ${explanation.trim()}`
      : reasonLabel;

    try {
      const response = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strikeId: strike.id,
          reason: fullReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Gagal mengirim banding.");
        return;
      }

      setStep("confirmation");
    } catch {
      setError("Koneksi terputus. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen || !strike) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm"
        onClick={isSubmitting ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
        {/* Step 1: Strike Notification */}
        {step === "strike" && (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            {/* Shield Icon */}
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-error-container/40">
              <ShieldAlert className="h-10 w-10 text-error" />
            </div>

            {/* Title */}
            <h2 className="mb-4 text-title-md font-bold text-on-surface">
              {contentType === "comment"
                ? "Komentarmu tidak dapat dipublikasikan"
                : "Postinganmu tidak dapat dipublikasikan"}
            </h2>

            {/* Violation Badge */}
            <span className="mb-4 rounded-full border border-error/30 bg-error/10 px-4 py-1.5 text-label-md font-bold uppercase tracking-wider text-error">
              {strike.reason}
            </span>

            {/* Description */}
            <p className="mb-8 text-body-sm text-on-surface-variant">
              AI kami mendeteksi konten yang melanggar panduan komunitas kami.
            </p>

            {/* Actions */}
            <div className="flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={() => setStep("appeal")}
                className="w-full rounded-full bg-primary py-3 text-label-md font-bold text-on-primary transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Ajukan Banding
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-full border border-outline-variant py-3 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container"
              >
                {contentType === "comment" ? "Hapus Komentar" : "Hapus Postingan"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Appeal Form */}
        {step === "appeal" && (
          <div className="flex flex-col px-6 py-6">
            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("strike")}
                className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
                aria-label="Kembali"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-title-md font-bold text-on-surface">
                Ajukan Banding
              </h2>
            </div>

            {/* Blocked Content Preview */}
            {blockedContent && (
              <div className="mb-6 rounded-xl bg-surface-container-low p-4">
                <p className="mb-1 text-label-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  {contentType === "comment" ? "Komentar" : "Postingan"} yang Ditangguhkan:
                </p>
                <p className="text-body-sm italic text-on-surface">
                  &ldquo;{blockedContent.slice(0, 120)}
                  {blockedContent.length > 120 ? "..." : ""}&rdquo;
                </p>
              </div>
            )}

            {/* Reason Select */}
            <div className="mb-4">
              <label className="mb-2 block text-label-md font-bold text-on-surface">
                Alasan Banding
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-body-sm focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={isSubmitting}
              >
                {APPEAL_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Explanation Textarea */}
            <div className="mb-4">
              <label className="mb-2 block text-label-md font-bold text-on-surface">
                Penjelasan (Opsional)
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                maxLength={MAX_EXPLANATION}
                rows={4}
                placeholder="Jelaskan mengapa postingan ini harus dipublikasikan..."
                className="w-full resize-none rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-body-sm placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-1 focus:ring-primary"
                disabled={isSubmitting}
              />
              <div className="mt-1 text-right text-label-xs text-on-surface-variant">
                {explanation.length} / {MAX_EXPLANATION}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="mb-4 text-body-sm text-error" role="alert">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmitAppeal}
              disabled={!selectedReason || isSubmitting}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-label-md font-bold text-on-primary transition-all",
                selectedReason && !isSubmitting
                  ? "hover:brightness-110 active:scale-[0.98]"
                  : "cursor-not-allowed opacity-50",
              )}
            >
              {isSubmitting ? (
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                </span>
              ) : (
                <>
                  Kirim Banding
                  <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === "confirmation" && (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            {/* Send Icon */}
            <div className="mb-6">
              <Send className="h-12 w-12 -rotate-12 text-primary" />
            </div>

            {/* Title */}
            <h2 className="mb-3 text-title-md font-bold text-on-surface">
              Bandingmu telah dikirim!
            </h2>

            {/* Description */}
            <p className="mb-8 text-body-sm text-on-surface-variant">
              Tim moderator kami akan meninjau permintaan Anda dalam waktu 1x24 jam.
            </p>

            {/* Action */}
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-surface-container py-3 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
            >
              Kembali ke Beranda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
