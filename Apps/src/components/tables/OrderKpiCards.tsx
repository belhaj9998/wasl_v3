"use client";

/**
 * OrderKpiCards
 *
 * Renders four KPI cards above the OrderStatusTabs strip on /admin/orders:
 *   1. Today orders count
 *   2. Today revenue (LYD, 3 decimals)
 *   3. Today AOV (LYD, 3 decimals)
 *   4. Pending orders (all-time, status = PENDING)
 *
 * Behavior
 * - Reads { kpis, kpisLoading, kpisError } from the orders slice (sticky values).
 * - First load (kpis === null && kpisLoading): renders <Skeleton /> per card.
 * - Error: renders "—" per value; refresh button stays enabled.
 * - Refresh button: dispatches fetchOrderKpis({ storeId }); RefreshCw icon
 *   spins iff kpisLoading is true.
 * - Money formatting: server already produced 3-decimal strings via
 *   Decimal.toFixed(3); we render them as-is and append the LYD suffix.
 *   We intentionally do NOT reuse the 2-decimal formatCurrency util.
 * - RTL/LTR: uses logical `me-2` so spacing flips automatically with locale.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Receipt, TrendingUp, Clock, RefreshCw } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchOrderKpis } from "@/lib/store/slices/orders.thunks";

interface OrderKpiCardsProps {
  storeId: number;
  locale: "ar" | "en";
}

const LABELS = {
  todayOrders: { ar: "طلبات اليوم", en: "Today Orders" },
  todayRevenue: { ar: "إيرادات اليوم", en: "Today Revenue" },
  todayAov: { ar: "متوسط قيمة الطلب", en: "Today AOV" },
  pending: { ar: "طلبات قيد الانتظار", en: "Pending Orders" },
  refresh: { ar: "تحديث", en: "Refresh" },
  sectionLabel: { ar: "مؤشرات الطلبات", en: "Order KPIs" },
} as const;

const PLACEHOLDER = "—";

function formatLyd(
  value: string | undefined | null,
  locale: "ar" | "en",
): string {
  if (!value) return PLACEHOLDER;
  // Server emits Decimal.toFixed(3); render as-is and append LYD suffix.
  return locale === "ar" ? `${value} د.ل` : `${value} LYD`;
}

export function OrderKpiCards({ storeId, locale }: OrderKpiCardsProps) {
  const dispatch = useAppDispatch();
  const { kpis, kpisLoading, kpisError } = useAppSelector(
    (state) => state.orders,
  );

  const isFirstLoad = kpis === null && kpisLoading;
  const hasError = kpisError !== null;

  const handleRefresh = () => {
    dispatch(fetchOrderKpis({ storeId }));
  };

  const countValue = (n: number | undefined): string =>
    hasError || n === undefined ? PLACEHOLDER : String(n);

  return (
    <section
      data-testid="order-kpi-cards"
      aria-label={LABELS.sectionLabel[locale]}
    >
      <div className="mb-3 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          aria-label={LABELS.refresh[locale]}
          data-testid="order-kpi-refresh"
        >
          <RefreshCw
            className={`me-2 h-4 w-4 ${kpisLoading ? "animate-spin" : ""}`}
          />
          {LABELS.refresh[locale]}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCell
          icon={<Package className="h-4 w-4 text-muted-foreground" />}
          label={LABELS.todayOrders[locale]}
          value={countValue(kpis?.orders_today_count)}
          loading={isFirstLoad}
          dimmed={hasError}
        />
        <KpiCell
          icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
          label={LABELS.todayRevenue[locale]}
          value={
            hasError ? PLACEHOLDER : formatLyd(kpis?.revenue_today, locale)
          }
          loading={isFirstLoad}
          dimmed={hasError}
        />
        <KpiCell
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          label={LABELS.todayAov[locale]}
          value={hasError ? PLACEHOLDER : formatLyd(kpis?.aov_today, locale)}
          loading={isFirstLoad}
          dimmed={hasError}
        />
        <KpiCell
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          label={LABELS.pending[locale]}
          value={countValue(kpis?.pending_orders_count)}
          loading={isFirstLoad}
          dimmed={hasError}
        />
      </div>
    </section>
  );
}

interface KpiCellProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
  dimmed?: boolean;
}

function KpiCell({ icon, label, value, loading, dimmed }: KpiCellProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div
            className={`text-2xl font-bold ${dimmed ? "text-muted-foreground" : ""}`}
          >
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
