import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { permissionService } from "../../services/platform/permission.Service";
import { AppRequest } from "../../types";

/**
 * PermissionController handles platform-level permission management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/platform/permissions
 * Returns all permissions.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const permissions = await permissionService.list();

  sendSuccess(res, { permissions }, "Permissions retrieved");
});

/**
 * POST /api/platform/permissions
 * Creates a new permission.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const permission = await permissionService.create(req.body);

  sendSuccess(res, { permission }, "Permission created", 201);
});

/**
 * PATCH /api/platform/permissions/:id
 * Updates a permission by ID.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const permission = await permissionService.update(id, req.body);

  sendSuccess(res, { permission }, "Permission updated");
});

/**
 * DELETE /api/platform/permissions/:id
 * Deletes a permission by ID (hard delete).
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  await permissionService.delete(id);

  sendSuccess(res, null, "Permission deleted");
});
