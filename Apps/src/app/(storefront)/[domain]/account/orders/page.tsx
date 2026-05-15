"use client";

/**
 * Storefront Customer Orders Page
 * Shows order history with pagination.
 * Requirements: 19.4, 19.5
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Package, ShoppingBag } from "lucide-react";

import { storefrontService } from "@/lib/api/services/storefront.service";
import { EmptyState } from "@/components/shared";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Order, PaginationMeta } from "@/types";

function getOrderStatusVariant(status: string) {
  switch (status) {
    case "DELIVERED":
      return "success" as const;
    case "CANCELED":
    case "RETURNED":
      return "error" as const;
    case "PENDING":
    case "DRAFT":
      return "warning" as const;
    case "SHIPPED":
    case "IN_TRANSIT":
    case "OUT_FOR_DELIVERY":
      return "info" as const;
    default:
      return "neutral" as const;
  }
}

export default function StorefrontOrdersPage() {
  const params = useParams();
  const domain = params.domain as string;
  const t = useTranslations("storefront");

  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);
        const response = await storefrontService.getCustomerOrders(domain, {
          page: page,
          limit: 20,
        });
        setOrders(response.data);
        setMeta(response.meta);
      } catch {
        setError("load_failed");
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [domain, page]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <EmptyState
          title={t("loadError")}
          description={t("loadErrorDesc")}
          action={{
            label: t("retry"),
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        {t("myOrders")}
      </h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={t("noOrders")}
          description={t("noOrdersDesc")}
        />
      ) : (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        #{order.order_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-end">
                      <StatusBadge
                        label={order.status}
                        variant={getOrderStatusVariant(order.status)}
                      />
                      <p className="text-sm font-bold text-foreground mt-1">
                        {order.total} د.ل
                      </p>
                    </div>
                  </div>
                  {order.items && order.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        {order.items.length} {t("items")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t("previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("pageOf", { current: page, total: meta.totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
