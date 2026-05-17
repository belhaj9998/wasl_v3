import { Skeleton } from "@/components/ui/skeleton";

/**
 * Storefront product detail page loading state — Suspense fallback.
 * Displays a skeleton matching the product detail layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function ProductDetailLoading() {
  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Product image */}
        <Skeleton className="aspect-square w-full rounded-lg" />

        {/* Product info */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />

          {/* Variants */}
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-20 rounded-md" />
              <Skeleton className="h-10 w-20 rounded-md" />
              <Skeleton className="h-10 w-20 rounded-md" />
            </div>
          </div>

          {/* Add to cart */}
          <div className="flex gap-4 pt-4">
            <Skeleton className="h-10 w-24 rounded-md" />
            <Skeleton className="h-10 flex-1 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
