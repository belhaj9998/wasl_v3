import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { AppError } from "../../utils/AppError";
import { StorefrontRequest } from "../../types/storefront.types";
import { orderLookupSchema } from "../../validators/storefront.validators";
import prisma from "../../configs/prisma";

/**
 * StorefrontOrderController handles guest order lookup.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/storefront/:domain/orders/lookup
 * Looks up an order by order_number + verification value (email or phone).
 * Returns a generic 404 on mismatch to prevent order enumeration.
 * Requirements: 10.1, 10.2, 10.3
 */
export const lookupOrder = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;

    // Validate query params
    const parsed = orderLookupSchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest(
        "order_number and verification_value are required",
      );
    }

    const { order_number, verification_value } = parsed.data;

    // Find order by order_number within the store
    const order = await prisma.order.findUnique({
      where: {
        store_id_order_number: {
          store_id: storeId,
          order_number,
        },
      },
      include: {
        items: {
          select: {
            id: true,
            product_name: true,
            variant_title: true,
            sku: true,
            quantity: true,
            unit_price: true,
            line_total: true,
          },
        },
        addresses: {
          select: {
            id: true,
            type: true,
            full_name: true,
            phone: true,
            city: true,
            region: true,
            street_line_1: true,
            street_line_2: true,
            postal_code: true,
            google_maps_url: true,
          },
        },
        timeline: {
          select: {
            id: true,
            event: true,
            from_status: true,
            to_status: true,
            note: true,
            created_at: true,
          },
          orderBy: { created_at: "asc" },
        },
      },
    });

    // Generic 404 — don't reveal whether order_number exists
    if (!order) {
      throw AppError.notFound("Order not found");
    }

    // Verify the verification_value matches customer_email (case-insensitive) or customer_phone (exact)
    const emailMatch =
      order.customer_email &&
      order.customer_email.toLowerCase() === verification_value.toLowerCase();
    const phoneMatch = order.customer_phone === verification_value;

    if (!emailMatch && !phoneMatch) {
      throw AppError.notFound("Order not found");
    }

    // Return order data excluding internal/admin-only fields
    const result = {
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      currency_code: order.currency_code,
      subtotal: order.subtotal,
      discount_total: order.discount_total,
      shipping_total: order.shipping_total,
      grand_total: order.grand_total,
      placed_at: order.placed_at,
      items: order.items,
      addresses: order.addresses,
      timeline: order.timeline,
    };

    sendSuccess(res, { order: result }, "Order retrieved");
  },
);
