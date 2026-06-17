import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { orderStateMachine } from "../../utils/orderStateMachine";
import {
  orderNumberGenerator,
  PrismaTransactionClient,
} from "../../utils/orderNumberGenerator";
import { couponService } from "./coupon.Service";
import {
  mapOrderToDto,
  mapOrderTimelineToDto,
  mapEligibleAssigneeToDto,
} from "../../mappers";
import { getStoreDayBoundsUtc } from "../../utils/timezone";
import { Money, getScale } from "../../utils/money";
import {
  Prisma,
  ShipmentStatus,
  PaymentStatus,
  PaymentMethod,
  OrderSource,
  MembershipStatus,
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
  source?: OrderSource[];
  customer_id?: number;
  date_from?: Date;
  date_to?: Date;
  amount_min?: number;
  amount_max?: number;
  tag_ids?: number[];
  /**
   * Pre-resolved assignee filter (Requirements 9.1, 9.2, 9.3):
   * - undefined → no filter
   * - "unassigned" → assigned_user_id IS NULL
   * - number[] → assigned_user_id IN (...) (validated as Eligible_Assignees
   *   by the controller before reaching the service)
   */
  assigned_user_id?: "unassigned" | number[];
  sort_by?: "placed_at" | "grand_total" | "order_number";
  sort_order?: "asc" | "desc";
}
/**
 * Filter parameters shared by list and counts endpoints.
 * Excludes pagination and sort fields which are list-only concerns.
 */
interface OrderFilterParams {
  search?: string;
  status?: ShipmentStatus;
  payment_status?: PaymentStatus;
  source?: OrderSource[];
  customer_id?: number;
  date_from?: Date;
  date_to?: Date;
  amount_min?: number;
  amount_max?: number;
  tag_ids?: number[];
  /**
   * Pre-resolved assignee filter — same semantics as on OrderListParams.
   * Shared by the counts builder so the per-status tabs stay in sync with
   * the visible list (Requirement 9.4).
   */
  assigned_user_id?: "unassigned" | number[];
}
/**
 * Parameters accepted by getCounts.
 * Same shape as OrderFilterParams without the `status` field
 * (since each tab IS a status — counts respect filters but ignore status).
 */
interface OrderCountsParams {
  search?: string;
  payment_status?: PaymentStatus;
  source?: OrderSource[];
  customer_id?: number;
  date_from?: Date;
  date_to?: Date;
  amount_min?: number;
  amount_max?: number;
  tag_ids?: number[];
  /**
   * Pre-resolved assignee filter — applied identically to the list so the
   * per-status count tabs stay in sync with the visible list (Requirement 9.4).
   */
  assigned_user_id?: "unassigned" | number[];
}

/**
 * Result returned by getCounts.
 * `total` equals the sum of all 11 by_status values.
 * `by_status` always contains exactly the 11 ShipmentStatus keys
 * (zero-filled when a status has no matching orders).
 */
interface OrderCountsResult {
  total: number;
  by_status: Record<ShipmentStatus, number>;
}
/**
 * Result returned by getKpis.
 * - orders_today_count, pending_orders_count: non-negative integers.
 * - revenue_today, aov_today: Prisma.Decimal (controller serializes via toFixed(3)).
 */
export interface OrderKpisResult {
  orders_today_count: number;
  revenue_today: Prisma.Decimal;
  aov_today: Prisma.Decimal;
  pending_orders_count: number;
}

/**
 * The 11 ShipmentStatus values, in the canonical UI order.
 * Used to zero-fill the by_status object so the response always
 * has all keys present even when no orders match.
 */
const ALL_SHIPMENT_STATUSES: ShipmentStatus[] = [
  "DRAFT",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PREPARING",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELED",
  "RETURNED",
];

/**
 * The Terminal_Status set for assignment purposes. Orders in any of these
 * states are considered closed and reject every assignment mutation with
 * `ORDER_TERMINAL_STATUS` (Requirements 4.1, 4.2).
 */
const ASSIGNEE_TERMINAL_STATUSES: ReadonlySet<ShipmentStatus> = new Set([
  ShipmentStatus.CANCELED,
  ShipmentStatus.RETURNED,
  ShipmentStatus.DELIVERED,
]);

