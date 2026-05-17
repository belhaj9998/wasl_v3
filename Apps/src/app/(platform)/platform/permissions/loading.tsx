import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Permissions page loading state — Suspense fallback.
 * Displays a table skeleton matching the permissions list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function PermissionsLoading() {
  return <TableSkeleton rows={8} columns={5} showHeader showFilters={false} />;
}
