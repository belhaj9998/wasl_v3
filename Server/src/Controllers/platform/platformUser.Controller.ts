import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { platformUserService } from "../../services/platform/platformUser.Service";
import { AppRequest, PaginationParams } from "../../types";
import { PlatformUserFilters } from "../../services/platform/platformUser.Service";
import { SystemRole } from "../../../generated/prisma";

/**
 * PlatformUserController handles platform-level user management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/platform/users
 * Returns a paginated list of users with optional filters.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const sortBy = req.query.sortBy as string | undefined;
  const sortOrder = (req.query.sortOrder as "asc" | "desc") || undefined;

  const params: PaginationParams = { page, limit, sortBy, sortOrder };

  const filters: PlatformUserFilters = {};

  if (req.query.system_role) {
    filters.system_role = req.query.system_role as SystemRole;
  }

  if (req.query.is_active !== undefined) {
    filters.is_active = req.query.is_active === "true";
  }

  if (req.query.search) {
    filters.search = req.query.search as string;
  }

  const result = await platformUserService.list(params, filters);

  sendPaginated(res, result.data, result.meta, "Users retrieved");
});

/**
 * GET /api/platform/users/:id
 * Returns a single user by ID.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const user = await platformUserService.getById(id);

  sendSuccess(res, { user }, "User retrieved");
});

/**
 * PATCH /api/platform/users/:id
 * Updates a user's is_active or system_role fields.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const user = await platformUserService.update(id, req.body, req.user!.userId);

  sendSuccess(res, { user }, "User updated");
});

/**
 * DELETE /api/platform/users/:id
 * Soft-deletes a user.
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  await platformUserService.delete(id, req.user!.userId);

  sendSuccess(res, null, "User deleted");
});
