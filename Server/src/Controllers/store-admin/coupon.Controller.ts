import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { couponService } from "../../services/store-admin/coupon.Service";
import { AppRequest } from "../../types";

/**
 * CouponController handles coupon management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/coupons
 * Returns a paginated list of coupons with filtering, sorting, and search.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const { page, limit, search, is_active, type, sort_by, sort_order } =
    req.query;

  const result = await couponService.list(storeId, {
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    search: search as string | undefined,
    is_active:
      is_active !== undefined ? (is_active as string) === "true" : undefined,
    type: type as "PERCENTAGE" | "FIXED" | undefined,
    sort_by: sort_by as
      | "created_at"
      | "code"
      | "starts_at"
      | "ends_at"
      | undefined,
    sort_order: sort_order as "asc" | "desc" | undefined,
  });

  sendPaginated(res, result.data, result.meta, "Coupons retrieved");
});

/**
 * POST /api/stores/:storeId/coupons
 * Creates a new coupon in the store.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;

  const coupon = await couponService.create(storeId, req.body);

  sendSuccess(res, { coupon }, "Coupon created", 201);
});

/**
 * GET /api/stores/:storeId/coupons/:couponId
 * Returns a specific coupon.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const couponId = parseInt(req.params.couponId as string, 10);

  const coupon = await couponService.getById(storeId, couponId);

  sendSuccess(res, { coupon }, "Coupon retrieved");
});

/**
 * PATCH /api/stores/:storeId/coupons/:couponId
 * Updates a coupon's details.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const couponId = parseInt(req.params.couponId as string, 10);

  const coupon = await couponService.update(storeId, couponId, req.body);

  sendSuccess(res, { coupon }, "Coupon updated");
});

/**
 * DELETE /api/stores/:storeId/coupons/:couponId
 * Deletes a coupon (only if no usages exist).
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const couponId = parseInt(req.params.couponId as string, 10);

  await couponService.delete(storeId, couponId);

  sendSuccess(res, null, "Coupon deleted");
});

/**
 * GET /api/stores/:storeId/coupons/:couponId/usages
 * Returns paginated usage history for a coupon.
 */
export const getUsageHistory = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const couponId = parseInt(req.params.couponId as string, 10);
    const { page, limit } = req.query;

    const result = await couponService.getUsageHistory(storeId, couponId, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    sendPaginated(
      res,
      result.data,
      result.meta,
      "Coupon usage history retrieved",
    );
  },
);

/**
 * POST /api/stores/:storeId/coupons/validate
 * Validates a coupon code against an order subtotal.
 */
export const validateCoupon = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const { code, subtotal, customer_id } = req.body;

    const result = await couponService.validateCoupon(
      storeId,
      code,
      customer_id ?? null,
      subtotal,
    );

    sendSuccess(res, result, "Coupon is valid");
  },
);
