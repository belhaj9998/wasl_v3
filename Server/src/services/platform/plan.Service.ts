import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { BaseService } from "../base.Service";
import { SubscriptionPlan } from "../../../generated/prisma";

/**
 * Input type for creating a subscription plan.
 */
interface CreatePlanInput {
  code: string;
  name: string;
  price_monthly: number;
  price_yearly?: number;
  max_stores?: number;
  max_products?: number;
  max_staff?: number;
}

/**
 * Input type for updating a subscription plan.
 * Only name, pricing, and limit fields are updatable.
 */
interface UpdatePlanInput {
  name?: string;
  price_monthly?: number;
  price_yearly?: number;
  max_stores?: number | null;
  max_products?: number | null;
  max_staff?: number | null;
}

/**
 * PlanService manages subscription plan CRUD operations.
 * Extends BaseService for pagination and soft-delete support.
 */
export class PlanService extends BaseService<
  SubscriptionPlan,
  CreatePlanInput,
  UpdatePlanInput
> {
  constructor() {
    super(prisma.subscriptionPlan);
  }

  /**
   * Returns all plans excluding soft-deleted records.
   */
  async list(): Promise<SubscriptionPlan[]> {
    return prisma.subscriptionPlan.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "asc" },
    });
  }

  /**
   * Creates a new subscription plan.
   * Checks code uniqueness before creating — throws 409 on conflict.
   */
  async createPlan(data: CreatePlanInput): Promise<SubscriptionPlan> {
    // Check code uniqueness
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw AppError.conflict("A plan with this code already exists");
    }

    return prisma.subscriptionPlan.create({
      data: {
        code: data.code,
        name: data.name,
        price_monthly: data.price_monthly,
        price_yearly: data.price_yearly,
        max_stores: data.max_stores,
        max_products: data.max_products,
        max_staff: data.max_staff,
      },
    });
  }

  /**
   * Retrieves a single plan by ID.
   * Returns 404 if not found or soft-deleted.
   */
  async getById(id: number): Promise<SubscriptionPlan> {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id, deleted_at: null },
    });

    if (!plan) {
      throw AppError.notFound("Plan not found");
    }

    return plan;
  }

  /**
   * Updates allowed fields on a plan.
   * Returns 404 if plan not found or soft-deleted.
   */
  async updatePlan(
    id: number,
    data: UpdatePlanInput,
  ): Promise<SubscriptionPlan> {
    // Verify plan exists and is not soft-deleted
    await this.getById(id);

    return prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.price_monthly !== undefined && {
          price_monthly: data.price_monthly,
        }),
        ...(data.price_yearly !== undefined && {
          price_yearly: data.price_yearly,
        }),
        ...(data.max_stores !== undefined && { max_stores: data.max_stores }),
        ...(data.max_products !== undefined && {
          max_products: data.max_products,
        }),
        ...(data.max_staff !== undefined && { max_staff: data.max_staff }),
      },
    });
  }

  /**
   * Soft-deletes a plan by setting deleted_at.
   * Checks for active subscriptions first — throws 409 if plan is in use.
   */
  async deletePlan(id: number): Promise<SubscriptionPlan> {
    // Verify plan exists and is not already soft-deleted
    await this.getById(id);

    // Check for active or trialing subscriptions using this plan
    const activeSubscriptions = await prisma.storeSubscription.count({
      where: {
        plan_id: id,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
    });

    if (activeSubscriptions > 0) {
      throw AppError.conflict(
        "Cannot delete: plan is in use by active subscriptions",
      );
    }

    // Soft delete
    return prisma.subscriptionPlan.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}

export const planService = new PlanService();
