import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Plans page loading state — Suspense fallback.
 * Displays a table skeleton matching the subscription plans list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function PlansLoading() {
  return <TableSkeleton rows={6} columns={6} showHeader showFilters={false} />;
}
