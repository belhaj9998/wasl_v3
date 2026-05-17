"use client";

/**
 * Product Quick View Modal
 * Displays product info in a modal without navigating to the detail page.
 * Shows: main image, name, price, description (first 200 chars),
 * variant options, and add-to-cart button.
 *
 * Requirements: 8.4
 */

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Package, Minus, Plus, ShoppingCart, Check, X } from "lucide-react";
import { toast } from "sonner";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { addToCartThunk } from "@/lib/store/slices/cart.thunks";
import { selectCartLoading } from "@/lib/store/slices/cart.slice";
import { formatCurrencyLYD } from "@/lib/i18n/formatters";
import type { SupportedLocale } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, ProductVariant } from "@/types";

interface ProductQuickViewProps {
  product: Product;
  domain: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductQuickView({
  product,
  domain,
  isOpen,
  onClose,
}: ProductQuickViewProps) {
  const t = useTranslations("storefront");
  const tA11y = useTranslations("accessibility.buttons");
  const locale = useLocale() as SupportedLocale;
  const dispatch = useAppDispatch();
  const cartLoading = useAppSelector(selectCartLoading);

  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  // Use focus trap when modal is open
  useFocusTrap(modalRef, isOpen);

  // Store the element that triggered the modal open
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Initialize selected variant when product changes or modal opens
  useEffect(() => {
    if (isOpen && product.variants && product.variants.length > 0) {
      const defaultVariant =
        product.variants.find((v) => v.is_default) || product.variants[0];
      setSelectedVariant(defaultVariant);
    }
    // Reset state when opening
    if (isOpen) {
      setQuantity(1);
      setAddedToCart(false);
    }
  }, [isOpen, product]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  // Restore focus to trigger element on close
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Close when clicking the overlay (outside the modal content)
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getVariantPrice = (): number => {
    if (selectedVariant?.price) return parseFloat(selectedVariant.price);
    return parseFloat(product.base_price);
  };

  const getVariantComparePrice = (): number | null => {
    if (selectedVariant?.compare_at_price)
      return parseFloat(selectedVariant.compare_at_price);
    if (product.compare_at_price) return parseFloat(product.compare_at_price);
    return null;
  };

  const isInStock = (): boolean => {
    if (!product.track_inventory) return true;
    if (!selectedVariant?.inventory) return true;
    return selectedVariant.inventory.available_quantity > 0;
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    try {
      await dispatch(
        addToCartThunk({
          domain,
          productId: product.id,
          variantId: selectedVariant.id,
          quantity,
        }),
      ).unwrap();
      setAddedToCart(true);
      toast.success(t("addedToCart"));
      setTimeout(() => setAddedToCart(false), 2000);
    } catch {
      toast.error(t("addToCartError"));
    }
  };

  const getTruncatedDescription = (): string => {
    const desc = product.description || product.short_description || "";
    if (desc.length <= 200) return desc;
    return desc.slice(0, 200) + "...";
  };

  // Get the main image (first by sort_order)
  const mainImage =
    product.media && product.media.length > 0
      ? [...product.media].sort((a, b) => a.sort_order - b.sort_order)[0]
      : null;

  if (!isOpen) return null;

  const titleId = `quick-view-title-${product.id}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Modal Content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-background shadow-xl border"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute end-3 top-3 z-10 rounded-full p-1.5 bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label={tA11y("closeMenu")}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-6">
          {/* Product Image */}
          <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
            {mainImage ? (
              <Image
                src={mainImage.url}
                alt={mainImage.alt_text || product.name}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-3">
            {/* Name */}
            <h2
              id={titleId}
              className="text-lg font-bold text-foreground line-clamp-2"
            >
              {product.name}
            </h2>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">
                {formatCurrencyLYD(getVariantPrice(), locale)}
              </span>
              {getVariantComparePrice() && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrencyLYD(getVariantComparePrice()!, locale)}
                </span>
              )}
            </div>

            {/* Description (first 200 chars) */}
            {getTruncatedDescription() && (
              <p className="text-sm text-muted-foreground line-clamp-4">
                {getTruncatedDescription()}
              </p>
            )}

            {/* Variant Selection */}
            {product.variants && product.variants.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  {t("selectVariant")}
                </label>
                <Select
                  value={
                    selectedVariant ? String(selectedVariant.id) : undefined
                  }
                  onValueChange={(value) => {
                    const variant = product.variants?.find(
                      (v) => v.id === Number(value),
                    );
                    if (variant) setSelectedVariant(variant);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectVariant")} />
                  </SelectTrigger>
                  <SelectContent>
                    {product.variants
                      .filter((v) => v.is_active)
                      .map((variant) => (
                        <SelectItem key={variant.id} value={String(variant.id)}>
                          {variant.title}
                          {variant.price &&
                            ` - ${formatCurrencyLYD(parseFloat(variant.price), locale)}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("quantity")}
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label={tA11y("decreaseQuantity")}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium w-8 text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label={tA11y("increaseQuantity")}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              className="w-full mt-auto"
              onClick={handleAddToCart}
              disabled={!isInStock() || cartLoading || !selectedVariant}
            >
              {addedToCart ? (
                <>
                  <Check className="me-2 h-4 w-4" />
                  {t("addedToCart")}
                </>
              ) : (
                <>
                  <ShoppingCart className="me-2 h-4 w-4" />
                  {isInStock() ? t("addToCart") : t("outOfStock")}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
