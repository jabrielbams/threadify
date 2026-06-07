"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PrivacyConsentField } from "@/components/auth/PrivacyConsentField";
import { sendOtp } from "@/lib/supabase/actions";
import type { RegisterFormData } from "@/types/auth";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
/** Digits entered after the +62 prefix — must be 8–12 characters */
const PHONE_DIGITS_REGEX = /^[0-9]{8,12}$/;

interface FormErrors {
  displayName?: string;
  username?: string;
  phone?: string;
  privacyConsent?: string;
  general?: string;
}

/**
 * Registration form with display_name, username, phone, and UU PDP consent.
 * On submit: validates → sends OTP → stores pending session → navigates to /verify-otp.
 */
export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<RegisterFormData>({
    displayName: "",
    username: "",
    phone: "",
    privacyConsent: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function setField<K extends keyof RegisterFormData>(
    key: K,
    value: RegisterFormData[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!form.displayName.trim())
      e.displayName = "Nama tampilan wajib diisi.";
    else if (form.displayName.length > 60)
      e.displayName = "Maksimal 60 karakter.";
    if (!form.username.trim())
      e.username = "Username wajib diisi.";
    else if (form.username.length < 3)
      e.username = "Minimal 3 karakter.";
    else if (form.username.length > 30)
      e.username = "Maksimal 30 karakter.";
    else if (!USERNAME_REGEX.test(form.username))
      e.username = "Hanya huruf, angka, dan underscore (_).";
    if (!form.phone.trim())
      e.phone = "Nomor HP wajib diisi.";
    else if (!PHONE_DIGITS_REGEX.test(form.phone))
      e.phone = "Masukkan 8–12 digit setelah +62.";
    if (!form.privacyConsent)
      e.privacyConsent = "Anda harus menyetujui Kebijakan Privasi.";
    return e;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    startTransition(async () => {
      const result = await sendOtp(form.phone);
      if (!result.success) { setErrors({ general: result.error }); return; }

      // Store registration data in sessionStorage for the OTP verification step.
      // These are cleared immediately after verifyOtp succeeds.
      sessionStorage.setItem("pending_phone", "+62" + form.phone.replace(/^0+/, ""));
      sessionStorage.setItem("auth_display_name", form.displayName.trim());
      sessionStorage.setItem("auth_username", form.username.toLowerCase());
      router.push("/verify-otp");
    });
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Buat akun baru</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sudah punya akun?{" "}
          <a href="/login" className="font-medium text-brand-primary hover:underline">
            Masuk
          </a>
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {errors.general && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-brand-danger" role="alert">
            {errors.general}
          </div>
        )}
        <Input label="Nama Tampilan" id="display-name" type="text"
          placeholder="Nama yang tampil di profil" value={form.displayName}
          onChange={(e) => setField("displayName", e.target.value)}
          error={errors.displayName} maxLength={60} required autoComplete="name"
        />
        <Input label="Username" id="username" type="text"
          placeholder="contoh: budi_santoso" value={form.username}
          onChange={(e) => setField("username", e.target.value.toLowerCase())}
          error={errors.username} hint="3–30 karakter, huruf, angka, underscore"
          maxLength={30} required autoComplete="username"
        />
        <Input label="Nomor HP" id="phone" type="tel"
          placeholder="8123456789" value={form.phone}
          onChange={(e) => setField("phone", e.target.value.replace(/\D/g, ""))}
          error={errors.phone} prefix="+62" hint="Masukkan angka setelah +62"
          required inputMode="numeric" autoComplete="tel"
        />
        <PrivacyConsentField
          checked={form.privacyConsent}
          onChange={(v) => setField("privacyConsent", v)}
          error={errors.privacyConsent}
        />
        <Button type="submit" fullWidth isLoading={isPending} className="mt-2 text-sm text-white">
          Kirim Kode OTP
        </Button>
      </form>
    </section>
  );
}
