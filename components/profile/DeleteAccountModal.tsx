"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Delete account confirmation dialog.
 * Shows a warning icon, explains the consequences (UU PDP: permanent deletion within 30 days),
 * and requires explicit confirmation before soft-deleting the account.
 */
export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  // Block body scroll when open
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

  async function handleDelete(): Promise<void> {
    setIsDeleting(true);
    setError("");

    try {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Sesi tidak ditemukan. Silakan login ulang.");
        return;
      }

      // Soft-delete: mark profile as banned (data purge handled by backend within 30 days per UU PDP)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_banned: true })
        .eq("user_id", user.id);

      if (updateError) {
        setError("Gagal menghapus akun. Silakan coba lagi.");
        return;
      }

      // Sign out
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error(
        "[DeleteAccount] Failed:",
        err instanceof Error ? err.message : "Unknown error",
      );
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-gutter transition-all duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-on-background/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-[400px] scale-100 transform rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-xl shadow-2xl transition-all duration-300">
        <div className="flex flex-col items-center text-center">
          {/* Warning Icon */}
          <div className="mb-md flex h-16 w-16 items-center justify-center rounded-full bg-error-container">
            <AlertTriangle className="h-8 w-8 text-error" />
          </div>

          <h2
            id="delete-modal-title"
            className="mb-sm text-headline-lg font-bold text-on-surface"
          >
            Hapus akun?
          </h2>

          <p className="mb-xl text-body-lg leading-relaxed text-on-surface-variant">
            Tindakan ini bersifat permanen dan tidak dapat dibatalkan. Semua
            postingan, pengikut, dan data Anda akan dihapus secara permanen
            dalam 30 hari.
          </p>

          {error && (
            <p className="mb-md text-body-sm text-error" role="alert">
              {error}
            </p>
          )}

          <div className="flex w-full flex-col gap-sm">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                "w-full rounded-full bg-error px-6 py-3 text-title-md font-semibold text-on-error shadow-lg shadow-error/20 transition-all hover:brightness-110 active:scale-95",
                isDeleting && "cursor-not-allowed opacity-50",
              )}
            >
              {isDeleting ? "Menghapus..." : "Hapus Akun"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="w-full rounded-full border border-outline-variant px-6 py-3 text-title-md text-on-surface transition-all hover:bg-surface-container-low"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
