import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { orderTagService } from "../../services/store-admin/orderTag.Service";
import { AppRequest } from "../../types";

/**
 * OrderTagController exposes eight HTTP handlers across two route groups:
 *
 *   /order-tags              ── definition CRUD (settings page surface)
 *   /orders/:orderId/tags    ── per-order assignment surface
 *   /orders/bulk/tags        ── bulk assignment surface
 *
 * All handlers are wrapped in `asyncHandler` so thrown `AppError`s flow
 * through the central error middleware, and all responses go through
 * `sendSuccess` for shape consistency.
 */

/**
 * GET /api/stores/:storeId/order-tags
 * Lists every tag in the store, with optional `assignment_count` per tag
 * when `with_counts=true`.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const withCounts = Boolean(req.query.with_counts);

  const tags = await orderTagService.list(storeId, { withCounts });

  sendSuccess(res, { tags }, "Order tags retrieved");
});

/**
 * POST /api/stores/:storeId/order-tags
 * Creates a new tag definition. Body: `{ name, color_preset }`.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const tag = await orderTagService.create(storeId, req.body);

  sendSuccess(res, { tag }, "Order tag created", 201);
});

/**
 * PATCH /api/stores/:storeId/order-tags/:id
 * Partially updates a tag's name and/or color preset.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const tagId = parseInt(req.params.id as string, 10);

  const tag = await orderTagService.update(storeId, tagId, req.body);

  sendSuccess(res, { tag }, "Order tag updated");
});

/**
 * DELETE /api/stores/:storeId/order-tags/:id
 * Deletes a tag and cascade-deletes its assignments.
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const tagId = parseInt(req.params.id as string, 10);

  await orderTagService.delete(storeId, tagId);

  sendSuccess(res, { ok: true }, "Order tag deleted");
});

/**
 * GET /api/stores/:storeId/orders/:orderId/tags
 * Returns the tag set currently assigned to an order.
 */
export const getForOrder = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const orderId = parseInt(req.params.orderId as string, 10);

    const tags = await orderTagService.getForOrder(storeId, orderId);

    sendSuccess(res, { tags }, "Order tags retrieved");
  },
);

/**
 * PUT /api/stores/:storeId/orders/:orderId/tags
 * Replaces the entire tag set on an order. Body: `{ tag_ids: number[] }`.
 */
export const replaceForOrder = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const orderId = parseInt(req.params.orderId as string, 10);
    const actorUserId = req.user!.userId;
    const { tag_ids } = req.body as { tag_ids: number[] };

    const tags = await orderTagService.replaceForOrder(
      storeId,
      orderId,
      tag_ids,
      actorUserId,
    );

    sendSuccess(res, { tags }, "Order tags updated");
  },
);

/**
 * POST /api/stores/:storeId/orders/bulk/tags
 * Adds every tag in `tag_ids` to every order in `order_ids` atomically.
 */
export const bulkAdd = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const actorUserId = req.user!.userId;

  const result = await orderTagService.bulkAdd(storeId, req.body, actorUserId);

  sendSuccess(res, result, "Tags added to orders");
});

/**
 * DELETE /api/stores/:storeId/orders/bulk/tags
 * Removes every (order_id, tag_id) pair where both ids appear in the request.
 */
export const bulkRemove = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const actorUserId = req.user!.userId;

    const result = await orderTagService.bulkRemove(
      storeId,
      req.body,
      actorUserId,
    );

    sendSuccess(res, result, "Tags removed from orders");
  },
);
