import prisma from "../../configs/prisma";
import { Prisma } from "../../../generated/prisma";
import { AppError } from "../../utils/AppError";

/**
 * Type alias for a Prisma transaction client, used by methods that
 * operate within a transaction.
 */
type PrismaTransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * StorefrontCouponService handles coupon validation, application,
 * and removal for storefront shopping carts.
 *
 * Responsibilities:
 * - Validate coupon eligibility (active, date range, usage limits, minimum amount)
 * - Calculate discount amounts (PERCENTAGE capped at max, FIXED capped at subtotal)
 * - Apply coupons to carts (create CouponUsage, update cart totals)
 * - Remove coupons from carts (delete CouponUsage, recalculate totals)
 */
export class StorefrontCouponService {
  /**
   * Applies a coupon to a cart.
   *
   * Validates the coupon through the full validation chain, removes any
   * existing coupon on the cart, creates a CouponUsage record, and updates
   * the cart's discount_total and grand_total.
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11
   */
  async applyCoupon(
    storeId: number,
    cartId: number,
    code: string,
    customerId?: number,
  ) {
    return prisma.$transaction(async (tx) => {
      // Verify cart exists and is OPEN
      const cart = await (tx as any).cart.findFirst({
        where: { id: cartId, store_id: storeId, status: "OPEN" },
        include: { items: true },
      });

      if (!cart) {
        throw AppError.notFound("Cart not found");
      }

      // Calculate cart subtotal from items
      let subtotal = new Prisma.Decimal(0);
      for (const item of cart.items) {
        const itemTotal = new Prisma.Decimal(item.unit_price.toString()).mul(
          item.quantity,
        );
        subtotal = subtotal.add(itemTotal);
      }

      // Validate coupon and calculate discount
      const validation = await this.validateCouponForCartInternal(
        tx as PrismaTransactionClient,
        storeId,
        code,
        subtotal,
        customerId,
      );

      if (!validation.valid) {
        throw AppError.badRequest(validation.error!);
      }

      // Remove existing coupon if any (Requirement 7.11)
      await (tx as any).couponUsage.deleteMany({
        where: { store_id: storeId, cart_id: cartId, order_id: null },
      });

      // Create new CouponUsage record (Requirement 7.10)
      await (tx as any).couponUsage.create({
        data: {
          store_id: storeId,
          coupon_id: validation.coupon!.id,
          customer_id: customerId ?? null,
          cart_id: cartId,
          order_id: null,
          discount_amount: validation.discount,
        },
      });

      // Update cart discount_total and grand_total
      const shippingTotal = new Prisma.Decimal(cart.shipping_total.toString());
      const grandTotal = Prisma.Decimal.max(
        subtotal.sub(validation.discount).add(shippingTotal),
        new Prisma.Decimal(0),
      );

      const updatedCart = await (tx as any).cart.update({
        where: { id_store_id: { id: cartId, store_id: storeId } },
        data: {
          subtotal,
          discount_total: validation.discount,
          grand_total: grandTotal,
        },
        include: { items: true },
      });

      return updatedCart;
    });
  }

  /**
   * Removes a coupon from a cart.
   *
   * Deletes the CouponUsage record, sets discount_total to 0,
   * and recalculates grand_total.
   *
   * Requirements: 7.12
   */
  async removeCoupon(storeId: number, cartId: number) {
    return prisma.$transaction(async (tx) => {
      // Verify cart exists and is OPEN
      const cart = await (tx as any).cart.findFirst({
        where: { id: cartId, store_id: storeId, status: "OPEN" },
        include: { items: true },
      });

      if (!cart) {
        throw AppError.notFound("Cart not found");
      }

      // Delete CouponUsage record(s) for this cart
      await (tx as any).couponUsage.deleteMany({
        where: { store_id: storeId, cart_id: cartId, order_id: null },
      });

      // Recalculate subtotal from items
      let subtotal = new Prisma.Decimal(0);
      for (const item of cart.items) {
        const itemTotal = new Prisma.Decimal(item.unit_price.toString()).mul(
          item.quantity,
        );
        subtotal = subtotal.add(itemTotal);
      }

      // Set discount_total to 0, recalculate grand_total
      const shippingTotal = new Prisma.Decimal(cart.shipping_total.toString());
      const grandTotal = Prisma.Decimal.max(
        subtotal.add(shippingTotal),
        new Prisma.Decimal(0),
      );

      const updatedCart = await (tx as any).cart.update({
        where: { id_store_id: { id: cartId, store_id: storeId } },
        data: {
          subtotal,
          discount_total: new Prisma.Decimal(0),
          grand_total: grandTotal,
        },
        include: { items: true },
      });

      return updatedCart;
    });
  }

