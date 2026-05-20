"use client";

/**
 * Storefront Cart Page
 * Shows cart items, quantities, totals, and checkout link.
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ShoppingCart, Minus, Plus, Trash2, Tag, X } from "lucide-react";
import { toast } from "sonner";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  selectCartItems,
  selectCartSubtotal,
  selectCartDiscount,
  selectCartTotal,
  selectCartCoupon,
  selectCartLoading,
  setCart,
} from "@/lib/store/slices/cart.slice";
import {
  updateCartItemThunk,
  removeCartItemThunk,
  applyCouponThunk,
  removeCouponThunk,
} from "@/lib/store/slices/cart.thunks";
import { ROUTES } from "@/lib/constants/routes";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { CartState } from "@/lib/store/slices/cart.slice";

export default function StorefrontCartPage() {
  const params = useParams();
  const domain = params.domain as string;
  const t = useTranslations("storefront");
  const tA11y = useTranslations("accessibility.buttons");
  const dispatch = useAppDispatch();

  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const discount = useAppSelector(selectCartDiscount);
  const total = useAppSelector(selectCartTotal);
  const coupon = useAppSelector(selectCartCoupon);
  const loading = useAppSelector(selectCartLoading);

  const [couponCode, setCouponCode] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [couponLoading, setCouponLoading] = useState(false);

  // Fetch cart on mount
  useEffect(() => {
    async function fetchCart() {
      try {
        const response = await storefrontService.getCart(domain);
        dispatch(
          setCart({
            items: response.data.cart.items ?? [],
            subtotal: response.data.cart.subtotal ?? "0",
            discount_amount: response.data.cart.discount_total ?? "0",
            total: response.data.cart.grand_total ?? "0",
            coupon: response.data.cart.coupon ?? null,
          } as CartState),
        );
      } catch {
        // Cart might not exist yet, that's ok
      } finally {
        setPageLoading(false);
      }
    }

    fetchCart();
  }, [domain, dispatch]);

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    try {
      await dispatch(
        updateCartItemThunk({ domain, itemId, quantity: newQuantity }),
      ).unwrap();
    } catch {
      toast.error(t("updateCartError"));
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await dispatch(removeCartItemThunk({ domain, itemId })).unwrap();
      toast.success(t("itemRemoved"));
    } catch {
      toast.error(t("removeItemError"));
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      await dispatch(
        applyCouponThunk({ domain, code: couponCode.trim() }),
      ).unwrap();
      toast.success(t("couponApplied"));
      setCouponCode("");
    } catch {
      toast.error(t("couponError"));
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponLoading(true);
    try {
      await dispatch(removeCouponThunk({ domain })).unwrap();
      toast.success(t("couponRemoved"));
    } catch {
      toast.error(t("couponRemoveError"));
    } finally {
      setCouponLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={ShoppingCart}
          title={t("emptyCart")}
          description={t("emptyCartDesc")}
          action={{
            label: t("continueShopping"),
            onClick: () =>
              (window.location.href = ROUTES.STOREFRONT.PRODUCTS(domain)),
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">{t("cart")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0 relative">
                    {item.product.media && item.product.media.length > 0 ? (
                      <Image
                        src={item.product.media[0].url}
                        alt={item.product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-medium text-foreground truncate">
                      {item.product.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {item.variant.title}
                    </p>
                    <p className="text-sm font-medium text-primary mt-1">
                      {item.unit_price} د.ل
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        handleUpdateQuantity(item.id, item.quantity - 1)
                      }
                      disabled={loading}
                      aria-label={tA11y("decreaseQuantity")}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-8 text-center">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        handleUpdateQuantity(item.id, item.quantity + 1)
                      }
                      disabled={loading}
                      aria-label={tA11y("increaseQuantity")}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Line Total & Remove */}
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-sm font-bold text-foreground">
                      {item.total_price} د.ل
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={loading}
                      aria-label={tA11y("removeItem")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("orderSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Coupon */}
              {coupon ? (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      {coupon.code}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleRemoveCoupon}
                    disabled={couponLoading}
                    aria-label={tA11y("removeCoupon")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder={t("couponCode")}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                  >
                    {t("apply")}
                  </Button>
                </div>
              )}

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span className="font-medium">{subtotal} د.ل</span>
                </div>
                {discount && discount !== "0" && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t("discount")}</span>
                    <span>-{discount} د.ل</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>{t("total")}</span>
                  <span className="text-primary">{total} د.ل</span>
                </div>
              </div>

              {/* Checkout Button */}
              <Link href={ROUTES.STOREFRONT.CHECKOUT(domain)} className="block">
                <Button className="w-full" size="lg" disabled={loading}>
                  {t("proceedToCheckout")}
                </Button>
              </Link>

              {/* Continue Shopping */}
              <Link
                href={ROUTES.STOREFRONT.PRODUCTS(domain)}
                className="block text-center"
              >
                <Button variant="ghost" size="sm" className="w-full">
                  {t("continueShopping")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
