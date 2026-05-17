import { FormSkeleton } from "@/components/shared/FormSkeleton";

/**
 * Product create page loading state — Suspense fallback.
 * Displays a form skeleton matching the product creation layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function ProductCreateLoading() {
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
