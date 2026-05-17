"use client";

/**
 * LowStockAlerts — Dashboard section showing up to 10 low-stock inventory alerts.
 * Items are sorted ascending by available quantity.
 * Loads independently with its own skeleton and error handling.
 *
 * Requirements: 13.3, 13.6, 13.7
 */

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AlertTriangle, Package, RefreshCw } from "lucide-react";

import { useStore } from "@/hooks";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { PaginatedResponse } from "@/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InventoryAlert {
  variant_id: number;
  product_id: number;
  product_name: string;
  variant_title: string;
  sku: string;
  available_quantity: number;
  low_stock_threshold: number;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function LowStockAlertsSkeleton() {
  return (
    <div
      className="space-y-3"
      aria-busy="true"
      aria-label="Loading inventory alerts"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2 px-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="text-end">
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LowStockAlerts() {
  const t = useTranslations("storeDashboard");
  const { currentStoreId } = useStore();

  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!currentStoreId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient<PaginatedResponse<InventoryAlert>>(
        `${API_ENDPOINTS.STORE.DASHBOARD(currentStoreId)}/inventory-alerts?limit=10&sortBy=available_quantity&sortOrder=asc`,
        { storeId: currentStoreId },
      );
      setAlerts(res.data);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, t]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{t("inventoryAlerts")}</CardTitle>
          <CardDescription>{t("lowStockItems")}</CardDescription>
        </div>
        <Link
          href="/admin/inventory/low-stock"
          className="text-sm text-primary hover:underline"
        >
          {t("viewAll")}
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LowStockAlertsSkeleton />
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
              onClick={fetchAlerts}
              aria-label={t("retry")}
            >
              <RefreshCw className="h-4 w-4 me-1" />
              {t("retry")}
            </Button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mb-2" />
            <p className="text-sm">{t("noAlerts")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {alerts.map((alert) => (
              <Link
                key={alert.variant_id}
                href={`/admin/inventory?variantId=${alert.variant_id}`}
                className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {alert.product_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.variant_title}
                    {alert.sku && ` · ${alert.sku}`}
                  </p>
                </div>
                <div className="text-end ms-3">
                  <Badge
                    variant="destructive"
                    className="text-xs"
                    aria-label={`${t("available")}: ${alert.available_quantity} / ${t("threshold")}: ${alert.low_stock_threshold}`}
                  >
                    {alert.available_quantity} / {alert.low_stock_threshold}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
