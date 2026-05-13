import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { dashboardService } from "../../services/store-admin/dashboard.Service";
import { AppRequest } from "../../types";

/**
 * DashboardController handles store-level analytics endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/dashboard/overview
 * Returns store performance overview metrics.
 */
export const getOverview = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;

    const overview = await dashboardService.getOverview(storeId);

    sendSuccess(res, { overview }, "Dashboard overview retrieved");
  },
);

/**
 * GET /api/stores/:storeId/dashboard/sales-stats
 * Returns sales statistics grouped by period (day/week/month).
 * Query params: period, from_date, to_date
 */
export const getSalesStats = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const period = (req.query.period as "day" | "week" | "month") || "day";
    const from_date = req.query.from_date
      ? new Date(req.query.from_date as string)
      : undefined;
    const to_date = req.query.to_date
      ? new Date(req.query.to_date as string)
      : undefined;

    const stats = await dashboardService.getSalesStats(storeId, {
      period,
      from_date,
      to_date,
    });

    sendSuccess(res, { stats }, "Sales statistics retrieved");
  },
);

/**
 * GET /api/stores/:storeId/dashboard/inventory-alerts
 * Returns a paginated list of low-stock inventory alerts.
 * Query params: page, limit
 */
export const getInventoryAlerts = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await dashboardService.getInventoryAlerts(storeId, {
      page,
      limit,
    });

    sendPaginated(res, result.data, result.meta, "Inventory alerts retrieved");
  },
);
