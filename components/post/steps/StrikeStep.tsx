"use client";

import { ShieldAlert } from "lucide-react";
import type { StrikeInfo } from "@/types/app";

interface StrikeStepProps {
  strike: StrikeInfo | null;
  reason: string;
  onAppeal: () => void;
  onDiscard: () => void;
}

/**
 * Step 5: Strike — post blocked by AI moderation.
 * Shows the violation category, reason, and options to appeal or discard.
 */
export function StrikeStep({ strike, reason, onAppeal, onDiscard }: StrikeStepProps) {
  return (
    <section className="flex w-full max-w-[600px] flex-col items-center justify-center gap-lg rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-xl text-center shadow-lg">
      {/* Strike Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error-container">
        <ShieldAlert className="h-12 w-12 text-error" />
      </div>

      {/* Text */}
      <div className="space-y-sm">
        <h2 className="text-title-md font-semibold">
          Postinganmu tidak dapat dipublikasikan
        </h2>

        {/* Violation Badge */}
        <div className="flex justify-center">
          <span className="rounded-full bg-error px-3 py-1 text-label-xs font-bold uppercase tracking-wider text-on-error">
            {reason || "Pelanggaran Terdeteksi"}
          </span>
        </div>

        <p className="mt-2 text-body-sm text-on-surface-variant">
          AI kami mendeteksi konten yang melanggar panduan komunitas kami.
        </p>

        {strike && (
          <p className="text-body-sm text-on-surface-variant">
            Peringatan ke-{strike.strike_number} • Keyakinan AI:{" "}
            {Math.round(strike.ai_confidence * 100)}%
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-xs flex-col gap-sm">
        <button
          type="button"
          onClick={onAppeal}
          className="w-full rounded-full bg-primary py-3 text-label-md font-medium text-on-primary transition-all hover:brightness-110"
        >
          Ajukan Banding
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="w-full rounded-full border border-outline py-3 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container"
        >
          Hapus Postingan
        </button>
      </div>
    </section>
  );
}
