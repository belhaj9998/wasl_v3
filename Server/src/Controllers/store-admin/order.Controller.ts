import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { orderService } from "../../services/store-admin/order.Service";
import { AppRequest } from "../../types";
import {
  ShipmentStatus,
  PaymentStatus,
  OrderSource,
} from "../../../generated/prisma";

/**
 * OrderController handles order management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * Reads the pre-parsed `assigned_user_id` filter from `req.params` (the
 * `validateQuery` middleware lands parsed query values there) and resolves the
 * `"me"` token to the requester's own user id BEFORE the value reaches the
 * service. The validator (`assigneeFilterSchema`) produces one of:
 *   - `"me"`         → resolved here to `[req.user.userId]`
 *   - `"unassigned"` → passed straight through
 *   - `number[]`     → passed straight through
 *   - `undefined`    → no filter
 * so `orderService.list` / `orderService.getCounts` only ever observe
 * `"unassigned" | number[] | undefined` (Requirement 9.2).
 */
function resolveAssigneeFilter(
  req: AppRequest,
): "unassigned" | number[] | undefined {
  const parsed = (req.params as Record<string, unknown>).assigned_user_id as
    | "me"
    | "unassigned"
    | number[]
    | undefined;

  if (parsed === "me") {
    return [req.user!.userId];
  }

  return parsed;
}
function resolveSourceFilter(req: AppRequest): OrderSource[] | undefined {
  return (req.params as Record<string, unknown>).source as
    | OrderSource[]
    | undefined;
}

/**
 * GET /api/stores/:storeId/orders
 * Returns a paginated list of orders with filtering, sorting, and search.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const {
    page,
    limit,
    search,
    status,
    payment_status,
    customer_id,
    date_from,
    date_to,
    amount_min,
    amount_max,
    sort_by,
    sort_order,
  } = req.query;

  // `tag_ids` is parsed by `orderListQuerySchema` (via the
  // `tagFilterIdsQuerySchema` helper) from a comma-separated query string
  // into `number[] | undefined`. The `validateQuery` middleware lands
  // parsed values on `req.params`, so we read them from there.
  const tag_ids = (req.params as Record<string, unknown>).tag_ids as
    | number[]
    | undefined;

  // `assigned_user_id` is parsed by `orderListQuerySchema` (via the
  // `assigneeFilterSchema` helper) into `"me" | "unassigned" | number[] |
  // undefined` and lands on `req.params` like `tag_ids`. The `me` token is
  // resolved to the requester's own id HERE, at the controller, so the
  // service only ever sees `"unassigned" | number[]` (Requirement 9.2).
  const assigned_user_id = resolveAssigneeFilter(req);
  const source = resolveSourceFilter(req);

  const result = await orderService.list(storeId, {
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    search: search as string | undefined,
    status: status as ShipmentStatus | undefined,
    payment_status: payment_status as PaymentStatus | undefined,
    source,
    customer_id: customer_id ? parseInt(customer_id as string, 10) : undefined,
    date_from: date_from ? new Date(date_from as string) : undefined,
    date_to: date_to ? new Date(date_to as string) : undefined,
    amount_min: amount_min ? parseFloat(amount_min as string) : undefined,
    amount_max: amount_max ? parseFloat(amount_max as string) : undefined,
    tag_ids,
    assigned_user_id,
    sort_by: sort_by as
      | "placed_at"
      | "grand_total"
      | "order_number"
      | undefined,
    sort_order: sort_order as "asc" | "desc" | undefined,
  });

  sendPaginated(res, result.data, result.meta, "Orders retrieved");
});

/**
 * POST /api/stores/:storeId/orders
 * Creates a new order in the store.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const actorUserId = req.user!.userId;

  const order = await orderService.create(storeId, req.body, actorUserId);

  sendSuccess(res, { order }, "Order created", 201);
});

/**
 * GET /api/stores/:storeId/orders/:orderId
 * Returns a specific order with all related data.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const orderId = parseInt(req.params.orderId as string, 10);

  const order = await orderService.getById(storeId, orderId);

  sendSuccess(res, { order }, "Order retrieved");
});

/**
 * PATCH /api/stores/:storeId/orders/:orderId/status
 * Updates an order's status with state machine validation.
 */
export const updateStatus = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const orderId = parseInt(req.params.orderId as string, 10);
    const actorUserId = req.user!.userId;

    const order = await orderService.updateStatus(
      storeId,
      orderId,
      req.body,
      actorUserId,
    );

    sendSuccess(res, { order }, "Order status updated");
  },
);

/**
 * PATCH /api/stores/:storeId/orders/:orderId/source
 * Updates an order's source and records a SOURCE_CHANGED timeline event.
 */
export const updateOrderSource = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const orderId = parseInt(req.params.orderId as string, 10);
    const actorUserId = req.user!.userId;
    const { source } = req.body as { source: OrderSource };

    const order = await orderService.updateOrderSource(
      storeId,
      orderId,
      source,
      actorUserId,
    );

    sendSuccess(res, { order }, "Order source updated");
  },
);

/**
 * POST /api/stores/:storeId/orders/:orderId/cancel
 * Cancels an order with inventory rollback.
 */
