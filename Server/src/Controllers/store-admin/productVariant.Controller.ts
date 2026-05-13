import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { productVariantService } from "../../services/store-admin/productVariant.Service";
import { AppRequest } from "../../types";

/**
 * ProductVariantController handles product variant management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/products/:productId/variants
 * Returns all variants for a product with option values and inventory.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);

  const variants = await productVariantService.list(storeId, productId);

  sendSuccess(res, { variants }, "Variants retrieved");
});

/**
 * POST /api/stores/:storeId/products/:productId/variants
 * Creates a new variant for a product.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);

  const variant = await productVariantService.create(
    storeId,
    productId,
    req.body,
  );

  sendSuccess(res, { variant }, "Variant created", 201);
});

/**
 * GET /api/stores/:storeId/variants/:variantId
 * Returns a single variant by ID with option values and inventory.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const variantId = parseInt(req.params.variantId as string, 10);

  const variant = await productVariantService.getById(storeId, variantId);

  sendSuccess(res, { variant }, "Variant retrieved");
});

/**
 * PATCH /api/stores/:storeId/variants/:variantId
 * Updates a variant's fields (price, SKU, barcode, weight, etc.).
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const variantId = parseInt(req.params.variantId as string, 10);

  const variant = await productVariantService.update(
    storeId,
    variantId,
    req.body,
  );

  sendSuccess(res, { variant }, "Variant updated");
});

/**
 * DELETE /api/stores/:storeId/variants/:variantId
 * Deletes a variant. Cannot delete the last variant of a product.
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const variantId = parseInt(req.params.variantId as string, 10);

  await productVariantService.delete(storeId, variantId);

  sendSuccess(res, null, "Variant deleted");
});

/**
 * PATCH /api/stores/:storeId/variants/:variantId/set-default
 * Sets a variant as the default for its product.
 */
export const setDefault = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const variantId = parseInt(req.params.variantId as string, 10);

    const variant = await productVariantService.setDefault(storeId, variantId);

    sendSuccess(res, { variant }, "Default variant updated");
  },
);

/**
 * POST /api/stores/:storeId/products/:productId/variants/generate
 * Generates all variant combinations from product options (cartesian product).
 */
export const generate = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);

  const result = await productVariantService.generateVariants(
    storeId,
    productId,
  );

  sendSuccess(res, result, "Variants generated", 201);
});
