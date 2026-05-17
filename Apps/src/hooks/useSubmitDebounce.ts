/**
 * Submit Debounce Hook
 * Prevents duplicate form submissions by disabling the submit button
 * immediately on click and re-enabling after the response OR a minimum
 * of 500ms (whichever is later). Ensures only one request is sent
 * even with rapid clicks.
 *
 * Requirements: 11.4
 */

import { useCallback, useRef, useState } from "react";

const MIN_DEBOUNCE_MS = 500;

/**
 * Hook that wraps a submit function with debounce logic.
 *
 * @returns An object with:
 * - `isSubmitting`: boolean to disable the submit button
 * - `handleSubmit`: wrapper function that enforces single-request semantics
 *
 * @example
 * ```tsx
 * const { isSubmitting, handleSubmit } = useSubmitDebounce();
 *
 * const onSubmit = handleSubmit(async (data) => {
 *   await api.createProduct(data);
 * });
 *
 * <button disabled={isSubmitting} onClick={onSubmit}>Submit</button>
 * ```
 */
export function useSubmitDebounce() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLockedRef = useRef(false);

  const handleSubmit = useCallback(
    <T extends (...args: any[]) => Promise<any>>(submitFn: T) => {
      return async (
        ...args: Parameters<T>
      ): Promise<ReturnType<T> | undefined> => {
        // Guard: if already submitting, reject immediately
        if (isLockedRef.current) {
          return undefined;
        }

        // Lock immediately to prevent concurrent submissions
        isLockedRef.current = true;
        setIsSubmitting(true);

        const startTime = Date.now();

        try {
          const result = await submitFn(...args);

          // Ensure minimum debounce time has elapsed
          const elapsed = Date.now() - startTime;
          const remaining = MIN_DEBOUNCE_MS - elapsed;

          if (remaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, remaining));
          }

          return result as ReturnType<T>;
        } catch (error) {
          // Ensure minimum debounce time even on error
          const elapsed = Date.now() - startTime;
          const remaining = MIN_DEBOUNCE_MS - elapsed;

          if (remaining > 0) {
            await new Promise((resolve) => setTimeout(resolve, remaining));
          }

          throw error;
        } finally {
          isLockedRef.current = false;
          setIsSubmitting(false);
        }
      };
    },
    [],
  );

  return { isSubmitting, handleSubmit };
}
