import { DetailSkeleton } from "@/components/shared/DetailSkeleton";

/**
 * Storefront account page loading state — Suspense fallback.
 * Displays a detail skeleton matching the account overview layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function AccountLoading() {
  return (
    <DetailSkeleton
      showHeader
      showSidebar={false}
      contentCards={2}
      fields={4}
    />
  );
}
