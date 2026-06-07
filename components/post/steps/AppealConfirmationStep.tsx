"use client";

import { Send } from "lucide-react";

interface AppealConfirmationStepProps {
  onGoHome: () => void;
}

/**
 * Step 7: Appeal Confirmation — appeal submitted successfully.
 * Informs the user that moderators will review within 1x24 hours.
 */
export function AppealConfirmationStep({ onGoHome }: AppealConfirmationStepProps) {
  return (
    <section className="flex w-full max-w-[600px] flex-col items-center justify-center gap-lg rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-xl text-center shadow-lg">
      {/* Icon */}
      <div className="flex h-24 w-24 items-center justify-center">
        <Send className="h-16 w-16 -rotate-45 text-primary" />
      </div>

      {/* Text */}
      <div className="space-y-sm">
        <h2 className="text-title-md font-semibold">
          Bandingmu telah dikirim!
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          Tim moderator kami akan meninjau permintaan Anda dalam waktu 1x24 jam.
        </p>
      </div>

      {/* Action */}
      <button
        type="button"
        onClick={onGoHome}
        className="w-full max-w-xs rounded-full bg-surface-container py-3 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container-high"
      >
        Kembali ke Beranda
      </button>
    </section>
  );
}
