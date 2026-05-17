import { FormSkeleton } from "@/components/shared/FormSkeleton";

/**
 * New customer form page loading state — Suspense fallback.
 * Displays a form skeleton matching the customer creation layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function NewCustomerLoading() {
  return <FormSkeleton fields={5} showHeader showActions layout="single" />;
}
