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
    source,
    customer_id,
    date_from,
    date_to,
    amount_min,
    amount_max,
    sort_by,
    sort_order,
  } = req.query;

  const result = await orderService.list(storeId, {
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    search: search as string | undefined,
    status: status as ShipmentStatus | undefined,
    payment_status: payment_status as PaymentStatus | undefined,
    source: source as OrderSource | undefined,
    customer_id: customer_id ? parseInt(customer_id as string, 10) : undefined,
    date_from: date_from ? new Date(date_from as string) : undefined,
    date_to: date_to ? new Date(date_to as string) : undefined,
    amount_min: amount_min ? parseFloat(amount_min as string) : undefined,
    amount_max: amount_max ? parseFloat(amount_max as string) : undefined,
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
