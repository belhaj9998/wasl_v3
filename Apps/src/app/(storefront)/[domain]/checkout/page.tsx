"use client";

/**
 * Storefront Multi-Step Checkout Page
 * 4 steps: Customer Info → Address → Payment Method → Review
 * Requirements: 8.5, 9.11
 */

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { storefrontService } from "@/lib/api/services/storefront.service";
import {
  CHECKOUT_STEPS,
  type CheckoutStep,
  type CheckoutCustomerData,
  type CheckoutAddressData,
  type CheckoutPaymentData,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared";

import { CheckoutStepIndicator } from "./CheckoutStepIndicator";
import { CustomerInfoStep } from "./CustomerInfoStep";
import { AddressStep } from "./AddressStep";
import { PaymentStep } from "./PaymentStep";
import { ReviewStep } from "./ReviewStep";

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

  // Multi-step state
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("customer");
  const [customerData, setCustomerData] = useState<CheckoutCustomerData | null>(
    null,
  );
  const [addressData, setAddressData] = useState<CheckoutAddressData | null>(
    null,
  );
  const [paymentData, setPaymentData] = useState<CheckoutPaymentData | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const currentStepIndex = CHECKOUT_STEPS.indexOf(currentStep);

  const handleCustomerNext = useCallback((data: CheckoutCustomerData) => {
    setCustomerData(data);
    setCurrentStep("address");
  }, []);

  const handleAddressNext = useCallback((data: CheckoutAddressData) => {
    setAddressData(data);
    setCurrentStep("payment");
  }, []);

  const handlePaymentNext = useCallback((data: CheckoutPaymentData) => {
    setPaymentData(data);
    setCurrentStep("review");
  }, []);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(CHECKOUT_STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  const handlePlaceOrder = useCallback(async () => {
    if (!customerData || !addressData || !paymentData) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await storefrontService.checkout(domain, {
        customer_name: customerData.customer_name,
        customer_phone: customerData.customer_phone,
        shipping_address: {
          full_name: addressData.full_name,
          city: addressData.city,
          street_line_1: addressData.street_line_1,
          street_line_2: addressData.street_line_2 || undefined,
          state: addressData.region || undefined,
          postal_code: addressData.postal_code || undefined,
        },
        payment_method: paymentData.payment_method,
        notes_from_customer: paymentData.notes_from_customer || undefined,
      });

      const order = response.data.order; // Store order data in sessionStorage for the confirmation page
      try {
        sessionStorage.setItem(
          "wasl_order_confirmation",
          JSON.stringify(order),
        );
      } catch {
        // Ignore storage errors
      }
      dispatch(resetCart());
      toast.success(t("orderPlaced"));
      router.push(
        ROUTES.STOREFRONT.ORDER_CONFIRMATION(domain, order.order_number),
      );
    } catch (err: unknown) {
      const apiError = err as {
        status?: number;
        errors?: Array<{ path?: string[]; message?: string }>;
        message?: string;
      };

      if (apiError.status === 400) {
        setServerError(apiError.message || t("insufficientInventory"));
      } else {
        setServerError(apiError.message || t("checkoutError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [customerData, addressData, paymentData, domain, dispatch, t]);

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

      {/* Step Indicator */}
      <CheckoutStepIndicator steps={CHECKOUT_STEPS} currentStep={currentStep} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Step Content */}
        <div className="lg:col-span-2">
          {currentStep === "customer" && (
            <CustomerInfoStep
              defaultValues={customerData}
              onNext={handleCustomerNext}
            />
          )}

          {currentStep === "address" && (
            <AddressStep
              defaultValues={addressData}
              onNext={handleAddressNext}
              onBack={handleBack}
            />
          )}

          {currentStep === "payment" && (
            <PaymentStep
              defaultValues={paymentData}
              onNext={handlePaymentNext}
              onBack={handleBack}
            />
          )}

          {currentStep === "review" && (
            <ReviewStep
              customerData={customerData!}
              addressData={addressData!}
              paymentData={paymentData!}
              items={items}
              subtotal={subtotal}
              discount={discount}
              total={total}
              coupon={coupon}
              isSubmitting={isSubmitting}
              serverError={serverError}
              onBack={handleBack}
              onPlaceOrder={handlePlaceOrder}
            />
          )}
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
        </div>
      </div>
    </div>
  );
}
