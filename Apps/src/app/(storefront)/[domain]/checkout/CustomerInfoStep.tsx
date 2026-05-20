"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight } from "lucide-react";

import {
  checkoutCustomerSchema,
  type CheckoutCustomerData,
} from "@/lib/validators/checkout.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/forms";

interface CustomerInfoStepProps {
  defaultValues: CheckoutCustomerData | null;
  onNext: (data: CheckoutCustomerData) => void;
}

export function CustomerInfoStep({
  defaultValues,
  onNext,
}: CustomerInfoStepProps) {
  const t = useTranslations("storefront");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutCustomerData>({
    resolver: zodResolver(checkoutCustomerSchema),
    defaultValues: defaultValues ?? {
      customer_name: "",
      customer_phone: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("customerInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="customer_name">{t("customerName")} *</Label>
            <Input
              id="customer_name"
              {...register("customer_name")}
              aria-describedby={
                errors.customer_name ? "customer_name-error" : undefined
              }
              className="mt-1"
            />
            {errors.customer_name && (
              <FormError
                id="customer_name-error"
                message={errors.customer_name.message}
              />
            )}
          </div>

          <div>
            <Label htmlFor="customer_phone">{t("customerPhone")} *</Label>
            <Input
              id="customer_phone"
              {...register("customer_phone")}
              placeholder="+218XXXXXXXXX"
              aria-describedby={
                errors.customer_phone ? "customer_phone-error" : undefined
              }
              className="mt-1"
              dir="ltr"
            />
            {errors.customer_phone && (
              <FormError
                id="customer_phone-error"
                message={errors.customer_phone.message}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end mt-6">
        <Button type="submit">
          {t("checkoutSteps.next")}
          <ChevronRight className="w-4 h-4 ms-1" />
        </Button>
      </div>
    </form>
  );
}
