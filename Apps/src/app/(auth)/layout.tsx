"use client";

import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setLocale } from "@/lib/store/slices/ui.slice";
import { persistLocale } from "@/lib/i18n/config";
import type { SupportedLocale } from "@/lib/i18n/config";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const t = useTranslations("language");

  const toggleLocale = () => {
    const newLocale: SupportedLocale = locale === "ar" ? "en" : "ar";
    dispatch(setLocale(newLocale));
    persistLocale(newLocale);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>

        {/* Card with page content */}
        <Card className="p-6">{children}</Card>

        {/* Language switcher */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLocale}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            {locale === "ar" ? t("en") : t("ar")}
          </Button>
        </div>
      </div>
    </div>
  );
}
