"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

/**
 * Step 3: AI Moderation Loading — spinning shield icon with progress bar.
 * Shows while the moderation pipeline processes the content (max 3 seconds).
 */
export function ModerationLoadingStep() {
  const [progress, setProgress] = useState(0);

  // Animate progress bar over ~3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 3;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="flex w-full max-w-[600px] flex-col items-center justify-center gap-lg rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-xl text-center shadow-lg">
      {/* Spinning Shield */}
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Shield className="h-10 w-10 text-primary" />
        </div>
      </div>

      {/* Text */}
      <div className="space-y-sm">
        <h2 className="text-title-md font-semibold">
          Sedang memeriksa konten...
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          AI kami sedang menganalisis teks dan gambar Anda.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-container">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Kemajuan moderasi"
        />
      </div>
    </section>
  );
}
