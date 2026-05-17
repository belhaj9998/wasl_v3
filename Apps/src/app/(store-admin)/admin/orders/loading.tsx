import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Orders page loading state — Suspense fallback.
 * Displays a table skeleton matching the orders list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function OrdersLoading() {
  return <TableSkeleton rows={10} columns={6} filterCount={4} showHeader />;
}
