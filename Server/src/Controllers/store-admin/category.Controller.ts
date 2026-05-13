import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { categoryService } from "../../services/store-admin/category.Service";
import { AppRequest } from "../../types";

/**
 * CategoryController handles category management endpoints for store admins.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/categories
 * Returns categories as a nested tree (default) or flat paginated list.
 * Query params: flat, page, limit, parent_id, is_active
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const flat = req.query.flat === "true";
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
  const parent_id = req.query.parent_id
    ? parseInt(req.query.parent_id as string, 10)
    : undefined;
  const is_active =
    req.query.is_active !== undefined
      ? req.query.is_active === "true"
      : undefined;

  const result = await categoryService.list(storeId, {
    flat,
    page,
    limit,
    parent_id,
    is_active,
  });

  if (flat && "meta" in result) {
    sendPaginated(res, result.data, result.meta, "Categories retrieved");
  } else {
    sendSuccess(res, { categories: result }, "Categories retrieved");
  }
});

/**
 * POST /api/stores/:storeId/categories
 * Creates a new category with auto-generated slug.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const { name, parent_id, image_url, is_active } = req.body;

  const category = await categoryService.create(storeId, {
    name,
    parent_id,
    image_url,
    is_active,
  });

  sendSuccess(res, { category }, "Category created", 201);
});

/**
 * GET /api/stores/:storeId/categories/:id
 * Returns a single category by ID.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const id = parseInt(req.params.id as string, 10);

  const category = await categoryService.getById(storeId, id);

  sendSuccess(res, { category }, "Category retrieved");
});

/**
 * PATCH /api/stores/:storeId/categories/:id
 * Updates a category's name, parent, image, or active status.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const id = parseInt(req.params.id as string, 10);

  const category = await categoryService.update(storeId, id, req.body);

  sendSuccess(res, { category }, "Category updated");
});

/**
 * DELETE /api/stores/:storeId/categories/:id
 * Deletes a category and reassigns its children.
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const id = parseInt(req.params.id as string, 10);

  await categoryService.delete(storeId, id);

  sendSuccess(res, null, "Category deleted");
});

/**
 * PATCH /api/stores/:storeId/categories/reorder
 * Bulk reorders categories by updating sort_order and optional parent_id.
 */
export const reorder = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const { items } = req.body;

  await categoryService.reorder(storeId, items);

  sendSuccess(res, null, "Categories reordered");
});
