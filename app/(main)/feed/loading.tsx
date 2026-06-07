import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Feed loading skeleton — matches the PostCard layout with avatar + content blocks.
 */
export default function FeedLoading() {
  return (
    <main className="min-h-screen flex-1 border-x border-outline-variant bg-surface-bright">
      {/* Composer skeleton */}
      <div className="border-b border-outline-variant p-sm md:p-md">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="flex items-center justify-between border-t border-surface-container-high pt-4">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Post skeletons */}
      <div className="divide-y divide-outline-variant">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-sm md:p-md">
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
          </div>
        ))}
      </div>
    </main>
  );
}
