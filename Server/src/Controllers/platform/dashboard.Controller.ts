import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { dashboardService } from "../../services/platform/dashboard.Service";
import { AppRequest } from "../../types";

/**
 * DashboardController handles platform dashboard analytics endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/platform/dashboard/stats
 * Returns platform-wide statistics (users, stores, subscriptions).
 */
export const getStats = asyncHandler(async (req: AppRequest, res: Response) => {
  const stats = await dashboardService.getStats();

  sendSuccess(res, { stats }, "Dashboard stats retrieved");
});

/**
 * GET /api/platform/dashboard/revenue
 * Returns aggregated monthly revenue data.
 */
export const getRevenue = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const revenue = await dashboardService.getRevenue();

    sendSuccess(res, { revenue }, "Revenue data retrieved");
  },
);

/**
 * GET /api/platform/dashboard/growth
 * Returns store growth metrics grouped by month.
 * Query params: start_month (YYYY-MM), end_month (YYYY-MM)
 */
export const getGrowth = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const start_month = req.query.start_month as string | undefined;
    const end_month = req.query.end_month as string | undefined;

    const growth = await dashboardService.getGrowth(start_month, end_month);

    sendSuccess(res, { growth }, "Growth data retrieved");
  },
);
