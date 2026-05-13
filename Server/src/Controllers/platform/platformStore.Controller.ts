import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import {
  platformStoreService,
  PlatformStoreFilters,
} from "../../services/platform/platformStore.Service";
import { AppRequest, PaginationParams } from "../../types";
import { StoreStatus } from "../../../generated/prisma";

/**
 * PlatformStoreController handles platform-level store management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/platform/stores
 * Returns a paginated list of stores with optional filters (status, search).
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const sortBy = req.query.sortBy as string | undefined;
  const sortOrder = (req.query.sortOrder as "asc" | "desc") || undefined;

  const params: PaginationParams = { page, limit, sortBy, sortOrder };

  const filters: PlatformStoreFilters = {};

  if (req.query.status) {
    filters.status = req.query.status as StoreStatus;
  }

  if (req.query.search) {
    filters.search = req.query.search as string;
  }

  const result = await platformStoreService.list(params, filters);

  sendPaginated(res, result.data, result.meta, "Stores retrieved");
});

/**
 * GET /api/platform/stores/:id
 * Returns a single store by ID with subscription plan name and membership count.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const store = await platformStoreService.getById(id);

  sendSuccess(res, { store }, "Store retrieved");
});

/**
 * PATCH /api/platform/stores/:id/status
 * Updates a store's status after validating the transition.
 */
export const updateStatus = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const id = parseInt(req.params.id as string, 10);
    const { status } = req.body;
    const store = await platformStoreService.updateStatus(id, status);

    sendSuccess(res, { store }, "Store status updated");
  },
);

/**
 * DELETE /api/platform/stores/:id
 * Soft-deletes a store.
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  await platformStoreService.delete(id);

  sendSuccess(res, null, "Store deleted");
});
