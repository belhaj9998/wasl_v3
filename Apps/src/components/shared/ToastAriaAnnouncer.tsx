"use client";

import { useEffect, useState } from "react";
import {
  subscribeToAnnouncements,
  type ToastType,
} from "@/lib/toast/toastManager";

interface Announcement {
  id: number;
  type: ToastType;
  text: string;
}

/**
 * ToastAriaAnnouncer — provides dedicated ARIA live regions for toast
 * notifications to ensure screen readers announce them with the correct urgency.
 *
 * Accessibility (Requirement 7.6):
 * - Success/info toasts are announced via role="status" + aria-live="polite"
 * - Error/warning toasts are announced via role="alert" + aria-live="assertive"
 *
 * This component renders two visually-hidden live regions:
 * 1. A "polite" region for success/info messages
 * 2. An "assertive" region for error/warning messages
 *
 * When a toast is shown, the appropriate region's content is updated,
 * triggering the screen reader to announce the message.
 */
export function ToastAriaAnnouncer() {
  const [politeAnnouncement, setPoliteAnnouncement] =
    useState<Announcement | null>(null);
  const [assertiveAnnouncement, setAssertiveAnnouncement] =
    useState<Announcement | null>(null);

  useEffect(() => {
    let counter = 0;

    const unsubscribe = subscribeToAnnouncements(({ type, title, message }) => {
      const text = message ? `${title}. ${message}` : title;
      const announcement: Announcement = { id: ++counter, type, text };

      if (type === "error" || type === "warning") {
        setAssertiveAnnouncement(announcement);
      } else {
        setPoliteAnnouncement(announcement);
      }
    });

    return unsubscribe;
  }, []);

  // Clear announcements after they've been read (to allow re-announcement of same text)
  useEffect(() => {
    if (!politeAnnouncement) return;
    const timer = setTimeout(() => setPoliteAnnouncement(null), 1000);
    return () => clearTimeout(timer);
  }, [politeAnnouncement]);

  useEffect(() => {
    if (!assertiveAnnouncement) return;
    const timer = setTimeout(() => setAssertiveAnnouncement(null), 1000);
    return () => clearTimeout(timer);
  }, [assertiveAnnouncement]);

  return (
    <>
      {/* Polite live region for success/info toasts */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeAnnouncement?.text ?? ""}
      </div>

      {/* Assertive live region for error/warning toasts */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveAnnouncement?.text ?? ""}
      </div>
    </>
  );
}
