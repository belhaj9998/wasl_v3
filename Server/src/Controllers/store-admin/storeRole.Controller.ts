import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { storeRoleService } from "../../services/store-admin/storeRole.Service";
import { AppRequest } from "../../types";

/**
 * StoreRoleController handles store-level role management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/roles
 * Returns all roles for the current store with member counts.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const roles = await storeRoleService.list(storeId);

  sendSuccess(res, { roles }, "Roles retrieved");
});

/**
 * POST /api/stores/:storeId/roles
 * Creates a new custom role in the store.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const { name, description } = req.body;

  const role = await storeRoleService.create(storeId, { name, description });

  sendSuccess(res, { role }, "Role created", 201);
});

/**
 * GET /api/stores/:storeId/roles/:roleId
 * Returns a single role by ID with permissions and member count.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const roleId = parseInt(req.params.roleId as string, 10);

  const role = await storeRoleService.getById(storeId, roleId);

  sendSuccess(res, { role }, "Role retrieved");
});

/**
 * PATCH /api/stores/:storeId/roles/:roleId
 * Updates a non-protected role's name and/or description.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const roleId = parseInt(req.params.roleId as string, 10);

  const role = await storeRoleService.update(storeId, roleId, req.body);

  sendSuccess(res, { role }, "Role updated");
});

/**
 * DELETE /api/stores/:storeId/roles/:roleId
 * Deletes a non-protected role with no assigned members.
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const roleId = parseInt(req.params.roleId as string, 10);

  await storeRoleService.remove(storeId, roleId);

  sendSuccess(res, null, "Role deleted");
});

/**
 * PUT /api/stores/:storeId/roles/:roleId/permissions
 * Replaces all permission assignments for a role.
 */
export const updatePermissions = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const roleId = parseInt(req.params.roleId as string, 10);
    const { permission_ids } = req.body;

    const role = await storeRoleService.updatePermissions(
      storeId,
      roleId,
      permission_ids,
    );

    sendSuccess(res, { role }, "Role permissions updated");
  },
);
