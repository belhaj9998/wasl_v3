import { FormSkeleton } from "@/components/shared/FormSkeleton";

/**
 * New order form page loading state — Suspense fallback.
 * Displays a form skeleton matching the manual order creation layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function NewOrderLoading() {
  return <FormSkeleton fields={8} showHeader showActions layout="single" />;
}
