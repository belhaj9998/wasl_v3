import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { subscriptionService } from "../../services/platform/subscription.Service";
import { AppRequest, PaginationParams } from "../../types";

/**
 * SubscriptionController handles platform-level subscription management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/platform/subscriptions
 * Returns a paginated list of subscriptions with related store and plan data.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const sortBy = req.query.sortBy as string | undefined;
  const sortOrder = (req.query.sortOrder as "asc" | "desc") || undefined;

  const params: PaginationParams = { page, limit, sortBy, sortOrder };

  const result = await subscriptionService.list(params);

  sendPaginated(res, result.data, result.meta, "Subscriptions retrieved");
});

/**
 * GET /api/platform/subscriptions/:id
 * Returns a single subscription by ID with related store and plan data.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const subscription = await subscriptionService.getById(id);

  sendSuccess(res, { subscription }, "Subscription retrieved");
});

/**
 * PATCH /api/platform/subscriptions/:id
 * Updates a subscription's status, period, plan, or billing cycle.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const subscription = await subscriptionService.update(id, req.body);

  sendSuccess(res, { subscription }, "Subscription updated");
});
