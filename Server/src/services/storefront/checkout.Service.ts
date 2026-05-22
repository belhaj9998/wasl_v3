import prisma from "../../configs/prisma";
import { Prisma, PaymentMethod } from "../../../generated/prisma";
import { AppError } from "../../utils/AppError";
import { CreateCheckoutInput } from "../../types/storefront.types";
import {
  orderNumberGenerator,
  PrismaTransactionClient,
} from "../../utils/orderNumberGenerator";

/**
 * StorefrontCheckoutService handles the atomic 9-step checkout transaction.
 *
 * Responsibilities:
 * - Validate cart and stock availability
 * - Create Order with OrderItems (snapshot data)
 * - Deduct inventory and create InventoryMovement records
 * - Create OrderAddress from shipping input
 * - Link CouponUsage to order (re-validate at checkout time)
 * - Create OrderTimeline entry
 * - Convert cart status to CONVERTED
 * - Create PaymentTransaction
 * - Final order totals recalculation
 *
 * The entire checkout is wrapped in a single prisma.$transaction() call.
 * If any step fails, the entire transaction rolls back.
 *
 * Requirements: 8.1–8.17
 */
export class StorefrontCheckoutService {
  /**
   * Executes the atomic 9-step checkout transaction.
   *
   * @param storeId - The store ID
   * @param cartId - The cart ID to checkout
   * @param input - Checkout input (customer info, shipping address, payment method)
   * @param customerId - Optional authenticated customer ID
   * @returns The created order with items, addresses, and payment transaction
   */
  async executeCheckout(
    storeId: number,
    cartId: number,
    input: CreateCheckoutInput,
    customerId?: number,
  ) {
    return prisma.$transaction(async (tx) => {
      const txClient = tx as unknown as PrismaTransactionClient;

      // ─── Step 1: Validate Cart & Stock ─────────────────────────────────────────
      const cart = await (tx as any).cart.findFirst({
        where: { id: cartId, store_id: storeId },
        include: {
          items: {
            include: {
              product: true,
              variant: {
                include: { inventory: true },
              },
            },
          },
        },
      });

      if (!cart || cart.status !== "OPEN") {
        throw AppError.badRequest(
          "Cart is not eligible for checkout (not found or not open)",
        );
      }

      if (!cart.items || cart.items.length === 0) {
        throw AppError.badRequest(
          "Cart is not eligible for checkout (cart is empty)",
        );
      }

      // Validate all items: product published, variant active, inventory sufficient
      for (const item of cart.items) {
        if (!item.product.is_published || item.product.status !== "PUBLISHED") {
          throw AppError.badRequest(
            `Product "${item.product.name}" is no longer available (not published)`,
          );
        }

        if (!item.variant.is_active) {
          throw AppError.badRequest(
            `Variant "${item.variant.title}" for product "${item.product.name}" is no longer active`,
          );
        }

        // Inventory check for tracked products
        if (item.product.track_inventory && item.variant.inventory) {
          if (item.variant.inventory.available_quantity < item.quantity) {
            throw AppError.badRequest(
              `Insufficient stock for "${item.product.name}" (variant: ${item.variant.title}). Available: ${item.variant.inventory.available_quantity}, Requested: ${item.quantity}`,
            );
          }
        }
      }

      // ─── Step 2: Create Order + OrderItems (snapshot data) ─────────────────────
      const orderNumber = await orderNumberGenerator.generate(
        storeId,
        txClient,
      );

      const order = await (tx as any).order.create({
        data: {
          store_id: storeId,
          customer_id: customerId ?? null,
          cart_id: cartId,
          order_number: orderNumber,
          source: "STOREFRONT",
          status: "PENDING",
          payment_status: "UNPAID",
          currency_code: cart.currency_code ?? "LYD",
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          subtotal: cart.subtotal,
          discount_total: cart.discount_total,
          shipping_total: cart.shipping_total,
          grand_total: cart.grand_total,
          notes_from_customer: input.notes_from_customer ?? null,
        },
      });

      // Create OrderItems with snapshot data
      const orderItemsData = cart.items.map((item: any) => {
        // unit_price: variant.price ?? product.base_price
        const unitPrice = item.variant.price ?? item.product.base_price;
        const lineTotal = new Prisma.Decimal(unitPrice.toString()).mul(
          item.quantity,
        );

        return {
          store_id: storeId,
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: item.product.name,
          variant_title: item.variant.title ?? null,
          sku: item.variant.sku,
          quantity: item.quantity,
          unit_price: unitPrice,
          discount_total: new Prisma.Decimal(0),
          line_total: lineTotal,
        };
      });

      await (tx as any).orderItem.createMany({
        data: orderItemsData,
      });

      // ─── Step 3: Deduct Inventory + Create InventoryMovement ───────────────────
      for (const item of cart.items) {
        if (item.product.track_inventory) {
          await (tx as any).inventory.update({
            where: {
              variant_id_store_id: {
                variant_id: item.variant_id,
                store_id: storeId,
              },
            },
            data: {
              available_quantity: { decrement: item.quantity },
              reserved_quantity: { increment: item.quantity },
            },
          });

          await (tx as any).inventoryMovement.create({
            data: {
              store_id: storeId,
              variant_id: item.variant_id,
              order_id: order.id,
              type: "RESERVED",
              quantity_change: -item.quantity,
              reason: `Order ${orderNumber} placed`,
              reference_type: "ORDER",
              reference_id: order.id,
            },
          });
        }
      }

      // ─── Step 4: Create OrderAddress (SHIPPING) ────────────────────────────────
      await (tx as any).orderAddress.create({
        data: {
          store_id: storeId,
          order_id: order.id,
          type: "SHIPPING",
          full_name: input.shipping_address.full_name,
          phone: input.shipping_address.phone ?? null,
          city: input.shipping_address.city,
          region: input.shipping_address.region ?? null,
          street_line_1: input.shipping_address.street_line_1,
          street_line_2: input.shipping_address.street_line_2 ?? null,
          postal_code: input.shipping_address.postal_code ?? null,
          google_maps_url: input.shipping_address.google_maps_url ?? null,
        },
      });

      // ─── Step 5: Link CouponUsage to Order (re-validate at checkout time) ──────
      const discountTotal = new Prisma.Decimal(cart.discount_total.toString());

      if (discountTotal.gt(0)) {
        // Find existing coupon usage for this cart
        const couponUsage = await (tx as any).couponUsage.findFirst({
          where: { store_id: storeId, cart_id: cartId, order_id: null },
          include: { coupon: true },
        });

        if (couponUsage) {
          // Re-validate coupon at checkout time
          const coupon = couponUsage.coupon;

          if (!coupon.is_active) {
            throw AppError.badRequest("Coupon is no longer valid (inactive)");
          }

          const now = new Date();
          if (coupon.starts_at && now < coupon.starts_at) {
            throw AppError.badRequest(
              "Coupon is no longer valid (not yet active)",
            );
          }
          if (coupon.ends_at && now > coupon.ends_at) {
            throw AppError.badRequest("Coupon is no longer valid (expired)");
          }

          // Check global usage limit
          if (coupon.usage_limit !== null) {
            const totalUsages = await (tx as any).couponUsage.count({
              where: { store_id: storeId, coupon_id: coupon.id },
            });
            if (totalUsages >= coupon.usage_limit) {
              throw AppError.badRequest(
                "Coupon is no longer valid (usage limit reached)",
              );
            }
          }

          // Check per-customer usage limit
          if (coupon.usage_limit_per_customer !== null && customerId) {
            const customerUsages = await (tx as any).couponUsage.count({
              where: {
                store_id: storeId,
                coupon_id: coupon.id,
                customer_id: customerId,
              },
            });
            if (customerUsages >= coupon.usage_limit_per_customer) {
              throw AppError.badRequest(
                "Coupon is no longer valid (per-customer usage limit reached)",
              );
            }
          }

          // Check minimum order amount
          if (coupon.minimum_order_amount !== null) {
            const minimumAmount = new Prisma.Decimal(
              coupon.minimum_order_amount.toString(),
            );
            const subtotal = new Prisma.Decimal(cart.subtotal.toString());
            if (subtotal.lt(minimumAmount)) {
              throw AppError.badRequest(
                "Coupon is no longer valid (minimum order amount not met)",
              );
            }
          }

          // Link coupon usage to the order
          await (tx as any).couponUsage.update({
            where: { id: couponUsage.id },
            data: { order_id: order.id },
          });
        }
      }

      // ─── Step 6: Create OrderTimeline ──────────────────────────────────────────
      await (tx as any).orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: order.id,
          event: "ORDER_PLACED",
          to_status: "PENDING",
          note: "Order placed via storefront",
        },
      });

