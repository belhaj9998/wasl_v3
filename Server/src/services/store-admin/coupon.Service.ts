import prisma from "../../configs/prisma";
import { Prisma } from "../../../generated/prisma";
import { AppError } from "../../utils/AppError";
import { Money, getScale } from "../../utils/money";

/**
 * Parameters for listing coupons with pagination, filtering, and sorting.
 */
interface CouponListParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  type?: "PERCENTAGE" | "FIXED";
  sort_by?: "created_at" | "code" | "starts_at" | "ends_at";
  sort_order?: "asc" | "desc";
}

/**
 * Input for creating a coupon.
 */
interface CreateCouponInput {
  code: string;
  description?: string | null;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minimum_order_amount?: number | null;
  maximum_discount_amount?: number | null;
  usage_limit?: number | null;
  usage_limit_per_customer?: number | null;
  starts_at?: Date | null;
  ends_at?: Date | null;
  is_active?: boolean;
}

/**
 * Input for updating a coupon.
 */
interface UpdateCouponInput {
  code?: string;
  description?: string | null;
  type?: "PERCENTAGE" | "FIXED";
  value?: number;
  minimum_order_amount?: number | null;
  maximum_discount_amount?: number | null;
  usage_limit?: number | null;
  usage_limit_per_customer?: number | null;
  starts_at?: Date | null;
  ends_at?: Date | null;
  is_active?: boolean;
}

/**
 * Pagination parameters for usage history.
 */
interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Result of coupon validation.
 */
interface CouponValidationResult {
  valid: boolean;
  discount_amount: Prisma.Decimal;
  coupon: any;
}

/**
 * CouponService handles coupon management within a store:
 * listing with filters/search, creating, updating, deleting,
 * usage history, and coupon validation for order application.
 */
