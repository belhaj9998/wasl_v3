"use client";

/**
 * Customer Detail Page
 * Displays customer profile, order history, and addresses.
 * Supports editing customer info and managing addresses (add, edit, delete, set default).
 *
 * Requirements: 10.2, 10.3, 10.4, 10.5, 10.6
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Pencil,
  Plus,
  Trash2,
  Star,
  MapPin,
  ShoppingBag,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { CustomerForm } from "@/components/forms/CustomerForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchCustomerById,
  updateCustomer,
} from "@/lib/store/slices/customers.thunks";
import { customerService } from "@/lib/api/services/customer.service";
import { useStore } from "@/hooks/useStore";
import { formatDate } from "@/lib/utils/formatDate";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { CustomerFormData } from "@/lib/validators/customer.schema";
import type { Customer, CustomerAddress, Order, PaginationMeta } from "@/types";
import type { StatusVariant } from "@/components/shared/StatusBadge";

import { AddressFormDialog } from "./_components/AddressFormDialog";

// ─── Status helpers ──────────────────────────────────────────────────────────

const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "نشط",
  BLOCKED: "محظور",
  ARCHIVED: "مؤرشف",
};

const CUSTOMER_STATUS_VARIANT_MAP: Record<string, StatusVariant> = {
  ACTIVE: "success",
  BLOCKED: "error",
  ARCHIVED: "warning",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  PROCESSING: "قيد المعالجة",
  PREPARING: "قيد التحضير",
  SHIPPED: "تم الشحن",
  IN_TRANSIT: "في الطريق",
  OUT_FOR_DELIVERY: "خارج للتوصيل",
  DELIVERED: "تم التوصيل",
  CANCELED: "ملغي",
  RETURNED: "مرتجع",
};

// ─── Customer Detail Page ────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();

  const customerId = Number(params.id);

  const { currentCustomer: customer, loading } = useAppSelector(
    (state) => state.customers,
  );

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersMeta, setOrdersMeta] = useState<PaginationMeta | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);

  // Addresses state
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  // Address form dialog
  const [addressDialog, setAddressDialog] = useState<{
    open: boolean;
    address: CustomerAddress | null;
  }>({ open: false, address: null });

  // Delete address confirmation
  const [deleteAddressDialog, setDeleteAddressDialog] = useState<{
    open: boolean;
    address: CustomerAddress | null;
  }>({ open: false, address: null });
  const [deleteAddressLoading, setDeleteAddressLoading] = useState(false);

  // Fetch customer data
  useEffect(() => {
    if (!currentStoreId || !customerId) return;
    dispatch(fetchCustomerById({ storeId: currentStoreId, customerId }));
  }, [dispatch, currentStoreId, customerId]);

  // Fetch orders
  useEffect(() => {
    if (!currentStoreId || !customerId) return;

    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const response = await customerService.getOrders(
          currentStoreId,
          customerId,
          { page: ordersPage, limit: 20 },
        );
        setOrders(response.data as unknown as Order[]);
        setOrdersMeta(response.meta as unknown as PaginationMeta);
      } catch {
        // Silently handle - orders are supplementary
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [currentStoreId, customerId, ordersPage]);

  // Fetch addresses
  const fetchAddresses = useCallback(async () => {
    if (!currentStoreId || !customerId) return;

    setAddressesLoading(true);
    try {
      const response = await customerService.getAddresses(
        currentStoreId,
        customerId,
      );
      setAddresses((response.data ?? response) as unknown as CustomerAddress[]);
    } catch {
      // Silently handle
    } finally {
      setAddressesLoading(false);
    }
  }, [currentStoreId, customerId]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Handle customer update
  const handleUpdateCustomer = useCallback(
    async (data: CustomerFormData) => {
      if (!currentStoreId || !customerId) return;

      const payload = {
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        notes: data.notes || undefined,
        status: data.status || undefined,
        gender: data.gender || undefined,
        birth_date: data.birth_date || undefined,
      };

      await dispatch(
        updateCustomer({ storeId: currentStoreId, customerId, payload }),
      ).unwrap();

      toast.success("تم تحديث بيانات العميل بنجاح");
      setIsEditing(false);
    },
    [dispatch, currentStoreId, customerId],
  );

  // Handle address submit (add/edit)
  const handleAddressSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      if (!currentStoreId || !customerId) return;

      try {
        if (addressDialog.address) {
          // Update
          await customerService.updateAddress(
            currentStoreId,
            customerId,
            addressDialog.address.id,
            data,
          );
          toast.success("تم تحديث العنوان بنجاح");
        } else {
          // Create
          await customerService.addAddress(
            currentStoreId,
            customerId,
            data as {
              full_name: string;
              city: string;
              street_line_1: string;
              type?: "SHIPPING" | "BILLING" | "OTHER";
            },
          );
          toast.success("تم إضافة العنوان بنجاح");
        }

        setAddressDialog({ open: false, address: null });
        fetchAddresses();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "فشل حفظ العنوان";
        toast.error(message);
        throw err;
      }
    },
    [currentStoreId, customerId, addressDialog.address, fetchAddresses],
  );

  // Handle address delete
  const handleDeleteAddress = useCallback(async () => {
    if (!currentStoreId || !customerId || !deleteAddressDialog.address) return;

    setDeleteAddressLoading(true);
    try {
      await customerService.deleteAddress(
        currentStoreId,
        customerId,
        deleteAddressDialog.address.id,
      );
      toast.success("تم حذف العنوان بنجاح");
      setDeleteAddressDialog({ open: false, address: null });
      fetchAddresses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "فشل حذف العنوان";
      toast.error(message);
    } finally {
      setDeleteAddressLoading(false);
    }
  }, [currentStoreId, customerId, deleteAddressDialog.address, fetchAddresses]);

  // Handle set default address
  const handleSetDefaultAddress = useCallback(
    async (addressId: number) => {
      if (!currentStoreId || !customerId) return;

      try {
        await customerService.setDefaultAddress(
          currentStoreId,
          customerId,
          addressId,
        );
        toast.success("تم تعيين العنوان الافتراضي");
        fetchAddresses();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "فشل تعيين العنوان الافتراضي";
        toast.error(message);
      }
    },
    [currentStoreId, customerId, fetchAddresses],
  );

  // Loading state
  if (loading && !customer) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/customers")}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold">العميل غير موجود</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/customers")}
          >
            <ArrowRight className="h-4 w-4" />
            <span className="sr-only">العودة</span>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {[customer.first_name, customer.last_name]
                .filter(Boolean)
                .join(" ") || "عميل"}
            </h2>
            <p className="text-muted-foreground">
              عميل منذ {formatDate(customer.created_at)}
            </p>
          </div>
        </div>
        <StatusBadge
          label={CUSTOMER_STATUS_LABELS[customer.status] || customer.status}
          variant={CUSTOMER_STATUS_VARIANT_MAP[customer.status] || "neutral"}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            الملف الشخصي
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            الطلبات
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2">
            <MapPin className="h-4 w-4" />
            العناوين
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>بيانات العميل</CardTitle>
                <CardDescription>المعلومات الأساسية للعميل</CardDescription>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="me-2 h-4 w-4" />
                  تعديل
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <CustomerForm
                  customer={customer}
                  onSubmit={handleUpdateCustomer}
                  onCancel={() => setIsEditing(false)}
                  isEdit
                />
              ) : (
                <CustomerProfileView customer={customer} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>سجل الطلبات</CardTitle>
              <CardDescription>
                طلبات العميل ({ordersMeta?.total ?? 0} طلب)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  لا توجد طلبات لهذا العميل
                </p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <div className="space-y-1">
                        <p className="font-medium">#{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </Badge>
                        <span className="font-medium">
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {ordersMeta && ordersMeta.totalPages > 1 && (
                    <div className="flex justify-center gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={ordersPage <= 1}
                        onClick={() => setOrdersPage((p) => p - 1)}
                      >
                        السابق
                      </Button>
                      <span className="flex items-center text-sm text-muted-foreground">
                        صفحة {ordersPage} من {ordersMeta.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={ordersPage >= ordersMeta.totalPages}
                        onClick={() => setOrdersPage((p) => p + 1)}
                      >
                        التالي
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>العناوين</CardTitle>
                <CardDescription>عناوين الشحن والفوترة للعميل</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setAddressDialog({ open: true, address: null })}
              >
                <Plus className="me-2 h-4 w-4" />
                إضافة عنوان
              </Button>
            </CardHeader>
            <CardContent>
              {addressesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : addresses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  لا توجد عناوين محفوظة
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {addresses.map((address) => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      onEdit={() => setAddressDialog({ open: true, address })}
                      onDelete={() =>
                        setDeleteAddressDialog({ open: true, address })
                      }
                      onSetDefault={() => handleSetDefaultAddress(address.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Address Form Dialog */}
      <AddressFormDialog
        open={addressDialog.open}
        onOpenChange={(open) => {
          if (!open) setAddressDialog({ open: false, address: null });
        }}
        address={addressDialog.address}
        onSubmit={handleAddressSubmit}
      />

      {/* Delete Address Confirmation */}
      <ConfirmDialog
        open={deleteAddressDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteAddressDialog({ open: false, address: null });
        }}
        title="حذف العنوان"
        description="هل أنت متأكد من حذف هذا العنوان؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDeleteAddress}
        destructive
        loading={deleteAddressLoading}
      />
    </div>
  );
}

