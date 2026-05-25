import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { productOptionService } from "../../services/store-admin/productOption.Service";
import { AppRequest } from "../../types";

/**
 * ProductOptionController handles product option and option value management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/products/:productId/options
 * Returns all options for a product with their values, ordered by position.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);

  const options = await productOptionService.list(storeId, productId);

  sendSuccess(res, { options }, "Product options retrieved");
});

/**
 * POST /api/stores/:storeId/products/:productId/options
 * Creates a new option for a product.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);
  const { name, type, position } = req.body;

  const option = await productOptionService.create(storeId, productId, {
    name,
    type,
    position,
  });

  sendSuccess(res, { option }, "Product option created", 201);
});

/**
 * PATCH /api/stores/:storeId/products/:productId/options/:optionId
 * Updates an existing product option.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);
  const optionId = parseInt(req.params.optionId as string, 10);
  const { name, type, position } = req.body;

  const option = await productOptionService.update(
    storeId,
    productId,
    optionId,
    { name, type, position },
  );

  sendSuccess(res, { option }, "Product option updated");
});

/**
 * DELETE /api/stores/:storeId/products/:productId/options/:optionId
 * Deletes a product option and its values.
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);
  const optionId = parseInt(req.params.optionId as string, 10);

  await productOptionService.delete(storeId, productId, optionId);

  sendSuccess(res, null, "Product option deleted");
});

/**
 * POST /api/stores/:storeId/products/:productId/options/:optionId/values
 * Adds a new value to a product option.
 */
export const addValue = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);
  const optionId = parseInt(req.params.optionId as string, 10);
  const { value, color_hex, image_url, position } = req.body;

  const option = await productOptionService.addValue(
    storeId,
    productId,
    optionId,
    { value, color_hex, image_url, position },
  );

  sendSuccess(res, { option }, "Option value added", 201);
});

/**
 * PATCH /api/stores/:storeId/products/:productId/options/:optionId/values/:valueId
 * Updates an existing option value.
 */
export const updateValue = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const productId = parseInt(req.params.productId as string, 10);
    const optionId = parseInt(req.params.optionId as string, 10);
    const valueId = parseInt(req.params.valueId as string, 10);
    const { value, color_hex, image_url, position } = req.body;

    const option = await productOptionService.updateValue(
      storeId,
      productId,
      optionId,
      valueId,
      { value, color_hex, image_url, position },
    );

    sendSuccess(res, { option }, "Option value updated");
  },
);

/**
 * DELETE /api/stores/:storeId/products/:productId/options/:optionId/values/:valueId
 * Deletes an option value.
 */
export const deleteValue = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const productId = parseInt(req.params.productId as string, 10);
    const optionId = parseInt(req.params.optionId as string, 10);
    const valueId = parseInt(req.params.valueId as string, 10);

    const option = await productOptionService.deleteValue(
      storeId,
      productId,
      optionId,
      valueId,
    );

    sendSuccess(res, { option }, "Option value deleted");
  },
);
