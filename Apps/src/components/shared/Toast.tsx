"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useAppSelector } from "@/lib/store/hooks";

/**
 * Toast — configures the sonner Toaster component with RTL position support.
 * Positions toasts on the start side based on the current direction (rtl/ltr).
 */
export function Toast() {
  const direction = useAppSelector((state) => state.ui.direction);

  return (
    <SonnerToaster
      position={direction === "rtl" ? "bottom-right" : "bottom-left"}
      dir={direction}
      richColors
      closeButton
      toastOptions={{
        className: "font-sans",
      }}
    />
  );
}
