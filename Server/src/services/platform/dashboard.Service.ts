import prisma from "../../configs/prisma";
import {
  DashboardStats,
  RevenueData,
  GrowthMetric,
} from "../../types/platform.types";

/**
 * DashboardService provides read-only aggregation queries
 * for platform-wide statistics, revenue, and growth metrics.
 */
export class DashboardService {
  /**
   * Returns platform-wide counts:
   * - total_users: non-deleted users
   * - total_stores: non-deleted stores
   * - total_orders: all orders
   * - total_revenue: sum from active/trialing subscriptions
   * - active_subscriptions: subscriptions with ACTIVE or TRIALING status
   */
  async getStats(): Promise<DashboardStats> {
    const [
      totalUsers,
      totalStores,
      totalOrders,
      activeSubscriptions,
      subscriptions,
    ] = await Promise.all([
      prisma.user.count({ where: { deleted_at: null } }),
      prisma.store.count({ where: { deleted_at: null } }),
      prisma.order.count(),
      prisma.storeSubscription.count({
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
      }),
      prisma.storeSubscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        include: { plan: true },
      }),
    ]);

    // Calculate total revenue from active subscriptions
    let totalRevenue = 0;
    for (const sub of subscriptions) {
      if (sub.billing_cycle === "MONTHLY") {
        totalRevenue += Number(sub.plan.price_monthly);
      } else if (sub.billing_cycle === "YEARLY") {
        const yearlyPrice = sub.plan.price_yearly
          ? Number(sub.plan.price_yearly)
          : Number(sub.plan.price_monthly) * 12;
        totalRevenue += yearlyPrice;
      }
    }

    return {
      total_users: totalUsers,
      total_stores: totalStores,
      total_orders: totalOrders,
      total_revenue: (Math.round(totalRevenue * 100) / 100).toFixed(2),
      active_subscriptions: activeSubscriptions,
    };
  }

  /**
   * Aggregates monthly revenue from active/trialing subscriptions.
   * - MONTHLY billing: uses price_monthly from the plan
   * - YEARLY billing: uses price_yearly / 12 from the plan
   */
  async getRevenue(): Promise<RevenueData> {
    const subscriptions = await prisma.storeSubscription.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIALING"] },
      },
      include: {
        plan: true,
      },
    });

    let monthlyRevenue = 0;

    for (const sub of subscriptions) {
      if (sub.billing_cycle === "MONTHLY") {
        monthlyRevenue += Number(sub.plan.price_monthly);
      } else if (sub.billing_cycle === "YEARLY") {
        const yearlyPrice = sub.plan.price_yearly
          ? Number(sub.plan.price_yearly)
          : Number(sub.plan.price_monthly) * 12;
        monthlyRevenue += yearlyPrice / 12;
      }
    }

    return {
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    };
  }

  /**
   * Groups store creation by month (YYYY-MM format).
   * Filters by date range; defaults to last 12 months if no range provided.
   */
  async getGrowth(
    startMonth?: string,
    endMonth?: string,
  ): Promise<GrowthMetric[]> {
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    if (startMonth) {
      // Parse YYYY-MM format
      const [year, month] = startMonth.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
    } else {
      // Default: 12 months ago from start of current month
      startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    }

    if (endMonth) {
      // Parse YYYY-MM format — end of that month
      const [year, month] = endMonth.split("-").map(Number);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      // Default: end of current month
      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    }

    const stores = await prisma.store.findMany({
      where: {
        deleted_at: null,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        created_at: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });

    // Group by YYYY-MM
    const grouped: Record<string, number> = {};

    // Initialize all months in range with 0
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (cursor <= endCursor) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      grouped[key] = 0;
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // Count stores per month
    for (const store of stores) {
      const date = new Date(store.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (key in grouped) {
        grouped[key]++;
      }
    }

    // Convert to array
    const result: GrowthMetric[] = Object.entries(grouped).map(
      ([month, count]) => ({ month, count }),
    );

    return result;
  }
}

export const dashboardService = new DashboardService();
