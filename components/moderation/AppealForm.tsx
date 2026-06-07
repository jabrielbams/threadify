"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface AppealFormProps {
  strikeId: string;
}

/**
 * Form for submitting an appeal against a specific strike.
 * Users must provide a reason (max 500 chars).
 */
export function AppealForm({ strikeId }: AppealFormProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const remaining = 500 - reason.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim().length < 10) {
      setErrorMessage("Alasan harus minimal 10 karakter.");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strikeId, reason: reason.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrorMessage(data.error || "Gagal mengirim banding. Silakan coba lagi.");
        setIsSubmitting(false);
        return;
      }

      router.push("/strikes?appealed=1");
    } catch (error) {
      console.error("[Appeal] Failed to submit:", error);
      setErrorMessage("Gagal mengirim banding. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="appeal-reason"
          className="text-sm font-semibold text-gray-800"
        >
          Mengapa menurut Anda keputusan ini salah?
        </label>
        <textarea
          id="appeal-reason"
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Jelaskan alasan Anda di sini..."
          rows={5}
          required
          className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
        />
        <div className="mt-1 text-right text-xs text-gray-400">
          {remaining} karakter tersisa
        </div>
      </div>

      {errorMessage && (
        <p className="text-xs text-brand-danger" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          fullWidth
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Kirim Banding
        </Button>
      </div>
    </form>
  );
}
