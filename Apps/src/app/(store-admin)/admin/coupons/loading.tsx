import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Coupons page loading state — Suspense fallback.
 * Displays a table skeleton matching the coupons list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function CouponsLoading() {
  return <TableSkeleton rows={10} columns={7} filterCount={1} showHeader />;
}
