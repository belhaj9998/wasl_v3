"use client";

/**
 * Storefront Customer Register Page
 * Requirements: 19.1, 19.3
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { setCustomerToken } from "@/lib/api/client";
import { ROUTES } from "@/lib/constants/routes";
import { FormError, SubmitButton } from "@/components/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const registerSchema = z.object({
  first_name: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(100, "First name must not exceed 100 characters"),
  last_name: z.string().optional(),
  phone: z
    .string()
    .min(8, "Phone must be at least 8 characters")
    .max(20, "Phone must not exceed 20 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function StorefrontRegisterPage() {
  const params = useParams();
  const domain = params.domain as string;
  const router = useRouter();
  const t = useTranslations("storefront");

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setServerError(null);
      const response = await storefrontService.customerRegister(domain, {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        password: data.password,
      });
      setCustomerToken(response.data.token);
      toast.success(t("registerSuccess"));
      router.push(ROUTES.STOREFRONT.ACCOUNT.PROFILE(domain));
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      if (apiError.status === 409) {
        setServerError(t("duplicateAccount"));
      } else {
        setServerError(apiError.message || t("registerError"));
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("customerRegister")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">{t("firstName")} *</Label>
                <Input
                  id="first_name"
                  {...register("first_name")}
                  className="mt-1"
                />
                {errors.first_name && (
                  <FormError message={errors.first_name.message} />
                )}
              </div>
              <div>
                <Label htmlFor="last_name">{t("lastName")}</Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">{t("phone")} *</Label>{" "}
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                className="mt-1"
                dir="ltr"
                placeholder="+218920000001"
              />
              {errors.phone && <FormError message={errors.phone.message} />}
            </div>

            <div>
              <Label htmlFor="password">{t("password")} *</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                className="mt-1"
              />
              {errors.password && (
                <FormError message={errors.password.message} />
              )}
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <SubmitButton isSubmitting={isSubmitting} className="w-full">
              {t("register")}
            </SubmitButton>

            <p className="text-center text-sm text-muted-foreground">
              {t("hasAccount")}{" "}
              <Link
                href={ROUTES.STOREFRONT.ACCOUNT.LOGIN(domain)}
                className="text-primary hover:underline"
              >
                {t("loginHere")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
