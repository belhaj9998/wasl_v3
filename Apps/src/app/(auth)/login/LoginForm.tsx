"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { loginSchema, type LoginFormData } from "@/lib/validators/auth.schema";
import {
  FormField,
  FormSummaryError,
  SubmitButton,
  mapServerErrorsToForm,
} from "@/components/forms";
import { useAppDispatch } from "@/lib/store/hooks";
import { loginThunk } from "@/lib/store/slices/auth.thunks";
import { ROUTES } from "@/lib/constants/routes";
import type { ApiError } from "@/types";

const LOGIN_FIELD_NAMES = ["identifier", "password"] as const;

export function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");

  const [summaryErrors, setSummaryErrors] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setSummaryErrors([]);

    try {
      const result = await dispatch(loginThunk(data)).unwrap();

      // Redirect based on system_role
      if (
        result.system_role === "PLATFORM_ADMIN" ||
        result.system_role === "PLATFORM_OWNER"
      ) {
        router.push(ROUTES.PLATFORM.DASHBOARD);
      } else {
        router.push(ROUTES.STORE_ADMIN.DASHBOARD);
      }
    } catch (error: unknown) {
      const apiError = error as ApiError | string;

      if (typeof apiError === "string") {
        // Simple error message from rejectWithValue
        setSummaryErrors([apiError]);
        return;
      }

      // Handle structured API errors
      if (
        apiError &&
        typeof apiError === "object" &&
        "statusCode" in apiError
      ) {
        const err = apiError as ApiError;

        switch (err.statusCode) {
          case 401:
            setSummaryErrors([tErrors("auth.invalidCredentials")]);
            break;
          case 429:
            setSummaryErrors([tErrors("auth.rateLimited")]);
            break;
          case 422: {
            const unmapped = mapServerErrorsToForm<LoginFormData>(
              err,
              setError,
              [...LOGIN_FIELD_NAMES],
            );
            if (unmapped.length > 0) {
              setSummaryErrors(unmapped);
            }
            break;
          }
          default:
            setSummaryErrors([err.message || tErrors("network")]);
        }
      } else {
        setSummaryErrors([tErrors("network")]);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{t("login")}</h1>
        <p className="text-sm text-muted-foreground">{t("identifier")}</p>
      </div>

      {/* Summary errors */}
      <FormSummaryError errors={summaryErrors} />

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={control}
          name="identifier"
          label={t("identifier")}
          type="text"
          placeholder={t("identifier")}
          required
        />

        <FormField
          control={control}
          name="password"
          label={t("password")}
          type="password"
          placeholder={t("password")}
          required
        />

        <SubmitButton isSubmitting={isSubmitting} className="w-full">
          {t("login")}
        </SubmitButton>
      </form>

      {/* Footer links */}
      <div className="space-y-2 text-center text-sm">
        <Link
          href={ROUTES.AUTH.FORGOT_PASSWORD}
          className="text-primary hover:underline"
        >
          {t("forgotPassword")}
        </Link>
        <p className="text-muted-foreground">
          {t("noAccount")}{" "}
          <Link
            href={ROUTES.AUTH.REGISTER}
            className="text-primary hover:underline"
          >
            {t("register")}
          </Link>
        </p>
      </div>
    </div>
  );
}
