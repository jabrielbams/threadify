"use client";

import { CheckCircle } from "lucide-react";

interface SuccessStepProps {
  postId: string | null;
  onViewPost: () => void;
  onNewPost: () => void;
}

/**
 * Step 4: Success — post published confirmation.
 * Shows a green checkmark and options to view the post or create another.
 */
export function SuccessStep({ postId, onViewPost, onNewPost }: SuccessStepProps) {
  return (
    <section className="flex w-full max-w-[600px] flex-col items-center justify-center gap-lg rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-xl text-center shadow-lg">
      {/* Success Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle className="h-12 w-12 text-green-600" />
      </div>

      {/* Text */}
      <div className="space-y-sm">
        <h2 className="text-title-md font-semibold">
          Postinganmu telah dipublikasikan!
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          Terima kasih telah berbagi cerita di Threadify.
        </p>
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-xs flex-col gap-sm">
        <button
          type="button"
          onClick={onViewPost}
          className="w-full rounded-full bg-primary py-3 text-label-md font-medium text-on-primary shadow-lg transition-all hover:brightness-110"
        >
          Lihat Postingan
        </button>
        <button
          type="button"
          onClick={onNewPost}
          className="w-full rounded-full border border-outline py-3 text-label-md font-medium text-on-surface transition-colors hover:bg-surface-container"
        >
          Buat Postingan Baru
        </button>
      </div>
    </section>
  );
}
