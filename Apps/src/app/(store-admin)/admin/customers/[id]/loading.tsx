import { DetailSkeleton } from "@/components/shared/DetailSkeleton";

/**
 * Customer detail page loading state — Suspense fallback.
 * Displays a detail skeleton matching the customer detail layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function CustomerDetailLoading() {
  return (
    <DetailSkeleton
      showHeader
      showSidebar
      sidebarCards={2}
      contentCards={2}
      fields={4}
    />
  );
}
