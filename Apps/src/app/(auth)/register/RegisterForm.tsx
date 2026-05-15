"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { registerSchema, type RegisterFormData } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import {
  FormField,
  FormSummaryError,
  SubmitButton,
  mapServerErrorsToForm,
} from "@/components/forms";
import type { ApiError } from "@/types/api.types";

const REGISTER_FIELD_NAMES = ["name", "email", "phone", "password"] as const;

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [summaryErrors, setSummaryErrors] = useState<string[]>([]);

  const { register: registerUser, loading } = useAuth();

  const { control, handleSubmit, setError } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setSummaryErrors([]);

    const result = await registerUser(data);

    if (registerThunkFulfilled(result)) {
      router.push("/admin/dashboard");
    } else {
      const error = result.payload as ApiError | string;
      handleRegisterError(error);
    }
  };

  const handleRegisterError = (error: ApiError | string) => {
    if (typeof error === "string") {
      setSummaryErrors([error]);
      return;
    }

    // 409 — email or phone already exists
    if (error.statusCode === 409) {
      setSummaryErrors([error.message || tErrors("resource.alreadyExists")]);
      return;
    }

    // 422 — validation errors mapped to fields
    if (error.statusCode === 422) {
      const unmapped = mapServerErrorsToForm<RegisterFormData>(
        error,
        setError,
        [...REGISTER_FIELD_NAMES],
      );
      if (unmapped.length > 0) {
        setSummaryErrors(unmapped);
      }
      return;
    }

    // Generic error fallback
    setSummaryErrors([error.message || tErrors("network")]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("register")}
        </h1>
      </div>

      <FormSummaryError errors={summaryErrors} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={control}
          name="name"
          label={t("name")}
          type="text"
          placeholder={t("name")}
          required
        />

        <FormField
          control={control}
          name="email"
          label={t("email")}
          type="email"
          placeholder={t("email")}
          required
        />

        <FormField
          control={control}
          name="phone"
          label={t("phone")}
          type="text"
          placeholder="+218XXXXXXXXX"
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

        <SubmitButton isSubmitting={loading} className="w-full">
          {t("register")}
        </SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("login")}
        </Link>
      </p>
    </div>
  );
}

/**
 * Type guard to check if the thunk result was fulfilled.
 */
function registerThunkFulfilled(result: unknown): boolean {
  return (
    typeof result === "object" &&
    result !== null &&
    "meta" in result &&
    typeof (result as Record<string, unknown>).meta === "object" &&
    (result as { meta: { requestStatus: string } }).meta.requestStatus ===
      "fulfilled"
  );
}
