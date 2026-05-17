import { FormSkeleton } from "@/components/shared/FormSkeleton";

/**
 * Storefront checkout page loading state — Suspense fallback.
 * Displays a form skeleton matching the multi-step checkout layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function CheckoutLoading() {
  return (
    <FormSkeleton
      fields={5}
      showHeader
      showTabs
      tabCount={4}
      showActions
      layout="single"
    />
  );
}
