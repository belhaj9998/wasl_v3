"use client";

/**
 * Product Edit Page
 * Renders the ProductForm in edit mode with tabbed interface.
 * Supports status transitions: DRAFT→ACTIVE, ACTIVE→ARCHIVED, ARCHIVED→DRAFT.
 * Tabs preserve data when switching between them.
 *
 * Requirements: 9.4, 9.5, 6.6
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { ProductForm } from "@/components/products/ProductForm";
import { Button } from "@/components/ui/button";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchProductById,
  updateProduct,
  changeProductStatus,
} from "@/lib/store/slices/products.thunks";
import { fetchCategories } from "@/lib/store/slices/categories.thunks";
import { useStore } from "@/hooks/useStore";
import { ROUTES } from "@/lib/constants/routes";
import { productService } from "@/lib/api/services/product.service";
import { PermissionGate } from "@/components/shared/PermissionGate";
import type { ProductFormData } from "@/lib/validators/product.schema";
import type { ProductStatus } from "@/types";

export default function ProductEditPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const { currentStoreId } = useStore();
  const t = useTranslations("products");
  const tCommon = useTranslations("common");
  const tSuccess = useTranslations("success");

  const productId = Number(params.id);

  const { currentProduct: product, loading } = useAppSelector(
    (state) => state.products,
  );
  const { items: categories } = useAppSelector((state) => state.categories);

  const [duplicating, setDuplicating] = useState(false);

  // Fetch product and categories on mount
  useEffect(() => {
    if (currentStoreId && productId) {
      dispatch(fetchProductById({ storeId: currentStoreId, productId }));
      dispatch(fetchCategories({ storeId: currentStoreId }));
    }
  }, [dispatch, currentStoreId, productId]);

  // Handle form submission (update)
  const handleSubmit = async (
    data: ProductFormData & { category_ids: number[] },
  ) => {
    if (!currentStoreId || !productId) return;

    const payload = {
      name: data.name,
      slug: data.slug || undefined,
      description: data.description || undefined,
      short_description: data.short_description || undefined,
      base_price: data.base_price,
      compare_at_price: data.compare_at_price || undefined,
      cost_price: data.cost_price || undefined,
      track_inventory: data.track_inventory,
      category_ids: data.category_ids,
    };

    await dispatch(
      updateProduct({ storeId: currentStoreId, productId, payload }),
    ).unwrap();

    toast.success(tSuccess("product.updated"));
  };

  // Handle status change
  const handleStatusChange = async (newStatus: ProductStatus) => {
    if (!currentStoreId || !productId) return;

    await dispatch(
      changeProductStatus({
        storeId: currentStoreId,
        productId,
        status: newStatus,
      }),
    ).unwrap();

    // Re-fetch product to get updated status
    dispatch(fetchProductById({ storeId: currentStoreId, productId }));
  };

  // Handle product duplication
  const handleDuplicate = useCallback(async () => {
    if (!currentStoreId || !productId) return;

    setDuplicating(true);
    try {
      const response = await productService.duplicate(
        currentStoreId,
        productId,
      );
      toast.success(tSuccess("product.duplicated"));
      router.push(ROUTES.STORE_ADMIN.PRODUCT_EDIT(response.data.id));
    } catch (err: unknown) {
      const message = typeof err === "string" ? err : t("duplicateFailed");
      toast.error(message);
    } finally {
      setDuplicating(false);
    }
  }, [currentStoreId, productId, router, tSuccess, t]);

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {loading
              ? tCommon("loading")
              : t("editTitle", { name: product?.name || "" })}
          </h1>
          <p className="text-muted-foreground">{t("editDescription")}</p>
        </div>

        {/* Duplicate Button */}
        <PermissionGate permission="product:create">
          <Button
            variant="outline"
            onClick={handleDuplicate}
            disabled={duplicating || loading}
          >
            <Copy className="me-2 h-4 w-4" />
            {t("duplicateButton")}
          </Button>
        </PermissionGate>
      </div>

      {/* Product Form */}
      <ProductForm
        product={product}
        categories={categories}
        loading={loading}
        onSubmit={handleSubmit}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
