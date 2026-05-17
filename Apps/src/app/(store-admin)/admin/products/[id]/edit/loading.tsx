import { FormSkeleton } from "@/components/shared/FormSkeleton";

/**
 * Product edit page loading state — Suspense fallback.
 * Displays a form skeleton matching the product edit layout with tabs.
 *
 * Requirements: 1.3, 2.3
 */
export default function ProductEditLoading() {
  return (
    <FormSkeleton
      fields={6}
      showHeader
      showTabs
      tabCount={3}
      showActions
      layout="single"
    />
  );
}
