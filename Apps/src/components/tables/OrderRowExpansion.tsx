"use client";

/**
 * OrderRowExpansion
 *
 * Read-only inline expansion content rendered under an order row inside
 * the orders DataTable (Zid-style). Reads the order from the row data
 * already loaded by the list query — NO additional fetch.
 */

import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";

import type { Order } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { Button } from "@/components/ui/button";

interface OrderRowExpansionProps {
  order: Order;
  locale: "ar" | "en";
}

export function OrderRowExpansion({ order, locale }: OrderRowExpansionProps) {
  const items = order.items ?? [];
  const address = order.shipping_address;

  // Sum of items (subtotal) — fall back to the order subtotal field
  const itemsSubtotal = order.subtotal;
  const grandTotal = order.total;

  return (
    <div className="bg-muted/30 px-6 py-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ─── Customer block ──────────────────────────────────────── */}
        <div>
          <h4 className="text-sm font-semibold mb-3">
            {locale === "ar" ? "العميل" : "Customer"}
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-3">
              <dt className="text-muted-foreground min-w-24">
                {locale === "ar" ? "الاسم" : "Name"}
              </dt>
              <dd className="font-medium">{order.customer_name || "—"}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-muted-foreground min-w-24">
                {locale === "ar" ? "رقم الهاتف" : "Phone"}
              </dt>
              <dd className="font-medium" dir="ltr">
                {order.customer_phone || "—"}
              </dd>
            </div>
            {order.customer_email && (
              <div className="flex gap-3">
                <dt className="text-muted-foreground min-w-24">
                  {locale === "ar" ? "البريد الإلكتروني" : "Email"}
                </dt>
                <dd className="font-medium" dir="ltr">
                  {order.customer_email}
                </dd>
              </div>
            )}
            <div className="flex gap-3">
              <dt className="text-muted-foreground min-w-24">
                {locale === "ar" ? "المدينة" : "City"}
              </dt>
              <dd className="font-medium">{address?.city || "—"}</dd>
            </div>
            {address?.street_line_1 && (
              <div className="flex gap-3">
                <dt className="text-muted-foreground min-w-24">
                  {locale === "ar" ? "العنوان" : "Address"}
                </dt>
                <dd className="font-medium">{address.street_line_1}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* ─── Totals block ────────────────────────────────────────── */}
        <div>
          <h4 className="text-sm font-semibold mb-3">
            {locale === "ar" ? "الفاتورة" : "Invoice"}
          </h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {locale === "ar" ? "قيمة المنتجات" : "Items subtotal"}
              </dt>
              <dd className="font-medium">{formatCurrency(itemsSubtotal)}</dd>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {locale === "ar" ? "الخصم" : "Discount"}
                </dt>
                <dd className="font-medium text-destructive">
                  −{formatCurrency(order.discount_amount)}
                </dd>
              </div>
            )}
            {Number(order.shipping_amount) > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {locale === "ar" ? "الشحن" : "Shipping"}
                </dt>
                <dd className="font-medium">
                  {formatCurrency(order.shipping_amount)}
                </dd>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 mt-2">
              <dt className="font-semibold">
                {locale === "ar" ? "المجموع الكلي" : "Grand total"}
              </dt>
              <dd className="font-bold">{formatCurrency(grandTotal)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ─── Items table ────────────────────────────────────────────── */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold mb-3">
          {locale === "ar" ? "منتجات الطلب" : "Order items"}
        </h4>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {locale === "ar" ? "لا توجد منتجات" : "No items"}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-background">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">
                    {locale === "ar" ? "المنتج" : "Product"}
                  </th>
                  <th className="px-4 py-2 text-start font-medium">
                    {locale === "ar" ? "SKU" : "SKU"}
                  </th>
                  <th className="px-4 py-2 text-center font-medium">
                    {locale === "ar" ? "الكمية" : "Qty"}
                  </th>
                  <th className="px-4 py-2 text-end font-medium">
                    {locale === "ar" ? "السعر" : "Unit price"}
                  </th>
                  <th className="px-4 py-2 text-end font-medium">
                    {locale === "ar" ? "الإجمالي" : "Total"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        {/* Product image — falls back to icon when missing */}
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {item.product_image ? (
                            <Image
                              src={item.product_image}
                              alt={item.product_name}
                              fill
                              sizes="48px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <ImageOff className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {item.product_name}
                          </div>
                          {item.variant_title && (
                            <div className="text-xs text-muted-foreground truncate">
                              {item.variant_title}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground" dir="ltr">
                      {item.sku || "—"}
                    </td>
                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                    <td className="px-4 py-2 text-end">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-2 text-end font-medium">
                      {formatCurrency(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Footer CTA: View full order details (Zid-style) ───────── */}
      <div className="mt-5 flex justify-start">
        <Link href={`/admin/orders/${order.id}`}>
          <Button variant="default" onClick={(e) => e.stopPropagation()}>
            {locale === "ar" ? "عرض" : "View"}
          </Button>
        </Link>
      </div>
    </div>
  );
}
