"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import { FormField } from "@/components/forms/FormField";
import { FormSummaryError } from "@/components/forms/FormSummaryError";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/lib/api/services/auth.service";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/lib/validators/auth.schema";
import { ROUTES } from "@/lib/constants/routes";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");

  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerErrors([]);
    setSuccessMessage(null);

    if (!token) {
      setServerErrors([tErrors("validation.required")]);
      return;
    }

    try {
      await authService.resetPassword({ token, password: data.password });
      setSuccessMessage(t("passwordResetSuccess"));
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 422) {
        setServerErrors([tErrors("validation.failed")]);
      } else if (err.status === 400 || err.status === 401) {
        setServerErrors([tErrors("auth.unauthorized")]);
      } else {
        setServerErrors([err.message || tErrors("network")]);
      }
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t("resetPassword")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("resetPasswordDescription")}
        </p>
      </CardHeader>
      <CardContent>
        {successMessage ? (
          <div className="space-y-4">
            <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              <p>{successMessage}</p>
            </div>
            <div className="text-center">
              <Link
                href={ROUTES.AUTH.LOGIN}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("login")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormSummaryError errors={serverErrors} />

            <FormField
              control={control}
              name="password"
              label={t("newPassword")}
              type="password"
              placeholder="••••••••"
              required
            />

            <FormField
              control={control}
              name="confirmPassword"
              label={t("confirmPassword")}
              type="password"
              placeholder="••••••••"
              required
            />

            <SubmitButton
              isSubmitting={formState.isSubmitting}
              className="w-full"
            >
              {t("resetPassword")}
            </SubmitButton>

            <div className="text-center">
              <Link
                href={ROUTES.AUTH.LOGIN}
                className="text-sm text-primary hover:underline"
              >
                {t("backToLogin")}
              </Link>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
