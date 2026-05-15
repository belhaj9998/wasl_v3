/**
 * Local Storage Keys
 * Constants for all localStorage keys used across the application
 */

export const STORAGE_KEYS = {
  /** Theme preference: "dark" | "light" | "system" */
  THEME: "wasl-theme",
  /** Language/locale preference: "ar" | "en" */
  LANGUAGE: "wasl-language",
  /** Sidebar collapsed state: "true" | "false" */
  SIDEBAR_COLLAPSED: "wasl-sidebar-collapsed",
  /** Currently selected store ID for multi-tenancy */
  CURRENT_STORE_ID: "wasl-current-store-id",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
