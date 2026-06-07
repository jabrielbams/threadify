import { cn } from "@/lib/utils/cn";

interface SkeletonProps {
  className?: string;
}

/**
 * Base animated skeleton block. Use for loading placeholders.
 * Uses surface-container color for the pulse animation.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-surface-container", className)}
      aria-hidden="true"
    />
  );
}

/**
 * Full post-card skeleton matching the new feed PostCard layout.
 */
export function PostCardSkeleton() {
  return (
    <article
      className="p-sm md:p-md"
      aria-busy="true"
      aria-label="Memuat postingan"
    >
      <div className="flex gap-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-8 pt-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-6" />
          </div>
        </div>
      </div>
    </article>
  );
}
