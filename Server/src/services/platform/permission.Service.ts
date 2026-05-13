import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";

/**
 * PermissionService manages platform-level permission records.
 * Permissions use hard delete (no soft-delete) since they define
 * the access control vocabulary for store roles.
 */
export class PermissionService {
  /**
   * Returns all permission records.
   */
  async list() {
    return prisma.permission.findMany({
      orderBy: { id: "asc" },
    });
  }

  /**
   * Creates a new permission record.
   * Checks code uniqueness and returns 409 on conflict.
   */
  async create(data: {
    code: string;
    module: string;
    action: string;
    description?: string;
  }) {
    // Check code uniqueness
    const existing = await prisma.permission.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw AppError.conflict("A permission with this code already exists");
    }

    return prisma.permission.create({ data });
  }

  /**
   * Updates a permission record by ID.
   * Returns 404 if not found.
   */
  async update(
    id: number,
    data: {
      code?: string;
      module?: string;
      action?: string;
      description?: string;
    },
  ) {
    const permission = await prisma.permission.findUnique({ where: { id } });
    if (!permission) {
      throw AppError.notFound("Permission not found");
    }

    // If code is being changed, check uniqueness of the new code
    if (data.code && data.code !== permission.code) {
      const existing = await prisma.permission.findUnique({
        where: { code: data.code },
      });
      if (existing) {
        throw AppError.conflict("A permission with this code already exists");
      }
    }

    return prisma.permission.update({
      where: { id },
      data,
    });
  }

  /**
   * Deletes a permission record (hard delete).
   * Returns 404 if not found.
   * Returns 409 if the permission is assigned to any store role.
   */
  async delete(id: number) {
    const permission = await prisma.permission.findUnique({ where: { id } });
    if (!permission) {
      throw AppError.notFound("Permission not found");
    }

    // Check if permission is in use by any StoreRolePermission
    const usageCount = await prisma.storeRolePermission.count({
      where: { permission_id: id },
    });
    if (usageCount > 0) {
      throw AppError.conflict(
        "Cannot delete: permission is in use by one or more store roles",
      );
    }

    await prisma.permission.delete({ where: { id } });
  }
}

export const permissionService = new PermissionService();
