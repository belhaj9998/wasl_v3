import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { inventoryService } from "../../services/store-admin/inventory.Service";
import { AppRequest } from "../../types";

/**
 * InventoryController handles inventory management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/inventory
 * Returns a paginated list of inventory records with optional search and low-stock filter.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const search = req.query.search as string | undefined;
  const low_stock_only = req.query.low_stock_only === "true";

  const result = await inventoryService.list(storeId, {
    page,
    limit,
    search,
    low_stock_only,
  });

  sendPaginated(res, result.data, result.meta, "Inventory retrieved");
});

/**
 * GET /api/stores/:storeId/inventory/low-stock
 * Returns a paginated list of low-stock inventory items.
 */
export const getLowStock = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await inventoryService.getLowStock(storeId, { page, limit });

    sendPaginated(res, result.data, result.meta, "Low stock items retrieved");
  },
);

/**
 * GET /api/stores/:storeId/inventory/:variantId
 * Returns inventory details for a specific variant.
 */
export const getByVariantId = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const variantId = parseInt(req.params.variantId as string, 10);

    const inventory = await inventoryService.getByVariantId(storeId, variantId);

    sendSuccess(res, { inventory }, "Inventory retrieved");
  },
);

/**
 * POST /api/stores/:storeId/inventory/:variantId/adjust
 * Adjusts inventory for a specific variant and records the movement.
 */
export const adjust = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const variantId = parseInt(req.params.variantId as string, 10);
  const actorUserId = req.user!.userId;
  const { type, quantity, reason, reference_type, reference_id } = req.body;

  const inventory = await inventoryService.adjust(
    storeId,
    variantId,
    { type, quantity, reason, reference_type, reference_id },
    actorUserId,
  );

  sendSuccess(res, { inventory }, "Inventory adjusted successfully");
});

/**
 * GET /api/stores/:storeId/inventory/movements
 * Returns a paginated list of all inventory movements for the store.
 */
export const listMovements = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const type = req.query.type as string | undefined;
    const from_date = req.query.from_date
      ? new Date(req.query.from_date as string)
      : undefined;
    const to_date = req.query.to_date
      ? new Date(req.query.to_date as string)
      : undefined;

    const result = await inventoryService.listMovements(storeId, {
      page,
      limit,
      type: type as any,
      from_date,
      to_date,
    });

    sendPaginated(res, result.data, result.meta, "Movements retrieved");
  },
);

/**
 * GET /api/stores/:storeId/inventory/:variantId/movements
 * Returns a paginated list of inventory movements for a specific variant.
 */
export const getVariantMovements = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const variantId = parseInt(req.params.variantId as string, 10);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const result = await inventoryService.getVariantMovements(
      storeId,
      variantId,
      { page, limit },
    );

    sendPaginated(res, result.data, result.meta, "Variant movements retrieved");
  },
);
