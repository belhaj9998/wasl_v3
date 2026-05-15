"use client";

/**
 * Store Admin Dashboard Page
 * Displays store-specific statistics: overview cards, recent orders, and low-stock alerts.
 *
 * Requirements: 6.3
 */

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ShoppingCart,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  Package,
} from "lucide-react";

import { useStore } from "@/hooks";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { ApiResponse, PaginatedResponse, Order } from "@/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardOverview {
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  orders_today: number;
  revenue_today: number;
  pending_orders: number;
  average_order_value: number;
}

interface SalesDataPoint {
  date: string;
  orders_count: number;
  revenue: number;
}

interface InventoryAlert {
  variant_id: number;
  product_name: string;
  variant_title: string;
  sku: string;
  available_quantity: number;
  low_stock_threshold: number;
}

// ─── Loading Skeletons ───────────────────────────────────────────────────────

function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function RecentOrdersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
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

function InventoryAlertsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
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

// ─── Stats Card Component ────────────────────────────────────────────────────

interface StatsCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
}

function StatsCard({ title, value, description, icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function StoreAdminDashboardPage() {
  const t = useTranslations("storeDashboard");
  const { currentStoreId } = useStore();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!currentStoreId) return;

    setLoading(true);
    setError(null);

    try {
      const [overviewRes, ordersRes, alertsRes] = await Promise.all([
        apiClient<ApiResponse<{ overview: DashboardOverview }>>(
          `${API_ENDPOINTS.STORE.DASHBOARD(currentStoreId)}/overview`,
          { storeId: currentStoreId },
        ),
        apiClient<PaginatedResponse<Order>>(
          `${API_ENDPOINTS.STORE.ORDERS(currentStoreId)}?limit=5&sortBy=created_at&sortOrder=desc`,
          { storeId: currentStoreId },
        ),
        apiClient<PaginatedResponse<InventoryAlert>>(
          `${API_ENDPOINTS.STORE.DASHBOARD(currentStoreId)}/inventory-alerts?limit=5`,
          { storeId: currentStoreId },
        ),
      ]);

      setOverview(overviewRes.data.overview);
      setRecentOrders(ordersRes.data);
      setInventoryAlerts(alertsRes.data);
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [currentStoreId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ─── Overview Stats Cards ──────────────────────────────────────────────────

  function renderOverviewCards() {
    if (loading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (!overview) return null;

    const stats = [
      {
        title: t("totalOrders"),
        value: String(overview.total_orders),
        icon: <ShoppingCart className="h-5 w-5" />,
      },
      {
        title: t("totalRevenue"),
        value: formatCurrency(overview.total_revenue),
        icon: <DollarSign className="h-5 w-5" />,
      },
      {
        title: t("totalCustomers"),
        value: String(overview.total_customers),
        icon: <Users className="h-5 w-5" />,
      },
      {
        title: t("ordersToday"),
        value: String(overview.orders_today),
        icon: <Clock className="h-5 w-5" />,
      },
      {
        title: t("revenueToday"),
        value: formatCurrency(overview.revenue_today),
        icon: <TrendingUp className="h-5 w-5" />,
      },
      {
        title: t("pendingOrders"),
        value: String(overview.pending_orders),
        icon: <Package className="h-5 w-5" />,
      },
      {
        title: t("averageOrderValue"),
        value: formatCurrency(overview.average_order_value),
        icon: <DollarSign className="h-5 w-5" />,
      },
    ];

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </div>
    );
  }

  // ─── Recent Orders ─────────────────────────────────────────────────────────

  function renderRecentOrders() {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t("recentOrders")}</CardTitle>
            <CardDescription>{t("ordersToday")}</CardDescription>
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
          ) : recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-2" />
              <p className="text-sm">{t("noRecentOrders")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">#{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customer_name}
                    </p>
                  </div>
                  <div className="text-end space-y-0.5">
                    <p className="text-sm font-medium">
                      {formatCurrency(order.total)}
                    </p>
                    <StatusBadge
                      label={order.status}
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

  // ─── Inventory Alerts ──────────────────────────────────────────────────────

  function renderInventoryAlerts() {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t("inventoryAlerts")}</CardTitle>
            <CardDescription>{t("lowStockItems")}</CardDescription>
          </div>
          <Link
            href="/admin/inventory"
            className="text-sm text-primary hover:underline"
          >
            {t("viewAll")}
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <InventoryAlertsSkeleton />
          ) : inventoryAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mb-2" />
              <p className="text-sm">{t("noAlerts")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inventoryAlerts.map((alert) => (
                <div
                  key={alert.variant_id}
                  className="flex items-center justify-between py-2 px-2 rounded-md"
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
                    <Badge variant="destructive" className="text-xs">
                      {alert.available_quantity} / {alert.low_stock_threshold}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────────

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium mb-2">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="text-sm text-primary hover:underline"
        >
          {t("viewAll")}
        </button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      {renderOverviewCards()}

      {/* Recent Orders & Inventory Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {renderRecentOrders()}
        {renderInventoryAlerts()}
      </div>
    </div>
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
