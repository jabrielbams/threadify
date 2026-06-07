"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Pencil, Trash2, X, Check } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ReportCategoryEnum, ReportStatusEnum } from "@/types/database";

interface ReportWithPost {
  id: string;
  category: ReportCategoryEnum;
  description: string | null;
  status: ReportStatusEnum;
  created_at: string;
  posts: { content: string | null } | null;
}

const CATEGORY_LABELS: Record<ReportCategoryEnum, string> = {
  hate_speech: "Ujaran Kebencian",
  sara: "SARA",
  nsfw: "Konten Tidak Pantas",
  spam_buzzer: "Spam",
  misinformation: "Misinformasi",
  other: "Lainnya",
};

const CATEGORY_OPTIONS: { value: ReportCategoryEnum; label: string }[] = [
  { value: "hate_speech", label: "Ujaran Kebencian" },
  { value: "sara", label: "SARA" },
  { value: "nsfw", label: "Konten Tidak Pantas" },
  { value: "spam_buzzer", label: "Spam / Buzzer" },
  { value: "misinformation", label: "Misinformasi" },
  { value: "other", label: "Lainnya" },
];

const STATUS_CONFIG: Record<ReportStatusEnum, { label: string; className: string }> = {
  pending: { label: "Sedang Ditinjau", className: "bg-primary-fixed text-on-primary-fixed" },
  reviewed: { label: "Ditinjau", className: "bg-secondary-fixed text-on-secondary-fixed" },
  resolved: { label: "Diselesaikan", className: "bg-secondary-container text-on-primary-container" },
  dismissed: { label: "Ditolak", className: "bg-surface-variant text-on-surface-variant" },
};

/**
 * Reports page — user's submitted reports with edit/delete for pending reports.
 */
