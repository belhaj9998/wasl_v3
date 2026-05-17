/**
 * Notifications Hook
 * Provides polling-based notification fetching with sound alerts.
 *
 * - Polls every 30 seconds for new notifications
 * - Supports notification types: new_order, order_status_change, low_stock
 * - Plays alert sound when enabled in settings
 * - Handles online/offline state (pauses polling when offline)
 * - Cleans up interval on unmount
 *
 * Requirements: 14.3, 14.5, 14.6
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import { useAppSelector } from "@/lib/store/hooks";
import { toastInfo, toastWarning } from "@/lib/toast/toastManager";
import type {
  Notification,
  NotificationSettings,
  NotificationsResponse,
} from "@/types/notification.types";

const POLLING_INTERVAL = 30_000; // 30 seconds
const NOTIFICATION_SOUND_PATH = "/sounds/notification.mp3";

interface UseNotificationsOptions {
  /** Override polling interval in ms (default: 30000) */
  pollingInterval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

interface UseNotificationsReturn {
  /** List of notifications */
  notifications: Notification[];
  /** Count of unread notifications (capped at 99, shows "99+" beyond) */
  unreadCount: number;
  /** Formatted unread count string */
  unreadCountDisplay: string;
  /** Whether notifications are currently loading */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether there are more notifications to load */
  hasMore: boolean;
  /** Notification settings */
  settings: NotificationSettings;
  /** Mark a single notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Load more notifications (pagination) */
  loadMore: () => Promise<void>;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Update notification settings */
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
}

/**
 * Hook for managing notifications with polling.
 * Automatically fetches new notifications every 30 seconds,
 * plays sound alerts for new notifications, and handles online/offline state.
 */
