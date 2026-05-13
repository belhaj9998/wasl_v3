import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { slugify } from "../../utils/slugify";

/**
 * StoreRoleService handles role management within a store:
 * listing, creating, updating, deleting roles, and managing
 * role-permission assignments.
 */
export class StoreRoleService {
  /**
   * Fetches all roles for a store with the count of members assigned to each role.
   */
  async list(storeId: number) {
    const roles = await prisma.storeRole.findMany({
      where: { store_id: storeId },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: { created_at: "asc" },
    });

    return roles;
  }

  /**
   * Creates a new custom role in the store.
   * Generates slug from name, checks uniqueness, sets is_protected=false.
   * Throws 409 if a role with the same slug already exists.
   */
  async create(storeId: number, data: { name: string; description?: string }) {
    const slug = slugify(data.name);

    // Check slug uniqueness within the store
    const existing = await prisma.storeRole.findUnique({
      where: { store_id_slug: { store_id: storeId, slug } },
    });

    if (existing) {
      throw AppError.conflict(
        "A role with this name already exists in this store",
      );
    }

    const role = await prisma.storeRole.create({
      data: {
        store_id: storeId,
        name: data.name,
        slug,
        description: data.description,
        is_protected: false,
      },
    });

    return role;
  }

  /**
   * Fetches a single role by ID within a store, including its permissions
   * and member count. Throws 404 if not found.
   */
  async getById(storeId: number, roleId: number) {
    const role = await prisma.storeRole.findFirst({
      where: { id: roleId, store_id: storeId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { memberships: true },
        },
      },
    });

    if (!role) {
      throw AppError.notFound("Role not found");
    }

    return role;
  }

  /**
   * Updates a non-protected role's name and/or description.
   * Regenerates slug if name is changed, checks slug uniqueness.
   * Throws 404 if role not found, 403 if protected, 409 if slug conflict.
   */
  async update(
    storeId: number,
    roleId: number,
    data: { name?: string; description?: string | null },
  ) {
    // Check existence
    const role = await prisma.storeRole.findFirst({
      where: { id: roleId, store_id: storeId },
    });

    if (!role) {
      throw AppError.notFound("Role not found");
    }

    // Check protected
    if (role.is_protected) {
      throw AppError.forbidden("Cannot modify a protected role");
    }

    // Build update data
    const updateData: {
      name?: string;
      slug?: string;
      description?: string | null;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
      const newSlug = slugify(data.name);

      // Check slug uniqueness (only if slug actually changed)
      if (newSlug !== role.slug) {
        const existing = await prisma.storeRole.findUnique({
          where: { store_id_slug: { store_id: storeId, slug: newSlug } },
        });

        if (existing) {
          throw AppError.conflict(
            "A role with this name already exists in this store",
          );
        }
      }

      updateData.slug = newSlug;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    const updated = await prisma.storeRole.update({
      where: { id: roleId },
      data: updateData,
    });

    return updated;
  }

  /**
   * Deletes a non-protected role that has no members assigned.
   * Throws 404 if not found, 403 if protected, 409 if has members.
   */
  async remove(storeId: number, roleId: number) {
    // Check existence
    const role = await prisma.storeRole.findFirst({
      where: { id: roleId, store_id: storeId },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });

    if (!role) {
      throw AppError.notFound("Role not found");
    }

    // Check protected
    if (role.is_protected) {
      throw AppError.forbidden("Cannot delete a protected role");
    }

    // Check has members
    if (role._count.memberships > 0) {
      throw AppError.conflict(
        "Cannot delete a role that has members assigned to it",
      );
    }

    await prisma.storeRole.delete({
      where: { id: roleId },
    });
  }

  /**
   * Replaces all permission assignments for a role with the given permission IDs.
   * Validates that all permission IDs exist, then deletes existing and creates new
   * assignments in a transaction. Returns the role with its updated permissions.
   * Throws 404 if role not found, 400 if any permission ID is invalid.
   */
  async updatePermissions(
    storeId: number,
    roleId: number,
    permissionIds: number[],
  ) {
    // Check role existence
    const role = await prisma.storeRole.findFirst({
      where: { id: roleId, store_id: storeId },
    });

    if (!role) {
      throw AppError.notFound("Role not found");
    }

    // Validate all permission IDs exist
    if (permissionIds.length > 0) {
      const existingPermissions = await prisma.permission.findMany({
        where: { id: { in: permissionIds } },
        select: { id: true },
      });

      if (existingPermissions.length !== permissionIds.length) {
        throw AppError.badRequest("One or more permission IDs are invalid");
      }
    }

    // Delete existing and create new in a transaction
    await prisma.$transaction([
      prisma.storeRolePermission.deleteMany({
        where: { role_id: roleId },
      }),
      ...permissionIds.map((permissionId) =>
        prisma.storeRolePermission.create({
          data: {
            role_id: roleId,
            permission_id: permissionId,
          },
        }),
      ),
    ]);

    // Return role with updated permissions
    const updatedRole = await prisma.storeRole.findFirst({
      where: { id: roleId, store_id: storeId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return updatedRole;
  }
}

export const storeRoleService = new StoreRoleService();
