"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Shield, CheckCircle, ArrowRight, Clock, RefreshCw } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { STRIKE_THRESHOLDS } from "@/constants/moderation";

interface StrikeRow {
  id: string;
  content_type: "post" | "comment";
  content_id: string;
  layer_triggered: number;
  ai_verdict: string;
  ai_confidence: number | null;
  ai_reason: string | null;
  strike_number: number;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

interface AppealRow {
  id: string;
  strike_id: string;
  status: "pending" | "approved" | "rejected";
}

/**
 * Strikes page — shows the user's strike history with appeal status.
 * Displays escalation level, resolution status, and appeal CTAs.
 */
export default function StrikesPage() {
  const [strikes, setStrikes] = useState<StrikeRow[]>([]);
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Fetch strikes
      const { data: strikesData, error: strikesErr } = await supabase
        .from("strikes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (strikesErr) {
        console.error("[StrikesPage] Failed to fetch strikes:", strikesErr.message);
      } else {
        setStrikes(strikesData as StrikeRow[]);
      }

      // Fetch appeals for these strikes
      const { data: appealsData, error: appealsErr } = await supabase
        .from("appeals")
        .select("id, strike_id, status")
        .eq("user_id", user.id);

      if (!appealsErr && appealsData) {
        setAppeals(appealsData as AppealRow[]);
      }

      setLoading(false);
    }

