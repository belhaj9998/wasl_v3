import { toast as sonnerToast } from "sonner";

// Types
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string | number;
  type: ToastType;
  title: string;
  message?: string;
}

export interface ToastOptions {
  title: string;
  message?: string;
  duration?: number;
}

/**
 * Returns the appropriate ARIA attributes for a toast type.
 *
 * Accessibility (Requirement 7.6):
 * - Success/info: role="status" + aria-live="polite" (non-urgent announcements)
 * - Error/warning: role="alert" + aria-live="assertive" (urgent announcements)
 */
export function getToastAriaAttributes(type: ToastType): {
  role: "status" | "alert";
  "aria-live": "polite" | "assertive";
  "aria-atomic": "true";
} {
  if (type === "error" || type === "warning") {
    return { role: "alert", "aria-live": "assertive", "aria-atomic": "true" };
  }
  return { role: "status", "aria-live": "polite", "aria-atomic": "true" };
}

/**
 * Subscribers for toast announcements (used by ToastAriaAnnouncer component).
 */
type ToastAnnouncementListener = (announcement: {
  type: ToastType;
  title: string;
  message?: string;
}) => void;

const announcementListeners: Set<ToastAnnouncementListener> = new Set();

export function subscribeToAnnouncements(
  listener: ToastAnnouncementListener,
): () => void {
  announcementListeners.add(listener);
  return () => {
    announcementListeners.delete(listener);
  };
}

function announceToast(type: ToastType, title: string, message?: string): void {
  announcementListeners.forEach((listener) =>
    listener({ type, title, message }),
  );
}

/**
 * ToastManager — wraps sonner's toast API to enforce:
 * - Maximum 5 visible toasts at a time
 * - Oldest toast removed when limit exceeded
 * - Auto-close: 5s default, 8s for errors
 * - Types: success, error, warning, info
 * - Proper ARIA announcements per toast type (Requirement 7.6)
 *
 * Validates: Requirements 14.1, 2.2, 7.6
 */
class ToastManager {
  private maxVisible = 5;
  private defaultDuration = 5000; // 5 seconds
  private errorDuration = 8000; // 8 seconds for errors
  private activeToasts: ToastItem[] = [];

  /**
   * Get currently active toasts (for testing/inspection)
   */
  getActiveToasts(): ReadonlyArray<ToastItem> {
    return [...this.activeToasts];
  }

  /**
   * Show a toast notification, enforcing the max visible limit.
   */
  show(type: ToastType, options: ToastOptions): string | number {
    // Enforce max visible limit — remove oldest if at capacity
    if (this.activeToasts.length >= this.maxVisible) {
      const oldest = this.activeToasts[0];
      this.dismiss(oldest.id);
    }

    const duration = this.getDuration(type, options.duration);

    const id = this.fireToast(type, options, duration);

    const item: ToastItem = {
      id,
      type,
      title: options.title,
      message: options.message,
    };

    this.activeToasts.push(item);

    // Announce to ARIA live regions for screen readers
    announceToast(type, options.title, options.message);

    return id;
  }

  /**
   * Dismiss a specific toast by ID.
   */
  dismiss(id: string | number): void {
    sonnerToast.dismiss(id);
    this.removeFromActive(id);
  }

  /**
   * Dismiss all active toasts.
   */
  dismissAll(): void {
    sonnerToast.dismiss();
    this.activeToasts = [];
  }

  /**
   * Remove a toast from the active tracking list.
   * Called internally when a toast is dismissed or auto-closed.
   */
  private removeFromActive(id: string | number): void {
    this.activeToasts = this.activeToasts.filter((t) => t.id !== id);
  }

  /**
   * Get the appropriate duration based on toast type.
   */
  private getDuration(type: ToastType, customDuration?: number): number {
    if (customDuration !== undefined) return customDuration;
    return type === "error" ? this.errorDuration : this.defaultDuration;
  }

  /**
   * Fire the actual sonner toast and return its ID.
   */
  private fireToast(
    type: ToastType,
    options: ToastOptions,
    duration: number,
  ): string | number {
    const toastOptions = {
      description: options.message,
      duration,
      onDismiss: (t: { id: string | number }) => {
        this.removeFromActive(t.id);
      },
      onAutoClose: (t: { id: string | number }) => {
        this.removeFromActive(t.id);
      },
    };

    switch (type) {
      case "success":
        return sonnerToast.success(options.title, toastOptions);
      case "error":
        return sonnerToast.error(options.title, toastOptions);
      case "warning":
        return sonnerToast.warning(options.title, toastOptions);
      case "info":
        return sonnerToast.info(options.title, toastOptions);
    }
  }
}

// Singleton instance
export const toastManager = new ToastManager();

// Convenience methods
export function toastSuccess(title: string, message?: string): string | number {
  return toastManager.show("success", { title, message });
}

export function toastError(title: string, message?: string): string | number {
  return toastManager.show("error", { title, message });
}

export function toastWarning(title: string, message?: string): string | number {
  return toastManager.show("warning", { title, message });
}

export function toastInfo(title: string, message?: string): string | number {
  return toastManager.show("info", { title, message });
}
