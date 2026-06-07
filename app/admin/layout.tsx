import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderator Dashboard | Threadify",
  description: "Dashboard moderasi untuk mengelola banding dan laporan.",
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Admin layout — minimal, no user nav. Just the dashboard shell.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      {children}
    </div>
  );
}
