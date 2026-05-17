import { Suspense } from "react";
import OrdersPageClient from "./OrdersPageClient";
import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Orders List Page — Server Component (Container)
 *
 * Follows the Container/Presentational pattern:
 * - This Server Component handles the page shell and metadata
 * - OrdersPageClient handles interactivity and Redux state
 *
 * Note: Full SSR data fetching is not possible here due to Redux dependency
 * for state management (optimistic updates, cache, filters). The client component
 * handles data fetching via Redux thunks.
 *
 * Requirements: 1.1, 1.3, 1.5, 2.3
 */

export default function OrdersPage() {
  return (
    <Suspense
      fallback={<TableSkeleton rows={10} columns={6} filterCount={4} />}
    >
      <OrdersPageClient />
    </Suspense>
  );
}
