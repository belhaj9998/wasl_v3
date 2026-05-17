"use client";

/**
 * NotificationCenter — Notification center component for the header.
 *
 * Features:
 * - Displays last 20 notifications sorted newest first
 * - Unread count badge (up to 99, then "99+")
 * - Load more via scroll (pagination 50/page)
 * - Mark as read on click
 * - "Mark all as read" button
 * - Loading, error, and empty states
 * - Accessible with aria-live for screen readers
 *
 * Requirements: 14.2, 14.7
 */

import { useState, useEffect, useCallback, useRef, type UIEvent } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/cn";
import { notificationService } from "@/lib/api/services/notification.service";
import { useStore } from "@/hooks/useStore";
import type { Notification } from "@/types";

const INITIAL_LIMIT = 20;
const PAGE_SIZE = 50;

export function NotificationCenter() {
  const t = useTranslations("notifications");
  const { currentStoreId } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Format unread count display
  const unreadDisplay = unreadCount > 99 ? "99+" : String(unreadCount);

  // Fetch notifications
  const fetchNotifications = useCallback(
    async (pageNum: number, append = false) => {
      if (!currentStoreId) return;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const limit = pageNum === 1 ? INITIAL_LIMIT : PAGE_SIZE;
        const response = await notificationService.getAll(currentStoreId, {
          page: pageNum,
          limit,
        });

        if (response.success) {
          const newItems = response.data;
          if (append) {
            setNotifications((prev) => [...prev, ...newItems]);
          } else {
            setNotifications(newItems);
          }
          setHasMore(response.meta.page < response.meta.totalPages);
          setPage(pageNum);
        }
      } catch {
        setError(t("fetchError"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [currentStoreId, t],
  );

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!currentStoreId) return;

    try {
      const response = await notificationService.getUnreadCount(currentStoreId);
      if (response.success) {
        setUnreadCount(response.data.count);
      }
    } catch {
      // Silently fail for count — don't block UI
    }
  }, [currentStoreId]);

  // Initial load of unread count
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Load notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1);
    }
  }, [isOpen, fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (loadingMore || !hasMore) return;

      const target = e.currentTarget;
      const scrollBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight;

      if (scrollBottom < 100) {
        fetchNotifications(page + 1, true);
      }
    },
    [loadingMore, hasMore, page, fetchNotifications],
  );

  // Mark single notification as read
  const handleMarkAsRead = useCallback(
    async (notification: Notification) => {
      if (!currentStoreId || notification.read) return;

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await notificationService.markAsRead(currentStoreId, notification.id);
      } catch {
        // Rollback on failure
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: false } : n,
          ),
        );
        setUnreadCount((prev) => prev + 1);
      }
    },
    [currentStoreId],
  );

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    if (!currentStoreId || unreadCount === 0) return;

    // Optimistic update
    const previousNotifications = notifications;
    const previousCount = unreadCount;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await notificationService.markAllAsRead(currentStoreId);
    } catch {
      // Rollback on failure
      setNotifications(previousNotifications);
      setUnreadCount(previousCount);
    }
  }, [currentStoreId, unreadCount, notifications]);

  // Retry fetching
  const handleRetry = useCallback(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Get relative time display
  const getRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("time.justNow");
    if (diffMins < 60) return t("time.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("time.hoursAgo", { count: diffHours });
    return t("time.daysAgo", { count: diffDays });
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        onClick={togglePanel}
        aria-label={t("openNotifications")}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -end-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
          >
            {unreadDisplay}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t("title")}
          className="absolute end-0 top-full mt-2 w-80 sm:w-96 max-h-[480px] rounded-lg border bg-popover text-popover-foreground shadow-lg z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-semibold">{t("title")}</h2>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs gap-1 h-7"
                aria-label={t("markAllAsRead")}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("markAllAsRead")}
              </Button>
            )}
          </div>

          <Separator />

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto"
            onScroll={handleScroll}
            aria-live="polite"
            aria-atomic="false"
          >
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="sr-only">{t("loading")}</span>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 px-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <p className="text-sm text-destructive text-center">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("retry")}
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 px-4">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t("empty")}</p>
              </div>
            )}

            {/* Notification List */}
            {!loading && !error && notifications.length > 0 && (
              <ul className="divide-y" role="list" aria-label={t("list")}>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notification)}
                      className={cn(
                        "w-full text-start px-4 py-3 hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                        !notification.read && "bg-accent/20",
                      )}
                      aria-label={
                        notification.read
                          ? notification.title
                          : t("unreadNotification", {
                              title: notification.title,
                            })
                      }
                    >
                      <div className="flex items-start gap-3">
                        {/* Unread indicator */}
                        <div className="mt-1.5 shrink-0">
                          {!notification.read ? (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          ) : (
                            <Check className="h-3 w-3 text-muted-foreground/50" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm truncate",
                              !notification.read && "font-medium",
                            )}
                          >
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {getRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}

                {/* Loading more indicator */}
                {loadingMore && (
                  <li className="flex items-center justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
