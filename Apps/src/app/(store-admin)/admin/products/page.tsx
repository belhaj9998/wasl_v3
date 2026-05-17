import { Suspense } from "react";
import ProductsPageClient from "./ProductsPageClient";
import { TableSkeleton } from "@/components/shared/TableSkeleton";

/**
 * Products List Page — Server Component (Container)
 *
 * Follows the Container/Presentational pattern:
 * - This Server Component handles the page shell and metadata
 * - ProductsPageClient handles interactivity and Redux state
 *
 * Note: Full SSR data fetching is not possible here due to Redux dependency
 * for state management (optimistic updates, cache, filters). The client component
 * handles data fetching via Redux thunks.
 *
 * Requirements: 1.1, 1.3, 1.5, 2.3
 */

export default function ProductsPage() {
  return (
    <Suspense
      fallback={<TableSkeleton rows={10} columns={6} filterCount={3} />}
    >
      <ProductsPageClient />
    </Suspense>
  );
}
