/**
 * Focus Trap Hook
 * Traps keyboard focus within a container element when active.
 * Used for modals, dialogs, and other overlay components.
 *
 * Requirements: 7.4
 */

import { useEffect, type RefObject } from "react";

/**
 * Selector for all focusable elements within a container.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled]):not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(", ");

/**
 * Returns all focusable elements within the given container.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
}

/**
 * Hook that traps Tab/Shift+Tab focus within a container element.
 *
 * When `isActive` is true:
 * - Moves focus to the first focusable element inside the container
 * - Pressing Tab on the last element cycles to the first
 * - Pressing Shift+Tab on the first element cycles to the last
 *
 * @param containerRef - Ref to the container element
 * @param isActive - Whether the focus trap is active
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = getFocusableElements(container);

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Move focus to the first focusable element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      // Re-query focusable elements in case DOM changed
      const currentFocusable = getFocusableElements(container);
      if (currentFocusable.length === 0) return;

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, isActive]);
}
