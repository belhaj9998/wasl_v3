"use client";

/**
 * Store Admin — Manual Order Creation Page
 * Allows store admins to create orders manually with line items,
 * shipping address, and payment method selection.
 *
 * Requirements: 9.4, 9.7
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, ArrowLeft, Package } from "lucide-react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/FormField";
import { FormSummaryError } from "@/components/forms/FormSummaryError";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/forms/FormError";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { useStore } from "@/hooks/useStore";
import { createOrder } from "@/lib/store/slices/orders.thunks";
import {
  manualOrderSchema,
  type ManualOrderFormData,
} from "@/lib/validators/order.schema";
import { productService } from "@/lib/api/services/product.service";
import { inventoryService } from "@/lib/api/services/inventory.service";
import type { Product, ProductVariant } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

// ─── Payment Method Options ──────────────────────────────────────────────────

const PAYMENT_METHODS = [
  {
    value: "CASH_ON_DELIVERY",
    label: { ar: "الدفع عند الاستلام", en: "Cash on Delivery" },
  },
  { value: "CARD", label: { ar: "بطاقة ائتمان", en: "Card" } },
  { value: "BANK_TRANSFER", label: { ar: "تحويل بنكي", en: "Bank Transfer" } },
  { value: "WALLET", label: { ar: "محفظة إلكترونية", en: "Wallet" } },
  { value: "MANUAL", label: { ar: "يدوي", en: "Manual" } },
] as const;

// ─── Order Creation Page ─────────────────────────────────────────────────────

export default function NewOrderPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentStoreId } = useStore();
  const locale = useAppSelector((state) => state.ui.locale);

  // Products state for selection
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [inventoryErrors, setInventoryErrors] = useState<
    Record<number, string>
  >({});

  // Form setup with Zod validation
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<ManualOrderFormData>({
    resolver: zodResolver(manualOrderSchema),
    defaultValues: {
      items: [{ product_id: 0, variant_id: 0, quantity: 1 }],
      shipping_address: {
        full_name: "",
        city: "",
        street_line_1: "",
        street_line_2: "",
        state: "",
        postal_code: "",
        country: "",
      },
      payment_method: "CASH_ON_DELIVERY",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      notes_from_customer: "",
      source: "MANUAL",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");

  // ─── Fetch Products ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentStoreId) return;

    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const response = await productService.getAll(currentStoreId, {
          limit: 100,
          status: "ACTIVE",
        } as Record<string, unknown>);
        // Filter products that have variants
        const productsWithVariants = (response.data || []).filter(
          (p: Product) => p.variants && p.variants.length > 0,
        ) as ProductWithVariants[];
        setProducts(productsWithVariants);
      } catch {
        toast.error(
          locale === "ar" ? "فشل في تحميل المنتجات" : "Failed to load products",
        );
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [currentStoreId, locale]);

  // ─── Inventory Validation ────────────────────────────────────────────────

  const validateInventory = useCallback(
    async (items: ManualOrderFormData["items"]): Promise<boolean> => {
      if (!currentStoreId) return false;

      const newInventoryErrors: Record<number, string> = {};
      let allSufficient = true;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.variant_id || item.variant_id === 0) continue;

        try {
          const response = await inventoryService.getByVariant(
            currentStoreId,
            item.variant_id,
          );
          const inventory = response.data;
          if (inventory && inventory.available_quantity < item.quantity) {
            newInventoryErrors[i] =
              locale === "ar"
                ? `الكمية المتاحة: ${inventory.available_quantity} فقط`
                : `Only ${inventory.available_quantity} available`;
            allSufficient = false;
          }
        } catch {
          // If we can't check inventory, allow submission (server will validate)
        }
      }

      setInventoryErrors(newInventoryErrors);
      return allSufficient;
    },
    [currentStoreId, locale],
  );

  // ─── Form Submission ─────────────────────────────────────────────────────

  const onSubmit = async (data: ManualOrderFormData) => {
    if (!currentStoreId) return;

    setServerErrors([]);
    setInventoryErrors({});

    // Validate inventory availability before submission
    const inventoryValid = await validateInventory(data.items);
    if (!inventoryValid) {
      setServerErrors([
        locale === "ar"
          ? "بعض المنتجات غير متوفرة بالكمية المطلوبة"
          : "Some products do not have sufficient inventory",
      ]);
      return;
    }

    try {
      const payload = {
        customer_name: data.customer_name || data.shipping_address.full_name,
        customer_phone: data.customer_phone || "",
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
        payment_method: data.payment_method || "CASH_ON_DELIVERY",
        items: data.items.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
        notes_from_customer: data.notes_from_customer || undefined,
      };

      const result = await dispatch(
        createOrder({ storeId: currentStoreId, payload }),
      ).unwrap();

      toast.success(
        locale === "ar" ? "تم إنشاء الطلب بنجاح" : "Order created successfully",
      );
      router.push(`/admin/orders/${result.id}`);
    } catch (error: unknown) {
      // Handle server validation errors (422)
      if (error && typeof error === "object" && "errors" in error) {
        const validationErrors = (
          error as { errors: Array<{ path: string[]; message: string }> }
        ).errors;
        const unmappedErrors: string[] = [];

        for (const err of validationErrors) {
          const fieldPath = err.path?.join(".");
          if (fieldPath) {
            // Try to set field-level error
            try {
              setError(fieldPath as keyof ManualOrderFormData, {
                type: "server",
                message: err.message,
              });
            } catch {
              unmappedErrors.push(err.message);
            }
          } else {
            unmappedErrors.push(err.message);
          }
        }

        if (unmappedErrors.length > 0) {
          setServerErrors(unmappedErrors);
        }
      } else {
        const message =
          typeof error === "string"
            ? error
            : locale === "ar"
              ? "فشل في إنشاء الطلب"
              : "Failed to create order";
        setServerErrors([message]);
      }
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getVariantsForProduct = (productId: number): ProductVariant[] => {
    const product = products.find((p) => p.id === productId);
    return product?.variants?.filter((v) => v.is_active) || [];
  };

  const handleProductChange = (index: number, productId: number) => {
    setValue(`items.${index}.product_id`, productId);
    // Reset variant when product changes
    setValue(`items.${index}.variant_id`, 0);
    // Clear inventory error for this item
    setInventoryErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleVariantChange = (index: number, variantId: number) => {
    setValue(`items.${index}.variant_id`, variantId);
    // Clear inventory error for this item
    setInventoryErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const canAddMoreItems = fields.length < 100;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/orders")}
          aria-label={locale === "ar" ? "العودة للطلبات" : "Back to orders"}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {locale === "ar" ? "إنشاء طلب يدوي" : "Create Manual Order"}
          </h2>
          <p className="text-muted-foreground">
            {locale === "ar"
              ? "أضف طلب جديد يدوياً مع تفاصيل المنتجات والشحن"
              : "Add a new order manually with product and shipping details"}
          </p>
        </div>
      </div>

      {/* Server Errors */}
      <FormSummaryError errors={serverErrors} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ─── Line Items Section ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {locale === "ar" ? "المنتجات" : "Line Items"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start"
              >
                {/* Product Selection */}
                <div className="flex-1 space-y-2">
                  <Label>
                    {locale === "ar" ? "المنتج" : "Product"}
                    <span className="text-destructive ms-1">*</span>
                  </Label>
                  <Select
                    value={
                      watchedItems[index]?.product_id
                        ? String(watchedItems[index].product_id)
                        : ""
                    }
                    onValueChange={(val) =>
                      handleProductChange(index, Number(val))
                    }
                    disabled={productsLoading}
                  >
                    <SelectTrigger
                      className={
                        errors.items?.[index]?.product_id
                          ? "border-destructive"
                          : ""
                      }
                    >
                      <SelectValue
                        placeholder={
                          locale === "ar" ? "اختر منتج..." : "Select product..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={String(product.id)}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormError
                    message={errors.items?.[index]?.product_id?.message}
                  />
                </div>

                {/* Variant Selection */}
                <div className="flex-1 space-y-2">
                  <Label>
                    {locale === "ar" ? "المتغير" : "Variant"}
                    <span className="text-destructive ms-1">*</span>
                  </Label>
                  <Select
                    value={
                      watchedItems[index]?.variant_id
                        ? String(watchedItems[index].variant_id)
                        : ""
                    }
                    onValueChange={(val) =>
                      handleVariantChange(index, Number(val))
                    }
                    disabled={
                      !watchedItems[index]?.product_id ||
                      watchedItems[index]?.product_id === 0
                    }
                  >
                    <SelectTrigger
                      className={
                        errors.items?.[index]?.variant_id
                          ? "border-destructive"
                          : ""
                      }
                    >
                      <SelectValue
                        placeholder={
                          locale === "ar"
                            ? "اختر متغير..."
                            : "Select variant..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {getVariantsForProduct(
                        watchedItems[index]?.product_id || 0,
                      ).map((variant) => (
                        <SelectItem key={variant.id} value={String(variant.id)}>
                          {variant.title}
                          {variant.sku ? ` (${variant.sku})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormError
                    message={errors.items?.[index]?.variant_id?.message}
                  />
                </div>

                {/* Quantity */}
                <div className="w-full sm:w-28 space-y-2">
                  <Label>
                    {locale === "ar" ? "الكمية" : "Qty"}
                    <span className="text-destructive ms-1">*</span>
                  </Label>
                  <FormField
                    control={control}
                    name={`items.${index}.quantity`}
                    label=""
                    type="number"
                    placeholder="1"
                    className="[&>label]:hidden [&>label]:sr-only"
                  />
                  <FormError message={inventoryErrors[index]} />
                </div>

                {/* Remove Button */}
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => remove(index)}
                    aria-label={locale === "ar" ? "حذف المنتج" : "Remove item"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {/* Items array-level error */}
            <FormError message={errors.items?.message} />
            <FormError message={errors.items?.root?.message} />

            {/* Add Item Button */}
            {canAddMoreItems && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ product_id: 0, variant_id: 0, quantity: 1 })
                }
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                {locale === "ar" ? "إضافة منتج" : "Add Item"}
              </Button>
            )}

            {!canAddMoreItems && (
              <p className="text-sm text-muted-foreground">
                {locale === "ar"
                  ? "الحد الأقصى 100 منتج لكل طلب"
                  : "Maximum 100 items per order"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ─── Shipping Address Section ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "ar" ? "عنوان الشحن" : "Shipping Address"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="shipping_address.full_name"
              label={locale === "ar" ? "الاسم الكامل" : "Full Name"}
              placeholder={
                locale === "ar" ? "أدخل الاسم الكامل" : "Enter full name"
              }
              required
            />
            <FormField
              control={control}
              name="shipping_address.city"
              label={locale === "ar" ? "المدينة" : "City"}
              placeholder={locale === "ar" ? "أدخل المدينة" : "Enter city"}
              required
            />
            <FormField
              control={control}
              name="shipping_address.street_line_1"
              label={locale === "ar" ? "العنوان (سطر 1)" : "Street Line 1"}
              placeholder={
                locale === "ar" ? "أدخل العنوان" : "Enter street address"
              }
              required
              className="sm:col-span-2"
            />
            <FormField
              control={control}
              name="shipping_address.street_line_2"
              label={locale === "ar" ? "العنوان (سطر 2)" : "Street Line 2"}
              placeholder={
                locale === "ar"
                  ? "عنوان إضافي (اختياري)"
                  : "Additional address (optional)"
              }
              className="sm:col-span-2"
            />
            <FormField
              control={control}
              name="shipping_address.state"
              label={locale === "ar" ? "المنطقة / الولاية" : "State / Region"}
              placeholder={
                locale === "ar" ? "المنطقة (اختياري)" : "State (optional)"
              }
            />
            <FormField
              control={control}
              name="shipping_address.postal_code"
              label={locale === "ar" ? "الرمز البريدي" : "Postal Code"}
              placeholder={
                locale === "ar"
                  ? "الرمز البريدي (اختياري)"
                  : "Postal code (optional)"
              }
            />
          </CardContent>
        </Card>

        {/* ─── Customer Info Section ──────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "ar" ? "معلومات العميل" : "Customer Info"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="customer_name"
              label={locale === "ar" ? "اسم العميل" : "Customer Name"}
              placeholder={
                locale === "ar"
                  ? "اسم العميل (اختياري)"
                  : "Customer name (optional)"
              }
            />
            <FormField
              control={control}
              name="customer_phone"
              label={locale === "ar" ? "رقم الهاتف" : "Phone Number"}
              placeholder={locale === "ar" ? "رقم الهاتف" : "Phone number"}
            />
            <FormField
              control={control}
              name="customer_email"
              label={locale === "ar" ? "البريد الإلكتروني" : "Email"}
              type="email"
              placeholder={
                locale === "ar"
                  ? "البريد الإلكتروني (اختياري)"
                  : "Email (optional)"
              }
            />
          </CardContent>
        </Card>

        {/* ─── Payment Method Section ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "ar" ? "طريقة الدفع" : "Payment Method"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="payment_method"
              label={locale === "ar" ? "طريقة الدفع" : "Payment Method"}
              type="select"
              options={PAYMENT_METHODS.map((m) => ({
                value: m.value,
                label: m.label[locale],
              }))}
            />
          </CardContent>
        </Card>

        {/* ─── Notes Section ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{locale === "ar" ? "ملاحظات" : "Notes"}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="notes_from_customer"
              label={locale === "ar" ? "ملاحظات الطلب" : "Order Notes"}
              type="textarea"
              placeholder={
                locale === "ar"
                  ? "أضف ملاحظات للطلب (اختياري)"
                  : "Add order notes (optional)"
              }
            />
          </CardContent>
        </Card>

        {/* ─── Submit ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/orders")}
          >
            {locale === "ar" ? "إلغاء" : "Cancel"}
          </Button>
          <SubmitButton isSubmitting={isSubmitting}>
            {locale === "ar" ? "إنشاء الطلب" : "Create Order"}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
