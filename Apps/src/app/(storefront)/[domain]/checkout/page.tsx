"use client";

/**
 * Storefront Checkout Page
 * Checkout form with validation, shipping address, payment method, and order placement.
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { storefrontService } from "@/lib/api/services/storefront.service";
import {
  checkoutSchema,
  type CheckoutFormData,
} from "@/lib/validators/checkout.schema";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartDiscount,
  selectCartTotal,
  selectCartCoupon,
  reset as resetCart,
} from "@/lib/store/slices/cart.slice";
import { ROUTES } from "@/lib/constants/routes";
import { FormError, FormSummaryError, SubmitButton } from "@/components/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared";
import type { Order } from "@/types";

export default function StorefrontCheckoutPage() {
  const params = useParams();
  const domain = params.domain as string;
  const router = useRouter();
  const t = useTranslations("storefront");
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const discount = useAppSelector(selectCartDiscount);
  const total = useAppSelector(selectCartTotal);
  const coupon = useAppSelector(selectCartCoupon);

  const [serverError, setServerError] = useState<string | null>(null);
  const [orderConfirmation, setOrderConfirmation] = useState<Order | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_email: undefined,
      shipping_address: {
        full_name: "",
        city: "",
        street_line_1: "",
        street_line_2: undefined,
        state: undefined,
        postal_code: undefined,
        country: undefined,
      },
      payment_method: "CASH_ON_DELIVERY",
      notes_from_customer: undefined,
    },
  });

  const onSubmit = async (data: CheckoutFormData) => {
    try {
      setServerError(null);
      const response = await storefrontService.checkout(domain, {
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || undefined,
        shipping_address: {
          full_name: data.shipping_address.full_name,
          city: data.shipping_address.city,
          street_line_1: data.shipping_address.street_line_1,
          street_line_2: data.shipping_address.street_line_2 || undefined,
          state: data.shipping_address.state || undefined,
          postal_code: data.shipping_address.postal_code || undefined,
          country: data.shipping_address.country || undefined,
        },
        payment_method: data.payment_method,
        notes_from_customer: data.notes_from_customer || undefined,
      });

      setOrderConfirmation(response.data);
      dispatch(resetCart());
      toast.success(t("orderPlaced"));
    } catch (err: unknown) {
      const apiError = err as {
        status?: number;
        errors?: Array<{ path?: string[]; message?: string }>;
        message?: string;
      };

      if (apiError.status === 422 && apiError.errors) {
        for (const err of apiError.errors) {
          const field = err.path?.[0];
          if (field) {
            setError(field as keyof CheckoutFormData, {
              message: err.message || "Validation error",
            });
          }
        }
      } else if (apiError.status === 400) {
        setServerError(apiError.message || t("insufficientInventory"));
      } else {
        setServerError(apiError.message || t("checkoutError"));
      }
    }
  };

  // Order Confirmation View
  if (orderConfirmation) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t("orderSuccess")}
        </h1>
        <p className="text-muted-foreground mb-4">{t("orderSuccessDesc")}</p>
        <Card className="text-start">
          <CardContent className="p-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("orderNumber")}</span>
              <span className="font-bold">
                {orderConfirmation.order_number}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("total")}</span>
              <span className="font-bold">{orderConfirmation.total} د.ل</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("paymentMethod")}
              </span>
              <span>{orderConfirmation.payment_method}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          title={t("emptyCart")}
          description={t("emptyCartCheckout")}
          action={{
            label: t("continueShopping"),
            onClick: () => router.push(ROUTES.STOREFRONT.PRODUCTS(domain)),
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        {t("checkout")}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
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
                    className="mt-1"
                  />
                  {errors.customer_name && (
                    <FormError message={errors.customer_name.message} />
                  )}
                </div>
                <div>
                  <Label htmlFor="customer_phone">{t("customerPhone")} *</Label>
                  <Input
                    id="customer_phone"
                    {...register("customer_phone")}
                    placeholder="+218XXXXXXXXX"
                    className="mt-1"
                    dir="ltr"
                  />
                  {errors.customer_phone && (
                    <FormError message={errors.customer_phone.message} />
                  )}
                </div>
                <div>
                  <Label htmlFor="customer_email">{t("customerEmail")}</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    {...register("customer_email")}
                    className="mt-1"
                    dir="ltr"
                  />
                  {errors.customer_email && (
                    <FormError message={errors.customer_email.message} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("shippingAddress")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="shipping_full_name">{t("fullName")} *</Label>
                  <Input
                    id="shipping_full_name"
                    {...register("shipping_address.full_name")}
                    className="mt-1"
                  />
                  {errors.shipping_address?.full_name && (
                    <FormError
                      message={errors.shipping_address.full_name.message}
                    />
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shipping_city">{t("city")} *</Label>
                    <Input
                      id="shipping_city"
                      {...register("shipping_address.city")}
                      className="mt-1"
                    />
                    {errors.shipping_address?.city && (
                      <FormError
                        message={errors.shipping_address.city.message}
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="shipping_state">{t("state")}</Label>
                    <Input
                      id="shipping_state"
                      {...register("shipping_address.state")}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="shipping_street_1">
                    {t("streetAddress")} *
                  </Label>
                  <Input
                    id="shipping_street_1"
                    {...register("shipping_address.street_line_1")}
                    className="mt-1"
                  />
                  {errors.shipping_address?.street_line_1 && (
                    <FormError
                      message={errors.shipping_address.street_line_1.message}
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="shipping_street_2">
                    {t("streetAddress2")}
                  </Label>
                  <Input
                    id="shipping_street_2"
                    {...register("shipping_address.street_line_2")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="shipping_postal_code">
                    {t("postalCode")}
                  </Label>
                  <Input
                    id="shipping_postal_code"
                    {...register("shipping_address.postal_code")}
                    className="mt-1"
                    dir="ltr"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("paymentMethod")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  defaultValue="CASH_ON_DELIVERY"
                  onValueChange={(value) =>
                    setValue(
                      "payment_method",
                      value as CheckoutFormData["payment_method"],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH_ON_DELIVERY">
                      {t("cashOnDelivery")}
                    </SelectItem>
                    <SelectItem value="BANK_TRANSFER">
                      {t("bankTransfer")}
                    </SelectItem>
                    <SelectItem value="CARD">{t("card")}</SelectItem>
                    <SelectItem value="WALLET">{t("wallet")}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.payment_method && (
                  <FormError message={errors.payment_method.message} />
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("notes")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...register("notes_from_customer")}
                  placeholder={t("notesPlaceholder")}
                  rows={3}
                />
                {errors.notes_from_customer && (
                  <FormError message={errors.notes_from_customer.message} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-base">{t("orderSummary")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate flex-1">
                        {item.product.name} × {item.quantity}
                      </span>
                      <span className="font-medium ms-2">
                        {item.total_price} د.ل
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("subtotal")}
                    </span>
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

                {/* Server Error */}
                {serverError && <FormSummaryError errors={[serverError]} />}

                {/* Submit */}
                <SubmitButton isSubmitting={isSubmitting} className="w-full">
                  {t("placeOrder")}
                </SubmitButton>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