    fetchData();
  }, [router]);

  function getAppealForStrike(strikeId: string): AppealRow | undefined {
    return appeals.find((a) => a.strike_id === strikeId);
  }

  // Stats
  const totalStrikes = strikes.length;
  const activeStrikes = strikes.filter((s) => !s.is_resolved).length;
  const resolvedStrikes = strikes.filter((s) => s.is_resolved).length;

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
            Riwayat Peringatan
          </h1>
          <p className="mt-xs text-body-lg text-on-surface-variant">
            Riwayat pelanggaran yang terdeteksi oleh sistem moderasi AI Threadify.
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="mb-xl grid grid-cols-3 gap-md">
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <span className="mb-xs block text-label-xs uppercase tracking-wider text-on-surface-variant">
              Total
            </span>
            <span className="text-title-md font-semibold text-on-background">
              {totalStrikes}
            </span>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <span className="mb-xs block text-label-xs uppercase tracking-wider text-on-surface-variant">
              Aktif
            </span>
            <span className="text-title-md font-semibold text-error">
              {activeStrikes}
            </span>
          </div>
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-md">
            <span className="mb-xs block text-label-xs uppercase tracking-wider text-on-surface-variant">
              Selesai
            </span>
            <span className="text-title-md font-semibold text-secondary">
              {resolvedStrikes}
            </span>
          </div>
        </div>

        {/* Escalation Info (if active strikes) */}
        {activeStrikes > 0 && (
          <div className="mb-xl rounded-xl border border-error/20 bg-error-container/20 p-md">
            <div className="flex items-center gap-sm">
              <ShieldAlert className="h-5 w-5 text-error" />
              <p className="text-label-md font-bold text-error">
                {getEscalationLabel(activeStrikes)}
              </p>
            </div>
            <p className="mt-xs text-body-sm text-on-surface-variant">
              {getEscalationDescription(activeStrikes)}
            </p>
          </div>
        )}

        {/* Strikes List */}
        {strikes.length === 0 ? (
          <div className="flex flex-col items-center gap-md rounded-xl border border-outline-variant bg-surface-container-lowest px-xl py-xl text-center">
            <Shield className="h-12 w-12 text-on-surface-variant opacity-20" />
            <div>
              <p className="text-label-md font-medium text-on-surface">
                Tidak ada peringatan
              </p>
              <p className="mt-xs text-body-sm text-on-surface-variant">
                Akun Anda bersih. Terus jaga perilaku baik di komunitas!
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            {strikes.map((strike, index) => {
              const appeal = getAppealForStrike(strike.id);
              return (
                <article
                  key={strike.id}
                  className={cn(
                    "p-md transition-colors hover:bg-surface-container-low/50",
                    index < strikes.length - 1 && "border-b border-outline-variant",
                  )}
                >
                  {/* Header row */}
                  <div className="mb-sm flex items-start justify-between">
                    <div className="flex items-center gap-xs">
                      <StrikeStatusBadge
                        isResolved={strike.is_resolved}
                        appeal={appeal}
                      />
                      <span className="text-label-xs text-on-surface-variant">
                        • {formatRelativeTime(strike.created_at)}
                      </span>
                    </div>
                    <span className="rounded bg-surface-container px-xs py-[2px] text-label-xs text-on-surface-variant">
                      #{strike.strike_number}
                    </span>
                  </div>

                  {/* Reason */}
                  <div className="mb-md">
                    <p className="mb-xs text-label-md text-on-surface-variant">
                      Tipe:{" "}
                      <span className="font-semibold text-on-surface">
                        {strike.content_type === "post" ? "Postingan" : "Komentar"}
                      </span>
                      {" • Layer "}
                      <span className="font-semibold text-on-surface">
                        {strike.layer_triggered}
                      </span>
                    </p>
                    {strike.ai_reason && (
                      <div className="rounded-lg border-l-4 border-error/40 bg-surface-container px-sm py-xs text-body-sm italic text-on-surface-variant">
                        &ldquo;{strike.ai_reason}&rdquo;
                      </div>
                    )}
                    {strike.ai_confidence !== null && (
                      <p className="mt-xs text-label-xs text-on-surface-variant">
                        Keyakinan AI: {Math.round(strike.ai_confidence * 100)}%
                      </p>
                    )}
                  </div>

                  {/* Footer / Actions */}
                  <div className="flex items-center justify-between">
                    {strike.is_resolved ? (
                      <ResolvedActions
                        strike={strike}
                        appeal={appeal}
                      />
                    ) : (
                      <AppealAction strikeId={strike.id} appeal={appeal} />
                    )}
                  </div>
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

// --- Sub-components ---

function StrikeStatusBadge({
  isResolved,
  appeal,
}: {
  isResolved: boolean;
  appeal: AppealRow | undefined;
}) {
  if (isResolved) {
    return (
      <span className="rounded bg-secondary-container px-xs py-[2px] text-label-xs font-medium text-on-primary-container">
        Diselesaikan
      </span>
    );
  }

  if (appeal) {
    const config = {
      pending: { label: "Banding Ditinjau", cls: "bg-primary-fixed text-on-primary-fixed" },
      approved: { label: "Banding Diterima", cls: "bg-secondary-container text-on-primary-container" },
      rejected: { label: "Banding Ditolak", cls: "bg-error-container text-on-error-container" },
    };
    const c = config[appeal.status];
    return (
      <span className={cn("rounded px-xs py-[2px] text-label-xs font-medium", c.cls)}>
        {c.label}
      </span>
    );
  }

  return (
    <span className="rounded bg-error-container px-xs py-[2px] text-label-xs font-medium text-on-error-container">
      Aktif
    </span>
  );
}

function AppealAction({
  strikeId,
  appeal,
}: {
  strikeId: string;
  appeal: AppealRow | undefined;
}) {
  if (!appeal) {
    return (
      <Link
        href={`/appeals/${strikeId}`}
        className="flex items-center gap-xs text-label-md font-medium text-primary underline-offset-4 decoration-2 hover:underline"
      >
        Ajukan Banding
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  if (appeal.status === "pending") {
    return (
      <span className="flex items-center gap-xs text-label-xs text-on-surface-variant">
        <Clock className="h-3.5 w-3.5" />
        Banding sedang ditinjau
      </span>
    );
  }

  if (appeal.status === "rejected") {
    return (
      <span className="text-label-xs text-error">
        Banding ditolak. Peringatan tetap berlaku.
      </span>
    );
  }

  return (
    <span className="flex items-center gap-xs text-label-xs text-secondary">
      <CheckCircle className="h-3.5 w-3.5" />
      Banding diterima
    </span>
  );
}

// --- Helpers ---

function ResolvedActions({
  strike,
  appeal,
}: {
  strike: StrikeRow;
  appeal: AppealRow | undefined;
}) {
  const [isReposting, setIsReposting] = useState(false);
  const [isReposted, setIsReposted] = useState(false);

  async function handleRepost(): Promise<void> {
    if (strike.content_type !== "post") return;
    setIsReposting(true);

    try {
      const response = await fetch("/api/posts/repost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: strike.content_id }),
      });

      const data = await response.json();

      if (data.already_posted || data.success) {
        setIsReposted(true);
      } else {
        console.error("[Strikes] Repost failed:", data.error);
      }
    } catch (err) {
      console.error("[Strikes] Repost error:", err);
    } finally {
      setIsReposting(false);
    }
  }

  const isApproved = appeal?.status === "approved";
  const canRepost = isApproved && strike.content_type === "post" && !isReposted;

  return (
    <div className="flex w-full items-center justify-between">
      <span className="flex items-center gap-xs text-label-xs text-secondary">
        <CheckCircle className="h-3.5 w-3.5" />
        Diselesaikan {strike.resolved_at ? formatRelativeTime(strike.resolved_at) : ""}
      </span>

      {canRepost && (
        <button
          type="button"
          onClick={handleRepost}
          disabled={isReposting}
          className={cn(
            "flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-label-xs font-bold text-on-primary transition-all hover:brightness-110 active:scale-95",
            isReposting && "opacity-60",
          )}
        >
          {isReposting ? (
            <span className="flex gap-0.5">
              <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
              <span className="h-1 w-1 animate-bounce rounded-full bg-current" />
            </span>
          ) : (
            <>
              <RefreshCw className="h-3 w-3" />
              Post Ulang
            </>
          )}
        </button>
      )}

      {isReposted && (
        <span className="flex items-center gap-1 text-label-xs text-secondary">
          <CheckCircle className="h-3 w-3" />
          Sudah diposting
        </span>
      )}
    </div>
  );
}

function getEscalationLabel(activeCount: number): string {
  if (activeCount >= STRIKE_THRESHOLDS.PERMANENT_BAN) return "Ban Permanen";
  if (activeCount >= STRIKE_THRESHOLDS.ACCOUNT_SUSPENSION_72H) return "Suspensi 72 Jam Aktif";
  if (activeCount >= STRIKE_THRESHOLDS.POST_RESTRICTION_24H) return "Pembatasan Posting 24 Jam";
  return `${activeCount} Peringatan Aktif`;
}

function getEscalationDescription(activeCount: number): string {
  if (activeCount >= STRIKE_THRESHOLDS.PERMANENT_BAN)
    return "Akun Anda telah dibanned permanen. Hubungi support untuk bantuan.";
  if (activeCount >= STRIKE_THRESHOLDS.ACCOUNT_SUSPENSION_72H)
    return "Akun Anda ditangguhkan. Anda tidak dapat memposting atau berkomentar selama 72 jam.";
  if (activeCount >= STRIKE_THRESHOLDS.POST_RESTRICTION_24H)
    return "Kemampuan posting Anda dibatasi selama 24 jam. Berhati-hatilah dengan konten yang dibagikan.";
  return "Perhatikan panduan komunitas untuk menghindari peringatan lebih lanjut.";
}
