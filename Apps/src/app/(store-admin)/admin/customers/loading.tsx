import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Customers page loading state — Suspense fallback.
 * Displays a table skeleton matching the customers list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function CustomersLoading() {
  return <TableSkeleton rows={10} columns={5} filterCount={2} showHeader />;
}
