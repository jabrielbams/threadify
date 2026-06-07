import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Daftar",
  description:
    "Buat akun Threadify baru dengan nomor HP Anda dan bergabunglah dengan komunitas media sosial yang aman.",
};

/**
 * Registration page — Server Component shell.
 * All form logic lives in RegisterForm (Client Component).
 */
export default function RegisterPage() {
  return <RegisterForm />;
}
