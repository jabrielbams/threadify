import Link from "next/link";
import { Sparkles } from "lucide-react";

interface StrikeNoticeCardProps {
  strikeId: string;
  reason?: string;
}

/**
 * Inline notice card displayed in the feed when a user's post was flagged.
 * Shows the AI moderation result with an appeal link.
 * Follows the error-container styling from DESIGN.md.
 */
export function StrikeNoticeCard({ strikeId, reason }: StrikeNoticeCardProps) {
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-error/20 bg-error-container/30 p-4">
      <div className="flex items-center gap-2 text-error">
        <Sparkles className="h-4 w-4" />
        <span className="text-label-md font-bold">AI Strike Terdeteksi</span>
      </div>
      <p className="text-body-sm text-on-surface opacity-60">
        {reason ??
          "Konten ini telah ditandai oleh sistem otomatis kami untuk ditinjau."}
      </p>
      <Link
        href={`/appeals/${strikeId}`}
        className="self-start text-label-md font-bold text-primary underline-offset-4 decoration-2 hover:underline"
      >
        Ajukan Banding
      </Link>
    </div>
  );
}
