import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src: string | null;
  displayName: string;
  size?: AvatarSize;
  className?: string;
}

const sizeMap: Record<AvatarSize, { px: number; cls: string; text: string }> = {
  sm: { px: 32, cls: "h-8 w-8", text: "text-xs" },
  md: { px: 40, cls: "h-10 w-10", text: "text-sm" },
  lg: { px: 128, cls: "h-32 w-32", text: "text-3xl" },
  xl: { px: 160, cls: "h-40 w-40", text: "text-4xl" },
};

/**
 * Circular avatar that shows a `next/image` photo when available,
 * or a two-letter initials badge derived from `displayName`.
 */
export function Avatar({
  src,
  displayName,
  size = "md",
  className,
}: AvatarProps) {
  const { px, cls, text } = sizeMap[size];
  const initials = displayName.trim().slice(0, 2).toUpperCase();

  if (src) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full bg-surface-card",
          cls,
          className,
        )}
      >
        <Image
          src={src}
          alt={displayName}
          width={px}
          height={px}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        "bg-brand-primary font-semibold text-white",
        cls,
        text,
        className,
      )}
      aria-label={displayName}
    >
      {initials}
    </div>
  );
}
