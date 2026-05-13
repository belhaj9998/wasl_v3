import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { shipmentService } from "../../services/store-admin/shipment.Service";
import { AppRequest } from "../../types";

/**
 * ShipmentController handles shipment management endpoints for store admins.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/orders/:orderId/shipments
 * Returns all shipments for a given order.
 */
export const listByOrder = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const orderId = parseInt(req.params.orderId as string, 10);

    const shipments = await shipmentService.listByOrder(storeId, orderId);

    sendSuccess(res, { shipments }, "Shipments retrieved");
  },
);

/**
 * GET /api/stores/:storeId/shipments/:shipmentId
 * Returns a single shipment by ID.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const shipmentId = parseInt(req.params.shipmentId as string, 10);

  const shipment = await shipmentService.getById(storeId, shipmentId);

  sendSuccess(res, { shipment }, "Shipment retrieved");
});

/**
 * POST /api/stores/:storeId/orders/:orderId/shipments
 * Creates a new shipment for an order.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const orderId = parseInt(req.params.orderId as string, 10);

  const shipment = await shipmentService.create(storeId, orderId, req.body);

  sendSuccess(res, { shipment }, "Shipment created", 201);
});

/**
 * PATCH /api/stores/:storeId/shipments/:shipmentId
 * Updates shipment fields (provider, tracking_number, etc.).
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const shipmentId = parseInt(req.params.shipmentId as string, 10);

  const shipment = await shipmentService.update(storeId, shipmentId, req.body);

  sendSuccess(res, { shipment }, "Shipment updated");
});

/**
 * PATCH /api/stores/:storeId/shipments/:shipmentId/status
 * Updates shipment status with state machine validation.
 */
export const updateStatus = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const shipmentId = parseInt(req.params.shipmentId as string, 10);

    const shipment = await shipmentService.updateStatus(
      storeId,
      shipmentId,
      req.body,
    );

    sendSuccess(res, { shipment }, "Shipment status updated");
  },
);