/**
 * Compact, structured audit log for every assignment-mutation rejection path.
 * Mirrors the design's "Audit logging on rejection" section: a single
 * `console.warn` entry with a deterministic shape (`event`,
 * `reason_code`, `store_id`, `actor_user_id`, `payload_summary`) is emitted
 * before the matching `AppError` is thrown. These audit entries MUST NOT be
 * written to `OrderTimeline` — they are operational logs only. The HTTP
 * `route` is a controller-layer concern and is intentionally omitted here.
 */
function auditAssigneeRejection(
  reasonCode: string,
  context: {
    store_id: number;
    actor_user_id: number;
    order_id: number;
    target_user_id: number | null;
    was_terminal_status?: boolean;
  },
): void {
  // eslint-disable-next-line no-console
  console.warn(
    JSON.stringify({
      level: "warn",
      event: "ORDER_ASSIGNEE_REJECTED",
      reason_code: reasonCode,
      store_id: context.store_id,
      actor_user_id: context.actor_user_id,
      payload_summary: {
        order_id: context.order_id,
        target_user_id: context.target_user_id,
        was_terminal_status: context.was_terminal_status ?? false,
      },
    }),
  );
}
function auditSourceRejection(
  reasonCode: string,
  context: {
    store_id: number;
    actor_user_id: number;
    order_id: number;
    target_source: OrderSource;
  },
): void {
  // eslint-disable-next-line no-console
  console.warn(
    JSON.stringify({
      level: "warn",
      event: "ORDER_SOURCE_REJECTED",
      reason_code: reasonCode,
      store_id: context.store_id,
      actor_user_id: context.actor_user_id,
      payload_summary: {
        order_id: context.order_id,
        target_source: context.target_source,
      },
    }),
  );
}

/**
 * Compact, structured audit log for every source-mutation rejection path.
 * Mirrors `auditAssigneeRejection`: a single `console.warn` entry is emitted
 * before the matching `AppError` is thrown. Audit entries MUST NOT be written
 * to `OrderTimeline` — they are operational logs only.
 */
