"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Store as StoreIcon,
  Globe,
  User,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusVariant } from "@/components/shared";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { updatePlatformStoreStatus } from "@/lib/store/slices/platform.thunks";
import { platformService } from "@/lib/api/services/platform.service";
import { formatDate } from "@/lib/utils/formatDate";
import {
  STORE_STATUS,
  STORE_STATUS_TRANSITIONS,
  STORE_STATUS_LABELS,
  type StoreStatus,
} from "@/lib/constants/enums";
import { ROUTES } from "@/lib/constants/routes";
import type { Store } from "@/types";

/**
 * Platform Store Detail Page
 * Displays store details and allows status changes with valid transitions.
 *
 * Requirements: 4.1, 4.3, 4.4, 4.5
 */
export default function PlatformStoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations();
  const tA11y = useTranslations("accessibility.buttons");
  const locale = useAppSelector((state) => state.ui.locale);

  const storeId = Number(params.id);

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  // Fetch store details
  useEffect(() => {
    async function fetchStore() {
      setLoading(true);
      setError(null);
      try {
        const response = await platformService.stores.getById(storeId);
        setStore(response.data as unknown as Store);
      } catch {
        setError(
          locale === "ar"
            ? "فشل في تحميل بيانات المتجر"
            : "Failed to load store details",
        );
      } finally {
        setLoading(false);
      }
    }

    if (storeId) {
      fetchStore();
    }
  }, [storeId, locale]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!store) return;

      const validTransitions =
        STORE_STATUS_TRANSITIONS[store.status as StoreStatus] || [];
      if (!validTransitions.includes(newStatus as StoreStatus)) {
        toast.error(t("errors.store.invalidTransition"));
        return;
      }

      setStatusChanging(true);
      try {
        const result = await dispatch(
          updatePlatformStoreStatus({
            storeId: store.id,
            payload: {
              status: newStatus as "ACTIVE" | "SUSPENDED" | "ARCHIVED",
            },
          }),
        ).unwrap();
        setStore((prev) => (prev ? { ...prev, status: result.status } : prev));
        toast.success(t("success.store.statusChanged"));
      } catch {
        toast.error(t("errors.store.invalidTransition"));
      } finally {
        setStatusChanging(false);
      }
    },
    [store, dispatch, t],
  );

  // Get status badge variant
  const getStatusVariant = (status: StoreStatus): StatusVariant => {
    switch (status) {
      case STORE_STATUS.ACTIVE:
        return "success";
      case STORE_STATUS.DRAFT:
        return "info";
      case STORE_STATUS.SUSPENDED:
        return "warning";
      case STORE_STATUS.ARCHIVED:
        return "neutral";
      default:
        return "neutral";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4">{error || "Store not found"}</p>
        <Button
          variant="outline"
          onClick={() => router.push(ROUTES.PLATFORM.STORES)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {locale === "ar" ? "العودة للمتاجر" : "Back to Stores"}
        </Button>
      </div>
    );
  }

  const currentStatus = store.status as StoreStatus;
  const validTransitions = STORE_STATUS_TRANSITIONS[currentStatus] || [];
  const statusLabel =
    STORE_STATUS_LABELS[currentStatus]?.[locale] || currentStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(ROUTES.PLATFORM.STORES)}
            aria-label={tA11y("backToList")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <StoreIcon className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-2xl font-bold">{store.name}</h2>
          <StatusBadge
            label={statusLabel}
            variant={getStatusVariant(currentStatus)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Store Information */}
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "ar" ? "معلومات المتجر" : "Store Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <StoreIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "اسم المتجر" : "Store Name"}
                </p>
                <p className="font-medium">{store.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "النطاق" : "Domain"}
                </p>
                <p className="font-medium">{store.domain}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "المالك" : "Owner"}
                </p>
                <p className="font-medium">{store.owner?.name || "—"}</p>
                {store.owner?.email && (
                  <p className="text-sm text-muted-foreground">
                    {store.owner.email}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "تاريخ الإنشاء" : "Created At"}
                </p>
                <p className="font-medium">{formatDate(store.created_at)}</p>
              </div>
            </div>

            {store.description && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "الوصف" : "Description"}
                </p>
                <p className="mt-1">{store.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Management */}
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "ar" ? "إدارة الحالة" : "Status Management"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {locale === "ar" ? "الحالة الحالية" : "Current Status"}
              </p>
              <StatusBadge
                label={statusLabel}
                variant={getStatusVariant(currentStatus)}
              />
            </div>

            {validTransitions.length > 0 ? (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {locale === "ar" ? "تغيير الحالة إلى" : "Change Status To"}
                </p>
                <Select
                  disabled={statusChanging}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        locale === "ar"
                          ? "اختر الحالة الجديدة"
                          : "Select new status"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(STORE_STATUS)
                      .filter((s) => s !== currentStatus)
                      .map((status) => {
                        const isValid = validTransitions.includes(status);
                        return (
                          <SelectItem
                            key={status}
                            value={status}
                            disabled={!isValid}
                          >
                            {STORE_STATUS_LABELS[status]?.[locale] || status}
                            {!isValid &&
                              (locale === "ar"
                                ? " (غير متاح)"
                                : " (unavailable)")}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  {locale === "ar"
                    ? "الانتقالات المتاحة فقط هي المفعّلة"
                    : "Only valid transitions are enabled"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {locale === "ar"
                  ? "لا توجد انتقالات متاحة من هذه الحالة"
                  : "No transitions available from this status"}
              </p>
            )}

            {/* Additional store details */}
            {store.support_email && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {locale === "ar"
                    ? "البريد الإلكتروني للدعم"
                    : "Support Email"}
                </p>
                <p className="font-medium">{store.support_email}</p>
              </div>
            )}

            {store.support_phone && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "هاتف الدعم" : "Support Phone"}
                </p>
                <p className="font-medium">{store.support_phone}</p>
              </div>
            )}

            {store.meta_title && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {locale === "ar" ? "عنوان SEO" : "SEO Title"}
                </p>
                <p className="font-medium">{store.meta_title}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
