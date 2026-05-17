import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Platform users page loading state — Suspense fallback.
 * Displays a table skeleton matching the users list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function PlatformUsersLoading() {
  return <TableSkeleton rows={10} columns={5} filterCount={2} showHeader />;
}