export default function ReportsPage() {
  const [reports, setReports] = useState<ReportWithPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<ReportCategoryEnum>("other");
  const [editDescription, setEditDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchReports() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("reports")
        .select("id, category, description, status, created_at, posts(content)")
        .eq("reporter_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[ReportsPage] Failed to fetch reports:", error.message);
      } else {
        setReports(data as unknown as ReportWithPost[]);
      }
      setLoading(false);
    }

    fetchReports();
  }, [router]);

  function startEdit(report: ReportWithPost) {
    setEditingId(report.id);
    setEditCategory(report.category);
    setEditDescription(report.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditCategory("other");
    setEditDescription("");
  }

  async function saveEdit(reportId: string): Promise<void> {
    setIsSaving(true);
    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("reports")
      .update({
        category: editCategory,
        description: editDescription.trim() || null,
      })
      .eq("id", reportId);

    if (error) {
      console.error("[Reports] Edit failed:", error.message);
      alert("Gagal menyimpan perubahan.");
    } else {
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, category: editCategory, description: editDescription.trim() || null }
            : r,
        ),
      );
      cancelEdit();
    }
    setIsSaving(false);
  }

  async function handleDelete(reportId: string): Promise<void> {
    if (!window.confirm("Hapus laporan ini? Tindakan tidak dapat dibatalkan.")) return;

    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId);

    if (error) {
      console.error("[Reports] Delete failed:", error.message);
      alert("Gagal menghapus laporan.");
    } else {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    }
  }

  // Stats
  const totalSubmitted = reports.length;
  const underReview = reports.filter((r) => r.status === "pending" || r.status === "reviewed").length;
  const resolved = reports.filter((r) => r.status === "resolved" || r.status === "dismissed").length;

  // Is report still editable (not resolved/dismissed)
  function isEditable(status: ReportStatusEnum): boolean {
    return status === "pending";
  }

  if (loading) {
    return (
      <main className="min-h-screen flex-1 border-x border-outline-variant/20 bg-surface">
        <div className="mx-auto max-w-[600px] px-margin-mobile py-lg md:px-xs">
          <div className="flex animate-pulse flex-col gap-md">
            <div className="h-8 w-48 rounded-lg bg-surface-container" />
            <div className="grid grid-cols-3 gap-md">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-surface-container" />
              ))}
            </div>
            <div className="h-64 rounded-xl bg-surface-container" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex-1 border-x border-outline-variant/20 bg-surface">
      <div className="mx-auto max-w-[600px] px-margin-mobile py-lg md:px-xs">
        {/* Header */}
        <div className="mb-xl">
          <h1 className="text-headline-lg font-semibold text-on-background">
            Aktivitas Laporan
          </h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Lacak dan kelola laporan yang telah Anda kirim.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-xl grid grid-cols-3 gap-md">
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <span className="mb-xs block text-label-xs uppercase tracking-wider text-on-surface-variant">
              Dikirim
            </span>
            <span className="text-title-md font-semibold text-on-background">{totalSubmitted}</span>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <span className="mb-xs block text-label-xs uppercase tracking-wider text-on-surface-variant">
              Ditinjau
            </span>
            <span className="text-title-md font-semibold text-primary">{underReview}</span>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <span className="mb-xs block text-label-xs uppercase tracking-wider text-on-surface-variant">
              Selesai
            </span>
            <span className="text-title-md font-semibold text-secondary">{resolved}</span>
          </div>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="flex flex-col items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest px-xl py-xl text-center">
            <Flag className="h-12 w-12 text-on-surface-variant opacity-20" />
            <div>
              <p className="text-label-md font-medium text-on-surface">Belum ada laporan</p>
              <p className="mt-xs text-body-sm text-on-surface-variant">
                Anda belum pernah melaporkan konten apapun.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            {reports.map((report, index) => {
              const postExcerpt = report.posts?.content
                ? report.posts.content.length > 80
                  ? report.posts.content.slice(0, 80) + "..."
                  : report.posts.content
                : "(Konten gambar)";

              const statusConfig = STATUS_CONFIG[report.status];
              const editable = isEditable(report.status);
              const isEditing = editingId === report.id;
              const isResolved = report.status === "resolved";
              const isDismissed = report.status === "dismissed";

              return (
                <article
                  key={report.id}
                  className={cn(
                    "p-md transition-colors",
                    index < reports.length - 1 && "border-b border-outline-variant",
                    !isEditing && "hover:bg-surface-container-low/50",
                  )}
                >
                  {/* Status + Actions */}
                  <div className="mb-sm flex items-start justify-between">
                    <div className="flex items-center gap-xs">
                      <span
                        className={cn(
                          "rounded px-xs py-[2px] text-label-xs font-medium",
                          statusConfig.className,
                        )}
                      >
                        {statusConfig.label}
                      </span>
                      <span className="text-label-xs text-on-surface-variant">
                        • {formatRelativeTime(report.created_at)}
                      </span>
                    </div>

                    {/* Edit/Delete buttons — only for pending reports */}
                    {editable && !isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(report)}
                          className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                          aria-label="Edit laporan"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(report.id)}
                          className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-error-container/20 hover:text-error"
                          aria-label="Hapus laporan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  {isEditing ? (
                    /* Edit Mode */
                    <div className="space-y-3">
                      {/* Category */}
                      <div className="space-y-1">
                        <label className="text-label-xs font-medium text-on-surface-variant">
                          Kategori
                        </label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as ReportCategoryEnum)}
                          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:ring-1 focus:ring-primary"
                          disabled={isSaving}
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <label className="text-label-xs font-medium text-on-surface-variant">
                          Deskripsi
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          maxLength={200}
                          rows={3}
                          placeholder="Detail tambahan..."
                          className="w-full resize-none rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm focus:border-primary focus:ring-1 focus:ring-primary"
                          disabled={isSaving}
                        />
                        <div className="text-right text-label-xs text-on-surface-variant">
                          {editDescription.length}/200
                        </div>
                      </div>

                      {/* Edit actions */}
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-label-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
                        >
                          <X className="h-3.5 w-3.5" />
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(report.id)}
                          disabled={isSaving}
                          className={cn(
                            "flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-label-xs font-bold text-on-primary transition-all hover:brightness-110 active:scale-95",
                            isSaving && "opacity-60",
                          )}
                        >
                          {isSaving ? (
                            <span className="flex gap-0.5">
                              <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
                              <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
                              <span className="h-1 w-1 animate-bounce rounded-full bg-current" />
                            </span>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Simpan
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      <div className="mb-md">
                        <p className="mb-xs text-label-md text-on-surface-variant">
                          Alasan:{" "}
                          <span className="font-semibold text-on-surface">
                            {CATEGORY_LABELS[report.category]}
                          </span>
                        </p>
                        <div className="rounded-lg border-l-4 border-primary/30 bg-surface-container px-sm py-xs italic text-body-sm text-on-surface-variant">
                          &ldquo;{postExcerpt}&rdquo;
                        </div>
                        {report.description && (
                          <p className="mt-2 text-body-sm text-on-surface-variant">
                            {report.description}
                          </p>
                        )}
                      </div>

                      {/* Footer info */}
                      <div className="text-label-xs text-on-surface-variant">
                        {isResolved && <span className="italic">Konten telah ditindak.</span>}
                        {isDismissed && <span>Tidak ditemukan pelanggaran.</span>}
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Mobile spacer */}
        <div className="h-20 lg:hidden" />
      </div>
    </main>
  );
}