function auditSourceRejection(
  reasonCode: string,
  context: {
    store_id: number;
    actor_user_id: number;
    order_id: number;
    target_source: string;
  },
): void {
  // eslint-disable-next-line no-console
  console.warn(
    JSON.stringify({
      level: "warn",
      event: "ORDER_SOURCE_REJECTED",
      reason_code: reasonCode,
      store_id: context.store_id,
      actor_user_id: context.actor_user_id,
      payload_summary: {
        order_id: context.order_id,
        target_source: context.target_source,
      },
    }),
  );
}
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
  state?: string;
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
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  source?: OrderSource;
  payment_method?: PaymentMethod;
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
  unit_price: Prisma.Decimal;
  discount_total: Prisma.Decimal;
  line_total: Prisma.Decimal;
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
  /**
   * Builds the Prisma `where` clause from filter parameters.
   * Shared by list() and getCounts() to guarantee filter parity.
   * The `status` field is honored if provided; callers (e.g. getCounts)
   * that should ignore status must omit it from `params`.
   */
  private buildOrderListWhere(storeId: number, params: OrderFilterParams): any {
    const where: any = { store_id: storeId };

    if (params.status) {
      where.status = params.status;
    }

    if (params.payment_status) {
      where.payment_status = params.payment_status;
    }

    if (params.source && params.source.length > 0) {
      where.source = { in: params.source };
    }

    if (params.customer_id) {
      where.customer_id = params.customer_id;
    }

    if (params.date_from || params.date_to) {
      where.placed_at = {};
      if (params.date_from) {
        where.placed_at.gte = params.date_from;
      }
      if (params.date_to) {
        where.placed_at.lte = params.date_to;
      }
    }

    if (params.amount_min !== undefined || params.amount_max !== undefined) {
      where.grand_total = {};
      if (params.amount_min !== undefined) {
        where.grand_total.gte = params.amount_min;
      }
      if (params.amount_max !== undefined) {
        where.grand_total.lte = params.amount_max;
      }
    }

    if (params.search) {
      where.OR = [
        { order_number: { contains: params.search, mode: "insensitive" } },
        { customer_name: { contains: params.search, mode: "insensitive" } },
        { customer_phone: { contains: params.search, mode: "insensitive" } },
      ];
    }

    // Tag filter — OR semantics: order matches when it has at least one
    // assignment whose tag_id is in the requested set.
    if (params.tag_ids && params.tag_ids.length > 0) {
      where.tag_assignments = {
        some: { tag_id: { in: params.tag_ids } },
      };
    }

    // Assignee filter (Requirements 9.1, 9.2, 9.3). The param is pre-resolved
    // by the controller into one of three shapes:
    //   - "unassigned" → only orders with no assignee (assigned_user_id IS NULL)
    //   - number[]     → orders whose assignee is in the validated id set
    //   - undefined    → no assignee clause applied
    if (params.assigned_user_id === "unassigned") {
      where.assigned_user_id = null;
    } else if (Array.isArray(params.assigned_user_id)) {
      where.assigned_user_id = { in: params.assigned_user_id };
    }

    return where;
  }

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
      tag_ids,
      assigned_user_id,
      sort_by = "placed_at",
      sort_order = "desc",
    } = params;

    const where = this.buildOrderListWhere(storeId, {
      search,
      status,
      payment_status,
      source,
      customer_id,
      date_from,
      date_to,
      amount_min,
      amount_max,
      tag_ids,
      assigned_user_id,
    });

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
              customer_name: true,
              phone: true,
            },
          },
          payments: {
            orderBy: { created_at: "desc" },
            take: 1,
          },
          items: {
            select: {
              id: true,
              product_id: true,
              variant_id: true,
              product_name: true,
              variant_title: true,
              sku: true,
              quantity: true,
              unit_price: true,
              line_total: true,
              product: {
                select: {
                  media: {
                    select: { url: true },
                    orderBy: { sort_order: "asc" },
                    take: 1,
                  },
                },
              },
            },
          },
          addresses: true,
          tag_assignments: {
            include: { tag: true },
          },
          // Assignee join so the mapper can project `assigned_user` with live
          // data and no N+1 lookup (Requirement 8.5).
          assigned_user: {
            select: {
              id: true,
              name: true,
              avatar_url: true,
              deleted_at: true,
              is_active: true,
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
      data: data.map((order) => mapOrderToDto(order)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  /**
   * Computes per-status order counts for the orders list page status tabs.
   * Uses a single grouped query — guaranteed by `prisma.order.groupBy` on `status`.
   * Always returns all 11 ShipmentStatus keys (zero-filled when no matches).
   * Honors all filters except `status` itself (each tab IS a status filter).
   */
  async getCounts(
    storeId: number,
    params: OrderCountsParams,
  ): Promise<OrderCountsResult> {
    // Build where via the shared helper — pass NO status field.
    const where = this.buildOrderListWhere(storeId, {
      search: params.search,
      payment_status: params.payment_status,
      source: params.source,
      customer_id: params.customer_id,
      date_from: params.date_from,
      date_to: params.date_to,
      amount_min: params.amount_min,
      amount_max: params.amount_max,
      tag_ids: params.tag_ids,
      assigned_user_id: params.assigned_user_id,
    });

    // Single grouped query — Requirement 6.1
    const grouped = await prisma.order.groupBy({
      by: ["status"],
      where: where as Prisma.OrderWhereInput,
      _count: { _all: true },
    });

    // Zero-fill all 11 statuses so the response shape is stable — Requirement 5.4
    const by_status = ALL_SHIPMENT_STATUSES.reduce<
      Record<ShipmentStatus, number>
    >(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<ShipmentStatus, number>,
    );

    let total = 0;
    for (const row of grouped) {
      by_status[row.status] = row._count._all;
      total += row._count._all;
    }

    return { total, by_status };
  }

  /**
   * Computes today's KPIs (count, revenue, AOV) and the all-time pending count.
   *
   * - "Today" is the local civil day in `Store.timezone`, converted to UTC bounds
   *   via {@link getStoreDayBoundsUtc}. Falls back to "Africa/Tripoli" if the store
   *   has no/invalid timezone.
   * - Today metrics exclude `CANCELED` and `RETURNED`.
   * - `pending_orders_count` is all-time (no date filter), `status = PENDING` only.
   * - All money math uses `Prisma.Decimal` — never JS `number` arithmetic.
   * - AOV is `0` when count is `0` (no division by zero).
   */
  async getKpis(storeId: number): Promise<OrderKpisResult> {
    // 1) Resolve the store timezone (helper handles null/invalid via fallback)
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { timezone: true },
    });

    const { startUtc, endUtc } = getStoreDayBoundsUtc(store?.timezone ?? null);

    // 2) Two queries in parallel — both covered by index [store_id, status, placed_at]
    const [todayAgg, pendingCount] = await Promise.all([
      prisma.order.aggregate({
        where: {
          store_id: storeId,
          placed_at: { gte: startUtc, lt: endUtc },
          status: {
            notIn: [ShipmentStatus.CANCELED, ShipmentStatus.RETURNED],
          },
        },
        _count: { _all: true },
        _sum: { grand_total: true },
      }),
      prisma.order.count({
        where: {
          store_id: storeId,
          status: ShipmentStatus.PENDING,
        },
      }),
    ]);

    const ordersTodayCount = todayAgg._count._all;
    const revenueToday = todayAgg._sum.grand_total ?? new Prisma.Decimal(0);

    const aovToday =
      ordersTodayCount === 0
        ? new Prisma.Decimal(0)
        : revenueToday.div(new Prisma.Decimal(ordersTodayCount));

    return {
      orders_today_count: ordersTodayCount,
      revenue_today: revenueToday,
      aov_today: aovToday,
      pending_orders_count: pendingCount,
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
            customer_name: true,
            phone: true,
          },
        },
        tag_assignments: {
          include: { tag: true },
        },
        // Assignee join so `mapOrderToDto` can project the current assignee
        // with live data and no N+1 lookup (Requirement 8.5).
        assigned_user: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
            deleted_at: true,
            is_active: true,
          },
        },
      },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    // Preload a live-user map for the timeline ASSIGNEE_CHANGED projection.
    // Collect every distinct user id referenced by an ASSIGNEE_CHANGED payload
    // (`payload.from?.id`, `payload.to?.id`) plus the current
    // `Order.assigned_user_id`, then resolve them in a single query so the
    // mapper performs O(1) lookups with no N+1 (Requirements 5.3, 5.4, 8.5).
    const liveUserMap = await this.buildTimelineLiveUserMap(order);

    return mapOrderToDto(order, liveUserMap);
  }

  /**
   * Builds the `Map<userId, liveUserRow>` consumed by the timeline mapper to
   * resolve `ASSIGNEE_CHANGED` snapshots against live user data. Collects ids
   * from every `ASSIGNEE_CHANGED` payload side and the order's current
   * `assigned_user_id`, then runs one `findMany`. Returns an empty map when no
   * ids are referenced.
   */
  private async buildTimelineLiveUserMap(order: {
    assigned_user_id?: number | null;
    timeline?: unknown;
  }): Promise<Map<number, Record<string, any>>> {
    const ids = new Set<number>();

    const addId = (value: unknown) => {
      if (typeof value === "number" && Number.isInteger(value) && value > 0) {
        ids.add(value);
      }
    };

    addId(order.assigned_user_id ?? null);

    const timeline = Array.isArray(order.timeline) ? order.timeline : [];
    for (const event of timeline as Array<Record<string, any>>) {
      if (event?.event !== "ASSIGNEE_CHANGED") continue;
      const payload = event.payload;
      if (!payload || typeof payload !== "object") continue;
      addId((payload as Record<string, any>).from?.id);
      addId((payload as Record<string, any>).to?.id);
    }

    if (ids.size === 0) {
      return new Map();
    }

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(ids) } },
      select: {
        id: true,
        name: true,
        avatar_url: true,
        deleted_at: true,
        is_active: true,
      },
    });

    return new Map(users.map((u) => [u.id, u as Record<string, any>]));
  }

  /**
   * Creates a new order with full validation and inventory reservation.
   * All operations are performed within a transaction.
   */
  async create(storeId: number, data: CreateOrderInput, actorUserId: number) {
    const createdOrder = await prisma.$transaction(async (tx) => {
      // Resolve currency scale from store
      const store = await tx.store.findUnique({
        where: { id: storeId },
        select: { currency_code: true },
      });
      const scale = getScale(store?.currency_code ?? "LYD");

      // Step 1: Validate customer if provided
      let customerName: string;
      let customerPhone: string;

      if (data.customer_id) {
        const customer = await tx.customer.findFirst({
          where: { id: data.customer_id, store_id: storeId, status: "ACTIVE" },
        });
        if (!customer) {
          throw AppError.notFound("Customer not found or not active");
        }
        customerName = [customer.customer_name].filter(Boolean).join(" ");
        customerPhone = customer.phone ?? data.shipping_address.phone ?? "";
      } else {
        customerName = data.customer_name ?? data.shipping_address.full_name;
        customerPhone =
          data.customer_phone ?? data.shipping_address.phone ?? "";
      }

      // Step 2: Validate and resolve items
      const lineTotals: Prisma.Decimal[] = [];
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

        if (variant.product.status !== "PUBLISHED") {
          throw AppError.badRequest(
            `Product "${variant.product.name}" is not published`,
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

        // Keep unitPrice as Prisma.Decimal — no Number(...) coercion
        const unitPrice: Prisma.Decimal =
          variant.price ?? variant.product.base_price ?? new Prisma.Decimal(0);
        const lineTotal = Money.multiply(unitPrice, item.quantity, scale);
        lineTotals.push(lineTotal);

        resolvedItems.push({
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: variant.product.name,
          variant_title: variant.title,
          sku: variant.sku,
          quantity: item.quantity,
          unit_price: unitPrice,
          discount_total: Money.zero(),
          line_total: lineTotal,
        });
      }

      // Compute subtotal as sum of rounded line totals
      const subtotal = Money.sum(lineTotals);

      // Step 3: Apply coupon if provided
      let discountTotal: Prisma.Decimal = Money.zero();
      let couponId: number | undefined;

      if (data.coupon_code) {
        const validation = await couponService.validateCoupon(
          storeId,
          data.coupon_code,
          data.customer_id ?? null,
          subtotal as any,
        );
        // validateCoupon returns discount_amount — use as Prisma.Decimal
        discountTotal =
          validation.discount_amount instanceof Prisma.Decimal
            ? validation.discount_amount
            : new Prisma.Decimal(validation.discount_amount);
        couponId = validation.coupon.id;
      }

      // Step 4: Calculate totals using Money utility
      const shippingTotal = new Prisma.Decimal(data.shipping_total ?? 0);
      const grandTotal = Money.max(
        Money.round(subtotal.sub(discountTotal).add(shippingTotal), scale),
        Money.zero(),
      );

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
          currency_code: store?.currency_code ?? "LYD",
          customer_name: customerName,
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
          region:
            data.shipping_address.region ?? data.shipping_address.state ?? null,
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
            region:
              data.billing_address.region ?? data.billing_address.state ?? null,
            street_line_1: data.billing_address.street_line_1,
            street_line_2: data.billing_address.street_line_2 ?? null,
            postal_code: data.billing_address.postal_code ?? null,
            google_maps_url: data.billing_address.google_maps_url ?? null,
          },
        });
      }

      // Step 9: Create a pending payment intent when a method is selected
      if (data.payment_method) {
        await tx.paymentTransaction.create({
          data: {
            store_id: storeId,
            order_id: order.id,
            method: data.payment_method,
            amount: grandTotal,
            currency_code: store?.currency_code ?? "LYD",
          },
        });
      }

      // Step 10: Reserve inventory
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

      // Step 11: Record coupon usage
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

      // Step 12: Create timeline entry
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

    return this.getById(storeId, createdOrder.id);
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

    return this.getById(storeId, updated.id);
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

    return this.getById(storeId, updated.id);
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

    const canceledOrder = await prisma.$transaction(async (tx) => {
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

    return this.getById(storeId, canceledOrder.id);
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
      include: {
        actor: { select: { id: true, name: true } },
      },
    });

    return mapOrderTimelineToDto(timelineEntry);
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
          actor: { select: { id: true, name: true } },
        },
      }),
      prisma.orderTimeline.count({ where }),
    ]);

    // Preload the live-user map so ASSIGNEE_CHANGED events on this page project
    // their `from`/`to` snapshots against live user data (Requirements 5.3–5.5).
    const liveUserMap = await this.buildTimelineLiveUserMap({ timeline: data });

    return {
      data: data.map((event) => mapOrderTimelineToDto(event, liveUserMap)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async updateOrderSource(
    storeId: number,
    orderId: number,
    source: OrderSource,
    actorUserId: number,
  ) {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, store_id: storeId },
        select: {
          id: true,
          store_id: true,
          source: true,
        },
      });

      if (!order) {
        auditSourceRejection("ORDER_NOT_FOUND", {
          store_id: storeId,
          actor_user_id: actorUserId,
          order_id: orderId,
          target_source: source,
        });
        throw AppError.notFound("Order not found: ORDER_NOT_FOUND");
      }

      if (order.source === source) {
        return;
      }

      await tx.order.update({
        where: { id_store_id: { id: orderId, store_id: storeId } },
        data: { source },
      });

      await tx.orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          actor_user_id: actorUserId,
          event: "SOURCE_CHANGED",
          payload: { from: order.source, to: source },
        },
      });
    });

    return this.getById(storeId, orderId);
  }
  /**
   * Returns `true` iff `userId` is an Eligible_Assignee for `storeId`.
   *
   * A user is eligible iff there exists a `StoreMembership` row with
   * `store_id = storeId`, `user_id = userId`, and `status = ACTIVE`, AND the
   * linked `User` row is live (`deleted_at IS NULL`) and active
   * (`is_active = true`). The predicate is expressed as a single inner-joined
   * lookup (`StoreMembership` + nested `user` where-filter) so the database
   * enforces the join — no second round-trip and no race window.
   *
   * Reused by `listEligibleAssignees` (returns the rows) and by the orders
   * list/counts filter validation (asserts each requested id is eligible).
   *
   * When called from inside `assignAssignee`'s `prisma.$transaction(...)`, the
   * optional `client` argument threads the transaction client through so the
   * eligibility read shares the same transaction snapshot as the mutation;
   * callers outside a transaction omit it and the read runs on the base
   * `prisma` client.
   *
   * Validates: Requirements 2.1, 18.2
   */
  private async isEligibleAssignee(
    storeId: number,
    userId: number,
    client: Prisma.TransactionClient = prisma,
  ): Promise<boolean> {
    const membership = await client.storeMembership.findFirst({
      where: {
        store_id: storeId,
        user_id: userId,
        status: MembershipStatus.ACTIVE,
        user: {
          deleted_at: null,
          is_active: true,
        },
      },
      select: { id: true },
    });

    return membership !== null;
  }

  /**
   * Lists the Eligible_Assignees of `storeId`.
   *
   * Returns every user `U` for which there exists a `StoreMembership` with
   * `store_id = storeId`, `status = ACTIVE`, AND `U.deleted_at IS NULL` AND
   * `U.is_active = true` — the same predicate as {@link isEligibleAssignee}.
   * Each row is projected through `mapEligibleAssigneeToDto` to `{ id, name,
   * avatar_url }`; no sensitive field (`email`, `phone`, `password`, …) is
   * ever returned (Requirement 2.2 / 7.2).
   *
   * The requester's own user record is NOT excluded — when the requester is an
   * Eligible_Assignee of the store, they appear in the list like any other
   * member (Requirement 7.5, no self-exclusion).
   *
   * Results are ordered by `name` ascending using a case-insensitive,
   * locale-aware comparison. Prisma/Postgres `orderBy` cannot express
   * `lower(name)` directly without a raw collation, so the rows are sorted in
   * application code after the fetch (Requirement 2.3).
   *
   * Validates: Requirements 2.1, 2.2, 2.3, 7.2, 7.5, 18.2
   */
  async listEligibleAssignees(
    storeId: number,
  ): Promise<Array<{ id: number; name: string; avatar_url: string | null }>> {
    const memberships = await prisma.storeMembership.findMany({
      where: {
        store_id: storeId,
        status: MembershipStatus.ACTIVE,
        user: {
          deleted_at: null,
          is_active: true,
        },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          },
        },
      },
    });

    return memberships
      .map((membership) => mapEligibleAssigneeToDto(membership.user))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }

  /**
   * Sets `Order.assigned_user_id` to `userId` (or clears it with `null`) for
   * the order identified by `(storeId, orderId)`, recording the change as a
   * single immutable `ASSIGNEE_CHANGED` timeline event.
   *
   * The entire operation runs inside one `prisma.$transaction(...)` so the
   * order read, the terminal-status guard, the eligibility check, the snapshot
   * capture, the `UPDATE Order`, and the `INSERT OrderTimeline` are atomic and
   * race-free. Reading `status` and `assigned_user_id` inside the transaction
   * closes the window described in Requirement 4.2 where a concurrent
   * transition to a Terminal_Status could otherwise slip past the guard.
   *
   * Behavior:
   * - Throws `ORDER_NOT_FOUND` (404) when no order matches `(orderId, storeId)`
   *   — this covers both a non-existent order and a cross-store target
   *   (Requirements 3.5, 18.1).
   * - Throws `ORDER_TERMINAL_STATUS` (409) when the order's `status` is one of
   *   `CANCELED`, `RETURNED`, `DELIVERED` (Requirements 4.1, 4.2). The existing
   *   `assigned_user_id` is preserved — never auto-cleared (Requirement 4.3).
   * - Throws `ASSIGNEE_NOT_ELIGIBLE` (400) when `userId` is non-null but the
   *   user is not an Eligible_Assignee of the store (Requirement 3.6).
   * - No-op short-circuit: when `userId === order.assigned_user_id` (including
   *   `null === null`), returns the current DTO WITHOUT writing the row or
   *   appending a timeline entry, leaving `updated_at` untouched
   *   (Requirements 3.4, 3.8).
   * - Otherwise: captures `{ id, name }` snapshots for the `from` and `to`
   *   sides, updates `assigned_user_id` (Prisma's `@updatedAt` bumps
   *   `updated_at` automatically — Requirements 3.1, 3.2, 3.8), and inserts
   *   exactly one `ASSIGNEE_CHANGED` timeline row with
   *   `payload = { from, to }` and `actor_user_id = actorUserId`
   *   (Requirements 3.3, 5.1, 5.2).
   *
   * `Order.notes_internal` is never mutated as part of an assignment; the
   * timeline event is the only record of the change (Requirement 5.6).
   *
   * Every rejection path emits a single structured `ORDER_ASSIGNEE_REJECTED`
   * audit log via {@link auditAssigneeRejection} before the `AppError` is
   * thrown. Audit logs are operational only and are never written to
   * `OrderTimeline`.
   *
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 4.1, 4.2, 4.3,
   * 5.1, 5.2, 5.6, 18.1
   */
  async assignAssignee(
    storeId: number,
    orderId: number,
    userId: number | null,
    actorUserId: number,
  ) {
    await prisma.$transaction(async (tx) => {
      // 1. Read the order inside the transaction. Selecting `store_id` keeps
      //    the cross-store guard explicit even though the where-clause already
      //    scopes by it.
      const order = await tx.order.findFirst({
        where: { id: orderId, store_id: storeId },
        select: {
          id: true,
          store_id: true,
          status: true,
          assigned_user_id: true,
        },
      });

      // 2. Cross-tenant / not-found guard (Requirements 3.5, 18.1).
      if (!order) {
        auditAssigneeRejection("ORDER_NOT_FOUND", {
          store_id: storeId,
          actor_user_id: actorUserId,
          order_id: orderId,
          target_user_id: userId,
        });
        throw AppError.notFound("Order not found: ORDER_NOT_FOUND");
      }

      // 3. Terminal-status guard, read inside the transaction to prevent the
      //    race in Requirement 4.2 (Requirements 4.1, 4.2, 4.3).
      if (ASSIGNEE_TERMINAL_STATUSES.has(order.status)) {
        auditAssigneeRejection("ORDER_TERMINAL_STATUS", {
          store_id: storeId,
          actor_user_id: actorUserId,
          order_id: orderId,
          target_user_id: userId,
          was_terminal_status: true,
        });
        throw AppError.conflict(
          "Order is in a terminal status: ORDER_TERMINAL_STATUS",
        );
      }

      // 4. Eligibility guard for non-null targets (Requirement 3.6).
      if (userId !== null) {
        const eligible = await this.isEligibleAssignee(storeId, userId, tx);
        if (!eligible) {
          auditAssigneeRejection("ASSIGNEE_NOT_ELIGIBLE", {
            store_id: storeId,
            actor_user_id: actorUserId,
            order_id: orderId,
            target_user_id: userId,
          });
          throw AppError.badRequest(
            "User is not an eligible assignee: ASSIGNEE_NOT_ELIGIBLE",
          );
        }
      }

      // 5. No-op short-circuit (Requirements 3.4, 3.8). When the requested
      //    value already equals the current one (including `null === null`),
      //    leave the row and timeline untouched and do NOT bump `updated_at`.
      if (userId === order.assigned_user_id) {
        return;
      }

      // 6. Capture both snapshots from live user rows inside the transaction.
      //    A snapshot is `{ id, name }` for a non-null side, or `null`.
      const fromSnapshot = await this.buildAssigneeSnapshot(
        order.assigned_user_id,
        tx,
      );
      const toSnapshot = await this.buildAssigneeSnapshot(userId, tx);

      // 7. Update the assignee. Prisma's `@updatedAt` on `Order.updated_at`
      //    bumps the timestamp automatically as part of this write
      //    (Requirements 3.1, 3.2, 3.8). `notes_internal` is never touched
      //    (Requirement 5.6).
      await tx.order.update({
        where: { id_store_id: { id: orderId, store_id: storeId } },
        data: { assigned_user_id: userId },
      });

      // 8. Append exactly one immutable ASSIGNEE_CHANGED timeline row in the
      //    same transaction (Requirements 3.3, 5.1, 5.2).
      await tx.orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          actor_user_id: actorUserId,
          event: "ASSIGNEE_CHANGED",
          payload: { from: fromSnapshot, to: toSnapshot },
        },
      });
    });

    // 9. Return the refreshed DTO (current assignee + timeline) — read outside
    //    the mutation transaction via the shared loader.
    return this.getById(storeId, orderId);
  }

  /**
   * Sets `Order.source` to `source` for `(storeId, orderId)`.
   * Mirrors `assignAssignee` in structure with these key differences:
   * - No terminal-status guard: source IS editable on CANCELED/RETURNED/DELIVERED
   *   (Req 8 — source is a record-keeping field, not an operational one).
   * - No eligibility check: any channel value from the Editable_Channel set is valid.
   * - Timeline event is `SOURCE_CHANGED` with `payload: { from, to }` as plain
   *   enum strings (no live-user snapshot resolution needed).
   *
   * No-ops silently when `order.source === source` — returns the current DTO
   * without writing the row, without appending a timeline entry, and without
   * bumping `updated_at` (Req 5.4).
   *
   * Every rejection path emits a single structured `ORDER_SOURCE_REJECTED`
   * audit log via {@link auditSourceRejection} before the `AppError` is
   * thrown. Audit logs are operational only and are never written to
   * `OrderTimeline`.
   *
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 5.8, 6.1, 6.2, 6.3,
   * 8.1, 8.2, 8.4, 16.1, 16.2, 16.4
   */
  async updateOrderSource(
    storeId: number,
    orderId: number,
    source: OrderSource,
    actorUserId: number,
  ) {
    await prisma.$transaction(async (tx) => {
      // 1. Read the order inside the transaction.
      const order = await tx.order.findFirst({
        where: { id: orderId, store_id: storeId },
        select: {
          id: true,
          store_id: true,
          source: true,
        },
      });

      // 2. Cross-tenant / not-found guard (Req 5.5, 16.1, 16.2).
      if (!order) {
        auditSourceRejection("ORDER_NOT_FOUND", {
          store_id: storeId,
          actor_user_id: actorUserId,
          order_id: orderId,
          target_source: source,
        });
        throw AppError.notFound("Order not found: ORDER_NOT_FOUND");
      }

      // 3. No terminal-status guard — source is editable on closed orders (Req 8).

      // 4. No-op short-circuit (Req 5.4). When the requested source already
      //    equals the current one, leave the row and timeline untouched and do
      //    NOT bump `updated_at`.
      if (order.source === source) {
        return;
      }

      // 5. Update the source. Prisma's `@updatedAt` on `Order.updated_at`
      //    bumps the timestamp automatically as part of this write (Req 5.2, 5.3).
      //    `notes_internal` is never touched (Req 5.8).
      await tx.order.update({
        where: { id_store_id: { id: orderId, store_id: storeId } },
        data: { source },
      });

      // 6. Append exactly one immutable SOURCE_CHANGED timeline row in the
      //    same transaction (Req 6.1, 6.2, 6.3, 16.4).
      await tx.orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          actor_user_id: actorUserId,
          event: "SOURCE_CHANGED",
          payload: { from: order.source, to: source },
        },
      });
    });

    // 7. Return the refreshed DTO (current source + timeline) — read outside
    //    the mutation transaction via the shared loader.
    return this.getById(storeId, orderId);
  }

  /**
   * Builds an Assignee_Snapshot (`{ id, name } | null`) for one side of an
   * `ASSIGNEE_CHANGED` event. Returns `null` when `userId` is `null`. For a
   * non-null id, reads `User.name` from the live row so the snapshot captures
   * the name at the moment the timeline row is written (Requirement 5.2). If
   * the user row cannot be found (e.g. a concurrently hard-deleted user), the
   * snapshot falls back to the id with an empty name rather than failing the
   * transaction.
   */
  private async buildAssigneeSnapshot(
    userId: number | null,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: number; name: string } | null> {
    if (userId === null) {
      return null;
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      return { id: userId, name: "" };
    }

    return { id: user.id, name: user.name };
  }
}

export const orderService = new OrderService();
