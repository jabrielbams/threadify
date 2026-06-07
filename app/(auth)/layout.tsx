import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    template: "%s | Threadify",
    default: "Threadify",
  },
};

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Auth route group layout.
 * Wraps /login, /register, and /verify-otp in a centred card shell.
 * No navbar — auth pages are intentionally minimal.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 py-12">
      <header className="mb-8 text-center">
        <p className="text-3xl font-bold tracking-tight text-brand-primary">
          Threadify
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Platform media sosial yang aman untuk Indonesia
        </p>
      </header>
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
