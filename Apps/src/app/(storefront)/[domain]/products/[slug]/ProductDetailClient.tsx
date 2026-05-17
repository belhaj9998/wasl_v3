"use client";

/**
 * Storefront Product Detail Page
 * Displays product info, images, variant selection, and add-to-cart button.
 * Requirements: 16.5
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Package, Minus, Plus, ShoppingCart, Check } from "lucide-react";
import { toast } from "sonner";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { addToCartThunk } from "@/lib/store/slices/cart.thunks";
import { selectCartLoading } from "@/lib/store/slices/cart.slice";
import { EmptyState } from "@/components/shared";
import { showMiniCart } from "@/hooks/useMiniCart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, ProductVariant } from "@/types";

export default function ProductDetailClient() {
  const params = useParams();
  const domain = params.domain as string;
  const slug = params.slug as string;
  const t = useTranslations("storefront");
  const tA11y = useTranslations("accessibility.buttons");
  const dispatch = useAppDispatch();
  const cartLoading = useAppSelector(selectCartLoading);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null,
  );
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);

        const response = await storefrontService.getProductBySlug(domain, slug);

        if (!cancelled) {
          setProduct(response.data);
          // Select default variant
          if (response.data.variants && response.data.variants.length > 0) {
            const defaultVariant =
              response.data.variants.find((v) => v.is_default) ||
              response.data.variants[0];
            setSelectedVariant(defaultVariant);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const apiError = err as { status?: number };
          if (apiError.status === 404) {
            setError("not_found");
          } else {
            setError("load_failed");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [domain, slug]);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;

    try {
      await dispatch(
        addToCartThunk({
          domain,
          productId: product!.id,
          variantId: selectedVariant.id,
          quantity,
        }),
      ).unwrap();
      setAddedToCart(true);

      // Show mini-cart popup with product details
      showMiniCart({
        productName: product!.name,
        quantity,
        price: getVariantPrice(),
      });

      setTimeout(() => setAddedToCart(false), 2000);
    } catch {
      toast.error(t("addToCartError"));
    }
  };

  const getVariantPrice = () => {
    if (selectedVariant?.price) return selectedVariant.price;
    return product?.base_price || "0";
  };

  const getVariantComparePrice = () => {
    if (selectedVariant?.compare_at_price)
      return selectedVariant.compare_at_price;
    return product?.compare_at_price || null;
  };

  const isInStock = () => {
    if (!product?.track_inventory) return true;
    if (!selectedVariant?.inventory) return true;
    return selectedVariant.inventory.available_quantity > 0;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error === "not_found" || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={Package}
          title={t("productNotFound")}
          description={t("productNotFoundDesc")}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          title={t("loadError")}
          description={t("loadErrorDesc")}
          action={{
            label: t("retry"),
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  const media = product.media || [];
  const sortedMedia = [...media].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
            {sortedMedia.length > 0 ? (
              <Image
                src={sortedMedia[selectedImageIndex]?.url}
                alt={sortedMedia[selectedImageIndex]?.alt_text || product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {sortedMedia.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sortedMedia.map((img, index) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors relative ${
                    index === selectedImageIndex
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt_text || `${product.name} ${index + 1}`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {product.name}
            </h1>
            {product.short_description && (
              <p className="mt-2 text-muted-foreground">
                {product.short_description}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">
              {getVariantPrice()} د.ل
            </span>
            {getVariantComparePrice() && (
              <span className="text-lg text-muted-foreground line-through">
                {getVariantComparePrice()} د.ل
              </span>
            )}
          </div>

          {/* Variant Selection */}
          {product.variants && product.variants.length > 1 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                {t("selectVariant")}
              </label>
              <Select
                value={selectedVariant ? String(selectedVariant.id) : undefined}
                onValueChange={(value) => {
                  const variant = product.variants?.find(
                    (v) => v.id === Number(value),
                  );
                  if (variant) setSelectedVariant(variant);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectVariant")} />
                </SelectTrigger>
                <SelectContent>
                  {product.variants
                    .filter((v) => v.is_active)
                    .map((variant) => (
                      <SelectItem key={variant.id} value={String(variant.id)}>
                        {variant.title}
                        {variant.price && ` - ${variant.price} د.ل`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">
              {t("quantity")}
            </label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label={tA11y("decreaseQuantity")}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium w-12 text-center">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label={tA11y("increaseQuantity")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Add to Cart */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleAddToCart}
            disabled={!isInStock() || cartLoading || !selectedVariant}
          >
            {addedToCart ? (
              <>
                <Check className="me-2 h-5 w-5" />
                {t("addedToCart")}
              </>
            ) : (
              <>
                <ShoppingCart className="me-2 h-5 w-5" />
                {isInStock() ? t("addToCart") : t("outOfStock")}
              </>
            )}
          </Button>

          {/* Stock Status */}
          {product.track_inventory && selectedVariant?.inventory && (
            <p
              className={`text-sm ${
                selectedVariant.inventory.available_quantity > 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {selectedVariant.inventory.available_quantity > 0
                ? t("inStock", {
                    count: selectedVariant.inventory.available_quantity,
                  })
                : t("outOfStock")}
            </p>
          )}

          {/* Description */}
          {product.description && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {t("description")}
              </h2>
              <div className="prose prose-sm text-muted-foreground max-w-none">
                <p className="whitespace-pre-wrap">{product.description}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
