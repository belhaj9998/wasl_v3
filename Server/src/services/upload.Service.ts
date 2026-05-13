import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { uploadConfig } from "../configs/upload.config";
import { AppError } from "../utils/AppError";
import type {
  UploadResult,
  ImageUploadOptions,
  UploadedFile,
} from "../types/upload.types";

// ─── Extension-to-mimetype mappings ────────────────────────────────────────────

const IMAGE_EXT_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const FILE_EXT_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".zip": "application/zip",
};

/**
 * UploadService handles file validation, image optimization via sharp,
 * local filesystem storage, and file deletion.
 * Provides a reusable interface for any part of the app that needs file uploads.
 */
export class UploadService {
  /**
   * Uploads and optimizes an image file.
   * Validates mimetype + extension, resizes within configured max dimensions,
   * converts to the specified format (default webp), and compresses at configured quality.
   *
   * @param storeId - The store ID for directory scoping
   * @param file - The uploaded file object (from multer memory storage)
   * @param options - Optional image optimization parameters
   * @returns UploadResult with key, url, originalName, mimetype, and size
   */
  async uploadImage(
    storeId: number,
    file: UploadedFile,
    options?: ImageUploadOptions,
  ): Promise<UploadResult> {
    // Validate mimetype and extension
    this.validateImageType(file);

    // Validate file size
    if (file.size > uploadConfig.maxImageSize) {
      throw AppError.badRequest(
        `Image size exceeds ${Math.round(uploadConfig.maxImageSize / (1024 * 1024))}MB limit`,
      );
    }

    // Optimize image with sharp
    const format = options?.format ?? "webp";
    const quality = options?.quality ?? uploadConfig.imageQuality;
    const maxWidth = options?.maxWidth ?? uploadConfig.imageMaxWidth;
    const maxHeight = options?.maxHeight ?? uploadConfig.imageMaxHeight;

    let optimizedBuffer: Buffer;
    try {
      optimizedBuffer = await sharp(file.buffer)
        .resize({
          width: maxWidth,
          height: maxHeight,
          fit: "inside",
          withoutEnlargement: true,
        })
        .toFormat(format, { quality })
        .toBuffer();
    } catch (err: any) {
      throw AppError.unprocessable(
        `Image processing failed: ${err.message || "corrupted or unsupported image format"}`,
      );
    }

    // Generate unique key and write to disk
    const uniqueName = `${randomUUID()}.${format}`;
    const key = `store-${storeId}/images/${uniqueName}`;
    const fullPath = path.join(uploadConfig.uploadsDir, key);

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, optimizedBuffer);
    } catch (err: any) {
      throw AppError.internal(`Failed to store file: ${err.message}`);
    }

    return {
      key,
      url: `/uploads/${key}`,
      originalName: file.originalname,
      mimetype: `image/${format}`,
      size: optimizedBuffer.length,
    };
  }

  /**
   * Uploads a general file (documents, PDFs, etc.).
   * Validates mimetype + extension against allowed file types,
   * stores at uploads/store-{storeId}/files/{uuid}.{ext}.
   *
   * @param storeId - The store ID for directory scoping
   * @param file - The uploaded file object (from multer memory storage)
   * @returns UploadResult with key, url, originalName, mimetype, and size
   */
  async uploadFile(storeId: number, file: UploadedFile): Promise<UploadResult> {
    // Validate mimetype and extension
    this.validateFileType(file);

    // Validate file size
    if (file.size > uploadConfig.maxFileSize) {
      throw AppError.badRequest(
        `File size exceeds ${Math.round(uploadConfig.maxFileSize / (1024 * 1024))}MB limit`,
      );
    }

    // Generate unique key and write to disk
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const uniqueName = `${randomUUID()}.${ext}`;
    const key = `store-${storeId}/files/${uniqueName}`;
    const fullPath = path.join(uploadConfig.uploadsDir, key);

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.buffer);
    } catch (err: any) {
      throw AppError.internal(`Failed to store file: ${err.message}`);
    }

    return {
      key,
      url: `/uploads/${key}`,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Deletes a file from local storage.
   * Resolves the path, verifies it stays within the uploads directory boundary,
   * verifies the storeId matches the key, and unlinks the file.
   *
   * @param key - The file key (e.g., "store-1/images/uuid.webp")
   * @param storeId - The authenticated user's store ID for ownership verification
   */
  async deleteFile(key: string, storeId: number): Promise<void> {
    // Validate key format: store-{storeId}/{type}/{filename}
    const keyPattern = /^store-(\d+)\/(images|files)\/.+$/;
    const match = key.match(keyPattern);

    if (!match) {
      throw AppError.badRequest(
        "Invalid file key format. Expected: store-{storeId}/{type}/{filename}",
      );
    }

    // Verify storeId matches the key
    const keyStoreId = parseInt(match[1], 10);
    if (keyStoreId !== storeId) {
      throw AppError.forbidden(
        "Store ID mismatch: you cannot delete files from another store",
      );
    }

    // Resolve full path and verify within uploads directory boundary
    const fullPath = path.resolve(uploadConfig.uploadsDir, key);
    const resolvedUploadsDir = path.resolve(uploadConfig.uploadsDir);

    if (!fullPath.startsWith(resolvedUploadsDir + path.sep)) {
      throw AppError.forbidden("Invalid file path");
    }

    // Attempt deletion
    try {
      await fs.unlink(fullPath);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        throw AppError.notFound("File not found");
      }
      throw AppError.internal(`Failed to delete file: ${err.message}`);
    }
  }

  // ─── Private Validation Helpers ──────────────────────────────────────────────

  /**
   * Validates that the file mimetype AND extension are in the allowed image types list.
   * Both must match for the file to be accepted.
   */
  private validateImageType(file: UploadedFile): void {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeAllowed = uploadConfig.allowedImageTypes.includes(file.mimetype);
    const extAllowed =
      ext in IMAGE_EXT_MAP &&
      uploadConfig.allowedImageTypes.includes(IMAGE_EXT_MAP[ext]);

    if (!mimeAllowed || !extAllowed) {
      throw AppError.badRequest(
        "Only image files are allowed (jpg, png, webp, gif)",
      );
    }
  }

  /**
   * Validates that the file mimetype AND extension are in the allowed file types list.
   * Both must match for the file to be accepted.
   */
  private validateFileType(file: UploadedFile): void {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeAllowed = uploadConfig.allowedFileTypes.includes(file.mimetype);
    const extAllowed =
      ext in FILE_EXT_MAP &&
      uploadConfig.allowedFileTypes.includes(FILE_EXT_MAP[ext]);

    if (!mimeAllowed || !extAllowed) {
      throw AppError.badRequest(
        "File type not allowed. Supported types: pdf, doc, docx, xls, xlsx, csv, txt, zip",
      );
    }
  }
}

export const uploadService = new UploadService();
