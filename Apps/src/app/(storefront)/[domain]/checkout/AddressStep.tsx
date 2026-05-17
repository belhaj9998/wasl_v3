"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  checkoutAddressSchema,
  type CheckoutAddressData,
} from "@/lib/validators/checkout.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/forms";

interface AddressStepProps {
  defaultValues: CheckoutAddressData | null;
  onNext: (data: CheckoutAddressData) => void;
  onBack: () => void;
}

export function AddressStep({
  defaultValues,
  onNext,
  onBack,
}: AddressStepProps) {
  const t = useTranslations("storefront");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutAddressData>({
    resolver: zodResolver(checkoutAddressSchema),
    defaultValues: defaultValues ?? {
      full_name: "",
      city: "",
      street_line_1: "",
      region: "",
      street_line_2: "",
      postal_code: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("shippingAddress")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="full_name">{t("fullName")} *</Label>
            <Input
              id="full_name"
              {...register("full_name")}
              aria-describedby={
                errors.full_name ? "full_name-error" : undefined
              }
              className="mt-1"
            />
            {errors.full_name && (
              <FormError
                id="full_name-error"
                message={errors.full_name.message}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">{t("city")} *</Label>
              <Input
                id="city"
                {...register("city")}
                aria-describedby={errors.city ? "city-error" : undefined}
                className="mt-1"
              />
              {errors.city && (
                <FormError id="city-error" message={errors.city.message} />
              )}
            </div>
            <div>
              <Label htmlFor="region">{t("state")}</Label>
              <Input id="region" {...register("region")} className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="street_line_1">{t("streetAddress")} *</Label>
            <Input
              id="street_line_1"
              {...register("street_line_1")}
              aria-describedby={
                errors.street_line_1 ? "street_line_1-error" : undefined
              }
              className="mt-1"
            />
            {errors.street_line_1 && (
              <FormError
                id="street_line_1-error"
                message={errors.street_line_1.message}
              />
            )}
          </div>

          <div>
            <Label htmlFor="street_line_2">{t("streetAddress2")}</Label>
            <Input
              id="street_line_2"
              {...register("street_line_2")}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="postal_code">{t("postalCode")}</Label>
            <Input
              id="postal_code"
              {...register("postal_code")}
              className="mt-1"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 me-1" />
          {t("checkoutSteps.back")}
        </Button>
        <Button type="submit">
          {t("checkoutSteps.next")}
          <ChevronRight className="w-4 h-4 ms-1" />
        </Button>
      </div>
    </form>
  );
}
