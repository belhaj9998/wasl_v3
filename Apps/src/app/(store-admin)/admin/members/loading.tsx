import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Members page loading state — Suspense fallback.
 * Displays a table skeleton matching the members list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function MembersLoading() {
  return <TableSkeleton rows={8} columns={5} showFilters={false} showHeader />;
}
