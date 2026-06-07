"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DeletePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/**
 * Delete post confirmation modal.
 * Shows a warning icon with explanation that deletion is permanent.
 * Matches the Threadify design with error-container icon, pill buttons.
 */
export function DeletePostModal({ isOpen, onClose, onConfirm }: DeletePostModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isDeleting) onClose();
    }
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, isDeleting, onClose]);

  async function handleDelete(): Promise<void> {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-margin-mobile backdrop-blur-xl"
      style={{ backgroundColor: "rgba(248, 249, 255, 0.7)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-post-title"
    >
      {/* Backdrop click */}
      <div
        className="absolute inset-0"
        onClick={isDeleting ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog Card */}
      <div className="relative flex w-full max-w-[400px] flex-col items-center rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-xl text-center shadow-2xl">
        {/* Warning Icon */}
        <div className="mb-lg flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-on-error-container">
          <Trash2 className="h-8 w-8" />
        </div>

        {/* Content */}
        <h2
          id="delete-post-title"
          className="mb-sm text-headline-lg font-semibold text-on-surface"
        >
          Hapus postingan ini?
        </h2>
        <p className="mb-xl text-body-lg text-on-surface-variant">
          Tindakan ini tidak dapat dibatalkan. Semua interaksi, balasan, dan
          media yang terkait dengan postingan ini akan dihapus secara permanen.
        </p>

        {/* Actions */}
        <div className="flex w-full flex-col gap-sm">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              "w-full rounded-full bg-error py-md text-title-md font-bold text-on-error transition-all hover:opacity-90 active:scale-[0.98]",
              isDeleting && "cursor-not-allowed opacity-50",
            )}
          >
            {isDeleting ? "Menghapus..." : "Hapus"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full rounded-full bg-surface-container-high py-md text-title-md font-bold text-on-surface transition-all hover:bg-surface-container-highest active:scale-[0.98]"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
