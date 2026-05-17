import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Subscriptions page loading state — Suspense fallback.
 * Displays a table skeleton matching the subscriptions list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function SubscriptionsLoading() {
  return <TableSkeleton rows={10} columns={6} showHeader showFilters={false} />;
}
