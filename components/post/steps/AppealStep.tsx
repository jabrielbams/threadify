"use client";

import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MAX_EXPLANATION = 300;

const APPEAL_REASONS = [
  { value: "", label: "Pilih alasan..." },
  { value: "none", label: "Konten ini tidak melanggar aturan" },
  { value: "error", label: "AI salah mendeteksi" },
  { value: "context", label: "Konteks disalahpahami" },
  { value: "other", label: "Lainnya" },
] as const;

interface AppealStepProps {
  strikeId: string;
  blockedContent: string;
  onBack: () => void;
  onSubmitted: () => void;
}

/**
 * Step 6: Appeal Form — user submits an appeal against an AI strike.
 * Requires selecting a reason category and optionally writing an explanation.
 */
export function AppealStep({
  strikeId,
  blockedContent,
  onBack,
  onSubmitted,
}: AppealStepProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = selectedReason.length > 0;

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    // Build the reason text combining category + explanation
    const reasonLabel = APPEAL_REASONS.find((r) => r.value === selectedReason)?.label ?? "";
    const fullReason = explanation.trim()
      ? `${reasonLabel}: ${explanation.trim()}`
      : reasonLabel;

    try {
      const response = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strikeId,
          reason: fullReason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Gagal mengirim banding. Silakan coba lagi.");
        return;
      }

      onSubmitted();
    } catch (err) {
      console.error(
        "[AppealStep] Failed to submit:",
        err instanceof Error ? err.message : "Unknown error",
      );
      setError("Gagal mengirim banding. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="flex w-full max-w-[600px] flex-col gap-md rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-md shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-xs">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-xs text-on-surface-variant transition-colors hover:bg-surface-container"
          aria-label="Kembali"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-title-md font-semibold">Ajukan Banding</h2>
      </div>

      {/* Blocked Content Preview */}
      <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-sm">
        <p className="mb-1 text-label-xs uppercase tracking-wider text-on-surface-variant">
          Postingan yang Ditangguhkan:
        </p>
        <p className="text-body-sm italic text-on-surface">
          &ldquo;{blockedContent.slice(0, 100)}
          {blockedContent.length > 100 ? "..." : ""}&rdquo;
        </p>
      </div>

      {/* Form */}
      <div className="space-y-md">
        {/* Reason Select */}
        <div className="space-y-xs">
          <label htmlFor="appeal-reason" className="block text-label-md font-medium">
            Alasan Banding
          </label>
          <select
            id="appeal-reason"
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="h-12 w-full rounded-lg border-outline-variant bg-surface-bright px-4 text-body-sm focus:border-primary focus:ring-primary"
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
        <div className="space-y-xs">
          <label htmlFor="appeal-explanation" className="block text-label-md font-medium">
            Penjelasan (Opsional)
          </label>
          <textarea
            id="appeal-explanation"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            maxLength={MAX_EXPLANATION}
            rows={3}
            placeholder="Jelaskan mengapa postingan ini harus dipublikasikan..."
            className="h-24 w-full resize-none rounded-lg border-outline-variant bg-surface-bright p-4 text-body-sm focus:border-primary focus:ring-primary"
            disabled={isSubmitting}
          />
          <div className="text-right text-label-xs text-outline">
            {explanation.length} / {MAX_EXPLANATION}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-body-sm text-error" role="alert">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className={cn(
          "flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-label-md font-medium text-on-primary transition-all hover:brightness-110 active:scale-95",
          (!canSubmit || isSubmitting) && "cursor-not-allowed opacity-50",
        )}
      >
        {isSubmitting ? "Mengirim..." : "Kirim Banding"}
        {!isSubmitting && <Send className="h-4 w-4" />}
      </button>
    </section>
  );
}
