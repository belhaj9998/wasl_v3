import { DetailSkeleton } from "@/components/shared/DetailSkeleton";

/**
 * Order detail page loading state — Suspense fallback.
 * Displays a detail skeleton matching the order detail layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function OrderDetailLoading() {
  return (
    <DetailSkeleton
      showHeader
      showSidebar
      sidebarCards={3}
      contentCards={2}
      fields={5}
    />
  );
}
