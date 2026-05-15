"use client";

/**
 * Global Error Boundary
 * Catches unhandled errors and displays a user-friendly error page.
 * Requirements: 25.1, 25.3
 */

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          حدث خطأ غير متوقع
        </h1>
        <p className="text-muted-foreground mb-6">
          نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">
            إعادة المحاولة
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
          >
            العودة للرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}
