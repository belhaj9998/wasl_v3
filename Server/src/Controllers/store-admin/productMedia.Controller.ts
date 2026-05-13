import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { productMediaService } from "../../services/store-admin/productMedia.Service";
import { AppRequest } from "../../types";
import "multer";

/**
 * ProductMediaController handles product media management endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * POST /products/:productId/media
 * Uploads a media file for a product. File is provided via multer (req.file).
 */
export const upload = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);
  const file = req.file!;

  const media = await productMediaService.upload(storeId, productId, {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer,
  });

  sendSuccess(res, { media }, "Media uploaded successfully", 201);
});

/**
 * PATCH /products/:productId/media/:id
 * Updates the alt text of a product media item.
 */
export const updateAltText = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const productId = parseInt(req.params.productId as string, 10);
    const mediaId = parseInt(req.params.id as string, 10);
    const { alt_text } = req.body;

    const media = await productMediaService.updateAltText(
      storeId,
      productId,
      mediaId,
      alt_text,
    );

    sendSuccess(res, { media }, "Media alt text updated");
  },
);

/**
 * PATCH /products/:productId/media/reorder
 * Reorders media items for a product.
 */
export const reorder = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);
  const { items } = req.body;

  const media = await productMediaService.reorder(storeId, productId, items);

  sendSuccess(res, { media }, "Media reordered successfully");
});

/**
 * DELETE /products/:productId/media/:id
 * Deletes a product media item and removes the file from storage.
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const productId = parseInt(req.params.productId as string, 10);
  const mediaId = parseInt(req.params.id as string, 10);

  await productMediaService.delete(storeId, productId, mediaId);

  sendSuccess(res, null, "Media deleted successfully");
});
