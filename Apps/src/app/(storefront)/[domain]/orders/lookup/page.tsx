"use client";

/**
 * Storefront Order Lookup Page
 * Order number + phone lookup form.
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5
 */

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search, Package } from "lucide-react";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FormError, SubmitButton } from "@/components/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@/types";

const lookupSchema = z.object({
  order_number: z
    .string()
    .min(1, "Order number is required")
    .max(50, "Order number must not exceed 50 characters"),
  phone: z
    .string()
    .min(1, "Phone or email is required")
    .max(255, "Must not exceed 255 characters"),
});

type LookupFormData = z.infer<typeof lookupSchema>;

function getOrderStatusVariant(status: string) {
  switch (status) {
    case "DELIVERED":
      return "success" as const;
    case "CANCELED":
    case "RETURNED":
      return "error" as const;
    case "PENDING":
    case "DRAFT":
      return "warning" as const;
    case "SHIPPED":
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
      return "info" as const;
    default:
      return "neutral" as const;
  }
}

export default function StorefrontOrderLookupPage() {
  const params = useParams();
  const domain = params.domain as string;
  const t = useTranslations("storefront");

  const [order, setOrder] = useState<Order | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LookupFormData>({
    resolver: zodResolver(lookupSchema),
  });

  const onSubmit = async (data: LookupFormData) => {
    try {
      setServerError(null);
      setOrder(null);
      const response = await storefrontService.orderLookup(domain, {
        order_number: data.order_number,
        phone: data.phone,
      });
      setOrder(response.data);
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      if (apiError.status === 404) {
        setServerError(t("orderNotFound"));
      } else if (apiError.status === 400) {
        setServerError(t("invalidLookupData"));
      } else if (apiError.status === 429) {
        setServerError(t("tooManyAttempts"));
      } else {
        setServerError(apiError.message || t("lookupError"));
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        {t("orderLookup")}
      </h1>

      {/* Lookup Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">{t("lookupDescription")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="order_number">{t("orderNumber")} *</Label>
              <Input
                id="order_number"
                {...register("order_number")}
                placeholder={t("orderNumberPlaceholder")}
                className="mt-1"
                dir="ltr"
              />
              {errors.order_number && (
                <FormError message={errors.order_number.message} />
              )}
            </div>

            <div>
              <Label htmlFor="phone">{t("phoneOrEmail")} *</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder={t("phoneOrEmailPlaceholder")}
                className="mt-1"
                dir="ltr"
              />
              {errors.phone && <FormError message={errors.phone.message} />}
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <SubmitButton isSubmitting={isSubmitting} className="w-full">
              <Search className="h-4 w-4 me-2" />
              {t("lookupOrder")}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      {/* Order Result */}
      {order && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">#{order.order_number}</CardTitle>
              <StatusBadge
                label={order.status}
                variant={getOrderStatusVariant(order.status)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t("date")}</span>
                <p className="font-medium">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("paymentStatus")}
                </span>
                <p className="font-medium">{order.payment_status}</p>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t("paymentMethod")}
                </span>
                <p className="font-medium">{order.payment_method}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t("total")}</span>
                <p className="font-bold text-primary">{order.total} د.ل</p>
              </div>
            </div>

            <Separator />

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("items")}</h3>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.product_name} × {item.quantity}
                      </span>
                      <span className="font-medium">
                        {item.total_price || item.unit_price} د.ل
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Shipping Address */}
            {order.shipping_address && (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  {t("shippingAddress")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {order.shipping_address.full_name}
                  <br />
                  {order.shipping_address.street_line_1}
                  {order.shipping_address.street_line_2 &&
                    `, ${order.shipping_address.street_line_2}`}
                  <br />
                  {order.shipping_address.city}
                  {order.shipping_address.state &&
                    `, ${order.shipping_address.state}`}
                </p>
              </div>
            )}

            {/* Timeline */}
            {order.timeline && order.timeline.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3">
                    {t("timeline")}
                  </h3>
                  <div className="space-y-3">
                    {order.timeline.map((event, index) => (
                      <div key={index} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-foreground">{event.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(event.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Totals */}
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span>{order.subtotal} د.ل</span>
              </div>
              {order.discount_amount && order.discount_amount !== "0" && (
                <div className="flex justify-between text-green-600">
                  <span>{t("discount")}</span>
                  <span>-{order.discount_amount} د.ل</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2">
                <span>{t("total")}</span>
                <span className="text-primary">{order.total} د.ل</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
