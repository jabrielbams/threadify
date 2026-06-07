"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional action button rendered in the header (e.g. "Save") */
  headerAction?: ReactNode;
  className?: string;
}

/**
 * Accessible centred dialog modal with backdrop blur.
 * Closes on Escape key and backdrop click.
 * Matches the Threadify glassmorphism/tonal design system.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  headerAction,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-gutter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-outline-variant/30 bg-surface shadow-2xl",
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-md py-sm">
          <div className="flex items-center gap-sm">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-xs transition-colors hover:bg-surface-container"
              aria-label="Tutup modal"
            >
              <X className="h-5 w-5 text-on-surface-variant" />
            </button>
            <h2 id="modal-title" className="text-title-md font-semibold">
              {title}
            </h2>
          </div>
          {headerAction}
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-md">{children}</div>
      </div>
    </div>
  );
}