  /**
   * Validates a coupon for a cart and returns the discount amount or error.
   *
   * Full validation chain:
   * 1. Coupon exists (case-insensitive code match)
   * 2. Coupon is_active is true
   * 3. Current date within starts_at/ends_at range (null = no bound)
   * 4. Global usage_limit not reached
   * 5. Per-customer usage_limit_per_customer not reached (skip for guests)
   * 6. Cart subtotal meets minimum_order_amount
   *
   * Discount calculation:
   * - PERCENTAGE: subtotal * (value/100), capped at maximum_discount_amount
   * - FIXED: min(coupon.value, subtotal)
   * - Discount never exceeds subtotal
   *
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.13
   */
  async validateCouponForCart(
    storeId: number,
    code: string,
    cartSubtotal: Prisma.Decimal | number,
    customerId?: number,
  ): Promise<{
    valid: boolean;
    coupon?: any;
    discount: Prisma.Decimal;
    error?: string;
  }> {
    const subtotal =
      cartSubtotal instanceof Prisma.Decimal
        ? cartSubtotal
        : new Prisma.Decimal(cartSubtotal.toString());

    return this.validateCouponForCartInternal(
      prisma as unknown as PrismaTransactionClient,
      storeId,
      code,
      subtotal,
      customerId,
    );
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Internal validation method that accepts a transaction client.
   * Used by both applyCoupon (within transaction) and validateCouponForCart (standalone).
   */
  private async validateCouponForCartInternal(
    tx: PrismaTransactionClient,
    storeId: number,
    code: string,
    cartSubtotal: Prisma.Decimal,
    customerId?: number,
  ): Promise<{
    valid: boolean;
    coupon?: any;
    discount: Prisma.Decimal;
    error?: string;
  }> {
    const zeroDiscount = new Prisma.Decimal(0);

    // Rule 1: Coupon exists (case-insensitive) — Requirement 7.1
    const coupon = await (tx as any).coupon.findFirst({
      where: {
        store_id: storeId,
        code: { equals: code, mode: "insensitive" },
      },
    });

    if (!coupon) {
      return {
        valid: false,
        discount: zeroDiscount,
        error: "Coupon not found",
      };
    }

    // Rule 2: Coupon is active — Requirement 7.2
    if (!coupon.is_active) {
      return {
        valid: false,
        discount: zeroDiscount,
        error: "Coupon is inactive",
      };
    }

    // Rule 3: Date validity — Requirement 7.3
    const now = new Date();
    if (coupon.starts_at && now < coupon.starts_at) {
      return {
        valid: false,
        discount: zeroDiscount,
        error: "Coupon is not yet active",
      };
    }
    if (coupon.ends_at && now > coupon.ends_at) {
      return {
        valid: false,
        discount: zeroDiscount,
        error: "Coupon has expired",
      };
    }

    // Rule 4: Global usage limit — Requirement 7.4
    if (coupon.usage_limit !== null) {
      const totalUsages = await (tx as any).couponUsage.count({
        where: { store_id: storeId, coupon_id: coupon.id },
      });
      if (totalUsages >= coupon.usage_limit) {
        return {
          valid: false,
          discount: zeroDiscount,
          error: "Coupon usage limit reached",
        };
      }
    }

    // Rule 5: Per-customer usage limit — Requirement 7.5, 7.6
    // Skip for guests (no customerId)
    if (coupon.usage_limit_per_customer !== null && customerId) {
      const customerUsages = await (tx as any).couponUsage.count({
        where: {
          store_id: storeId,
          coupon_id: coupon.id,
          customer_id: customerId,
        },
      });
      if (customerUsages >= coupon.usage_limit_per_customer) {
        return {
          valid: false,
          discount: zeroDiscount,
          error:
            "You have already used this coupon the maximum number of times",
        };
      }
    }

    // Rule 6: Minimum order amount — Requirement 7.7
    if (coupon.minimum_order_amount !== null) {
      const minimumAmount = new Prisma.Decimal(
        coupon.minimum_order_amount.toString(),
      );
      if (cartSubtotal.lt(minimumAmount)) {
        return {
          valid: false,
          discount: zeroDiscount,
          error: `Minimum order amount is ${coupon.minimum_order_amount}`,
        };
      }
    }

    // Calculate discount — Requirements 7.8, 7.9
    let discount: Prisma.Decimal;

    if (coupon.type === "PERCENTAGE") {
      // PERCENTAGE: discount = subtotal * (value / 100), capped at maximum_discount_amount
      const value = new Prisma.Decimal(coupon.value.toString());
      discount = cartSubtotal.mul(value).div(100);

      if (coupon.maximum_discount_amount !== null) {
        const maxDiscount = new Prisma.Decimal(
          coupon.maximum_discount_amount.toString(),
        );
        discount = Prisma.Decimal.min(discount, maxDiscount);
      }
    } else {
      // FIXED: discount = min(coupon.value, subtotal)
      const value = new Prisma.Decimal(coupon.value.toString());
      discount = Prisma.Decimal.min(value, cartSubtotal);
    }

    // Discount should never exceed subtotal
    discount = Prisma.Decimal.min(discount, cartSubtotal);

    return { valid: true, coupon, discount };
  }
}

export const storefrontCouponService = new StorefrontCouponService();
