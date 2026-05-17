"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Platform error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[400px] p-4"
    >
      <div className="flex justify-center mb-6">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">
        {t("pageError.title")}
      </h2>
      <p className="text-muted-foreground mb-2">{t("pageError.description")}</p>
      {error.digest && (
        <p className="text-sm text-muted-foreground mb-6">
          Ref: {error.digest}
        </p>
      )}
      <div className="flex gap-3 mt-4">
        <Button onClick={reset}>{t("pageError.retry")}</Button>
        <Button variant="outline" asChild>
          <Link href="/platform/dashboard">
            {t("pageError.backToDashboard")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