// ─── Customer Profile View ───────────────────────────────────────────────────

function CustomerProfileView({ customer }: { customer: Customer }) {
  const GENDER_LABELS: Record<string, string> = {
    male: "ذكر",
    female: "أنثى",
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <InfoItem label="الاسم الأول" value={customer.first_name} />
      <InfoItem label="اسم العائلة" value={customer.last_name} />
      <InfoItem label="البريد الإلكتروني" value={customer.email} />
      <InfoItem label="رقم الهاتف" value={customer.phone} dir="ltr" />
      <InfoItem
        label="الحالة"
        value={CUSTOMER_STATUS_LABELS[customer.status] || customer.status}
      />
      <InfoItem
        label="الجنس"
        value={
          customer.gender
            ? GENDER_LABELS[customer.gender] || customer.gender
            : null
        }
      />
      <InfoItem
        label="تاريخ الميلاد"
        value={customer.birth_date ? formatDate(customer.birth_date) : null}
      />
      <InfoItem label="إجمالي الطلبات" value={String(customer.total_orders)} />
      <InfoItem
        label="إجمالي الإنفاق"
        value={formatCurrency(customer.total_spent)}
      />
      <div className="sm:col-span-2">
        <InfoItem label="ملاحظات" value={customer.notes} />
      </div>
      <InfoItem label="تاريخ الإنشاء" value={formatDate(customer.created_at)} />
    </div>
  );
}

