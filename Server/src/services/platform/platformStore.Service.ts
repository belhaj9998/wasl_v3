import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { BaseService } from "../base.Service";
import { PaginationParams, PaginatedResult } from "../../types/index";
import { VALID_STORE_TRANSITIONS } from "../../types/platform.types";
import { Store, StoreStatus } from "../../../generated/prisma";

/**
 * Filters for the platform store list endpoint.
 */
export interface PlatformStoreFilters {
  status?: StoreStatus;
  search?: string;
}

/**
 * PlatformStoreService provides platform-level store management:
 * listing with filters, detail view with subscription/membership info,
 * status transitions, and soft delete.
 *
 * Extends BaseService<Store> for pagination and soft-delete support.
 */
export class PlatformStoreService extends BaseService<Store, any, any> {
  constructor() {
    super(prisma.store);
  }

  /**
   * Returns a paginated list of stores with optional status and search filters.
   * Excludes soft-deleted stores (deleted_at IS NULL).
   * Search matches against name and domain fields.
   */
  async list(
    params: PaginationParams,
    filters?: PlatformStoreFilters,
  ): Promise<PaginatedResult<Store>> {
    const where: Record<string, unknown> = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { domain: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.findAll(params, where);
  }

  /**
   * Retrieves a single store by ID with subscription plan name and membership count.
   * Returns 404 if not found or soft-deleted.
   */
  async getById(id: number) {
    const store = await prisma.store.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      include: {
        subscription: {
          include: {
            plan: {
              select: { name: true },
            },
          },
        },
        _count: {
          select: { memberships: true },
        },
      },
    });

    if (!store) {
      throw AppError.notFound("Store not found");
    }

    return {
      ...store,
      subscriptionPlanName: store.subscription?.plan?.name ?? null,
      membershipCount: store._count.memberships,
    };
  }

  /**
   * Updates a store's status after validating the transition against
   * the VALID_STORE_TRANSITIONS map.
   * Returns 404 if store not found or soft-deleted.
   * Returns 400 if the transition is invalid.
   */
  async updateStatus(id: number, newStatus: StoreStatus): Promise<Store> {
    const store = await prisma.store.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!store) {
      throw AppError.notFound("Store not found");
    }

    const allowedTransitions = VALID_STORE_TRANSITIONS[store.status];
    if (!allowedTransitions.includes(newStatus)) {
      throw AppError.badRequest(
        `Transition from ${store.status} to ${newStatus} is not allowed`,
      );
    }

    return prisma.store.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  /**
   * Soft-deletes a store by setting the deleted_at timestamp.
   * Returns 404 if store not found or already soft-deleted.
   */
  async delete(id: number): Promise<Store> {
    const store = await prisma.store.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!store) {
      throw AppError.notFound("Store not found");
    }

    return this.softDelete(id);
  }
}

export const platformStoreService = new PlatformStoreService();
