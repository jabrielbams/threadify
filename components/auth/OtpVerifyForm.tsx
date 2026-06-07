"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OtpDigitInput } from "@/components/auth/OtpDigitInput";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { maskPhoneNumber } from "@/lib/utils/format";
import { verifyOtp, sendOtp, updateProfileOnRegister } from "@/lib/supabase/actions";

const OTP_EXPIRY_SECS = 300; // 5 minutes shown in countdown
const RESEND_COOLDOWN_SECS = 60;

/** Formats seconds as MM:SS */
function formatCountdown(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * OTP verification form.
 * Reads the pending phone (and optional registration fields) from sessionStorage.
 * Handles: 5-minute expiry countdown, 60-second resend cooldown, verification, and redirect.
 */
export function OtpVerifyForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [phone, setPhone] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECS);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Hydrate phone from sessionStorage — redirect if missing
  useEffect(() => {
    const stored = sessionStorage.getItem("pending_phone");
    if (!stored) { router.replace("/login"); return; }
    setPhone(stored);
  }, [router]);

  // OTP expiry countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  // Resend button cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  function handleResend() {
    if (!phone || resendCooldown > 0 || isPending) return;
    startTransition(async () => {
      const result = await sendOtp(phone);
      if (!result.success) { setError(result.error); return; }
      setTimeLeft(OTP_EXPIRY_SECS);
      setResendCooldown(RESEND_COOLDOWN_SECS);
      setOtpValue("");
      setError(undefined);
    });
  }

  function handleVerify() {
    if (!phone) return;
    if (otpValue.replace(/\s/g, "").length < 6) {
      setError("Masukkan 6 digit kode OTP.");
      return;
    }
    setError(undefined);

    startTransition(async () => {
      const result = await verifyOtp(phone, otpValue);
      if (!result.success) { setError(result.error); return; }

      const storedName = sessionStorage.getItem("auth_display_name");
      const storedUsername = sessionStorage.getItem("auth_username");

      // Clear all pending auth data before any redirect
      sessionStorage.removeItem("pending_phone");
      sessionStorage.removeItem("auth_display_name");
      sessionStorage.removeItem("auth_username");

      if (storedName && storedUsername) {
        // Registration flow: finalise profile setup
        const profileResult = await updateProfileOnRegister(storedName, storedUsername);
        if (!profileResult.success) {
          setError(profileResult.error);
          // User is authenticated — route to temp profile so they can fix username
          if (result.username) router.replace(`/profile/${result.username}/edit`);
          return;
        }
        router.replace(`/profile/${storedUsername}/edit`);
      } else {
        // Login flow
        router.replace(
          result.isFirstLogin && result.username
            ? `/profile/${result.username}/edit`
            : "/feed",
        );
      }
    });
  }

  // Render nothing while sessionStorage is being read (avoids SSR flash)
  if (!phone) return null;

  const isExpired = timeLeft === 0;

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <header className="mb-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">Verifikasi OTP</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kode dikirim ke{" "}
          <span className="font-medium text-gray-700">{maskPhoneNumber(phone)}</span>
        </p>
      </header>

      <div className="flex flex-col gap-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-brand-danger" role="alert">
            {error}
          </div>
        )}

        <OtpDigitInput
          value={otpValue}
          onChange={setOtpValue}
          disabled={isPending || isExpired}
        />

        {/* Countdown timer */}
        <p className="text-center text-sm">
          {isExpired ? (
            <span className="font-medium text-brand-danger">Kode sudah kedaluwarsa.</span>
          ) : (
            <span className="text-gray-500">
              Kedaluwarsa dalam{" "}
              <span className={cn("font-semibold tabular-nums", timeLeft <= 60 && "text-brand-warning")}>
                {formatCountdown(timeLeft)}
              </span>
            </span>
          )}
        </p>

        <Button
          type="button"
          fullWidth
          isLoading={isPending}
          disabled={otpValue.replace(/\s/g, "").length < 6 || isExpired}
          onClick={handleVerify}
        >
          Verifikasi
        </Button>

        {/* Resend link */}
        <p className="text-center text-sm text-gray-500">
          Tidak menerima kode?{" "}
          {resendCooldown > 0 ? (
            <span className="text-gray-400">Kirim ulang ({resendCooldown}d)</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isPending}
              className="font-medium text-brand-primary hover:underline disabled:opacity-50"
            >
              Kirim ulang
            </button>
          )}
        </p>
      </div>
    </section>
  );
}
