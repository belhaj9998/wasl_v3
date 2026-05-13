import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { orderStateMachine } from "../../utils/orderStateMachine";
import {
  orderNumberGenerator,
  PrismaTransactionClient,
} from "../../utils/orderNumberGenerator";
import { couponService } from "./coupon.Service";
import {
  ShipmentStatus,
  PaymentStatus,
  OrderSource,
} from "../../../generated/prisma";

/**
 * Parameters for listing orders with pagination, filtering, and sorting.
 */
interface OrderListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ShipmentStatus;
  payment_status?: PaymentStatus;
  source?: OrderSource;
  customer_id?: number;
  date_from?: Date;
  date_to?: Date;
  amount_min?: number;
  amount_max?: number;
  sort_by?: "placed_at" | "grand_total" | "order_number";
  sort_order?: "asc" | "desc";
}

/**
 * Input for creating an order item.
 */
interface CreateOrderItemInput {
  product_id: number;
  variant_id: number;
  quantity: number;
}

/**
 * Address input for order creation.
 */
interface OrderAddressInput {
  type?: string;
  full_name: string;
  phone?: string;
  city: string;
  region?: string;
  street_line_1: string;
  street_line_2?: string;
  postal_code?: string;
  google_maps_url?: string;
}

/**
 * Input for creating an order.
 */
interface CreateOrderInput {
  customer_id?: number;
  source?: OrderSource;
  items: CreateOrderItemInput[];
  shipping_address: OrderAddressInput;
  billing_address?: OrderAddressInput;
  coupon_code?: string;
  shipping_total?: number;
  notes_from_customer?: string;
  notes_internal?: string;
}

/**
 * Input for updating order status.
 */
interface UpdateOrderStatusInput {
  status: ShipmentStatus;
  note?: string;
}

/**
 * Input for updating payment status.
 */
interface UpdatePaymentStatusInput {
  payment_status: PaymentStatus;
  note?: string;
}

/**
 * Pagination parameters.
 */
interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Resolved order item with pricing info.
 */
interface ResolvedOrderItem {
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_title: string | null;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_total: number;
  line_total: number;
}

/**
 * OrderService handles the full order lifecycle:
 * listing, creation with inventory reservation, status transitions,
 * cancellation with inventory rollback, notes, and timeline.
 */
