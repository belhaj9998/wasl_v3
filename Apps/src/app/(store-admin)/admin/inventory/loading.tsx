import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Inventory page loading state — Suspense fallback.
 * Displays a table skeleton matching the inventory list layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function InventoryLoading() {
  return <TableSkeleton rows={10} columns={6} filterCount={2} showHeader />;
}