export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsReturn {
  const { pollingInterval = POLLING_INTERVAL, enabled = true } = options;

  const currentStoreId = useAppSelector((state) => state.auth.currentStoreId);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [settings, setSettings] = useState<NotificationSettings>({
    newOrder: true,
    orderStatusChange: true,
    lowStock: true,
    soundEnabled: true,
  });
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastFetchedAtRef = useRef<number | null>(null);
  const previousNotificationIdsRef = useRef<Set<string>>(new Set());
  const settingsRef = useRef(settings);

  // Keep settingsRef in sync
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio(NOTIFICATION_SOUND_PATH);
      audioRef.current.volume = 0.5;
    }
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /**
   * Play notification sound if enabled in settings.
   */
  const playSound = useCallback(() => {
    if (settingsRef.current.soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Silently fail — browser may block autoplay without user interaction
      });
    }
  }, []);

  /**
   * Show toast notification based on notification type.
   */
  const showNotificationToast = useCallback((notification: Notification) => {
    const currentSettings = settingsRef.current;
    switch (notification.type) {
      case "new_order":
        if (currentSettings.newOrder) {
          toastInfo(notification.title, notification.message);
        }
        break;
      case "order_status_change":
        if (currentSettings.orderStatusChange) {
          toastInfo(notification.title, notification.message);
        }
        break;
      case "low_stock":
        if (currentSettings.lowStock) {
          toastWarning(notification.title, notification.message);
        }
        break;
    }
  }, []);

  /**
   * Check if a notification type is enabled in settings.
   */
  const isNotificationTypeEnabled = useCallback(
    (type: Notification["type"]): boolean => {
      const currentSettings = settingsRef.current;
      switch (type) {
        case "new_order":
          return currentSettings.newOrder;
        case "order_status_change":
          return currentSettings.orderStatusChange;
        case "low_stock":
          return currentSettings.lowStock;
        default:
          return true;
      }
    },
    [],
  );

  /**
   * Fetch notifications from the API.
   */
  const fetchNotifications = useCallback(
    async (pageNum: number = 1, isPolling: boolean = false) => {
      if (!currentStoreId) return;

      if (!isPolling) {
        setLoading(true);
      }
      setError(null);

      try {
        const endpoint = API_ENDPOINTS.STORE.NOTIFICATIONS(currentStoreId);
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "20",
        });

        // For polling, only fetch notifications newer than last fetch
        if (isPolling && lastFetchedAtRef.current) {
          params.set("since", new Date(lastFetchedAtRef.current).toISOString());
        }

        const response = await apiClient<NotificationsResponse>(
          `${endpoint}?${params.toString()}`,
        );

        const fetchedNotifications = response.data || [];
        const meta = response.meta;

        if (isPolling && pageNum === 1) {
          // During polling, prepend new notifications
          const newNotifications = fetchedNotifications.filter(
            (n) => !previousNotificationIdsRef.current.has(n.id),
          );

          if (newNotifications.length > 0) {
            setNotifications((prev) => [...newNotifications, ...prev]);

            // Show toast and play sound for new notifications
            let soundPlayed = false;
            for (const notification of newNotifications) {
              if (isNotificationTypeEnabled(notification.type)) {
                showNotificationToast(notification);
                if (!soundPlayed) {
                  playSound();
                  soundPlayed = true;
                }
              }
            }

            // Update unread count
            setUnreadCount((prev) => prev + newNotifications.length);

            // Track new IDs
            newNotifications.forEach((n) =>
              previousNotificationIdsRef.current.add(n.id),
            );
          }
        } else if (pageNum === 1) {
          // Initial fetch or manual refresh — replace all
          setNotifications(fetchedNotifications);
          setUnreadCount(meta?.unreadCount ?? 0);

          // Track all IDs
          previousNotificationIdsRef.current = new Set(
            fetchedNotifications.map((n) => n.id),
          );
        } else {
          // Pagination — append
          setNotifications((prev) => [...prev, ...fetchedNotifications]);
          fetchedNotifications.forEach((n) =>
            previousNotificationIdsRef.current.add(n.id),
          );
        }

        if (meta) {
          setHasMore(meta.hasMore);
        }

        lastFetchedAtRef.current = Date.now();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch notifications";
        setError(errorMessage);
      } finally {
        if (!isPolling) {
          setLoading(false);
        }
      }
    },
    [
      currentStoreId,
      isNotificationTypeEnabled,
      showNotificationToast,
      playSound,
    ],
  );

  /**
   * Fetch notification settings from the API.
   */
  const fetchSettings = useCallback(async () => {
    if (!currentStoreId) return;

    try {
      const endpoint =
        API_ENDPOINTS.STORE.NOTIFICATIONS_SETTINGS(currentStoreId);
      const response = await apiClient<{ data: NotificationSettings }>(
        endpoint,
      );
      if (response.data) {
        setSettings(response.data);
      }
    } catch {
      // Use default settings if fetch fails
    }
  }, [currentStoreId]);

  /**
   * Mark a single notification as read.
   */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!currentStoreId) return;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        const endpoint = API_ENDPOINTS.STORE.NOTIFICATIONS_READ(currentStoreId);
        await apiClient(endpoint, {
          method: "PATCH",
          body: { notificationIds: [notificationId] },
        });
      } catch {
        // Rollback on failure
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: false } : n,
          ),
        );
        setUnreadCount((prev) => prev + 1);
      }
    },
    [currentStoreId],
  );

  /**
   * Mark all notifications as read.
   */
  const markAllAsRead = useCallback(async () => {
    if (!currentStoreId) return;

    // Store previous state for rollback
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      return updated;
    });
    setUnreadCount(0);

    try {
      const endpoint =
        API_ENDPOINTS.STORE.NOTIFICATIONS_READ_ALL(currentStoreId);
      await apiClient(endpoint, { method: "PATCH" });
    } catch {
      // On failure, we can't easily rollback without storing previous state
      // Re-fetch to get accurate state
      fetchNotifications(1, false);
    }
  }, [currentStoreId, fetchNotifications]);

  /**
   * Load more notifications (next page).
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchNotifications(nextPage, false);
  }, [hasMore, loading, page, fetchNotifications]);

  /**
   * Manually trigger a refresh.
   */
  const refresh = useCallback(async () => {
    setPage(1);
    lastFetchedAtRef.current = null;
    await fetchNotifications(1, false);
  }, [fetchNotifications]);

  /**
   * Update notification settings.
   */
  const updateSettings = useCallback(
    async (newSettings: Partial<NotificationSettings>) => {
      if (!currentStoreId) return;

      const previousSettings = settingsRef.current;
      const merged = { ...previousSettings, ...newSettings };
      setSettings(merged);

      try {
        const endpoint =
          API_ENDPOINTS.STORE.NOTIFICATIONS_SETTINGS(currentStoreId);
        await apiClient(endpoint, {
          method: "PATCH",
          body: merged,
        });
      } catch {
        // Rollback on failure
        setSettings(previousSettings);
      }
    },
    [currentStoreId],
  );

  // Initial fetch on mount and when storeId changes
  useEffect(() => {
    if (enabled && currentStoreId && isOnline) {
      fetchNotifications(1, false);
      fetchSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, currentStoreId, isOnline]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled || !currentStoreId || !isOnline) {
      // Clear interval when disabled, no store, or offline
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      fetchNotifications(1, true);
    }, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, currentStoreId, isOnline, pollingInterval]);

  // Formatted unread count display
  const unreadCountDisplay = useMemo(() => {
    if (unreadCount > 99) return "99+";
    return String(unreadCount);
  }, [unreadCount]);

  return {
    notifications,
    unreadCount,
    unreadCountDisplay,
    loading,
    error,
    hasMore,
    settings,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh,
    updateSettings,
  };
}
