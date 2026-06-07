"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

const ADMIN_EMAIL = "admin@mail.com";
const ADMIN_PASSWORD = "admin123";

/**
 * Admin login page — simple email/password for moderator access.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simple credential check (no Supabase auth for admin)
    setTimeout(() => {
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        sessionStorage.setItem("admin_authenticated", "true");
        router.push("/admin/dashboard");
      } else {
        setError("Email atau password salah.");
      }
      setIsLoading(false);
    }, 500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-headline-lg font-bold text-on-surface">
            Moderator
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Threadify Content Moderation Dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-error-container/30 px-4 py-3 text-body-sm text-error">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="text-label-md font-medium text-on-surface-variant">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mail.com"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="text-label-md font-medium text-on-surface-variant">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-body-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-primary py-3 text-label-md font-bold text-on-primary transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? "Memverifikasi..." : "Masuk sebagai Moderator"}
          </button>
        </form>

        <p className="mt-6 text-center text-label-xs text-on-surface-variant">
          Akses terbatas untuk tim moderasi Threadify.
        </p>
      </div>
    </div>
  );
}
