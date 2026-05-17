/**
 * Dynamic Imports Configuration
 *
 * This module provides lazy-loaded versions of heavy components using next/dynamic.
 * Components > 50KB or those only needed on user interaction should be loaded dynamically.
 *
 * Usage:
 *   import { DynamicConfirmDialog } from '@/lib/dynamic';
 *   // Use <DynamicConfirmDialog /> instead of <ConfirmDialog />
 *
 * Candidates for dynamic import:
 * - Charts (recharts, chart.js) — when added
 * - Rich text editors (tiptap, quill) — when added
 * - Heavy modals (ConfirmDialog, complex forms)
 * - PDF viewers — when added
 * - Code editors (monaco, codemirror) — when added
 *
 * Requirements: 5.2
 */

import dynamic from "next/dynamic";

/**
 * Dynamically loaded ConfirmDialog — only loaded when user triggers a destructive action.
 * This avoids loading the dialog component and its dependencies on initial page load.
 */
export const DynamicConfirmDialog = dynamic(
  () =>
    import("@/components/shared/ConfirmDialog").then(
      (mod) => mod.ConfirmDialog,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);
