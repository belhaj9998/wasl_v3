"use client";

/**
 * MiniCartPopup
 * Shows a popup when an item is added to the cart.
 * Displays: product name, quantity added, price, and cart total.
 * Auto-dismisses after 5 seconds or can be closed manually.
 * Does not navigate away from the current page.
 * Requirements: 8.3
 */

import { useEffect, useRef, useCallback } from "react";
import { X, ShoppingCart, Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCartTotal } from "@/lib/store/slices/cart.slice";
import { useMiniCart } from "@/hooks/useMiniCart";
import { formatCurrencyLYD } from "@/lib/i18n/formatters";

export function MiniCartPopup() {
  const t = useTranslations("storefront");
  const tA11y = useTranslations("accessibility.buttons");
  const cartTotal = useAppSelector(selectCartTotal);
  const { item, visible, hide } = useMiniCart();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const locale =
    typeof document !== "undefined" && document.documentElement.lang === "ar"
      ? "ar"
      : "en";

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      clearTimer();
      timerRef.current = setTimeout(() => {
        hide();
      }, 5000);
    }

    return clearTimer;
  }, [visible, hide, clearTimer]);

  // Handle Escape key to close
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hide();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, hide]);

  if (!visible || !item) return null;

  return (
    <div
      ref={popupRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-20 end-4 z-[100] w-80 max-w-[calc(100vw-2rem)] rounded-lg border bg-card shadow-lg animate-in slide-in-from-top-2 fade-in duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
          <Check className="h-4 w-4" />
          <span>{t("addedToCart")}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={hide}
          aria-label={tA11y("close")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Product info */}
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {item.productName}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>
                {t("quantity")}: {item.quantity}
              </span>
              <span>•</span>
              <span>{formatCurrencyLYD(parseFloat(item.price), locale)}</span>
            </div>
          </div>
        </div>

        {/* Cart total */}
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">
            {t("miniCartTotal")}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {formatCurrencyLYD(parseFloat(cartTotal), locale)}
          </span>
        </div>
      </div>
    </div>
  );
}
