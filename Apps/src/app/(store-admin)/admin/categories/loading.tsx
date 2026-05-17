import { Skeleton } from "@/components/ui/skeleton";

/**
 * Categories page loading state — Suspense fallback.
 * Displays a tree-like skeleton matching the categories tree layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function CategoriesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Tree skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md border px-3 py-2"
            style={{ marginInlineStart: `${(i % 3) * 24}px` }}
          >
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
