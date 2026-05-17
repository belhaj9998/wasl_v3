import { Skeleton } from "@/components/ui/skeleton";

/**
 * Storefront home page loading state — Suspense fallback.
 * Displays a skeleton matching the storefront home layout with product grid.
 *
 * Requirements: 1.3, 2.3
 */
export default function StorefrontHomeLoading() {
  return (
    <div className="space-y-8">
      {/* Hero / Banner */}
      <Skeleton className="h-48 w-full rounded-lg" />

      {/* Categories */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-24 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
