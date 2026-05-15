"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  Store,
  CreditCard,
  DollarSign,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchPlatformStats } from "@/lib/store/slices/platform.thunks";
import { formatCurrency } from "@/lib/utils/formatCurrency";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
}

function StatCard({ title, value, icon, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20" />
        </CardContent>
      </Card>
    );
  }

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
      </CardContent>
    </Card>
  );
}

export default function PlatformDashboardPage() {
  const dispatch = useAppDispatch();
  const t = useTranslations("platformDashboard");
  const stats = useAppSelector((state) => state.platform.stats);
  const statsLoading = useAppSelector((state) => state.platform.statsLoading);
  const statsError = useAppSelector((state) => state.platform.statsError);

  useEffect(() => {
    dispatch(fetchPlatformStats());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {statsError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{statsError}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(fetchPlatformStats())}
          >
            {t("retry")}
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title={t("totalUsers")}
          value={stats?.total_users ?? 0}
          icon={<Users className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title={t("totalStores")}
          value={stats?.total_stores ?? 0}
          icon={<Store className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title={t("totalOrders")}
          value={stats?.total_orders ?? 0}
          icon={<Activity className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title={t("activeSubscriptions")}
          value={stats?.active_subscriptions ?? 0}
          icon={<CreditCard className="h-5 w-5" />}
          loading={statsLoading}
        />
        <StatCard
          title={t("totalRevenue")}
          value={stats ? formatCurrency(stats.total_revenue) : "0.00 د.ل"}
          icon={<DollarSign className="h-5 w-5" />}
          loading={statsLoading}
        />
      </div>
    </div>
  );
}
