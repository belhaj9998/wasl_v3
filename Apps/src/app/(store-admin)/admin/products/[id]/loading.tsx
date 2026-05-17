import { DetailSkeleton } from "@/components/shared/DetailSkeleton";

/**
 * Product detail page loading state — Suspense fallback.
 * Displays a detail skeleton matching the product detail layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function ProductDetailLoading() {
  return (
    <DetailSkeleton
      showHeader
      showSidebar
      sidebarCards={2}
      contentCards={2}
      fields={5}
    />
  );
}
