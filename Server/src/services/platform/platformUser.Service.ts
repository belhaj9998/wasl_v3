import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { PaginationParams, PaginatedResult } from "../../types/index";
import { User, SystemRole } from "../../../generated/prisma";

/**
 * Fields to exclude from user responses — password should never be returned.
 */
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatar_url: true,
  system_role: true,
  is_active: true,
  last_login_at: true,
  deleted_at: true,
  created_at: true,
  updated_at: true,
} as const;

export interface PlatformUserFilters {
  system_role?: SystemRole;
  is_active?: boolean;
  search?: string;
}

export interface PlatformUserUpdateData {
  is_active?: boolean;
  system_role?: SystemRole;
}

/**
 * Platform-level user management service.
 * Provides paginated listing, detail view, update, and soft-delete
 * for platform administrators.
 */
export class PlatformUserService {
  /**
   * Returns a paginated list of users with optional filters.
   * Excludes soft-deleted users and the password field.
   */
  async list(
    params: PaginationParams,
    filters: PlatformUserFilters = {},
  ): Promise<PaginatedResult<Omit<User, "password">>> {
    const { page, limit, sortBy, sortOrder } = params;

    const where: Record<string, unknown> = {
      deleted_at: null,
    };

    if (filters.system_role) {
      where.system_role = filters.system_role;
    }

    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;
    const take = limit;
    const orderBy = sortBy
      ? { [sortBy]: sortOrder || "desc" }
      : { created_at: "desc" as const };

    const [total, data] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        skip,
        take,
        orderBy,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data as unknown as Omit<User, "password">[],
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Returns a single user by ID, excluding password.
   * Throws 404 if user not found or soft-deleted.
   */
  async getById(id: number): Promise<Omit<User, "password">> {
    const user = await prisma.user.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      select: USER_SELECT,
    });

    if (!user) {
      throw AppError.notFound("User not found");
    }

    return user as unknown as Omit<User, "password">;
  }

  /**
   * Updates a user's is_active or system_role fields.
   * Prevents self-modification (throws 403).
   */
  async update(
    id: number,
    data: PlatformUserUpdateData,
    currentUserId: number,
  ): Promise<Omit<User, "password">> {
    if (id === currentUserId) {
      throw AppError.forbidden("Cannot modify your own account");
    }

    // Verify user exists and is not soft-deleted
    const existing = await prisma.user.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });

    if (!existing) {
      throw AppError.notFound("User not found");
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    return updated as unknown as Omit<User, "password">;
  }

  /**
   * Soft-deletes a user by setting deleted_at.
   * Prevents self-deletion (throws 403).
   */
  async delete(id: number, currentUserId: number): Promise<void> {
    if (id === currentUserId) {
      throw AppError.forbidden("Cannot modify your own account");
    }

    // Verify user exists and is not already soft-deleted
    const existing = await prisma.user.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });

    if (!existing) {
      throw AppError.notFound("User not found");
    }

    await prisma.user.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}

/** Singleton instance for use across the application */
export const platformUserService = new PlatformUserService();
