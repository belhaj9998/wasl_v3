"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { FormField } from "@/components/forms/FormField";
import { FormSummaryError } from "@/components/forms/FormSummaryError";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/lib/api/services/auth.service";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/lib/validators/auth.schema";
import { ROUTES } from "@/lib/constants/routes";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const tSuccess = useTranslations("success.auth");
  const tErrors = useTranslations("errors");

  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setServerErrors([]);
    setSuccessMessage(null);

    try {
      await authService.forgotPassword({ email: data.email });
      setSuccessMessage(t("resetLinkSent"));
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 422) {
        setServerErrors([tErrors("validation.failed")]);
      } else if (err.status === 404) {
        setServerErrors([tErrors("resource.notFound")]);
      } else {
        setServerErrors([err.message || tErrors("network")]);
      }
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t("forgotPassword")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("forgotPasswordDescription")}
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
                className="text-sm text-primary hover:underline"
              >
                {t("backToLogin")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormSummaryError errors={serverErrors} />

            <FormField
              control={control}
              name="email"
              label={t("email")}
              type="email"
              placeholder="example@email.com"
              required
            />

            <SubmitButton
              isSubmitting={formState.isSubmitting}
              className="w-full"
            >
              {t("sendResetLink")}
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
