import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";

/**
 * Allowed image MIME types for product media uploads.
 */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/**
 * Allowed file extensions for product media uploads.
 */
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

/**
 * Maximum file size in bytes (5MB).
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Base directory for local file storage.
 */
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

/**
 * Represents an uploaded file (compatible with multer's file object).
 */
interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Input for reordering media items.
 */
interface ReorderItem {
  id: number;
  sort_order: number;
}

/**
 * ProductMediaService handles product media management:
 * uploading files, updating alt text, reordering, and deleting media.
 * Uses local file storage (uploads/ directory) with the option to swap to S3 later.
 */
export class ProductMediaService {
  /**
   * Uploads a media file for a product.
   * Validates file type (jpg, png, webp, gif) and size (≤5MB),
   * stores the file locally, and creates a ProductMedia record with sort_order = max+1.
   */
  async upload(storeId: number, productId: number, file: UploadedFile) {
    // Validate product exists in store
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
      select: { id: true },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    // Validate file type
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      !ALLOWED_MIME_TYPES.includes(file.mimetype) &&
      !ALLOWED_EXTENSIONS.includes(ext)
    ) {
      throw AppError.badRequest(
        "Only image files are allowed (jpg, png, webp, gif)",
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw AppError.badRequest("File size exceeds the 5MB limit");
    }

    // Ensure uploads directory exists
    const storeDir = path.join(UPLOADS_DIR, `store-${storeId}`, "products");
    await fs.mkdir(storeDir, { recursive: true });

    // Generate unique filename
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = path.join(storeDir, uniqueName);

    // Write file to disk
    await fs.writeFile(filePath, file.buffer);

    // Generate URL path (relative to uploads root)
    const url = `/uploads/store-${storeId}/products/${uniqueName}`;

    // Determine sort_order: max+1 among product's existing media
    const maxSortOrder = await prisma.productMedia.aggregate({
      where: { product_id: productId, store_id: storeId },
      _max: { sort_order: true },
    });
    const sortOrder = (maxSortOrder._max.sort_order ?? -1) + 1;

    // Create ProductMedia record
    const media = await prisma.productMedia.create({
      data: {
        store_id: storeId,
        product_id: productId,
        url,
        sort_order: sortOrder,
      },
    });

    return media;
  }

  /**
   * Updates the alt_text field of a media item.
   * Returns 404 if the media item is not found for the product in the store.
   */
  async updateAltText(
    storeId: number,
    productId: number,
    mediaId: number,
    altText: string | null,
  ) {
    // Validate media exists for this product in this store
    const media = await prisma.productMedia.findFirst({
      where: { id: mediaId, product_id: productId, store_id: storeId },
    });

    if (!media) {
      throw AppError.notFound("Product media not found");
    }

    // Update alt_text
    const updated = await prisma.productMedia.update({
      where: { id_store_id: { id: mediaId, store_id: storeId } },
      data: { alt_text: altText },
    });

    return updated;
  }

  /**
   * Reorders media items for a product in an atomic transaction.
   * Validates all IDs belong to the product in the store.
   */
  async reorder(storeId: number, productId: number, items: ReorderItem[]) {
    // Validate product exists in store
    const product = await prisma.product.findFirst({
      where: { id: productId, store_id: storeId },
      select: { id: true },
    });

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    // Validate all media IDs belong to this product in this store
    const mediaIds = items.map((item) => item.id);
    const existingMedia = await prisma.productMedia.findMany({
      where: {
        id: { in: mediaIds },
        product_id: productId,
        store_id: storeId,
      },
      select: { id: true },
    });

    const existingIds = new Set(existingMedia.map((m) => m.id));
    const invalidIds = mediaIds.filter((id) => !existingIds.has(id));

    if (invalidIds.length > 0) {
      throw AppError.badRequest(
        `Media items not found for this product: ${invalidIds.join(", ")}`,
      );
    }

    // Atomic transaction to update sort_order for each media item
    await prisma.$transaction(
      items.map((item) =>
        prisma.productMedia.update({
          where: { id_store_id: { id: item.id, store_id: storeId } },
          data: { sort_order: item.sort_order },
        }),
      ),
    );

    // Return updated media list sorted by sort_order
    const updatedMedia = await prisma.productMedia.findMany({
      where: { product_id: productId, store_id: storeId },
      orderBy: { sort_order: "asc" },
    });

    return updatedMedia;
  }

  /**
   * Deletes a media item and removes the file from storage.
   * Returns 404 if the media item is not found for the product in the store.
   */
  async delete(storeId: number, productId: number, mediaId: number) {
    // Validate media exists for this product in this store
    const media = await prisma.productMedia.findFirst({
      where: { id: mediaId, product_id: productId, store_id: storeId },
    });

    if (!media) {
      throw AppError.notFound("Product media not found");
    }

    // Delete the database record
    await prisma.productMedia.delete({
      where: { id_store_id: { id: mediaId, store_id: storeId } },
    });

    // Remove file from storage (best-effort, don't fail if file is missing)
    try {
      const filePath = path.join(process.cwd(), media.url);
      await fs.unlink(filePath);
    } catch (err: any) {
      // File may already be deleted or path may be external (S3 URL)
      // Log but don't throw — the DB record is already deleted
      if (err.code !== "ENOENT") {
        console.error(
          `Warning: Failed to delete media file ${media.url}:`,
          err.message,
        );
      }
    }
  }
}

export const productMediaService = new ProductMediaService();
