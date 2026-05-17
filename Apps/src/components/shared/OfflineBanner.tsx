"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * OfflineBanner — displays a fixed banner at the top of the page when the
 * user's internet connection is lost. When the connection is restored, it
 * briefly shows a "connection restored" message then auto-hides after 3 seconds.
 *
 * Validates: Requirement 2.4
 */
export function OfflineBanner() {
  const t = useTranslations("errors");
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    // Initialize with current status
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Auto-hide the "restored" message after 3 seconds
  useEffect(() => {
    if (!showRestored) return;

    const timer = setTimeout(() => {
      setShowRestored(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showRestored]);

  if (!isOffline && !showRestored) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-0 inset-x-0 z-50 px-4 py-2 text-center text-sm font-medium transition-colors ${
        isOffline
          ? "bg-destructive text-destructive-foreground"
          : "bg-green-600 text-white"
      }`}
    >
      {isOffline ? t("connectionLost") : t("connectionRestored")}
    </div>
  );
}
