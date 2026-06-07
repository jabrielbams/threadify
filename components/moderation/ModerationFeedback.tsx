"use client";

import { CheckCircle, Clock, Shield, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type FeedbackType = "scanning" | "safe" | "pending" | "blocked" | "error";

interface ModerationFeedbackProps {
  type: FeedbackType;
  message?: string;
  className?: string;
}

const FEEDBACK_CONFIG: Record<FeedbackType, {
  icon: React.ElementType;
  iconClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  defaultMessage: string;
}> = {
  scanning: {
    icon: Shield,
    iconClass: "text-primary animate-pulse",
    bgClass: "bg-primary-fixed/30",
    borderClass: "border-primary/20",
    textClass: "text-on-surface",
    defaultMessage: "AI sedang memeriksa konten Anda...",
  },
  safe: {
    icon: CheckCircle,
    iconClass: "text-green-600",
    bgClass: "bg-green-50",
    borderClass: "border-green-200",
    textClass: "text-green-800",
    defaultMessage: "Postingan berhasil dipublikasikan!",
  },
  pending: {
    icon: Clock,
    iconClass: "text-tertiary",
    bgClass: "bg-tertiary-fixed/20",
    borderClass: "border-tertiary/20",
    textClass: "text-on-surface",
    defaultMessage: "Konten sedang ditinjau oleh tim kami. Anda akan diberi tahu hasilnya.",
  },
  blocked: {
    icon: AlertTriangle,
    iconClass: "text-error",
    bgClass: "bg-error-container/30",
    borderClass: "border-error/20",
    textClass: "text-on-surface",
    defaultMessage: "Konten tidak dapat dipublikasikan karena melanggar panduan komunitas.",
  },
  error: {
    icon: XCircle,
    iconClass: "text-error",
    bgClass: "bg-error-container/20",
    borderClass: "border-error/10",
    textClass: "text-on-surface",
    defaultMessage: "Terjadi kesalahan. Silakan coba lagi.",
  },
};

/**
 * Rich inline feedback component for AI moderation status.
 * Shows contextual icon, background color, and message for each moderation outcome.
 */
export function ModerationFeedback({ type, message, className }: ModerationFeedbackProps) {
  const config = FEEDBACK_CONFIG[type];
  const Icon = config.icon;
  const displayMessage = message ?? config.defaultMessage;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-all",
        config.bgClass,
        config.borderClass,
        className,
      )}
      role={type === "error" || type === "blocked" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.iconClass)} />
      <p className={cn("text-body-sm leading-relaxed", config.textClass)}>
        {displayMessage}
      </p>
    </div>
  );
}
