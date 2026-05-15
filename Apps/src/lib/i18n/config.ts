/**
 * Internationalization Configuration
 * Configures next-intl with supported locales, default locale, and message loading.
 */

import { STORAGE_KEYS } from "@/lib/constants/storage";

export const SUPPORTED_LOCALES = ["ar", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "ar";

/**
 * Returns the direction for a given locale.
 */
export function getDirectionForLocale(locale: SupportedLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Loads messages for a specific locale using static imports.
 */
async function getMessagesForLocale(
  locale: SupportedLocale,
): Promise<Record<string, unknown>> {
  switch (locale) {
    case "ar":
      return (await import("../../../messages/ar.json")).default;
    case "en":
      return (await import("../../../messages/en.json")).default;
    default:
      return (await import("../../../messages/ar.json")).default;
  }
}

/**
 * Loads messages for a given locale with fallback support.
 * If a key is missing in the selected locale, the other locale's messages
 * are merged as fallback.
 */
export async function loadMessages(
  locale: SupportedLocale,
): Promise<Record<string, unknown>> {
  const fallbackLocale: SupportedLocale = locale === "ar" ? "en" : "ar";

  const [primaryMessages, fallbackMessages] = await Promise.all([
    getMessagesForLocale(locale),
    getMessagesForLocale(fallbackLocale),
  ]);

  // Merge: primary takes precedence, fallback fills gaps
  return deepMerge(fallbackMessages, primaryMessages);
}

/**
 * Deep merges two objects. Values from `override` take precedence over `base`.
 */
function deepMerge(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base };

  for (const key of Object.keys(override)) {
    if (
      override[key] &&
      typeof override[key] === "object" &&
      !Array.isArray(override[key]) &&
      base[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(
        base[key] as Record<string, unknown>,
        override[key] as Record<string, unknown>,
      );
    } else {
      result[key] = override[key];
    }
  }

  return result;
}

/**
 * Gets the persisted locale from localStorage, or returns the default.
 */
export function getPersistedLocale(): SupportedLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Persists the locale to localStorage.
 */
export function persistLocale(locale: SupportedLocale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.LANGUAGE, locale);
}

/**
 * Updates the document's dir and lang attributes.
 */
export function updateDocumentDirection(locale: SupportedLocale): void {
  if (typeof document === "undefined") return;

  const direction = getDirectionForLocale(locale);
  document.documentElement.setAttribute("dir", direction);
  document.documentElement.setAttribute("lang", locale);
}
