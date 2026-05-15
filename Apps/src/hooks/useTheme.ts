"use client";

import { useTheme as useNextTheme } from "next-themes";

export type Theme = "dark" | "light" | "system";

/**
 * Custom hook wrapping next-themes useTheme for easy theme switching.
 * Provides typed theme values and convenience methods.
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useNextTheme();

  return {
    /** Current theme setting: "dark" | "light" | "system" */
    theme: (theme as Theme) ?? "system",
    /** The actual resolved theme after system preference is applied: "dark" | "light" */
    resolvedTheme: resolvedTheme as "dark" | "light" | undefined,
    /** The system's preferred color scheme */
    systemTheme: systemTheme as "dark" | "light" | undefined,
    /** Set the theme to dark, light, or system */
    setTheme: (newTheme: Theme) => setTheme(newTheme),
    /** Whether the resolved theme is dark */
    isDark: resolvedTheme === "dark",
    /** Whether the resolved theme is light */
    isLight: resolvedTheme === "light",
    /** Toggle between dark and light (ignores system) */
    toggleTheme: () => {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    },
  };
}
