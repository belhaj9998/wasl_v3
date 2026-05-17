import { Suspense } from "react";
import LowStockPageClient from "./LowStockPageClient";
import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Low Stock Inventory Page — Server Component (Container)
 *
 * Follows the Container/Presentational pattern:
 * - This Server Component handles the page shell
 * - LowStockPageClient handles interactivity and data fetching via Redux/service
 *
 * Displays products where available_quantity <= low_stock_threshold
 * Paginated table: default 20 items, max 50 per page
 *
 * Requirements: 9.1
 */

export default function LowStockPage() {
  return (
    <Suspense
      fallback={<TableSkeleton rows={10} columns={6} showFilters={false} />}
    >
      <LowStockPageClient />
    </Suspense>
  );
}
