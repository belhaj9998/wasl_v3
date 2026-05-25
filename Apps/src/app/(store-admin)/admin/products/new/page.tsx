"use client";

/**
 * Product New Page (alias for /products/create)
 * Renders the ProductForm in create mode with tabbed interface.
 * Supports: Basic Info, Options & Variants, Images, Categories, SEO tabs.
 * Includes "Save as Draft" functionality.
 *
 * Requirements: 9.4, 9.5, 6.6
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { ProductForm } from "@/components/products/ProductForm";
import { Button } from "@/components/ui/button";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { createProduct } from "@/lib/store/slices/products.thunks";
import { fetchCategories } from "@/lib/store/slices/categories.thunks";
import { useStore } from "@/hooks/useStore";
import { ROUTES } from "@/lib/constants/routes";
import type { ProductFormData } from "@/lib/validators/product.schema";

export default function ProductNewPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentStoreId } = useStore();
  const t = useTranslations("products");
  const tSuccess = useTranslations("success");

  const { items: categories } = useAppSelector((state) => state.categories);

  // Fetch categories on mount
  useEffect(() => {
    if (currentStoreId) {
      dispatch(fetchCategories({ storeId: currentStoreId }));
    }
  }, [dispatch, currentStoreId]);

  // Handle form submission
  const handleSubmit = async (
    data: ProductFormData & { category_ids: number[] },
  ) => {
    if (!currentStoreId) return;

    const payload = {
      name: data.name,
      slug: data.slug || undefined,
      description: data.description || undefined,
      short_description: data.short_description || undefined,
      base_price: data.base_price,
      compare_at_price: data.compare_at_price || undefined,
      cost_price: data.cost_price || undefined,
      track_inventory: data.track_inventory,
      has_variants: data.has_variants,
      status: data.status || "DRAFT",
      category_ids:
        data.category_ids.length > 0 ? data.category_ids : undefined,
    };

    const result = await dispatch(
      createProduct({ storeId: currentStoreId, payload }),
    ).unwrap();

    toast.success(tSuccess("product.created"));
    return result;
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(ROUTES.STORE_ADMIN.PRODUCTS)}
          aria-label={t("backToProducts")}
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("createTitle")}
          </h1>
          <p className="text-muted-foreground">{t("createDescription")}</p>
        </div>
      </div>

      {/* Product Form */}
      <ProductForm categories={categories} onSubmit={handleSubmit} />
    </div>
  );
}
