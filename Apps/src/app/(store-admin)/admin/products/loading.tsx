import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Products page loading state — Suspense fallback.
 * Displays a table skeleton matching the products list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function ProductsLoading() {
  return <TableSkeleton rows={10} columns={6} filterCount={3} showHeader />;
}
