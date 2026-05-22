"use client";

/**
 * Order Confirmation Page
 * Displays order details after successful checkout.
 * Shows: order number, products summary, total, shipping address, status.
 * Requirements: 8.6
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle, Package, MapPin, CreditCard } from "lucide-react";

import { formatCurrencyLYD } from "@/lib/i18n/formatters";
import type { SupportedLocale } from "@/lib/i18n/config";
import { ROUTES } from "@/lib/constants/routes";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { Order } from "@/types";

const ORDER_CONFIRMATION_STORAGE_KEY = "wasl_order_confirmation";

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

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("storefront");
  const locale = useLocale() as SupportedLocale;

  const domain = params.domain as string;
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load order data from sessionStorage (set during checkout)
    try {
      const stored = sessionStorage.getItem(ORDER_CONFIRMATION_STORAGE_KEY);
      if (stored) {
        const parsedOrder: Order = JSON.parse(stored);
        // Verify the order number matches
        if (parsedOrder.order_number === orderNumber) {
          setOrder(parsedOrder);
          // Clean up after reading
          sessionStorage.removeItem(ORDER_CONFIRMATION_STORAGE_KEY);
        }
      }
    } catch {
      // Ignore parse errors
    }
    setLoading(false);
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-16 w-16 bg-muted rounded-full mx-auto" />
          <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
          <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Success Header */}
      <header className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <CheckCircle
            className="h-16 w-16 text-green-500"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("orderSuccess")}
        </h1>
        <p className="text-muted-foreground">{t("orderSuccessDesc")}</p>
      </header>

      {/* Order Number & Status */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("orderNumber")}
              </p>
              <p className="text-xl font-bold text-foreground" dir="ltr">
                {orderNumber}
              </p>
            </div>
            <StatusBadge
              label={order?.status ?? "PENDING"}
              variant={getOrderStatusVariant(order?.status ?? "PENDING")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Details (only if we have full order data) */}
      {order && (
        <>
          {/* Products Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" aria-hidden="true" />
                {t("orderSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.product_name}
                        </p>
                        {item.variant_title && (
                          <p className="text-xs text-muted-foreground">
                            {item.variant_title}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("quantity")}: {item.quantity} ×{" "}
                          {formatCurrencyLYD(
                            parseFloat(item.unit_price),
                            locale,
                          )}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-foreground whitespace-nowrap">
                      {formatCurrencyLYD(parseFloat(item.total_price), locale)}
                    </p>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span>
                    {formatCurrencyLYD(parseFloat(order.subtotal), locale)}
                  </span>
                </div>
                {order.discount_amount && order.discount_amount !== "0" && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t("discount")}</span>
                    <span>
                      -
                      {formatCurrencyLYD(
                        parseFloat(order.discount_amount),
                        locale,
                      )}
                    </span>
                  </div>
                )}
                {order.shipping_amount && order.shipping_amount !== "0" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("shipping")}
                    </span>
                    <span>
                      {formatCurrencyLYD(
                        parseFloat(order.shipping_amount),
                        locale,
                      )}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>{t("total")}</span>
                  <span className="text-primary">
                    {formatCurrencyLYD(parseFloat(order.total), locale)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shipping_address && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {t("shippingAddress")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <address className="text-sm text-muted-foreground not-italic space-y-1">
                  <p className="font-medium text-foreground">
                    {order.shipping_address.full_name}
                  </p>
                  <p>{order.shipping_address.street_line_1}</p>
                  {order.shipping_address.street_line_2 && (
                    <p>{order.shipping_address.street_line_2}</p>
                  )}
                  <p>
                    {order.shipping_address.city}
                    {order.shipping_address.state &&
                      `, ${order.shipping_address.state}`}
                  </p>
                  {order.shipping_address.postal_code && (
                    <p>{order.shipping_address.postal_code}</p>
                  )}
                </address>
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                {t("paymentMethod")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                {t(getPaymentMethodKey(order.payment_method))}
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
        <Button
          variant="default"
          onClick={() => router.push(ROUTES.STOREFRONT.PRODUCTS(domain))}
        >
          {t("continueShopping")}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(ROUTES.STOREFRONT.ORDER_LOOKUP(domain))}
        >
          {t("trackOrder")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Maps payment method enum to translation key
 */
function getPaymentMethodKey(method: string | null): string {
  if (!method) {
    return "cashOnDelivery";
  }

  switch (method) {
    case "CASH_ON_DELIVERY":
      return "cashOnDelivery";
    case "BANK_TRANSFER":
      return "bankTransfer";
    case "CARD":
      return "card";
    case "WALLET":
      return "wallet";
    default:
      return "cashOnDelivery";
  }
}