export class OrderService {
  /**
   * Lists orders with pagination, filtering, sorting, and search.
   */
  async list(storeId: number, params: OrderListParams) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      payment_status,
      source,
      customer_id,
      date_from,
      date_to,
      amount_min,
      amount_max,
      sort_by = "placed_at",
      sort_order = "desc",
    } = params;

    const where: any = { store_id: storeId };

    // Status filter
    if (status) {
      where.status = status;
    }

    // Payment status filter
    if (payment_status) {
      where.payment_status = payment_status;
    }

    // Source filter
    if (source) {
      where.source = source;
    }

    // Customer filter
    if (customer_id) {
      where.customer_id = customer_id;
    }

    // Date range filter
    if (date_from || date_to) {
      where.placed_at = {};
      if (date_from) {
        where.placed_at.gte = date_from;
      }
      if (date_to) {
        where.placed_at.lte = date_to;
      }
    }

    // Amount range filter
    if (amount_min !== undefined || amount_max !== undefined) {
      where.grand_total = {};
      if (amount_min !== undefined) {
        where.grand_total.gte = amount_min;
      }
      if (amount_max !== undefined) {
        where.grand_total.lte = amount_max;
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { order_number: { contains: search, mode: "insensitive" } },
        { customer_name: { contains: search, mode: "insensitive" } },
        { customer_phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    if (sort_by === "grand_total") {
      orderBy.grand_total = sort_order;
    } else if (sort_by === "order_number") {
      orderBy.order_number = sort_order;
    } else {
      orderBy.placed_at = sort_order;
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      prisma.order.count({ where }),
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
   * Fetches a single order by ID with all relations.
   * Throws 404 if not found.
   */
  async getById(storeId: number, orderId: number) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
      include: {
        items: true,
        addresses: true,
        timeline: { orderBy: { created_at: "desc" } },
        payments: { orderBy: { created_at: "desc" } },
        shipments: { orderBy: { created_at: "desc" } },
        customer: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    return order;
  }

  /**
   * Creates a new order with full validation and inventory reservation.
   * All operations are performed within a transaction.
   */
  async create(storeId: number, data: CreateOrderInput, actorUserId: number) {
    return await prisma.$transaction(async (tx) => {
      // Step 1: Validate customer if provided
      let customerName: string;
      let customerEmail: string | undefined;
      let customerPhone: string;

      if (data.customer_id) {
        const customer = await tx.customer.findFirst({
          where: { id: data.customer_id, store_id: storeId, status: "ACTIVE" },
        });
        if (!customer) {
          throw AppError.notFound("Customer not found or not active");
        }
        customerName = [customer.first_name, customer.last_name]
          .filter(Boolean)
          .join(" ");
        customerEmail = customer.email ?? undefined;
        customerPhone = customer.phone ?? data.shipping_address.phone ?? "";
      } else {
        customerName = data.shipping_address.full_name;
        customerPhone = data.shipping_address.phone ?? "";
      }

      // Step 2: Validate and resolve items
      let subtotal = 0;
      const resolvedItems: ResolvedOrderItem[] = [];

      for (const item of data.items) {
        const variant = await tx.productVariant.findFirst({
          where: {
            id: item.variant_id,
            store_id: storeId,
            product_id: item.product_id,
            is_active: true,
          },
          include: {
            product: { select: { name: true, status: true, base_price: true } },
            inventory: true,
          },
        });

        if (!variant) {
          throw AppError.notFound(
            `Variant ${item.variant_id} not found, inactive, or does not belong to product ${item.product_id}`,
          );
        }

        if (variant.product.status !== "ACTIVE") {
          throw AppError.badRequest(
            `Product "${variant.product.name}" is not active`,
          );
        }

        // Check inventory
        if (
          variant.inventory &&
          variant.inventory.available_quantity < item.quantity
        ) {
          throw AppError.badRequest(
            `Insufficient stock for "${variant.title}". Available: ${variant.inventory.available_quantity}, Requested: ${item.quantity}`,
          );
        }

        const unitPrice = Number(
          variant.price ?? variant.product.base_price ?? 0,
        );
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;

        resolvedItems.push({
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: variant.product.name,
          variant_title: variant.title,
          sku: variant.sku,
          quantity: item.quantity,
          unit_price: unitPrice,
          discount_total: 0,
          line_total: lineTotal,
        });
      }

      // Step 3: Apply coupon if provided
      let discountTotal = 0;
      let couponId: number | undefined;

      if (data.coupon_code) {
        const validation = await couponService.validateCoupon(
          storeId,
          data.coupon_code,
          data.customer_id ?? null,
          subtotal,
        );
        discountTotal = validation.discount_amount;
        couponId = validation.coupon.id;
      }

      // Step 4: Calculate totals
      const shippingTotal = data.shipping_total ?? 0;
      const grandTotal = subtotal - discountTotal + shippingTotal;

      // Step 5: Generate order number
      const orderNumber = await orderNumberGenerator.generate(
        storeId,
        tx as unknown as PrismaTransactionClient,
      );

      // Step 6: Create order record
      const order = await tx.order.create({
        data: {
          store_id: storeId,
          customer_id: data.customer_id ?? null,
          order_number: orderNumber,
          source: data.source ?? "ADMIN",
          status: "PENDING",
          payment_status: "UNPAID",
          currency_code: "LYD",
          customer_name: customerName,
          customer_email: customerEmail ?? null,
          customer_phone: customerPhone,
          subtotal,
          discount_total: discountTotal,
          shipping_total: shippingTotal,
          grand_total: grandTotal,
          notes_from_customer: data.notes_from_customer ?? null,
          notes_internal: data.notes_internal ?? null,
        },
      });

      // Step 7: Create order items
      await tx.orderItem.createMany({
        data: resolvedItems.map((item) => ({
          store_id: storeId,
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant_title: item.variant_title,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_total: item.discount_total,
          line_total: item.line_total,
        })),
      });

      // Step 8: Create order addresses
      await tx.orderAddress.create({
        data: {
          store_id: storeId,
          order_id: order.id,
          type: "SHIPPING",
          full_name: data.shipping_address.full_name,
          phone: data.shipping_address.phone ?? null,
          city: data.shipping_address.city,
          region: data.shipping_address.region ?? null,
          street_line_1: data.shipping_address.street_line_1,
          street_line_2: data.shipping_address.street_line_2 ?? null,
          postal_code: data.shipping_address.postal_code ?? null,
          google_maps_url: data.shipping_address.google_maps_url ?? null,
        },
      });

      if (data.billing_address) {
        await tx.orderAddress.create({
          data: {
            store_id: storeId,
            order_id: order.id,
            type: "BILLING",
            full_name: data.billing_address.full_name,
            phone: data.billing_address.phone ?? null,
            city: data.billing_address.city,
            region: data.billing_address.region ?? null,
            street_line_1: data.billing_address.street_line_1,
            street_line_2: data.billing_address.street_line_2 ?? null,
            postal_code: data.billing_address.postal_code ?? null,
            google_maps_url: data.billing_address.google_maps_url ?? null,
          },
        });
      }

      // Step 9: Reserve inventory
      for (const item of resolvedItems) {
        await tx.inventory.update({
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

        await tx.inventoryMovement.create({
          data: {
            store_id: storeId,
            variant_id: item.variant_id,
            order_id: order.id,
            actor_user_id: actorUserId,
            type: "RESERVED",
            quantity_change: -item.quantity,
            reason: `Reserved for order ${orderNumber}`,
          },
        });
      }

      // Step 10: Record coupon usage
      if (couponId) {
        await tx.couponUsage.create({
          data: {
            store_id: storeId,
            coupon_id: couponId,
            customer_id: data.customer_id ?? null,
            order_id: order.id,
            discount_amount: discountTotal,
          },
        });
      }

      // Step 11: Create timeline entry
      await tx.orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: order.id,
          actor_user_id: actorUserId,
          event: "ORDER_CREATED",
          to_status: "PENDING",
          note: "Order created",
        },
      });

      return order;
    });
  }

  /**
   * Updates order status with state machine validation.
   * Creates a timeline entry for the transition.
   */
  async updateStatus(
    storeId: number,
    orderId: number,
    data: UpdateOrderStatusInput,
    actorUserId: number,
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    // Validate transition
    orderStateMachine.assertTransition(order.status, data.status);

    // Update status and create timeline entry
    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id_store_id: { id: orderId, store_id: storeId } },
        data: { status: data.status },
      });

      await tx.orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          actor_user_id: actorUserId,
          event: "STATUS_CHANGED",
          from_status: order.status,
          to_status: data.status,
          note: data.note ?? null,
        },
      });

      return updatedOrder;
    });

    return updated;
  }

  /**
   * Updates order payment status.
   * Creates a timeline entry for the change.
   */
  async updatePaymentStatus(
    storeId: number,
    orderId: number,
    data: UpdatePaymentStatusInput,
    actorUserId: number,
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id_store_id: { id: orderId, store_id: storeId } },
        data: { payment_status: data.payment_status },
      });

      await tx.orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          actor_user_id: actorUserId,
          event: "PAYMENT_STATUS_CHANGED",
          note: data.note ?? null,
          payload: {
            from_payment_status: order.payment_status,
            to_payment_status: data.payment_status,
          },
        },
      });

      return updatedOrder;
    });

    return updated;
  }

  /**
   * Cancels an order with inventory rollback.
   * Validates transition to CANCELED, releases reserved inventory,
   * and creates timeline entry. All in a transaction.
   */
  async cancel(
    storeId: number,
    orderId: number,
    actorUserId: number,
    reason?: string,
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
      include: { items: true },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    // Validate transition to CANCELED
    orderStateMachine.assertTransition(order.status, ShipmentStatus.CANCELED);

    return await prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id_store_id: { id: orderId, store_id: storeId } },
        data: { status: "CANCELED" },
      });

      // Release inventory for each item
      for (const item of order.items) {
        await tx.inventory.update({
          where: {
            variant_id_store_id: {
              variant_id: item.variant_id,
              store_id: storeId,
            },
          },
          data: {
            available_quantity: { increment: item.quantity },
            reserved_quantity: { decrement: item.quantity },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            store_id: storeId,
            variant_id: item.variant_id,
            order_id: orderId,
            actor_user_id: actorUserId,
            type: "RELEASED",
            quantity_change: item.quantity,
            reason: reason
              ? `Order canceled: ${reason}`
              : `Released from canceled order ${order.order_number}`,
          },
        });
      }

      // Create timeline entry
      await tx.orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          actor_user_id: actorUserId,
          event: "STATUS_CHANGED",
          from_status: order.status,
          to_status: "CANCELED",
          note: reason ?? "Order canceled",
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Adds a note to an order's timeline.
   * Throws 404 if order not found.
   */
  async addNote(
    storeId: number,
    orderId: number,
    note: string,
    actorUserId: number,
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    const timelineEntry = await prisma.orderTimeline.create({
      data: {
        store_id: storeId,
        order_id: orderId,
        actor_user_id: actorUserId,
        event: "NOTE_ADDED",
        note,
      },
    });

    return timelineEntry;
  }

  /**
   * Returns paginated timeline entries for an order.
   * Ordered by created_at desc. Throws 404 if order not found.
   */
  async getTimeline(
    storeId: number,
    orderId: number,
    params: PaginationParams,
  ) {
    const { page = 1, limit = 20 } = params;

    // Verify order exists
    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    const where = { store_id: storeId, order_id: orderId };

    const [data, total] = await Promise.all([
      prisma.orderTimeline.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          actor: { select: { id: true, first_name: true, last_name: true } },
        },
      }),
      prisma.orderTimeline.count({ where }),
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
}

export const orderService = new OrderService();
