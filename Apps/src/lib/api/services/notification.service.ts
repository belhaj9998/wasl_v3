/**
 * Notification Service
 * Store-scoped notification management operations.
 *
 * Requirements: 14.2, 14.7
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ApiResponse, Notification, PaginatedResponse } from "@/types";

export const notificationService = {
  /**
   * Fetch notifications with pagination.
   * Returns notifications sorted newest first.
   */
  getAll(storeId: number, params?: { page?: number; limit?: number }) {
    const query = params
      ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
      : "";
    return apiClient<PaginatedResponse<Notification>>(
      `${API_ENDPOINTS.STORE.NOTIFICATIONS(storeId)}${query}`,
      { storeId },
    );
  },

  /**
   * Get unread notification count.
   */
  getUnreadCount(storeId: number) {
    return apiClient<ApiResponse<{ count: number }>>(
      `${API_ENDPOINTS.STORE.NOTIFICATIONS(storeId)}/unread-count`,
      { storeId },
    );
  },

  /**
   * Mark a single notification as read.
   */
  markAsRead(storeId: number, notificationId: string) {
    return apiClient<ApiResponse<Notification>>(
      `${API_ENDPOINTS.STORE.NOTIFICATIONS(storeId)}/${notificationId}/read`,
      {
        method: "PATCH",
        storeId,
      },
    );
  },

  /**
   * Mark all notifications as read.
   */
  markAllAsRead(storeId: number) {
    return apiClient<ApiResponse<{ updated: number }>>(
      `${API_ENDPOINTS.STORE.NOTIFICATIONS(storeId)}/read-all`,
      {
        method: "PATCH",
        storeId,
      },
    );
  },
};
