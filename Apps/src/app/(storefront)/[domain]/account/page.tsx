"use client";

/**
 * Storefront Customer Profile Page
 * Requirements: 19.4
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "lucide-react";
import { toast } from "sonner";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { FormError, SubmitButton } from "@/components/forms";
import { EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { Customer } from "@/types";

const profileSchema = z.object({
  first_name: z.string().min(2).max(100),
  last_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().min(8).max(20).optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function StorefrontAccountPage() {
  const params = useParams();
  const domain = params.domain as string;
  const t = useTranslations("storefront");

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const response = await storefrontService.getCustomerProfile(domain);
        setCustomer(response.data);
        reset({
          first_name: response.data.first_name,
          last_name: response.data.last_name || "",
          email: response.data.email,
          phone: response.data.phone || "",
        });
      } catch {
        setError("unauthorized");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [domain, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const response = await storefrontService.updateCustomerProfile(domain, {
        first_name: data.first_name,
        last_name: data.last_name || undefined,
        phone: data.phone || undefined,
      });
      setCustomer(response.data);
      toast.success(t("profileUpdated"));
    } catch {
      toast.error(t("profileUpdateError"));
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (error === "unauthorized" || !customer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <EmptyState
          icon={User}
          title={t("loginRequired")}
          description={t("loginRequiredDesc")}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        {t("myAccount")}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("profileInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">{t("firstName")}</Label>
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
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                {...register("phone")}
                className="mt-1"
                dir="ltr"
              />
              {errors.phone && <FormError message={errors.phone.message} />}
            </div>

            <SubmitButton isSubmitting={isSubmitting}>
              {t("saveChanges")}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
