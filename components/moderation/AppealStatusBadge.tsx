import { cn } from "@/lib/utils/cn";
import type { AppealStatusEnum } from "@/types/database";

interface AppealStatusBadgeProps {
  status: AppealStatusEnum;
  className?: string;
}

export function AppealStatusBadge({ status, className }: AppealStatusBadgeProps) {
  const statusConfig = {
    pending: { label: "Menunggu", styles: "bg-amber-100 text-brand-warning" },
    approved: { label: "Disetujui", styles: "bg-green-100 text-brand-safe" },
    rejected: { label: "Ditolak", styles: "bg-red-100 text-brand-danger" },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        config.styles,
        className
      )}
    >
      {config.label}
    </span>
  );
}
