import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { PaginationParams, PaginatedResult } from "../../types/index";
import { VALID_SUBSCRIPTION_TRANSITIONS } from "../../types/platform.types";
import { SubscriptionStatus, BillingCycle } from "../../../generated/prisma";

/**
 * Data shape for updating a subscription.
 */
interface UpdateSubscriptionInput {
  status?: SubscriptionStatus;
  current_period_ends_at?: Date;
  plan_id?: number;
  billing_cycle?: BillingCycle;
}

/**
 * SubscriptionService handles listing, retrieving, and updating
 * store subscriptions with status transition validation.
 *
 * This service does NOT extend BaseService because StoreSubscription
 * has no soft-delete (deleted_at) and requires complex relation includes.
 */
export class SubscriptionService {
  /**
   * Returns a paginated list of subscriptions with related store and plan data.
   */
  async list(params: PaginationParams): Promise<PaginatedResult<any>> {
    const { page, limit, sortBy, sortOrder } = params;

    const skip = (page - 1) * limit;
    const take = limit;

    const orderBy = sortBy
      ? { [sortBy]: sortOrder || "desc" }
      : { created_at: "desc" as const };

    const [total, data] = await Promise.all([
      prisma.storeSubscription.count(),
      prisma.storeSubscription.findMany({
        skip,
        take,
        orderBy,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Retrieves a single subscription by ID with related store and plan data.
   * Throws 404 if not found.
   */
  async getById(id: number) {
    const subscription = await prisma.storeSubscription.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!subscription) {
      throw AppError.notFound("Subscription not found");
    }

    return subscription;
  }

  /**
   * Updates a subscription. Validates status transitions against
   * VALID_SUBSCRIPTION_TRANSITIONS map. Allows updating status,
   * current_period_ends_at, plan_id, and billing_cycle.
   */
  async update(id: number, data: UpdateSubscriptionInput) {
    // Fetch existing subscription to validate transition
    const existing = await prisma.storeSubscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw AppError.notFound("Subscription not found");
    }

    // Validate status transition if status is being changed
    if (data.status && data.status !== existing.status) {
      const allowedTransitions =
        VALID_SUBSCRIPTION_TRANSITIONS[existing.status];
      if (!allowedTransitions.includes(data.status)) {
        throw AppError.unprocessable(
          `Transition from ${existing.status} to ${data.status} is not allowed`,
        );
      }
    }

    // Build update payload with only provided fields
    const updateData: Record<string, unknown> = {};

    if (data.status !== undefined) {
      updateData.status = data.status;
    }
    if (data.current_period_ends_at !== undefined) {
      updateData.current_period_ends_at = data.current_period_ends_at;
    }
    if (data.plan_id !== undefined) {
      updateData.plan_id = data.plan_id;
    }
    if (data.billing_cycle !== undefined) {
      updateData.billing_cycle = data.billing_cycle;
    }

    const updated = await prisma.storeSubscription.update({
      where: { id },
      data: updateData,
      include: {
        store: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return updated;
  }
}

export const subscriptionService = new SubscriptionService();
