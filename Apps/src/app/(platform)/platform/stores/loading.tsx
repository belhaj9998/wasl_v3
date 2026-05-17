import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Platform stores page loading state — Suspense fallback.
 * Displays a table skeleton matching the stores list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function PlatformStoresLoading() {
  return <TableSkeleton rows={10} columns={6} filterCount={2} showHeader />;
}
