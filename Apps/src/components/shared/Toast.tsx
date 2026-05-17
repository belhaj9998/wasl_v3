"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useAppSelector } from "@/lib/store/hooks";
import { ToastAriaAnnouncer } from "./ToastAriaAnnouncer";

/**
 * Toast — configures the sonner Toaster component with RTL position support.
 * Positions toasts on the start side based on the current direction (rtl/ltr).
 * Enforces max 5 visible toasts as per requirement 14.1.
 *
 * Accessibility (Requirement 7.6):
 * - Success/info toasts use role="status" + aria-live="polite"
 * - Error/warning toasts use role="alert" + aria-live="assertive"
 * - The ToastAriaAnnouncer provides dedicated live regions for screen readers.
 */
export function Toast() {
  const direction = useAppSelector((state) => state.ui.direction);

  return (
    <>
      <SonnerToaster
        position={direction === "rtl" ? "bottom-right" : "bottom-left"}
        dir={direction}
        richColors
        closeButton
        visibleToasts={5}
        toastOptions={{
          className: "font-sans",
        }}
      />
      <ToastAriaAnnouncer />
    </>
  );
}
