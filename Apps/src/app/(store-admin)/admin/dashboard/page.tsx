"use client";

/**
 * Store Admin Dashboard Page
 * Displays store-specific statistics: overview cards, recent orders, and low-stock alerts.
 * Each section loads independently with its own skeleton and error handling.
 * Includes a DashboardHeader with welcome message and Create Store button.
 *
 * Requirements: 1.1, 1.3, 4.3, 6.1, 6.4, 13.1, 13.2, 13.3, 13.6, 13.7
 */

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import {
  ShoppingCart,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  Package,
  RefreshCw,
} from "lucide-react";

import { useStore, useAuth, useStoreSubscription } from "@/hooks";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { toastSuccess } from "@/lib/toast/toastManager";
import type { ApiResponse, Store } from "@/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/layouts/DashboardHeader";

import { RecentOrders } from "./RecentOrders";
import { LowStockAlerts } from "./LowStockAlerts";

// Dynamic import for SalesChart (recharts is > 50KB)
const SalesChart = dynamic(() => import("./SalesChart"), {
  ssr: false,
  loading: () => <SalesChartLoadingSkeleton />,
});

function SalesChartLoadingSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <Skeleton className="h-5 w-36" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

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
  const tCreateStore = useTranslations("createStore");
  const { currentStoreId } = useStore();
  const { user } = useAuth();
  const { storeCount, maxStores, hasActiveSubscription, refreshStores } =
    useStoreSubscription();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    if (!currentStoreId) return;

    setLoading(true);
    setError(null);

    try {
      const overviewRes = await apiClient<
        ApiResponse<{ overview: DashboardOverview }>
      >(`${API_ENDPOINTS.STORE.DASHBOARD(currentStoreId)}/overview`, {
        storeId: currentStoreId,
      });
      setOverview(overviewRes.data.overview);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, t]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Handle store creation: re-fetch store list and show success toast (auto-dismiss 5s)
  const handleStoreCreated = useCallback(
    async (_newStore: Store) => {
      await refreshStores();
      toastSuccess(tCreateStore("successToast"));
    },
    [refreshStores, tCreateStore],
  );

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

    if (error) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="text-sm mb-3">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOverview}
              aria-label={t("retry")}
            >
              <RefreshCw className="h-4 w-4 me-1" />
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Dashboard Header with welcome message and Create Store button */}
      <DashboardHeader
        userName={user?.name?.split(" ")[0] ?? null}
        storeCount={storeCount}
        maxStores={maxStores}
        hasActiveSubscription={hasActiveSubscription}
        onStoreCreated={handleStoreCreated}
      />

      {/* Overview Stats */}
      {renderOverviewCards()}

      {/* Sales Chart — loads independently with its own skeleton */}
      <SalesChart />

      {/* Recent Orders & Inventory Alerts — each loads independently */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentOrders />
        <LowStockAlerts />
      </div>
    </div>
  );
}
