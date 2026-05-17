import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Roles page loading state — Suspense fallback.
 * Displays a table skeleton matching the roles list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function RolesLoading() {
  return <TableSkeleton rows={6} columns={4} showFilters={false} showHeader />;
}
