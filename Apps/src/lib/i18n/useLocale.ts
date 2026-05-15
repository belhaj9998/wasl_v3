"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setLocale } from "@/lib/store/slices/ui.slice";
import {
  type SupportedLocale,
  persistLocale,
  updateDocumentDirection,
} from "./config";

/**
 * Hook for managing locale switching.
 * Handles Redux state update, localStorage persistence, and document dir attribute.
 */
export function useLocaleSwitch() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const direction = useAppSelector((state) => state.ui.direction);

  const switchLocale = useCallback(
    (newLocale: SupportedLocale) => {
      // Update Redux state (also updates direction in the slice)
      dispatch(setLocale(newLocale));

      // Persist to localStorage
      persistLocale(newLocale);

      // Update document dir and lang attributes
      updateDocumentDirection(newLocale);
    },
    [dispatch],
  );

  const toggleLocale = useCallback(() => {
    const newLocale: SupportedLocale = locale === "ar" ? "en" : "ar";
    switchLocale(newLocale);
  }, [locale, switchLocale]);

  return {
    locale,
    direction,
    switchLocale,
    toggleLocale,
  };
}
