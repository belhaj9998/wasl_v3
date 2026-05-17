"use client";

import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  checkoutPaymentSchema,
  type CheckoutPaymentData,
} from "@/lib/validators/checkout.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/forms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentStepProps {
  defaultValues: CheckoutPaymentData | null;
  onNext: (data: CheckoutPaymentData) => void;
  onBack: () => void;
}

export function PaymentStep({
  defaultValues,
  onNext,
  onBack,
}: PaymentStepProps) {
  const t = useTranslations("storefront");

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutPaymentData>({
    resolver: zodResolver(checkoutPaymentSchema),
    defaultValues: defaultValues ?? {
      payment_method: "CASH_ON_DELIVERY",
      notes_from_customer: "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("paymentMethod")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="payment_method">{t("paymentMethod")} *</Label>
            <Controller
              name="payment_method"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="payment_method"
                    aria-describedby={
                      errors.payment_method ? "payment_method-error" : undefined
                    }
                    className="mt-1"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH_ON_DELIVERY">
                      {t("cashOnDelivery")}
                    </SelectItem>
                    <SelectItem value="BANK_TRANSFER">
                      {t("bankTransfer")}
                    </SelectItem>
                    <SelectItem value="MANUAL">{t("manualPayment")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.payment_method && (
              <FormError
                id="payment_method-error"
                message={errors.payment_method.message}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">{t("notes")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("notes_from_customer")}
            placeholder={t("notesPlaceholder")}
            rows={3}
          />
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
