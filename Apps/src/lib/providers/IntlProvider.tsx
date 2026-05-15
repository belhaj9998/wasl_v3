"use client";

import { useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setLocale } from "@/lib/store/slices/ui.slice";
import {
  type SupportedLocale,
  loadMessages,
  getPersistedLocale,
  updateDocumentDirection,
} from "@/lib/i18n/config";

interface IntlProviderProps {
  children: React.ReactNode;
}

export function IntlProvider({ children }: IntlProviderProps) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const [messages, setMessages] = useState<Record<string, unknown>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // On mount: restore persisted locale and sync Redux + document
  useEffect(() => {
    const persisted = getPersistedLocale();
    if (persisted !== locale) {
      dispatch(setLocale(persisted));
    }
    updateDocumentDirection(persisted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages whenever locale changes
  useEffect(() => {
    let cancelled = false;

    loadMessages(locale as SupportedLocale).then((msgs) => {
      if (!cancelled) {
        setMessages(msgs);
        setIsLoaded(true);
      }
    });

    // Update document direction on locale change
    updateDocumentDirection(locale as SupportedLocale);

    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Don't render children until messages are loaded to avoid flash
  if (!isLoaded) {
    return null;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
