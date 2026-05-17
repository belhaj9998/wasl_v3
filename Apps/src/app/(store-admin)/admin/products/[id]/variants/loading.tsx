import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Product variants page loading state — Suspense fallback.
 * Displays a table skeleton matching the variants list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function ProductVariantsLoading() {
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-md bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
      </div>

      <TableSkeleton
        rows={5}
        columns={5}
        showHeader={false}
        showFilters={false}
      />
    </div>
  );
}
