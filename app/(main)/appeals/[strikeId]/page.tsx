"use client";

import { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { AppealForm } from "@/components/moderation/AppealForm";
import { createBrowserClient } from "@/lib/supabase/client";

interface AppealPageProps {
  params: {
    strikeId: string;
  };
}

interface StrikeData {
  strike_number: number;
  ai_reason: string | null;
  ai_confidence: number | null;
  content_type: "post" | "comment";
  content_id: string;
  appeals: { id: string }[] | null;
}

export default function AppealPage({ params }: AppealPageProps) {
  const router = useRouter();
  const [strike, setStrike] = useState<StrikeData | null>(null);
  const [blockedContent, setBlockedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStrike() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("strikes")
        .select("strike_number, ai_reason, ai_confidence, content_type, content_id, appeals(id)")
        .eq("id", params.strikeId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        notFound();
        return;
      }

      const strikeData = data as unknown as StrikeData;

      if (strikeData.appeals && strikeData.appeals.length > 0) {
        router.push("/strikes");
        return;
      }

      setStrike(strikeData);

      // Fetch the blocked content
      if (strikeData.content_type === "post") {
        const { data: postData } = await supabase
          .from("posts")
          .select("content")
          .eq("id", strikeData.content_id)
          .single();
        if (postData) setBlockedContent(postData.content);
      } else {
        const { data: commentData } = await supabase
          .from("comments")
          .select("content")
          .eq("id", strikeData.content_id)
          .single();
        if (commentData) setBlockedContent(commentData.content);
      }

      setLoading(false);
    }

    loadStrike();
  }, [params.strikeId, router]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-8 text-center text-sm text-gray-500">
        Memuat data...
      </main>
    );
  }

  if (!strike) return null;

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <Link
        href="/strikes"
        className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Riwayat Strike
      </Link>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Ajukan Banding</h1>
        <p className="mt-2 text-sm text-gray-500">
          Gunakan formulir ini jika Anda yakin konten Anda tidak melanggar panduan komunitas kami. 
          Tim moderator kami akan meninjau kembali keputusan ini.
        </p>

        <div className="mt-6 border-t border-gray-100 pt-6">
          <div className="mb-6 rounded-xl bg-surface-card p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-brand-warning" />
              <p className="text-sm font-bold text-gray-900">
                Peringatan ke-{strike.strike_number}
              </p>
            </div>
            
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Konten yang Diblokir ({strike.content_type === "post" ? "Postingan" : "Komentar"})
                </p>
                <p className="mt-1 text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-100">
                  {blockedContent || "(Konten gambar atau tidak tersedia)"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Alasan AI
                  </p>
                  <p className="mt-1 text-sm font-medium text-brand-danger">
                    {strike.ai_reason}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Kepercayaan AI
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-700">
                    {strike.ai_confidence ? Math.round(strike.ai_confidence * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          <AppealForm strikeId={params.strikeId} />
        </div>
      </div>
    </main>
  );
}
