"use client";

/**
 * Sales Chart Component for Store Admin Dashboard
 * Displays a line chart showing orders count and revenue over time.
 * Supports toggling between daily (30 days), weekly (12 weeks), and monthly (12 months) views.
 *
 * Requirements: 13.1, 13.6
 */

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { useStore } from "@/hooks";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils/formatCurrency";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ───────────────────────────────────────────────────────────────────

type SalesPeriod = "daily" | "weekly" | "monthly";

interface SalesDataPoint {
  date: string;
  orders_count: number;
  revenue: number;
}

interface SalesChartData {
  data: SalesDataPoint[];
}

// ─── Chart Skeleton ──────────────────────────────────────────────────────────

function SalesChartSkeleton() {
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

// ─── Period Toggle ───────────────────────────────────────────────────────────

interface PeriodToggleProps {
  activePeriod: SalesPeriod;
  onPeriodChange: (period: SalesPeriod) => void;
}

function PeriodToggle({ activePeriod, onPeriodChange }: PeriodToggleProps) {
  const t = useTranslations("storeDashboard");

  const periods: { key: SalesPeriod; label: string }[] = [
    { key: "daily", label: t("daily") },
    { key: "weekly", label: t("weekly") },
    { key: "monthly", label: t("monthly") },
  ];

  return (
    <div
      className="flex gap-1 rounded-md border p-0.5"
      role="tablist"
      aria-label={t("period")}
    >
      {periods.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={activePeriod === key}
          onClick={() => onPeriodChange(key)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activePeriod === key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

interface ChartErrorProps {
  onRetry: () => void;
}

function ChartError({ onRetry }: ChartErrorProps) {
  const t = useTranslations("storeDashboard");
  const tErrors = useTranslations("errors");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("salesStats")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
          <p className="text-sm mb-2">{tErrors("pageError.description")}</p>
          <button
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
          >
            {tErrors("pageError.retry")}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  ordersLabel: string;
  revenueLabel: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  ordersLabel,
  revenueLabel,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {entry.dataKey === "orders_count" ? ordersLabel : revenueLabel}:
          </span>
          <span className="font-medium">
            {entry.dataKey === "revenue"
              ? formatCurrency(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Sales Chart Component ───────────────────────────────────────────────────

export default function SalesChart() {
  const t = useTranslations("storeDashboard");
  const { currentStoreId } = useStore();

  const [period, setPeriod] = useState<SalesPeriod>("daily");
  const [data, setData] = useState<SalesDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSalesData = useCallback(async () => {
    if (!currentStoreId) return;

    setLoading(true);
    setError(false);

    try {
      const response = await apiClient<{ data: SalesChartData }>(
        `${API_ENDPOINTS.STORE.DASHBOARD(currentStoreId)}/sales?period=${period}`,
        { storeId: currentStoreId },
      );

      setData(response.data.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, period]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Loading state
  if (loading) {
    return <SalesChartSkeleton />;
  }

  // Error state
  if (error) {
    return <ChartError onRetry={fetchSalesData} />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">{t("salesStats")}</CardTitle>
        <PeriodToggle activePeriod={period} onPeriodChange={setPeriod} />
      </CardHeader>
      <CardContent>
        <div
          className="h-[300px] w-full"
          aria-label={t("salesStats")}
          role="img"
        >
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">{t("noRecentOrders")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="left"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="revenue"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: number) => `${value}`}
                />
                <Tooltip
                  content={
                    <CustomTooltip
                      ordersLabel={t("orders")}
                      revenueLabel={t("revenue")}
                    />
                  }
                />
                <Legend
                  formatter={(value: string) =>
                    value === "orders_count" ? t("orders") : t("revenue")
                  }
                />
                <Line
                  yAxisId="orders"
                  type="monotone"
                  dataKey="orders_count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="orders_count"
                />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-2, 160 60% 45%))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name="revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
