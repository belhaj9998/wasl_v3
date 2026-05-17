import { Skeleton } from "@/components/ui/skeleton";

/**
 * Product media page loading state — Suspense fallback.
 * Displays a grid skeleton matching the media gallery layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function ProductMediaLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Upload area */}
      <Skeleton className="h-32 w-full rounded-lg border-2 border-dashed" />

      {/* Image grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}
