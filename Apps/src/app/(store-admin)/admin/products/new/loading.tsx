import { FormSkeleton } from "@/components/shared/FormSkeleton";

/**
 * New product form page loading state — Suspense fallback.
 * Displays a form skeleton matching the product creation layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function NewProductLoading() {
  return (
    <FormSkeleton
      fields={6}
      showHeader
      showTabs={false}
      showActions
      layout="single"
    />
  );
}
