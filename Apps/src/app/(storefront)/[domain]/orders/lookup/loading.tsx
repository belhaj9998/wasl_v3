import { FormSkeleton } from "@/components/shared/FormSkeleton";

/**
 * Storefront order lookup page loading state — Suspense fallback.
 * Displays a form skeleton matching the order lookup layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function OrderLookupLoading() {
  return (
    <FormSkeleton
      fields={2}
      showHeader
      showTabs={false}
      showActions
      layout="single"
    />
  );
}
