/**
 * Notification Types
 * Type definitions for the notification system.
 *
 * Requirements: 14.2, 14.3, 14.4, 14.5, 14.6
 */

export type NotificationType =
  | "new_order"
  | "order_status_change"
  | "low_stock";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSettings {
  newOrder: boolean;
  orderStatusChange: boolean;
  lowStock: boolean;
  soundEnabled: boolean;
}

export interface NotificationsResponse {
  data: Notification[];
  meta?: {
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface NotificationState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
  settings: NotificationSettings;
  lastFetchedAt: number | null;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  newOrder: true,
  orderStatusChange: true,
  lowStock: true,
  soundEnabled: true,
};