export const cancel = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const orderId = parseInt(req.params.orderId as string, 10);
  const actorUserId = req.user!.userId;
  const reason = req.body?.reason as string | undefined;

  const order = await orderService.cancel(
    storeId,
    orderId,
    actorUserId,
    reason,
  );

  sendSuccess(res, { order }, "Order canceled");
});

/**
 * POST /api/stores/:storeId/orders/:orderId/notes
 * Adds a note to the order timeline.
 */
export const addNote = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const orderId = parseInt(req.params.orderId as string, 10);
  const actorUserId = req.user!.userId;
  const { note } = req.body;

  const timelineEntry = await orderService.addNote(
    storeId,
    orderId,
    note,
    actorUserId,
  );

  sendSuccess(res, { timeline: timelineEntry }, "Note added", 201);
});

/**
 * GET /api/stores/:storeId/orders/:orderId/timeline
 * Returns a paginated timeline of order events.
 */
export const getTimeline = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const orderId = parseInt(req.params.orderId as string, 10);
    const { page, limit } = req.query;

    const result = await orderService.getTimeline(storeId, orderId, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    sendPaginated(res, result.data, result.meta, "Order timeline retrieved");
  },
);

/**
 * GET /api/stores/:storeId/orders/stats/counts
 * Returns total order count and per-status counts for the orders list status tabs.
 * Honors the same filters as the list endpoint EXCEPT `status` itself.
 * Always returns all 11 ShipmentStatus keys (zero-filled).
 */
export const getCounts = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const {
      search,
      payment_status,
      customer_id,
      date_from,
      date_to,
      amount_min,
      amount_max,
    } = req.query;

    // `tag_ids` is parsed by `orderCountsQuerySchema` (via the
    // `tagFilterIdsQuerySchema` helper) from a comma-separated string
    // into `number[] | undefined`. `validateQuery` lands parsed data on
    // `req.params`, so we read it from there.
    const tag_ids = (req.params as Record<string, unknown>).tag_ids as
      | number[]
      | undefined;

    // `assigned_user_id` is resolved the same way as in `list` so the
    // per-status count tabs stay in sync with the visible list (Requirement
    // 9.4). The `me` token is resolved to the requester's id here.
    const assigned_user_id = resolveAssigneeFilter(req);
    const source = resolveSourceFilter(req);

    const result = await orderService.getCounts(storeId, {
      search: search as string | undefined,
      payment_status: payment_status as PaymentStatus | undefined,
      source,
      customer_id: customer_id
        ? parseInt(customer_id as string, 10)
        : undefined,
      date_from: date_from ? new Date(date_from as string) : undefined,
      date_to: date_to ? new Date(date_to as string) : undefined,
      amount_min: amount_min ? parseFloat(amount_min as string) : undefined,
      amount_max: amount_max ? parseFloat(amount_max as string) : undefined,
      tag_ids,
      assigned_user_id,
    });

    sendSuccess(res, result, "Order counts retrieved");
  },
);

/**
 * GET /api/stores/:storeId/orders/stats/kpis
 * Returns today's orders count, revenue, AOV, plus the all-time PENDING count.
 *
 * - "Today" is computed server-side from `Store.timezone` (default Africa/Tripoli).
 * - Today metrics exclude `CANCELED` and `RETURNED`.
 * - `pending_orders_count` is all-time, status = PENDING only.
 * - Money fields (`revenue_today`, `aov_today`) are serialized as 3-decimal strings.
 * - `storeId` is read from `req.storeId` (resolved by middleware), never the body.
 * - Accepts no query parameters; any extras are ignored.
 */
export const getKpis = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;

  const result = await orderService.getKpis(storeId);

  sendSuccess(
    res,
    {
      orders_today_count: result.orders_today_count,
      revenue_today: result.revenue_today.toFixed(3),
      aov_today: result.aov_today.toFixed(3),
      pending_orders_count: result.pending_orders_count,
    },
    "Order KPIs retrieved",
  );
});

/**
 * GET /api/stores/:storeId/orders/assignees
 * Returns the store's eligible assignees (ACTIVE members whose user account is
 * neither soft-deleted nor deactivated), sorted by name. Powers the order
 * detail assignee dropdown and the orders-list assignee filter.
 *
 * Response envelope matches the frontend `getEligibleAssignees` contract:
 * `ApiResponse<{ assignees: EligibleAssignee[] }>` (Requirements 7.1, 7.2).
 */
export const listEligibleAssignees = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;

    const assignees = await orderService.listEligibleAssignees(storeId);

    sendSuccess(res, { assignees }, "Eligible assignees retrieved");
  },
);

/**
 * PATCH /api/stores/:storeId/orders/:orderId/assignee
 * Sets, changes, or clears the order's assignee. The request body is validated
 * by `assignAssigneeSchema` ({ user_id: number | null }). The actor is the
 * authenticated requester (`req.user.userId`), recorded on the resulting
 * `ASSIGNEE_CHANGED` timeline event by the service (Requirements 6.1, 6.4,
 * 6.5).
 */
export const assignAssignee = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const orderId = parseInt(req.params.orderId as string, 10);
    const actorUserId = req.user!.userId;
    const { user_id } = req.body as { user_id: number | null };

    const order = await orderService.assignAssignee(
      storeId,
      orderId,
      user_id,
      actorUserId,
    );

    sendSuccess(res, { order }, "Order assignee updated");
  },
);
