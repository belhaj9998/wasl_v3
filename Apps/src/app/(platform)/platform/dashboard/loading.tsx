import { Skeleton } from "@/components/ui/skeleton";

/**
 * Platform Dashboard loading state — Suspense fallback.
 * Displays skeleton cards and chart placeholders matching the platform dashboard layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function PlatformDashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-64 w-full rounded" />
      </div>
    </div>
  );
}
