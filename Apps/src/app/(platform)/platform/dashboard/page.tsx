"use client";

/**
 * Platform Dashboard Page
 * Displays platform-wide statistics with percentage change vs previous month,
 * and a growth chart showing stores and users over the last 12 months.
 *
 * Requirements: 13.4, 13.5
 */

import { useEffect, useCallback, Suspense } from "react";
import { useTranslations, useLocale } from "next-intl";
import dynamic from "next/dynamic";
import {
  Users,
  Store,
  CreditCard,
  DollarSign,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchPlatformStats,
  fetchPlatformGrowth,
} from "@/lib/store/slices/platform.thunks";
import { formatCurrencyLYD } from "@/lib/i18n/formatters";
import {
  calculatePercentageChange,
  formatPercentageChange,
} from "@/lib/utils/percentageChange";
import type { SupportedLocale } from "@/lib/i18n/config";

// Dynamic import for recharts (code splitting for chart library)
const GrowthChart = dynamic(
  () => import("./GrowthChart").then((mod) => ({ default: mod.GrowthChart })),
  {
    ssr: false,
    loading: () => <GrowthChartSkeleton />,
  },
);

// ─── Skeleton Components ─────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

function GrowthChartSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-64 w-full rounded" />
    </div>
  );
}

// ─── Stat Card Component ─────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  percentageChange: number | null;
  locale: SupportedLocale;
  loading?: boolean;
}

function StatCard({
  title,
  value,
  icon,
  percentageChange,
  locale,
  loading,
}: StatCardProps) {
  if (loading) {
    return <StatCardSkeleton />;
  }

  const changeText = formatPercentageChange(percentageChange, locale);
  const isPositive = percentageChange !== null && percentageChange > 0;
  const isNegative = percentageChange !== null && percentageChange < 0;
  const isNew = percentageChange === null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground" aria-hidden="true">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {isPositive && (
            <TrendingUp className="h-3 w-3 text-green-600" aria-hidden="true" />
          )}
          {isNegative && (
            <TrendingDown className="h-3 w-3 text-red-600" aria-hidden="true" />
          )}
          {!isPositive && !isNegative && !isNew && (
            <Minus
              className="h-3 w-3 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <span
            className={`text-xs ${
              isPositive
                ? "text-green-600"
                : isNegative
                  ? "text-red-600"
                  : isNew
                    ? "text-blue-600"
                    : "text-muted-foreground"
            }`}
            aria-label={`${changeText} ${locale === "ar" ? "مقارنة بالشهر السابق" : "vs last month"}`}
          >
            {changeText}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Error Section Component ─────────────────────────────────────────────────

interface ErrorSectionProps {
  message: string;
  onRetry: () => void;
  retryLabel: string;
}

function ErrorSection({ message, onRetry, retryLabel }: ErrorSectionProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="h-4 w-4 text-destructive"
          aria-hidden="true"
        />
        <p className="text-sm text-destructive">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  );
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function PlatformDashboardPage() {
  const dispatch = useAppDispatch();
  const t = useTranslations("platformDashboard");
  const locale = useLocale() as SupportedLocale;

  const stats = useAppSelector((state) => state.platform.stats);
  const statsLoading = useAppSelector((state) => state.platform.statsLoading);
  const statsError = useAppSelector((state) => state.platform.statsError);

  const growth = useAppSelector((state) => state.platform.growth);
  const growthLoading = useAppSelector((state) => state.platform.growthLoading);
  const growthError = useAppSelector((state) => state.platform.growthError);

  const loadStats = useCallback(() => {
    dispatch(fetchPlatformStats());
  }, [dispatch]);

  const loadGrowth = useCallback(() => {
    dispatch(fetchPlatformGrowth());
  }, [dispatch]);

  useEffect(() => {
    loadStats();
    loadGrowth();
  }, [loadStats, loadGrowth]);

  // Calculate percentage changes for each stat
  const usersChange = stats
    ? calculatePercentageChange(stats.total_users, stats.prev_users ?? 0)
    : 0;

  const storesChange = stats
    ? calculatePercentageChange(stats.total_stores, stats.prev_stores ?? 0)
    : 0;

  const ordersChange = stats
    ? calculatePercentageChange(stats.total_orders, stats.prev_orders ?? 0)
    : 0;

  const revenueChange = stats
    ? calculatePercentageChange(
        parseFloat(stats.total_revenue) || 0,
        parseFloat(stats.prev_revenue ?? "0") || 0,
      )
    : 0;

  const subscriptionsChange = stats
    ? calculatePercentageChange(
        stats.active_subscriptions,
        stats.prev_subscriptions ?? 0,
      )
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Stats Error */}
      {statsError && !statsLoading && (
        <ErrorSection
          message={t("statsError")}
          onRetry={loadStats}
          retryLabel={t("retry")}
        />
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title={t("totalUsers")}
          value={stats?.total_users ?? 0}
          icon={<Users className="h-5 w-5" />}
          percentageChange={usersChange}
          locale={locale}
          loading={statsLoading}
        />
        <StatCard
          title={t("totalStores")}
          value={stats?.total_stores ?? 0}
          icon={<Store className="h-5 w-5" />}
          percentageChange={storesChange}
          locale={locale}
          loading={statsLoading}
        />
        <StatCard
          title={t("totalOrders")}
          value={stats?.total_orders ?? 0}
          icon={<Activity className="h-5 w-5" />}
          percentageChange={ordersChange}
          locale={locale}
          loading={statsLoading}
        />
        <StatCard
          title={t("totalRevenue")}
          value={
            stats
              ? formatCurrencyLYD(parseFloat(stats.total_revenue) || 0, locale)
              : formatCurrencyLYD(0, locale)
          }
          icon={<DollarSign className="h-5 w-5" />}
          percentageChange={revenueChange}
          locale={locale}
          loading={statsLoading}
        />
        <StatCard
          title={t("activeSubscriptions")}
          value={stats?.active_subscriptions ?? 0}
          icon={<CreditCard className="h-5 w-5" />}
          percentageChange={subscriptionsChange}
          locale={locale}
          loading={statsLoading}
        />
      </div>

      {/* Growth Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("growthChart")}</CardTitle>
          <CardDescription>{t("growthChartDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {growthError && !growthLoading ? (
            <ErrorSection
              message={t("growthError")}
              onRetry={loadGrowth}
              retryLabel={t("retry")}
            />
          ) : growthLoading ? (
            <GrowthChartSkeleton />
          ) : growth && growth.length > 0 ? (
            <Suspense fallback={<GrowthChartSkeleton />}>
              <GrowthChart data={growth} locale={locale} />
            </Suspense>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>{t("noGrowthData")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
