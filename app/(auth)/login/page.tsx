import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun Threadify Anda menggunakan nomor HP.",
};

/**
 * Login page — Server Component shell.
 * All form logic lives in LoginForm (Client Component).
 */
export default function LoginPage() {
  return <LoginForm />;
}
