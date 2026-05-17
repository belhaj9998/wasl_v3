"use client";

import { useTranslations } from "next-intl";

export function SkipToContent() {
  const t = useTranslations("accessibility");

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {t("skipToContent")}
    </a>
  );
}
