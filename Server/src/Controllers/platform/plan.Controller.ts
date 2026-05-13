import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { planService } from "../../services/platform/plan.Service";
import { AppRequest } from "../../types";

/**
 * PlanController handles platform-level subscription plan management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/platform/plans
 * Returns all subscription plans (excluding soft-deleted).
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const plans = await planService.list();

  sendSuccess(res, { plans }, "Plans retrieved");
});

/**
 * POST /api/platform/plans
 * Creates a new subscription plan.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const plan = await planService.createPlan(req.body);

  sendSuccess(res, { plan }, "Plan created", 201);
});

/**
 * GET /api/platform/plans/:id
 * Returns a single plan by ID.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const plan = await planService.getById(id);

  sendSuccess(res, { plan }, "Plan retrieved");
});

/**
 * PATCH /api/platform/plans/:id
 * Updates allowed fields on a plan.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const plan = await planService.updatePlan(id, req.body);

  sendSuccess(res, { plan }, "Plan updated");
});

/**
 * DELETE /api/platform/plans/:id
 * Soft-deletes a plan (checks for active subscriptions first).
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  await planService.deletePlan(id);

  sendSuccess(res, null, "Plan deleted");
});
