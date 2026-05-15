"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { STORAGE_KEYS } from "@/lib/constants/storage";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey={STORAGE_KEYS.THEME}
    >
      {children}
    </NextThemesProvider>
  );
}