function InfoItem({
  label,
  value,
  dir,
}: {
  label: string;
  value: string | null | undefined;
  dir?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-sm" dir={dir}>
        {value || "—"}
      </p>
    </div>
  );
}

// ─── Address Card ────────────────────────────────────────────────────────────

function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: CustomerAddress;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const ADDRESS_TYPE_LABELS: Record<string, string> = {
    SHIPPING: "شحن",
    BILLING: "فوترة",
    OTHER: "أخرى",
  };

  return (
    <div className="relative rounded-lg border p-4 space-y-2">
      {/* Default badge */}
      {address.is_default && (
        <Badge variant="secondary" className="absolute top-2 end-2">
          <Star className="me-1 h-3 w-3" />
          افتراضي
        </Badge>
      )}

      {/* Type */}
      <Badge variant="outline">
        {ADDRESS_TYPE_LABELS[address.type] || address.type}
      </Badge>

      {/* Address details */}
      <div className="space-y-1 text-sm">
        <p className="font-medium">{address.full_name}</p>
        <p className="text-muted-foreground">{address.street_line_1}</p>
        {address.street_line_2 && (
          <p className="text-muted-foreground">{address.street_line_2}</p>
        )}
        <p className="text-muted-foreground">
          {[address.city, address.state, address.postal_code]
            .filter(Boolean)
            .join("، ")}
        </p>
        {address.country && (
          <p className="text-muted-foreground">{address.country}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="me-1 h-3 w-3" />
          تعديل
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="me-1 h-3 w-3" />
          حذف
        </Button>
        {!address.is_default && (
          <Button variant="ghost" size="sm" onClick={onSetDefault}>
            <Star className="me-1 h-3 w-3" />
            تعيين كافتراضي
          </Button>
        )}
      </div>
    </div>
  );
}
