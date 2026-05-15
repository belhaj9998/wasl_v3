"use client";

/**
 * Storefront Customer Login Page
 * Requirements: 19.1, 19.2
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

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function StorefrontLoginPage() {
  const params = useParams();
  const domain = params.domain as string;
  const router = useRouter();
  const t = useTranslations("storefront");

  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setServerError(null);
      const response = await storefrontService.customerLogin(domain, data);
      setCustomerToken(response.data.token);
      toast.success(t("loginSuccess"));
      router.push(ROUTES.STOREFRONT.ACCOUNT.PROFILE(domain));
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      if (apiError.status === 401) {
        setServerError(t("invalidCredentials"));
      } else {
        setServerError(apiError.message || t("loginError"));
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("customerLogin")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                className="mt-1"
                dir="ltr"
              />
              {errors.email && <FormError message={errors.email.message} />}
            </div>

            <div>
              <Label htmlFor="password">{t("password")}</Label>
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
              {t("login")}
            </SubmitButton>

            <p className="text-center text-sm text-muted-foreground">
              {t("noAccount")}{" "}
              <Link
                href={ROUTES.STOREFRONT.ACCOUNT.REGISTER(domain)}
                className="text-primary hover:underline"
              >
                {t("registerHere")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
