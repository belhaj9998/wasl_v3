"use client";

/**
 * Global 404 Not Found Page
 * Displayed when a route doesn't match any page.
 * Requirements: 25.3
 */

import { FileX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-muted p-4">
            <FileX className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          الصفحة غير موجودة
        </h2>
        <p className="text-muted-foreground mb-6">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <Button onClick={() => (window.location.href = "/")} variant="default">
          العودة للرئيسية
        </Button>
      </div>
    </div>
  );
}
