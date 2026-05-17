"use client";

/**
 * Store Admin — Manual Order Creation Page
 * Allows store admins to create orders manually with:
 * - Customer search by name/phone/email
 * - Product selection (1-100 items) with quantity
 * - Shipping address (full_name, city, street_line_1 required)
 * - Payment method selection (CASH_ON_DELIVERY, BANK_TRANSFER, MANUAL)
 * - Order total calculation
 *
 * Requirements: 9.7
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Package,
  Search,
  User,
  X,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/forms/FormError";

import { useAppDispatch } from "@/lib/store/hooks";
import { useStore } from "@/hooks/useStore";
import { createOrder } from "@/lib/store/slices/orders.thunks";
import {
  manualOrderSchema,
  type ManualOrderFormData,
} from "@/lib/validators/order.schema";
import { productService } from "@/lib/api/services/product.service";
import { customerService } from "@/lib/api/services/customer.service";
import { formatCurrencyLYD } from "@/lib/i18n/formatters";
import type { SupportedLocale } from "@/lib/i18n/config";
import type { Product, ProductVariant, Customer } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

// ─── Order Creation Page ─────────────────────────────────────────────────────

export default function NewOrderPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentStoreId } = useStore();
  const t = useTranslations("orders.newOrder");
  const tCommon = useTranslations("common");
  const tA11y = useTranslations("accessibility.buttons");
  const locale = useLocale() as SupportedLocale;

  // Products state
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  // Error state
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
          limit: "100",
          status: "ACTIVE",
        } as Record<string, string>);
        const productsWithVariants = (response.data || []).filter(
          (p: Product) => p.variants && p.variants.length > 0,
        ) as ProductWithVariants[];
        setProducts(productsWithVariants);
      } catch {
        toast.error(t("failedToLoadProducts"));
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [currentStoreId, t]);

  // ─── Customer Search ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!currentStoreId || customerSearch.length < 2) {
      setCustomerResults([]);
      setShowCustomerResults(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const response = await customerService.getAll(currentStoreId, {
          search: customerSearch,
          limit: "10",
        } as Record<string, string>);
        setCustomerResults(response.data || []);
        setShowCustomerResults(true);
      } catch {
        setCustomerResults([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [customerSearch, currentStoreId]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerResults(false);
    setCustomerSearch("");

    // Pre-fill form fields from customer data
    const fullName = [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ");
    setValue("customer_name", fullName);
    setValue("customer_phone", customer.phone || "");
    setValue("customer_email", customer.email || "");
    setValue("customer_id", customer.id);

    // Pre-fill shipping address name
    setValue("shipping_address.full_name", fullName);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setValue("customer_id", undefined);
    setValue("customer_name", "");
    setValue("customer_phone", "");
    setValue("customer_email", "");
  };

  // ─── Order Total Calculation ─────────────────────────────────────────────

  const orderTotal = useMemo(() => {
    let total = 0;
    for (const item of watchedItems) {
      if (!item.product_id || !item.variant_id) continue;
      const product = products.find((p) => p.id === item.product_id);
      if (!product) continue;
      const variant = product.variants.find((v) => v.id === item.variant_id);
      if (!variant) continue;
      const price = parseFloat(variant.price || product.base_price || "0");
      total += price * (item.quantity || 0);
    }
    return total;
  }, [watchedItems, products]);

  const itemCount = useMemo(() => {
    return watchedItems.filter(
      (item) => item.product_id > 0 && item.variant_id > 0,
    ).length;
  }, [watchedItems]);

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
          const { inventoryService } =
            await import("@/lib/api/services/inventory.service");
          const response = await inventoryService.getByVariant(
            currentStoreId,
            item.variant_id,
          );
          const inventory = response.data;
          if (inventory && inventory.available_quantity < item.quantity) {
            newInventoryErrors[i] = t("availableOnly", {
              count: inventory.available_quantity,
            });
            allSufficient = false;
          }
        } catch {
          // If we can't check inventory, allow submission (server will validate)
        }
      }

      setInventoryErrors(newInventoryErrors);
      return allSufficient;
    },
    [currentStoreId, t],
  );

  // ─── Form Submission ─────────────────────────────────────────────────────

  const onSubmit = async (data: ManualOrderFormData) => {
    if (!currentStoreId) return;

    setServerErrors([]);
    setInventoryErrors({});

    // Validate inventory availability before submission
    const inventoryValid = await validateInventory(data.items);
    if (!inventoryValid) {
      setServerErrors([t("insufficientInventory")]);
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

      toast.success(t("orderCreatedSuccess"));
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
          typeof error === "string" ? error : t("failedToCreateOrder");
        setServerErrors([message]);
      }
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getVariantsForProduct = (productId: number): ProductVariant[] => {
    const product = products.find((p) => p.id === productId);
    return product?.variants?.filter((v) => v.is_active) || [];
  };

  const getItemPrice = (index: number): string | null => {
    const item = watchedItems[index];
    if (!item?.product_id || !item?.variant_id) return null;
    const product = products.find((p) => p.id === item.product_id);
    if (!product) return null;
    const variant = product.variants.find((v) => v.id === item.variant_id);
    if (!variant) return null;
    return variant.price || product.base_price || null;
  };

  const handleProductChange = (index: number, productId: number) => {
    setValue(`items.${index}.product_id`, productId);
    setValue(`items.${index}.variant_id`, 0);
    setInventoryErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleVariantChange = (index: number, variantId: number) => {
    setValue(`items.${index}.variant_id`, variantId);
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
          aria-label={tA11y("backToOrders")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      {/* Server Errors */}
      <FormSummaryError errors={serverErrors} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ─── Customer Search Section ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("customerSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedCustomer ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                <div>
                  <p className="font-medium">
                    {selectedCustomer.first_name} {selectedCustomer.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer.email}
                    {selectedCustomer.phone && ` • ${selectedCustomer.phone}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCustomer}
                  aria-label={t("clearCustomer")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Label htmlFor="customer-search">{t("searchCustomer")}</Label>
                <div className="relative mt-1.5">
                  <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={t("searchCustomerPlaceholder")}
                    className="ps-9"
                    aria-expanded={showCustomerResults}
                    aria-controls="customer-search-results"
                    role="combobox"
                    aria-autocomplete="list"
                  />
                  {customerSearching && (
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {t("searching")}
                    </span>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showCustomerResults && customerResults.length > 0 && (
                  <ul
                    id="customer-search-results"
                    role="listbox"
                    className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md"
                  >
                    {customerResults.map((customer) => (
                      <li
                        key={customer.id}
                        role="option"
                        aria-selected={false}
                        className="cursor-pointer px-4 py-2 hover:bg-accent focus:bg-accent"
                        onClick={() => handleSelectCustomer(customer)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            handleSelectCustomer(customer);
                          }
                        }}
                        tabIndex={0}
                      >
                        <p className="font-medium">
                          {customer.first_name} {customer.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customer.email}
                          {customer.phone && ` • ${customer.phone}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {showCustomerResults &&
                  customerResults.length === 0 &&
                  !customerSearching && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
                      {t("noCustomerFound")}
                    </div>
                  )}
              </div>
            )}

            {/* Manual customer info fields (shown when no customer selected) */}
            {!selectedCustomer && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("orEnterManually")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="customer_name"
                    label={t("customerName")}
                    placeholder={t("customerName")}
                  />
                  <FormField
                    control={control}
                    name="customer_phone"
                    label={t("customerPhone")}
                    placeholder={t("customerPhone")}
                  />
                  <FormField
                    control={control}
                    name="customer_email"
                    label={t("customerEmail")}
                    type="email"
                    placeholder={t("customerEmail")}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── Line Items Section ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t("productsSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const itemPrice = getItemPrice(index);
              return (
                <div
                  key={field.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start"
                >
                  {/* Product Selection */}
                  <div className="flex-1 space-y-2">
                    <Label>
                      {t("product")}
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
                        <SelectValue placeholder={t("selectProduct")} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem
                            key={product.id}
                            value={String(product.id)}
                          >
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
                      {t("variant")}
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
                        <SelectValue placeholder={t("selectVariant")} />
                      </SelectTrigger>
                      <SelectContent>
                        {getVariantsForProduct(
                          watchedItems[index]?.product_id || 0,
                        ).map((variant) => (
                          <SelectItem
                            key={variant.id}
                            value={String(variant.id)}
                          >
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
                      {t("quantity")}
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

                  {/* Price Display */}
                  {itemPrice && (
                    <div className="w-full sm:w-28 space-y-2">
                      <Label>{t("price")}</Label>
                      <p className="flex h-10 items-center text-sm font-medium">
                        {formatCurrencyLYD(parseFloat(itemPrice), locale)}
                      </p>
                    </div>
                  )}

                  {/* Remove Button */}
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => remove(index)}
                      aria-label={tA11y("removeItem")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}

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
                {t("addItem")}
              </Button>
            )}

            {!canAddMoreItems && (
              <p className="text-sm text-muted-foreground">
                {t("maxItemsReached")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ─── Shipping Address Section ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("shippingSection")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="shipping_address.full_name"
              label={t("fullName")}
              placeholder={t("fullNamePlaceholder")}
              required
            />
            <FormField
              control={control}
              name="shipping_address.city"
              label={t("city")}
              placeholder={t("cityPlaceholder")}
              required
            />
            <FormField
              control={control}
              name="shipping_address.street_line_1"
              label={t("streetLine1")}
              placeholder={t("streetLine1Placeholder")}
              required
              className="sm:col-span-2"
            />
            <FormField
              control={control}
              name="shipping_address.street_line_2"
              label={t("streetLine2")}
              placeholder={t("streetLine2Placeholder")}
              className="sm:col-span-2"
            />
            <FormField
              control={control}
              name="shipping_address.state"
              label={t("region")}
              placeholder={t("regionPlaceholder")}
            />
            <FormField
              control={control}
              name="shipping_address.postal_code"
              label={t("postalCode")}
              placeholder={t("postalCodePlaceholder")}
            />
          </CardContent>
        </Card>

        {/* ─── Payment Method Section ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("paymentSection")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="payment_method"
              label={t("paymentMethod")}
              type="select"
              options={[
                {
                  value: "CASH_ON_DELIVERY",
                  label: t("cashOnDelivery"),
                },
                {
                  value: "BANK_TRANSFER",
                  label: t("bankTransfer"),
                },
                {
                  value: "MANUAL",
                  label: t("manual"),
                },
              ]}
            />
          </CardContent>
        </Card>

        {/* ─── Notes Section ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("notesSection")}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={control}
              name="notes_from_customer"
              label={t("orderNotes")}
              type="textarea"
              placeholder={t("orderNotesPlaceholder")}
            />
          </CardContent>
        </Card>

        {/* ─── Order Summary ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>{t("orderSummary")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("items", { count: itemCount })}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium">{t("total")}</span>
                <span className="text-lg font-bold">
                  {formatCurrencyLYD(orderTotal, locale)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Submit ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/orders")}
          >
            {tCommon("cancel")}
          </Button>
          <SubmitButton isSubmitting={isSubmitting}>
            {t("createOrder")}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
