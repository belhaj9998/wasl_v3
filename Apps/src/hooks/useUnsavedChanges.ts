/**
 * Unsaved Changes Warning Hook
 * Warns users when they attempt to leave a page with unsaved form changes.
 * Supports both browser tab close/refresh (beforeunload) and
 * internal Next.js navigation (via beforePopState-like pattern).
 *
 * Requirements: 6.5
 */

"use client";

import { useEffect, useCallback } from "react";

/**
 * Options for the useUnsavedChanges hook.
 */
export interface UseUnsavedChangesOptions {
  /**
   * Whether the form has unsaved changes (dirty state).
   * Typically comes from React Hook Form's `formState.isDirty`.
   */
  isDirty: boolean;

  /**
   * Custom warning message for the browser's beforeunload dialog.
   * Note: Most modern browsers ignore custom messages and show their own.
   */
  message?: string;
}

/**
 * Hook that warns users when they attempt to leave a page with unsaved changes.
 *
 * When `isDirty` is true:
 * - Adds a `beforeunload` event listener to warn on tab close/refresh
 * - Intercepts browser back/forward navigation via `popstate`
 *
 * When `isDirty` is false:
 * - No warnings are shown, navigation proceeds normally
 *
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const { formState } = useForm();
 * useUnsavedChanges({ isDirty: formState.isDirty });
 * ```
 */
export function useUnsavedChanges({
  isDirty,
  message = "You have unsaved changes. Are you sure you want to leave?",
}: UseUnsavedChangesOptions): void {
  // Handle browser tab close / refresh
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      // For older browsers that respect returnValue
      e.returnValue = message;
      return message;
    },
    [isDirty, message],
  );

  // Handle browser back/forward navigation (popstate)
  const handlePopState = useCallback(
    (e: PopStateEvent) => {
      if (!isDirty) return;

      const confirmLeave = window.confirm(message);
      if (!confirmLeave) {
        // Push the current state back to prevent navigation
        window.history.pushState(null, "", window.location.href);
      }
    },
    [isDirty, message],
  );

  useEffect(() => {
    if (!isDirty) return;

    // Add beforeunload listener for tab close/refresh
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Push a state entry so we can intercept back navigation
    window.history.pushState(null, "", window.location.href);

    // Add popstate listener for browser back/forward
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty, handleBeforeUnload, handlePopState]);
}
