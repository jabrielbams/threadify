"use client";

import { OtpVerifyForm } from "@/components/auth/OtpVerifyForm";

/**
 * OTP verification page — Client Component.
 * Reads pending phone from sessionStorage on mount and delegates all logic
 * to OtpVerifyForm. Redirects to /login if no pending session is found.
 */
export default function VerifyOtpPage() {
  return <OtpVerifyForm />;
}
