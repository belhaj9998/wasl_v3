/**
 * Store Settings Service
 * Store-scoped settings management operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ApiResponse } from "@/types";

export interface StoreSettings {
  general: GeneralSettings;
  branding: BrandingSettings;
  seo: SeoSettings;
  contact: ContactSettings;
}

export interface GeneralSettings {
  name: string;
  domain: string;
  description: string | null;
  currency: string;
  timezone: string;
  language: string;
}

export interface BrandingSettings {
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export interface SeoSettings {
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
}

export interface ContactSettings {
  support_email: string | null;
  support_phone: string | null;
  social_links: Record<string, string> | null;
}

export interface UpdateGeneralPayload {
  name?: string;
  domain?: string;
  description?: string;
  currency?: string;
  timezone?: string;
  language?: string;
}

export interface UpdateBrandingPayload {
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
}

export interface UpdateSeoPayload {
  meta_title?: string | null;
  meta_description?: string | null;
  og_image_url?: string | null;
}

export interface UpdateContactPayload {
  support_email?: string | null;
  support_phone?: string | null;
  social_links?: Record<string, string> | null;
}

export const storeSettingsService = {
  getSettings(storeId: number) {
    return apiClient<ApiResponse<StoreSettings>>(
      API_ENDPOINTS.STORE.SETTINGS(storeId),
      { storeId },
    );
  },

  updateGeneral(storeId: number, payload: UpdateGeneralPayload) {
    return apiClient<ApiResponse<GeneralSettings>>(
      `${API_ENDPOINTS.STORE.SETTINGS(storeId)}/general`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },

  updateBranding(storeId: number, payload: UpdateBrandingPayload) {
    return apiClient<ApiResponse<BrandingSettings>>(
      `${API_ENDPOINTS.STORE.SETTINGS(storeId)}/branding`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },

  updateSeo(storeId: number, payload: UpdateSeoPayload) {
    return apiClient<ApiResponse<SeoSettings>>(
      `${API_ENDPOINTS.STORE.SETTINGS(storeId)}/seo`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },

  updateContact(storeId: number, payload: UpdateContactPayload) {
    return apiClient<ApiResponse<ContactSettings>>(
      `${API_ENDPOINTS.STORE.SETTINGS(storeId)}/contact`,
      {
        method: "PUT",
        body: payload,
        storeId,
      },
    );
  },
};
