/**
 * Notification Settings Service
 * Manages notification preferences for store admin users.
 *
 * Requirements: 14.4
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ApiResponse } from "@/types";

export interface NotificationSettings {
  newOrder: boolean;
  orderStatusChange: boolean;
  lowStock: boolean;
  soundEnabled: boolean;
}

export interface UpdateNotificationSettingsPayload {
  newOrder?: boolean;
  orderStatusChange?: boolean;
  lowStock?: boolean;
  soundEnabled?: boolean;
}

export const notificationSettingsService = {
  getSettings(storeId: number) {
    return apiClient<ApiResponse<NotificationSettings>>(
      `${API_ENDPOINTS.STORE.SETTINGS(storeId)}/notifications`,
      { storeId },
    );
  },

  updateSettings(storeId: number, payload: UpdateNotificationSettingsPayload) {
    return apiClient<ApiResponse<NotificationSettings>>(
      `${API_ENDPOINTS.STORE.SETTINGS(storeId)}/notifications`,
      {
        method: "PATCH",
        body: payload,
        storeId,
      },
    );
  },
};
