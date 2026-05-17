"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft } from "lucide-react";

import type {
  CheckoutCustomerData,
  CheckoutAddressData,
  CheckoutPaymentData,
} from "@/lib/validators/checkout.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FormSummaryError } from "@/components/forms";
import type { CartItem, AppliedCoupon } from "@/types";

interface ReviewStepProps {
  customerData: CheckoutCustomerData;
  addressData: CheckoutAddressData;
  paymentData: CheckoutPaymentData;
  items: CartItem[];
  subtotal: string;
  discount: string;
  total: string;
  coupon: AppliedCoupon | null;
  isSubmitting: boolean;
  serverError: string | null;
  onBack: () => void;
  onPlaceOrder: () => void;
}

export function ReviewStep({
  customerData,
  addressData,
  paymentData,
  items,
  subtotal,
  discount,
  total,
  coupon,
  isSubmitting,
  serverError,
  onBack,
  onPlaceOrder,
}: ReviewStepProps) {
  const t = useTranslations("storefront");

  const paymentMethodLabels: Record<string, string> = {
    CASH_ON_DELIVERY: t("cashOnDelivery"),
    BANK_TRANSFER: t("bankTransfer"),
    MANUAL: t("manualPayment"),
  };

  return (
    <div className="space-y-4">
      {/* Customer Info Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("customerInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("customerName")}</span>
            <span>{customerData.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("customerPhone")}</span>
            <span dir="ltr">{customerData.customer_phone}</span>
          </div>
          {customerData.customer_email && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("customerEmail")}
              </span>
              <span dir="ltr">{customerData.customer_email}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("shippingAddress")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("fullName")}</span>
            <span>{addressData.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("city")}</span>
            <span>{addressData.city}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("streetAddress")}</span>
            <span>{addressData.street_line_1}</span>
          </div>
          {addressData.region && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("state")}</span>
              <span>{addressData.region}</span>
            </div>
          )}
          {addressData.street_line_2 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("streetAddress2")}
              </span>
              <span>{addressData.street_line_2}</span>
            </div>
          )}
          {addressData.postal_code && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("postalCode")}</span>
              <span dir="ltr">{addressData.postal_code}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("paymentMethod")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("paymentMethod")}</span>
            <span>
              {paymentMethodLabels[paymentData.payment_method] ||
                paymentData.payment_method}
            </span>
          </div>
          {paymentData.notes_from_customer && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("notes")}</span>
              <span className="text-end max-w-[200px]">
                {paymentData.notes_from_customer}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cart Items Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("orderSummary")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate flex-1">
                  {item.product.name} × {item.quantity}
                </span>
                <span className="font-medium ms-2">{item.total_price} د.ل</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("subtotal")}</span>
              <span>{subtotal} د.ل</span>
            </div>
            {discount && discount !== "0" && (
              <div className="flex justify-between text-sm text-green-600">
                <span>{t("discount")}</span>
                <span>-{discount} د.ل</span>
              </div>
            )}
            {coupon && (
              <div className="text-xs text-green-600">
                {t("couponAppliedLabel", { code: coupon.code })}
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>{t("total")}</span>
              <span className="text-primary">{total} د.ل</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Error */}
      {serverError && <FormSummaryError errors={[serverError]} />}

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <ChevronLeft className="w-4 h-4 me-1" />
          {t("checkoutSteps.back")}
        </Button>
        <Button onClick={onPlaceOrder} disabled={isSubmitting}>
          {isSubmitting ? t("checkoutSteps.placing") : t("placeOrder")}
        </Button>
      </div>
    </div>
  );
}
