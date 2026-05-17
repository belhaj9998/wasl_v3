import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Storefront account orders page loading state — Suspense fallback.
 * Displays a table skeleton matching the customer orders list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function AccountOrdersLoading() {
  return <TableSkeleton rows={5} columns={4} showHeader showFilters={false} />;
}
