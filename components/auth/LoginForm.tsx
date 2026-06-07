"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { sendOtp } from "@/lib/supabase/actions";

/** Digits entered after the +62 prefix — must be 8–12 characters */
const PHONE_DIGITS_REGEX = /^[0-9]{8,12}$/;

/**
 * Login form — phone number only.
 * On submit: validates → sends OTP → stores phone in sessionStorage → navigates to /verify-otp.
 */
export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!PHONE_DIGITS_REGEX.test(phone)) {
      setError("Masukkan 8–12 digit nomor HP setelah +62.");
      return;
    }
    setError(undefined);

    startTransition(async () => {
      const result = await sendOtp(phone);
      if (!result.success) { setError(result.error); return; }

      // Store the normalized phone for the OTP verification step.
      // No display_name / username stored → this is a pure login flow.
      sessionStorage.setItem("pending_phone", "+62" + phone.replace(/^0+/, ""));
      router.push("/verify-otp");
    });
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Masuk ke Threadify</h1>
        <p className="mt-1 text-sm text-gray-500">
          Belum punya akun?{" "}
          <a
            href="/register"
            className="font-medium text-brand-primary hover:underline"
          >
            Daftar sekarang
          </a>
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <div
            className="rounded-lg bg-red-50 px-4 py-3 text-sm text-brand-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        <Input
          label="Nomor HP"
          id="phone"
          type="tel"
          placeholder="8123456789"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          prefix="+62"
          hint="Masukkan angka setelah +62"
          required
          inputMode="numeric"
          autoComplete="tel"
        />

        <Button
          type="submit"
          fullWidth
          isLoading={isPending}
          className="mt-2 text-sm text-white"
        >
          Kirim Kode OTP
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-gray-400">
        Dengan masuk, Anda menyetujui{" "}
        <a href="/tnc-privacy" className="hover:underline" target="_blank" rel="noopener noreferrer">
          Kebijakan Privasi
        </a>{" "}
        Threadify.
      </p>
    </section>
  );
}
