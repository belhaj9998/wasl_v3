import { FormSkeleton } from "@/components/shared/FormSkeleton";

/**
 * Settings page loading state — Suspense fallback.
 * Displays a form skeleton with tabs matching the settings layout.
 *
 * Requirements: 1.3, 2.3
 */
export default function SettingsLoading() {
  return (
    <FormSkeleton
      fields={6}
      showHeader
      showTabs
      tabCount={4}
      showActions
      layout="single"
    />
  );
}