export class CouponService {
  /**
   * Lists coupons with pagination, filtering, sorting, and search.
   */
  async list(storeId: number, params: CouponListParams) {
    const {
      page = 1,
      limit = 20,
      search,
      is_active,
      type,
      sort_by = "created_at",
      sort_order = "desc",
    } = params;

    const where: any = { store_id: storeId };

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    if (sort_by === "code") {
      orderBy.code = sort_order;
    } else if (sort_by === "starts_at") {
      orderBy.starts_at = sort_order;
    } else if (sort_by === "ends_at") {
      orderBy.ends_at = sort_order;
    } else {
      orderBy.created_at = sort_order;
    }

    const [data, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      prisma.coupon.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Fetches a single coupon by ID within a store.
   * Throws 404 if not found.
   */
  async getById(storeId: number, couponId: number) {
    const coupon = await prisma.coupon.findFirst({
      where: { id: couponId, store_id: storeId },
    });

    if (!coupon) {
      throw AppError.notFound("Coupon not found");
    }

    return coupon;
  }

  /**
   * Creates a new coupon.
   * Stores code in uppercase, validates percentage range,
   * validates date range, and checks code uniqueness per store.
   */
  async create(storeId: number, data: CreateCouponInput) {
    const code = data.code.toUpperCase();

    // Validate percentage value range
    if (data.type === "PERCENTAGE" && (data.value < 1 || data.value > 100)) {
      throw AppError.unprocessable(
        "Percentage value must be between 1 and 100",
      );
    }

    // Validate date range
    if (data.starts_at && data.ends_at && data.starts_at >= data.ends_at) {
      throw AppError.unprocessable("starts_at must be before ends_at");
    }

    // Check code uniqueness per store (case-insensitive)
    const existing = await prisma.coupon.findFirst({
      where: {
        store_id: storeId,
        code,
      },
    });

    if (existing) {
      throw AppError.conflict("A coupon with this code already exists");
    }

    const coupon = await prisma.coupon.create({
      data: {
        store_id: storeId,
        code,
        description: data.description ?? null,
        type: data.type,
        value: data.value,
        minimum_order_amount: data.minimum_order_amount ?? null,
        maximum_discount_amount: data.maximum_discount_amount ?? null,
        usage_limit: data.usage_limit ?? null,
        usage_limit_per_customer: data.usage_limit_per_customer ?? null,
        starts_at: data.starts_at ?? null,
        ends_at: data.ends_at ?? null,
        is_active: data.is_active ?? true,
      },
    });

    return coupon;
  }

  /**
   * Updates an existing coupon.
   * Validates percentage if type is PERCENTAGE, checks code uniqueness if changed.
   * Throws 404 if not found.
   */
  async update(storeId: number, couponId: number, data: UpdateCouponInput) {
    const coupon = await prisma.coupon.findFirst({
      where: { id: couponId, store_id: storeId },
    });

    if (!coupon) {
      throw AppError.notFound("Coupon not found");
    }

    // Determine effective type (updated or existing)
    const effectiveType = data.type ?? coupon.type;
    // Determine effective value (updated or existing)
    const effectiveValue = data.value ?? Number(coupon.value);

    // Validate percentage value range if type is PERCENTAGE
    if (
      effectiveType === "PERCENTAGE" &&
      (effectiveValue < 1 || effectiveValue > 100)
    ) {
      throw AppError.unprocessable(
        "Percentage value must be between 1 and 100",
      );
    }

    // Check code uniqueness if code is being changed
    if (data.code !== undefined) {
      const newCode = data.code.toUpperCase();

      if (newCode !== coupon.code) {
        const existing = await prisma.coupon.findFirst({
          where: {
            store_id: storeId,
            code: newCode,
            NOT: { id: couponId },
          },
        });

        if (existing) {
          throw AppError.conflict("A coupon with this code already exists");
        }
      }
    }

    // Build update data
    const updateData: any = {};

    if (data.code !== undefined) {
      updateData.code = data.code.toUpperCase();
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.type !== undefined) {
      updateData.type = data.type;
    }
    if (data.value !== undefined) {
      updateData.value = data.value;
    }
    if (data.minimum_order_amount !== undefined) {
      updateData.minimum_order_amount = data.minimum_order_amount;
    }
    if (data.maximum_discount_amount !== undefined) {
      updateData.maximum_discount_amount = data.maximum_discount_amount;
    }
    if (data.usage_limit !== undefined) {
      updateData.usage_limit = data.usage_limit;
    }
    if (data.usage_limit_per_customer !== undefined) {
      updateData.usage_limit_per_customer = data.usage_limit_per_customer;
    }
    if (data.starts_at !== undefined) {
      updateData.starts_at = data.starts_at;
    }
    if (data.ends_at !== undefined) {
      updateData.ends_at = data.ends_at;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    const updated = await prisma.coupon.update({
      where: { id_store_id: { id: couponId, store_id: storeId } },
      data: updateData,
    });

    return updated;
  }

  /**
   * Deletes a coupon. Checks for existing CouponUsage records first.
   * Throws 409 if coupon has usages, 404 if not found.
   */
  async delete(storeId: number, couponId: number) {
    const coupon = await prisma.coupon.findFirst({
      where: { id: couponId, store_id: storeId },
    });

    if (!coupon) {
      throw AppError.notFound("Coupon not found");
    }

    // Check for existing usages
    const usageCount = await prisma.couponUsage.count({
      where: { store_id: storeId, coupon_id: couponId },
    });

    if (usageCount > 0) {
      throw AppError.conflict("Cannot delete coupon with existing usages");
    }

    await prisma.coupon.delete({
      where: { id_store_id: { id: couponId, store_id: storeId } },
    });
  }

  /**
   * Returns paginated usage history for a coupon.
   * Throws 404 if coupon not found.
   */
  async getUsageHistory(
    storeId: number,
    couponId: number,
    params: PaginationParams,
  ) {
    const { page = 1, limit = 20 } = params;

    // Verify coupon exists
    const coupon = await prisma.coupon.findFirst({
      where: { id: couponId, store_id: storeId },
    });

    if (!coupon) {
      throw AppError.notFound("Coupon not found");
    }

    const where = { store_id: storeId, coupon_id: couponId };

    const [data, total] = await Promise.all([
      prisma.couponUsage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.couponUsage.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Validates a coupon for use in an order.
   * Performs full validation chain: existence, active status, date range,
   * minimum order amount, usage limits, and calculates discount amount.
   *
   * @param storeId - The store ID for multi-tenant isolation
   * @param code - The coupon code to validate
   * @param customerId - The customer ID (null for guest orders)
   * @param orderSubtotal - The order subtotal to validate against (Prisma.Decimal)
   * @param scale - Currency decimal scale (defaults to LYD = 3)
   * @returns Validation result with discount amount and coupon record
   */
  async validateCoupon(
    storeId: number,
    code: string,
    customerId: number | null,
    orderSubtotal: Prisma.Decimal,
    scale: number = getScale("LYD"),
  ): Promise<CouponValidationResult> {
    // Step 1: Find coupon by code (case-insensitive via uppercase)
    const coupon = await prisma.coupon.findFirst({
      where: { store_id: storeId, code: code.toUpperCase() },
    });

    if (!coupon) {
      throw AppError.notFound("Coupon not found");
    }

    // Step 2: Check active status
    if (!coupon.is_active) {
      throw AppError.badRequest("Coupon is not active");
    }

    // Step 3: Check date range
    const now = new Date();
    if (coupon.starts_at && now < coupon.starts_at) {
      throw AppError.badRequest("Coupon is not yet valid");
    }
    if (coupon.ends_at && now > coupon.ends_at) {
      throw AppError.badRequest("Coupon has expired");
    }

    // Step 4: Check minimum order amount (Decimal comparison)
    if (
      coupon.minimum_order_amount &&
      orderSubtotal.lt(
        new Prisma.Decimal(coupon.minimum_order_amount.toString()),
      )
    ) {
      throw AppError.badRequest(
        `Minimum order amount is ${coupon.minimum_order_amount}`,
      );
    }

    // Step 5: Check global usage limit
    if (coupon.usage_limit) {
      const totalUsages = await prisma.couponUsage.count({
        where: { store_id: storeId, coupon_id: coupon.id },
      });
      if (totalUsages >= coupon.usage_limit) {
        throw AppError.badRequest("Coupon usage limit reached");
      }
    }

    // Step 6: Check per-customer usage limit
    if (coupon.usage_limit_per_customer && customerId) {
      const customerUsages = await prisma.couponUsage.count({
        where: {
          store_id: storeId,
          coupon_id: coupon.id,
          customer_id: customerId,
        },
      });
      if (customerUsages >= coupon.usage_limit_per_customer) {
        throw AppError.badRequest(
          "You have reached the usage limit for this coupon",
        );
      }
    }

    // Step 7: Calculate discount using Money utility (Decimal-based, HALF_UP rounding)
    const discountAmount = Money.calculateDiscount(
      orderSubtotal,
      {
        type: coupon.type,
        value: new Prisma.Decimal(coupon.value.toString()),
        cap: coupon.maximum_discount_amount
          ? new Prisma.Decimal(coupon.maximum_discount_amount.toString())
          : null,
      },
      scale,
    );

    return {
      valid: true,
      discount_amount: discountAmount,
      coupon,
    };
  }
}

export const couponService = new CouponService();