      // ─── Step 7: Update Cart Status to CONVERTED ───────────────────────────────
      await (tx as any).cart.update({
        where: { id_store_id: { id: cartId, store_id: storeId } },
        data: { status: "CONVERTED" },
      });

      // ─── Step 8: Create PaymentTransaction ─────────────────────────────────────
      const paymentTransaction = await (tx as any).paymentTransaction.create({
        data: {
          store_id: storeId,
          order_id: order.id,
          method: input.payment_method,
          status: "PENDING",
          amount: order.grand_total,
          currency_code: order.currency_code,
          provider: this.resolvePaymentProvider(input.payment_method),
        },
      });

      // ─── Step 9: Final Order Totals Recalculation ──────────────────────────────
      const subtotal = new Prisma.Decimal(cart.subtotal.toString());
      const discount = new Prisma.Decimal(cart.discount_total.toString());
      const shipping = new Prisma.Decimal(cart.shipping_total.toString());
      const grandTotal = subtotal.sub(discount).add(shipping);

      const finalOrder = await (tx as any).order.update({
        where: { id_store_id: { id: order.id, store_id: storeId } },
        data: {
          subtotal: subtotal,
          discount_total: discount,
          shipping_total: shipping,
          grand_total: Prisma.Decimal.max(grandTotal, new Prisma.Decimal(0)),
        },
        include: {
          items: true,
          addresses: true,
          payments: true,
          timeline: true,
        },
      });

      return {
        order: finalOrder,
        paymentTransactionId: paymentTransaction.id,
      };
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Resolves the payment provider name based on the payment method.
   */
  private resolvePaymentProvider(method: PaymentMethod): string | null {
    switch (method) {
      case "CASH_ON_DELIVERY":
        return "cod";
      case "CARD":
        return "stripe";
      case "WALLET":
        return "paymob";
      case "BANK_TRANSFER":
        return "bank_transfer";
      case "MANUAL":
        return "manual";
      default:
        return null;
    }
  }
}

export const storefrontCheckoutService = new StorefrontCheckoutService();
