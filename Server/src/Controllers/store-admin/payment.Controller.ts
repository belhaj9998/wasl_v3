import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { paymentService } from "../../services/store-admin/payment.Service";
import { AppRequest } from "../../types";

/**
 * PaymentController handles payment recording and refund endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/orders/:orderId/payments
 * Returns all payment transactions for a given order.
 */
export const listByOrder = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const orderId = parseInt(req.params.orderId as string, 10);

    const payments = await paymentService.listByOrder(storeId, orderId);

    sendSuccess(res, { payments }, "Payments retrieved");
  },
);

/**
 * POST /api/stores/:storeId/orders/:orderId/payments
 * Records a payment against an order.
 */
export const recordPayment = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const orderId = parseInt(req.params.orderId as string, 10);
    const actorUserId = req.user!.userId;

    const payment = await paymentService.recordPayment(
      storeId,
      orderId,
      req.body,
      actorUserId,
    );

    sendSuccess(res, { payment }, "Payment recorded successfully", 201);
  },
);

/**
 * POST /api/stores/:storeId/orders/:orderId/refunds
 * Processes a refund for an order.
 */
export const processRefund = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const orderId = parseInt(req.params.orderId as string, 10);
    const actorUserId = req.user!.userId;

    const refund = await paymentService.processRefund(
      storeId,
      orderId,
      req.body,
      actorUserId,
    );

    sendSuccess(res, { refund }, "Refund processed successfully", 201);
  },
);
