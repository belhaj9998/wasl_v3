import { Skeleton } from "@/components/ui/skeleton";

/**
 * Storefront category page loading state — Suspense fallback.
 * Displays a skeleton matching the category products grid layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function CategoryLoading() {
  return (
    <div className="space-y-6">
      {/* Category header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
