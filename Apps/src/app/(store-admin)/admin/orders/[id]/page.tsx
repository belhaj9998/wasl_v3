"use client";

/**
 * Store Admin Order Detail Page
 * Displays full order details: order number, source, status, payment status,
 * line items, customer info, shipping address, timeline, and status transition buttons.
 * Implements cancel action with confirmation and add note functionality.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.8
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  Clock,
  MessageSquarePlus,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchOrderById,
  updateOrderStatus,
  cancelOrder,
  addOrderNote,
} from "@/lib/store/slices/orders.thunks";
import { useStore } from "@/hooks/useStore";
import { getAvailableTransitions } from "@/lib/utils/permissions";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDateTime, formatRelativeDate } from "@/lib/utils/formatDate";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants/enums";
import type { OrderStatus, PaymentStatus, OrderSource } from "@/types";

// ─── Source Labels ───────────────────────────────────────────────────────────

const ORDER_SOURCE_LABELS: Record<OrderSource, { ar: string; en: string }> = {
  STOREFRONT: { ar: "المتجر", en: "Storefront" },
  ADMIN: { ar: "لوحة التحكم", en: "Admin" },
  MANUAL: { ar: "يدوي", en: "Manual" },
  INSTAGRAM: { ar: "انستغرام", en: "Instagram" },
  FACEBOOK: { ar: "فيسبوك", en: "Facebook" },
  TIKTOK: { ar: "تيك توك", en: "TikTok" },
};

// ─── Status Variant Helpers ──────────────────────────────────────────────────

function getOrderStatusVariant(
  status: OrderStatus,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "DELIVERED":
      return "success";
    case "CANCELED":
    case "RETURNED":
      return "error";
    case "PENDING":
    case "DRAFT":
      return "neutral";
    case "PROCESSING":
    case "PREPARING":
    case "CONFIRMED":
      return "info";
    case "SHIPPED":
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
      return "warning";
    default:
      return "neutral";
  }
}

function getPaymentStatusVariant(
  status: PaymentStatus,
): "success" | "warning" | "error" | "info" | "neutral" {
  switch (status) {
    case "PAID":
      return "success";
    case "FAILED":
      return "error";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "warning";
    case "PENDING":
    case "PARTIALLY_PAID":
      return "info";
    case "UNPAID":
      return "neutral";
    default:
      return "neutral";
  }
}

// ─── Order Detail Page ───────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const { currentStoreId } = useStore();
  const locale = useAppSelector((state) => state.ui.locale);

  const orderId = Number(params.id);

  const {
    currentOrder: order,
    loading,
    error,
  } = useAppSelector((state) => state.orders);

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Status transition loading
  const [transitionLoading, setTransitionLoading] = useState(false);

  // Add note state
  const [noteContent, setNoteContent] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  // Fetch order on mount
  useEffect(() => {
    if (!currentStoreId || !orderId) return;
    dispatch(fetchOrderById({ storeId: currentStoreId, orderId }));
  }, [dispatch, currentStoreId, orderId]);

  // Handle status transition
  const handleTransition = useCallback(
    async (targetStatus: OrderStatus) => {
      if (!currentStoreId || !order) return;
      setTransitionLoading(true);
      try {
        await dispatch(
          updateOrderStatus({
            storeId: currentStoreId,
            orderId: order.id,
            payload: { status: targetStatus },
          }),
        ).unwrap();
        toast.success(
          locale === "ar"
            ? "تم تحديث حالة الطلب بنجاح"
            : "Order status updated successfully",
        );
      } catch (err) {
        toast.error(
          locale === "ar"
            ? "فشل تحديث حالة الطلب"
            : "Failed to update order status",
        );
      } finally {
        setTransitionLoading(false);
      }
    },
    [dispatch, currentStoreId, order, locale],
  );

  // Handle cancel
  const handleCancel = useCallback(async () => {
    if (!currentStoreId || !order) return;
    setCancelLoading(true);
    try {
      await dispatch(
        cancelOrder({
          storeId: currentStoreId,
          orderId: order.id,
          reason: cancelReason.trim() || undefined,
        }),
      ).unwrap();
      toast.success(
        locale === "ar"
          ? "تم إلغاء الطلب بنجاح"
          : "Order canceled successfully",
      );
      setCancelDialogOpen(false);
      setCancelReason("");
    } catch (err) {
      toast.error(
        locale === "ar" ? "فشل إلغاء الطلب" : "Failed to cancel order",
      );
    } finally {
      setCancelLoading(false);
    }
  }, [dispatch, currentStoreId, order, cancelReason, locale]);

  // Handle add note
  const handleAddNote = useCallback(async () => {
    if (!currentStoreId || !order || !noteContent.trim()) return;
    setNoteLoading(true);
    try {
      await dispatch(
        addOrderNote({
          storeId: currentStoreId,
          orderId: order.id,
          payload: { content: noteContent.trim() },
        }),
      ).unwrap();
      toast.success(
        locale === "ar" ? "تمت إضافة الملاحظة" : "Note added successfully",
      );
      setNoteContent("");
      // Re-fetch order to get updated timeline
      dispatch(fetchOrderById({ storeId: currentStoreId, orderId: order.id }));
    } catch (err) {
      toast.error(
        locale === "ar" ? "فشل إضافة الملاحظة" : "Failed to add note",
      );
    } finally {
      setNoteLoading(false);
    }
  }, [dispatch, currentStoreId, order, noteContent, locale]);

  // Loading state
  if (loading && !order) {
    return <OrderDetailSkeleton />;
  }

  // Error state
  if (error && !order) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-destructive">
          {locale === "ar" ? "فشل تحميل الطلب" : "Failed to load order"}
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          {locale === "ar" ? "العودة" : "Go Back"}
        </Button>
      </div>
    );
  }

  if (!order) return null;

  // Get available transitions for current status
  const availableTransitions = getAvailableTransitions(order.status);
  const isTerminal = order.status === "CANCELED" || order.status === "RETURNED";

  // Separate cancel from other transitions
  const forwardTransitions = availableTransitions.filter(
    (s) => s !== "CANCELED",
  );
  const canCancel = availableTransitions.includes("CANCELED" as OrderStatus);

  // Sort timeline newest first
  const sortedTimeline = [...(order.timeline || [])].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

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
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">
            {locale === "ar" ? "طلب" : "Order"} #{order.order_number}
          </h2>
          <p className="text-muted-foreground text-sm">
            {ORDER_SOURCE_LABELS[order.source]?.[locale] ?? order.source} •{" "}
            {formatDateTime(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            label={ORDER_STATUS_LABELS[order.status]?.[locale] ?? order.status}
            variant={getOrderStatusVariant(order.status)}
          />
          <StatusBadge
            label={
              PAYMENT_STATUS_LABELS[order.payment_status]?.[locale] ??
              order.payment_status
            }
            variant={getPaymentStatusVariant(order.payment_status)}
          />
        </div>
      </div>

      {/* Status Transition Buttons */}
      {!isTerminal && availableTransitions.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm font-medium text-muted-foreground">
              {locale === "ar" ? "تحديث الحالة:" : "Update Status:"}
            </span>
            {forwardTransitions.map((targetStatus) => (
              <Button
                key={targetStatus}
                variant="default"
                size="sm"
                disabled={transitionLoading}
                onClick={() => handleTransition(targetStatus)}
              >
                {ORDER_STATUS_LABELS[targetStatus]?.[locale] ?? targetStatus}
              </Button>
            ))}
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                disabled={transitionLoading}
                onClick={() => setCancelDialogOpen(true)}
              >
                {locale === "ar" ? "إلغاء الطلب" : "Cancel Order"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Terminal state indicator */}
      {isTerminal && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {locale === "ar"
                ? "هذا الطلب في حالة نهائية ولا يمكن تغيير حالته."
                : "This order is in a terminal state and cannot be transitioned."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Line Items + Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                {locale === "ar" ? "عناصر الطلب" : "Order Items"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-start pb-3 font-medium">
                        {locale === "ar" ? "المنتج" : "Product"}
                      </th>
                      <th className="text-start pb-3 font-medium">
                        {locale === "ar" ? "SKU" : "SKU"}
                      </th>
                      <th className="text-center pb-3 font-medium">
                        {locale === "ar" ? "الكمية" : "Qty"}
                      </th>
                      <th className="text-end pb-3 font-medium">
                        {locale === "ar" ? "سعر الوحدة" : "Unit Price"}
                      </th>
                      <th className="text-end pb-3 font-medium">
                        {locale === "ar" ? "الإجمالي" : "Total"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-3">
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            {item.variant_title && (
                              <p className="text-xs text-muted-foreground">
                                {item.variant_title}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {item.sku || "—"}
                        </td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-end">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-3 text-end font-medium">
                          {formatCurrency(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Totals */}
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {locale === "ar" ? "المجموع الفرعي" : "Subtotal"}
                  </span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {parseFloat(order.discount_amount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{locale === "ar" ? "الخصم" : "Discount"}</span>
                    <span>-{formatCurrency(order.discount_amount)}</span>
                  </div>
                )}
                {parseFloat(order.shipping_amount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {locale === "ar" ? "الشحن" : "Shipping"}
                    </span>
                    <span>{formatCurrency(order.shipping_amount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>{locale === "ar" ? "الإجمالي" : "Total"}</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                {locale === "ar" ? "سجل الأحداث" : "Timeline"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedTimeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "لا توجد أحداث" : "No events yet"}
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedTimeline.map((event) => (
                    <div
                      key={event.id}
                      className="flex gap-3 border-s-2 border-muted ps-4 pb-4 last:pb-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{event.event}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {event.actor_name && <span>{event.actor_name}</span>}
                          <span>•</span>
                          <span>
                            {formatRelativeDate(event.created_at, locale)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer, Shipping, Notes */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                {locale === "ar" ? "معلومات العميل" : "Customer Info"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              {order.customer_phone && (
                <div>
                  <span className="text-muted-foreground">
                    {locale === "ar" ? "الهاتف: " : "Phone: "}
                  </span>
                  <span dir="ltr">{order.customer_phone}</span>
                </div>
              )}
              {order.customer_email && (
                <div>
                  <span className="text-muted-foreground">
                    {locale === "ar" ? "البريد: " : "Email: "}
                  </span>
                  <span dir="ltr">{order.customer_email}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">
                  {locale === "ar" ? "طريقة الدفع: " : "Payment: "}
                </span>
                <span>
                  {getPaymentMethodLabel(order.payment_method, locale)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                {locale === "ar" ? "عنوان الشحن" : "Shipping Address"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {order.shipping_address ? (
                <>
                  <p className="font-medium">
                    {order.shipping_address.full_name}
                  </p>
                  <p>{order.shipping_address.street_line_1}</p>
                  {order.shipping_address.street_line_2 && (
                    <p>{order.shipping_address.street_line_2}</p>
                  )}
                  <p>
                    {order.shipping_address.city}
                    {order.shipping_address.state &&
                      `, ${order.shipping_address.state}`}
                  </p>
                  {order.shipping_address.postal_code && (
                    <p>{order.shipping_address.postal_code}</p>
                  )}
                  {order.shipping_address.country && (
                    <p>{order.shipping_address.country}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  {locale === "ar" ? "لا يوجد عنوان" : "No address provided"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Add Note */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquarePlus className="h-5 w-5" />
                {locale === "ar" ? "إضافة ملاحظة" : "Add Note"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder={
                  locale === "ar"
                    ? "اكتب ملاحظة داخلية..."
                    : "Write an internal note..."
                }
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value.slice(0, 1000))}
                rows={3}
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {noteContent.length}/1000
                </span>
                <Button
                  size="sm"
                  disabled={!noteContent.trim() || noteLoading}
                  onClick={handleAddNote}
                >
                  <Send className="h-4 w-4 me-1" />
                  {noteLoading
                    ? locale === "ar"
                      ? "جاري الإرسال..."
                      : "Sending..."
                    : locale === "ar"
                      ? "إرسال"
                      : "Send"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer Notes */}
          {order.notes_from_customer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {locale === "ar" ? "ملاحظات العميل" : "Customer Notes"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {order.notes_from_customer}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title={locale === "ar" ? "إلغاء الطلب" : "Cancel Order"}
        description={
          locale === "ar"
            ? "هل أنت متأكد من إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء."
            : "Are you sure you want to cancel this order? This action cannot be undone."
        }
        confirmLabel={locale === "ar" ? "إلغاء الطلب" : "Cancel Order"}
        cancelLabel={locale === "ar" ? "تراجع" : "Go Back"}
        onConfirm={handleCancel}
        destructive
        loading={cancelLoading}
      />
    </div>
  );
}

// ─── Payment Method Labels ───────────────────────────────────────────────────

function getPaymentMethodLabel(method: string, locale: "ar" | "en"): string {
  const labels: Record<string, { ar: string; en: string }> = {
    CASH_ON_DELIVERY: { ar: "الدفع عند الاستلام", en: "Cash on Delivery" },
    CARD: { ar: "بطاقة", en: "Card" },
    BANK_TRANSFER: { ar: "تحويل بنكي", en: "Bank Transfer" },
    WALLET: { ar: "محفظة", en: "Wallet" },
    MANUAL: { ar: "يدوي", en: "Manual" },
  };
  return labels[method]?.[locale] ?? method;
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
