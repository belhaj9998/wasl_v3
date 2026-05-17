"use client";

/**
 * RecentOrders — Dashboard section showing the last 5 orders.
 * Loads independently with its own skeleton and error handling.
 *
 * Requirements: 13.2, 13.6, 13.7
 */

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { ShoppingCart, AlertTriangle, RefreshCw } from "lucide-react";

import { useStore } from "@/hooks";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrencyLYD } from "@/lib/i18n/formatters";
import { formatDateLocale } from "@/lib/i18n/formatters";
import type { SupportedLocale } from "@/lib/i18n/config";
import type { PaginatedResponse, Order } from "@/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function RecentOrdersSkeleton() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading recent orders"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2 px-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="text-end space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RecentOrders() {
  const t = useTranslations("storeDashboard");
  const tStatus = useTranslations("statuses.orders");
  const locale = useLocale() as SupportedLocale;
  const { currentStoreId } = useStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentOrders = useCallback(async () => {
    if (!currentStoreId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient<PaginatedResponse<Order>>(
        `${API_ENDPOINTS.STORE.ORDERS(currentStoreId)}?limit=5&sortBy=created_at&sortOrder=desc`,
        { storeId: currentStoreId },
      );
      setOrders(res.data);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, t]);

  useEffect(() => {
    fetchRecentOrders();
  }, [fetchRecentOrders]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{t("recentOrders")}</CardTitle>
          <CardDescription>{t("lastFiveOrders")}</CardDescription>
        </div>
        <Link
          href="/admin/orders"
          className="text-sm text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <RecentOrdersSkeleton />
        ) : error ? (
          <div
            className="flex flex-col items-center justify-center py-8 text-muted-foreground"
            role="alert"
          >
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="text-sm mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecentOrders}
              aria-label={t("retry")}
            >
              <RefreshCw className="h-4 w-4 me-1" />
              {t("retry")}
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ShoppingCart className="h-10 w-10 mb-2" />
            <p className="text-sm">{t("noRecentOrders")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">#{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateLocale(order.created_at, locale, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="text-end space-y-0.5">
                  <p className="text-sm font-medium">
                    {formatCurrencyLYD(parseFloat(order.total), locale)}
                  </p>
                  <StatusBadge
                    label={tStatus(order.status)}
                    variant={getOrderStatusVariant(order.status)}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getOrderStatusVariant(
  status: string,
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
