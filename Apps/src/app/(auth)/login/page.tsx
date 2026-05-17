"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoginForm } from "./LoginForm";
import { AlertCircle } from "lucide-react";

/**
 * Login Page Content
 * Reads session_expired query param to show session expiry message.
 *
 * Requirements: 11.3, 11.7
 */
function LoginPageContent() {
  const searchParams = useSearchParams();
  const tErrors = useTranslations("errors");

  const sessionExpired = searchParams.get("session_expired") === "true";

  return (
    <>
      {sessionExpired && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{tErrors("auth.sessionExpired")}</span>
        </div>
      )}
      <LoginForm />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginForm />}>
      <LoginPageContent />
    </Suspense>
  );
}
