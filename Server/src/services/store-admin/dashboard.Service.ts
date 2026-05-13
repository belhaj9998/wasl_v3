import prisma from "../../configs/prisma";

/**
 * Dashboard overview metrics for a store.
 */
interface DashboardOverview {
  total_orders: number;
  total_revenue: number;
  total_customers: number;
  orders_today: number;
  revenue_today: number;
  pending_orders: number;
  average_order_value: number;
}

/**
 * Parameters for sales statistics query.
 */
interface SalesStatParams {
  period: "day" | "week" | "month";
  from_date?: Date;
  to_date?: Date;
}

/**
 * A single data point in sales statistics.
 */
interface SalesDataPoint {
  date: string;
  orders_count: number;
  revenue: number;
}

/**
 * An inventory alert item for low-stock variants.
 */
interface InventoryAlert {
  variant_id: number;
  product_name: string;
  variant_title: string;
  sku: string;
  available_quantity: number;
  low_stock_threshold: number;
}

/**
 * Pagination parameters.
 */
interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Statuses excluded from revenue calculations.
 */
const EXCLUDED_STATUSES = ["CANCELED", "RETURNED"] as const;

/**
 * DashboardService aggregates store-level analytics:
 * - Overview metrics (totals, today's stats, averages)
 * - Sales statistics grouped by period (day/week/month)
 * - Inventory alerts for low-stock variants
 *
 * All queries are scoped by store_id for multi-tenant isolation.
 * Revenue calculations exclude CANCELED and RETURNED orders.
 */
export class DashboardService {
  /**
   * Returns an overview of store performance metrics.
   * - total_orders: count of all orders (excluding CANCELED/RETURNED)
   * - total_revenue: sum of grand_total (excluding CANCELED/RETURNED)
   * - total_customers: count of all customers in the store
   * - orders_today: count of orders placed today (excluding CANCELED/RETURNED)
   * - revenue_today: sum of grand_total for today (excluding CANCELED/RETURNED)
   * - pending_orders: count of orders with status PENDING
   * - average_order_value: total_revenue / total_orders (0 if no orders)
   */
  async getOverview(storeId: number): Promise<DashboardOverview> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Run all queries in parallel for efficiency
    const [totalOrdersAgg, totalCustomers, todayOrdersAgg, pendingOrders] =
      await Promise.all([
        // Total orders count + total revenue (excluding CANCELED/RETURNED)
        prisma.order.aggregate({
          where: {
            store_id: storeId,
            status: { notIn: ["CANCELED", "RETURNED"] },
          },
          _count: { id: true },
          _sum: { grand_total: true },
        }),
        // Total customers in the store
        prisma.customer.count({
          where: { store_id: storeId },
        }),
        // Today's orders count + revenue (excluding CANCELED/RETURNED)
        prisma.order.aggregate({
          where: {
            store_id: storeId,
            status: { notIn: ["CANCELED", "RETURNED"] },
            placed_at: { gte: todayStart, lte: todayEnd },
          },
          _count: { id: true },
          _sum: { grand_total: true },
        }),
        // Pending orders count
        prisma.order.count({
          where: { store_id: storeId, status: "PENDING" },
        }),
      ]);

    const totalOrders = totalOrdersAgg._count.id ?? 0;
    const totalRevenue = Number(totalOrdersAgg._sum.grand_total ?? 0);
    const ordersToday = todayOrdersAgg._count.id ?? 0;
    const revenueToday = Number(todayOrdersAgg._sum.grand_total ?? 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_customers: totalCustomers,
      orders_today: ordersToday,
      revenue_today: revenueToday,
      pending_orders: pendingOrders,
      average_order_value: Math.round(averageOrderValue * 100) / 100,
    };
  }

  /**
   * Returns sales statistics grouped by period (day/week/month).
   * Groups orders by placed_at, excludes CANCELED/RETURNED.
   * Supports from_date/to_date filtering.
   * Uses raw SQL for date truncation grouping.
   */
  async getSalesStats(
    storeId: number,
    params: SalesStatParams,
  ): Promise<SalesDataPoint[]> {
    const { period, from_date, to_date } = params;

    // Determine the date_trunc interval for PostgreSQL
    let truncInterval: string;
    switch (period) {
      case "day":
        truncInterval = "day";
        break;
      case "week":
        truncInterval = "week";
        break;
      case "month":
        truncInterval = "month";
        break;
      default:
        truncInterval = "day";
    }

    // Build conditions array for the WHERE clause
    const conditions: string[] = [
      `store_id = $1`,
      `status NOT IN ('CANCELED', 'RETURNED')`,
    ];
    const queryParams: any[] = [storeId];
    let paramIndex = 2;

    if (from_date) {
      conditions.push(`placed_at >= $${paramIndex}`);
      queryParams.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      conditions.push(`placed_at <= $${paramIndex}`);
      queryParams.push(to_date);
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    const query = `
      SELECT
        date_trunc('${truncInterval}', placed_at)::date::text AS date,
        COUNT(*)::int AS orders_count,
        COALESCE(SUM(grand_total), 0)::float AS revenue
      FROM "Order"
      WHERE ${whereClause}
      GROUP BY date_trunc('${truncInterval}', placed_at)
      ORDER BY date_trunc('${truncInterval}', placed_at) ASC
    `;

    const results = await prisma.$queryRawUnsafe<SalesDataPoint[]>(
      query,
      ...queryParams,
    );

    return results.map((row) => ({
      date: row.date,
      orders_count: Number(row.orders_count),
      revenue: Number(row.revenue),
    }));
  }

  /**
   * Returns a paginated list of inventory alerts (low-stock variants).
   * A variant is considered low-stock when available_quantity <= low_stock_threshold.
   * Includes product_name, variant_title, sku.
   */
  async getInventoryAlerts(storeId: number, params: PaginationParams) {
    const { page = 1, limit = 20 } = params;

    // Prisma doesn't support column-to-column comparison in where clause,
    // so we fetch all inventory for the store and filter in application.
    const allRecords = await prisma.inventory.findMany({
      where: { store_id: storeId },
      include: {
        variant: {
          select: {
            id: true,
            title: true,
            sku: true,
            product: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { available_quantity: "asc" },
    });

    // Filter: available_quantity <= low_stock_threshold
    const lowStockRecords = allRecords.filter(
      (inv) => inv.available_quantity <= inv.low_stock_threshold,
    );

    const total = lowStockRecords.length;
    const paginatedRecords = lowStockRecords.slice(
      (page - 1) * limit,
      page * limit,
    );

    const data: InventoryAlert[] = paginatedRecords.map((inv) => ({
      variant_id: inv.variant.id,
      product_name: inv.variant.product.name,
      variant_title: inv.variant.title,
      sku: inv.variant.sku,
      available_quantity: inv.available_quantity,
      low_stock_threshold: inv.low_stock_threshold,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const dashboardService = new DashboardService();
