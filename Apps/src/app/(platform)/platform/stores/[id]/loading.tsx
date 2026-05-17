import { DetailSkeleton } from "@/components/shared/DetailSkeleton";

/**
 * Platform store detail page loading state — Suspense fallback.
 * Displays a detail skeleton matching the store detail layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function StoreDetailLoading() {
  return (
    <DetailSkeleton
      showHeader
      showSidebar
      sidebarCards={1}
      contentCards={1}
      fields={5}
    />
  );
}
