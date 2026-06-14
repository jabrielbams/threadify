"use client";
// c
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Flag,
  Scale,
  LogOut,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface AppealItem {
  id: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  strikes: {
    ai_reason: string | null;
    ai_confidence: number | null;
    content_type: string;
    strike_number: number;
  } | null;
  profiles: {
    username: string;
    display_name: string;
  } | null;
}

interface ReportItem {
  id: string;
  category: string;
  description: string | null;
  status: string;
  created_at: string;
  posts: { content: string | null; author_id: string } | null;
  profiles: { username: string; display_name: string } | null;
}

type Tab = "appeals" | "reports";

const CATEGORY_LABELS: Record<string, string> = {
  hate_speech: "Ujaran Kebencian",
  sara: "SARA",
  nsfw: "Konten Dewasa",
  spam_buzzer: "Spam/Buzzer",
  misinformation: "Misinformasi",
  other: "Lainnya",
};

/**
 * Moderator dashboard — manage appeals and reports.
 */
export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("appeals");
  const [appeals, setAppeals] = useState<AppealItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const isAuth = sessionStorage.getItem("admin_authenticated");
    if (isAuth !== "true") {
      router.push("/admin");
      return;
    }
    fetchData();
  }, [router]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data");
      const data = await res.json();
      setAppeals(data.appeals ?? []);
      setReports(data.reports ?? []);
    } catch (err) {
      console.error("[AdminDashboard] Failed to fetch:", err);
    }
    setLoading(false);
  }

  async function handleAppealAction(
    appealId: string,
    action: "approved" | "rejected",
  ) {
    setActionLoading(appealId);
    try {
      await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "appeal", id: appealId, action }),
      });
      setAppeals((prev) =>
        prev.map((a) => (a.id === appealId ? { ...a, status: action } : a)),
      );
    } catch (err) {
      console.error("[AdminDashboard] Appeal action failed:", err);
    }
    setActionLoading(null);
  }

  async function handleReportAction(
    reportId: string,
    action: "resolved" | "dismissed",
  ) {
    setActionLoading(reportId);
    try {
      await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "report", id: reportId, action }),
      });
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: action } : r)),
      );
    } catch (err) {
      console.error("[AdminDashboard] Report action failed:", err);
    }
    setActionLoading(null);
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_authenticated");
    router.push("/admin");
  }

  // Stats
  const pendingAppeals = appeals.filter((a) => a.status === "pending").length;
  const pendingReports = reports.filter((r) => r.status === "pending").length;

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent' />
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      {/* Top Bar */}
      <header className='sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-surface/80 px-6 backdrop-blur-xl'>
        <div className='flex items-center gap-3'>
          <Shield className='h-5 w-5 text-primary' />
          <h1 className='text-title-md font-bold text-primary'>
            Threadify Moderator
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className='flex items-center gap-2 rounded-full px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container'>
          <LogOut className='h-4 w-4' />
          Keluar
        </button>
      </header>

      <main className='mx-auto max-w-4xl px-4 py-6'>
        {/* Stats */}
        <div className='mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4'>
          <StatCard
            label='Banding Menunggu'
            value={pendingAppeals}
            icon={Scale}
            color='text-primary'
          />
          <StatCard
            label='Laporan Menunggu'
            value={pendingReports}
            icon={Flag}
            color='text-tertiary'
          />
          <StatCard
            label='Total Banding'
            value={appeals.length}
            icon={Scale}
            color='text-on-surface-variant'
          />
          <StatCard
            label='Total Laporan'
            value={reports.length}
            icon={Flag}
            color='text-on-surface-variant'
          />
        </div>

        {/* Tabs */}
        <div className='mb-6 flex gap-1 rounded-xl bg-surface-container-low p-1'>
          <button
            onClick={() => setActiveTab("appeals")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-label-md font-medium transition-all",
              activeTab === "appeals"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface",
            )}>
            Banding ({pendingAppeals})
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-label-md font-medium transition-all",
              activeTab === "reports"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface",
            )}>
            Laporan ({pendingReports})
          </button>
        </div>

        {/* Appeals Tab */}
        {activeTab === "appeals" && (
          <div className='space-y-3'>
            {appeals.length === 0 ? (
              <EmptyState message='Belum ada banding yang masuk.' />
            ) : (
              appeals.map((appeal) => (
                <div
                  key={appeal.id}
                  className='rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 transition-colors hover:bg-surface-container-low/30'>
                  {/* Header */}
                  <div className='mb-3 flex items-start justify-between'>
                    <div>
                      <p className='text-label-md font-bold text-on-surface'>
                        {appeal.profiles?.display_name ?? "User"}
                      </p>
                      <p className='text-label-xs text-on-surface-variant'>
                        @{appeal.profiles?.username ?? "unknown"} ·{" "}
                        {formatRelativeTime(appeal.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={appeal.status} />
                  </div>

                  {/* Strike Info */}
                  {appeal.strikes && (
                    <div className='mb-3 rounded-lg bg-surface-container p-3'>
                      <div className='flex items-center justify-between text-label-xs text-on-surface-variant'>
                        <span>
                          Strike #{appeal.strikes.strike_number} ·{" "}
                          {appeal.strikes.content_type === "post"
                            ? "Postingan"
                            : "Komentar"}
                        </span>
                        <span>
                          AI:{" "}
                          {Math.round(
                            (appeal.strikes.ai_confidence ?? 0) * 100,
                          )}
                          %
                        </span>
                      </div>
                      {appeal.strikes.ai_reason && (
                        <p className='mt-1 text-body-sm italic text-on-surface-variant'>
                          &ldquo;{appeal.strikes.ai_reason}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {/* Appeal Reason */}
                  <div className='mb-3'>
                    <p className='text-label-xs font-medium uppercase tracking-wider text-on-surface-variant'>
                      Alasan Banding
                    </p>
                    <p className='mt-1 text-body-sm text-on-surface'>
                      {appeal.reason}
                    </p>
                  </div>

                  {/* Actions */}
                  {appeal.status === "pending" && (
                    <div className='flex gap-2 border-t border-outline-variant/20 pt-3'>
                      <button
                        onClick={() =>
                          handleAppealAction(appeal.id, "approved")
                        }
                        disabled={actionLoading === appeal.id}
                        className='flex flex-1 items-center justify-center gap-1.5 rounded-full bg-green-600 py-2 text-label-md font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50'>
                        <CheckCircle className='h-4 w-4' />
                        Terima
                      </button>
                      <button
                        onClick={() =>
                          handleAppealAction(appeal.id, "rejected")
                        }
                        disabled={actionLoading === appeal.id}
                        className='flex flex-1 items-center justify-center gap-1.5 rounded-full bg-error py-2 text-label-md font-bold text-on-error transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50'>
                        <XCircle className='h-4 w-4' />
                        Tolak
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className='space-y-3'>
            {reports.length === 0 ? (
              <EmptyState message='Belum ada laporan yang masuk.' />
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className='rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 transition-colors hover:bg-surface-container-low/30'>
                  {/* Header */}
                  <div className='mb-3 flex items-start justify-between'>
                    <div>
                      <p className='text-label-md font-bold text-on-surface'>
                        Dilaporkan oleh @
                        {report.profiles?.username ?? "unknown"}
                      </p>
                      <p className='text-label-xs text-on-surface-variant'>
                        {formatRelativeTime(report.created_at)}
                      </p>
                    </div>
                    <span className='rounded bg-surface-container px-2 py-0.5 text-label-xs font-medium text-on-surface-variant'>
                      {CATEGORY_LABELS[report.category] ?? report.category}
                    </span>
                  </div>

                  {/* Reported Content */}
                  {report.posts?.content && (
                    <div className='mb-3 rounded-lg border-l-4 border-error/30 bg-surface-container p-3'>
                      <p className='text-body-sm italic text-on-surface-variant'>
                        &ldquo;{report.posts.content.slice(0, 150)}
                        {report.posts.content.length > 150 ? "..." : ""}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Reporter's Description */}
                  {report.description && (
                    <div className='mb-3'>
                      <p className='text-label-xs font-medium uppercase tracking-wider text-on-surface-variant'>
                        Catatan Pelapor
                      </p>
                      <p className='mt-1 text-body-sm text-on-surface'>
                        {report.description}
                      </p>
                    </div>
                  )}

                  {/* Status / Actions */}
                  {report.status === "pending" ? (
                    <div className='flex gap-2 border-t border-outline-variant/20 pt-3'>
                      <button
                        onClick={() =>
                          handleReportAction(report.id, "resolved")
                        }
                        disabled={actionLoading === report.id}
                        className='flex flex-1 items-center justify-center gap-1.5 rounded-full bg-green-600 py-2 text-label-md font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50'>
                        <CheckCircle className='h-4 w-4' />
                        Tindak
                      </button>
                      <button
                        onClick={() =>
                          handleReportAction(report.id, "dismissed")
                        }
                        disabled={actionLoading === report.id}
                        className='flex flex-1 items-center justify-center gap-1.5 rounded-full border border-outline-variant py-2 text-label-md font-medium text-on-surface-variant transition-all hover:bg-surface-container active:scale-[0.98] disabled:opacity-50'>
                        Abaikan
                      </button>
                    </div>
                  ) : (
                    <div className='border-t border-outline-variant/20 pt-3'>
                      <StatusBadge status={report.status} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// --- Sub-components ---

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className='rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4'>
      <div className='flex items-center gap-2'>
        <Icon className={cn("h-4 w-4", color)} />
        <span className='text-label-xs uppercase tracking-wider text-on-surface-variant'>
          {label}
        </span>
      </div>
      <p className={cn("mt-2 text-headline-lg font-bold", color)}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pending: { label: "Menunggu", cls: "bg-tertiary-fixed/30 text-tertiary" },
    approved: { label: "Diterima", cls: "bg-green-100 text-green-700" },
    rejected: { label: "Ditolak", cls: "bg-error-container text-error" },
    resolved: { label: "Ditindak", cls: "bg-green-100 text-green-700" },
    dismissed: {
      label: "Diabaikan",
      cls: "bg-surface-container text-on-surface-variant",
    },
    reviewed: { label: "Ditinjau", cls: "bg-primary-fixed text-primary" },
  };
  const c = config[status] ?? {
    label: status,
    cls: "bg-surface-container text-on-surface-variant",
  };

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-label-xs font-medium",
        c.cls,
      )}>
      {c.label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className='flex flex-col items-center gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-12 text-center'>
      <Clock className='h-10 w-10 text-on-surface-variant/30' />
      <p className='text-body-sm text-on-surface-variant'>{message}</p>
    </div>
  );
}
