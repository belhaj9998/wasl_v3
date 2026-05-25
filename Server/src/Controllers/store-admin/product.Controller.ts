import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { productService } from "../../services/store-admin/product.Service";
import { AppRequest } from "../../types";

/**
 * ProductController handles product management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/products
 * Returns a paginated list of products with filtering, sorting, and search.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const {
    page,
    limit,
    status,
    category_id,
    min_price,
    max_price,
    search,
    is_published,
    sort_by,
    sort_order,
  } = req.query;

  const result = await productService.list(storeId, {
    page: page ? parseInt(page as string, 10) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    status: status as
      | "DRAFT"
      | "HIDDEN"
      | "PUBLISHED"
      | "ARCHIVED"
      | undefined,
    category_id: category_id ? parseInt(category_id as string, 10) : undefined,
    min_price: min_price ? parseFloat(min_price as string) : undefined,
    max_price: max_price ? parseFloat(max_price as string) : undefined,
    search: search as string | undefined,
    is_published:
      is_published !== undefined
        ? (is_published as string) === "true"
        : undefined,
    sort_by: sort_by as
      | "name"
      | "price"
      | "created_at"
      | "updated_at"
      | undefined,
    sort_order: sort_order as "asc" | "desc" | undefined,
  });

  sendPaginated(res, result.data, result.meta, "Products retrieved");
});

/**
 * POST /api/stores/:storeId/products
 * Creates a new product in the store.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;

  const product = await productService.create(storeId, req.body);

  sendSuccess(res, { product }, "Product created", 201);
});

/**
 * GET /api/stores/:storeId/products/:id
 * Returns a specific product with all related data.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.id as string, 10);

  const product = await productService.getById(storeId, productId);

  sendSuccess(res, { product }, "Product retrieved");
});

/**
 * PATCH /api/stores/:storeId/products/:id
 * Updates a product's details.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.id as string, 10);

  const product = await productService.update(storeId, productId, req.body);

  sendSuccess(res, { product }, "Product updated");
});

/**
 * DELETE /api/stores/:storeId/products/:id
 * Deletes a product or archives it when historical order records reference it.
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.id as string, 10);

  const result = await productService.delete(storeId, productId);

  sendSuccess(
    res,
    result,
    result.action === "archived" ? "Product archived" : "Product deleted",
  );
});

/**
 * PATCH /api/stores/:storeId/products/:id/status
 * Updates a product's status.
 */
export const updateStatus = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const productId = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    const product = await productService.updateStatus(
      storeId,
      productId,
      status,
    );

    sendSuccess(res, { product }, "Product status updated");
  },
);

/**
 * POST /api/stores/:storeId/products/:id/publish
 * Publishes or unpublishes a product.
 */
export const publish = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.id as string, 10);
  const { publish: publishFlag } = req.body;

  const product = await productService.publish(storeId, productId, publishFlag);

  sendSuccess(
    res,
    { product },
    publishFlag ? "Product published" : "Product unpublished",
  );
});

/**
 * POST /api/stores/:storeId/products/:id/duplicate
 * Duplicates a product with all its related data.
 */
export const duplicate = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const productId = parseInt(req.params.id as string, 10);

    const product = await productService.duplicate(storeId, productId);

    sendSuccess(res, { product }, "Product duplicated", 201);
  },
);
