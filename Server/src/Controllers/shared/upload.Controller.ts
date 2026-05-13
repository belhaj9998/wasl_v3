import { Response } from "express";
import multer from "multer";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { uploadService } from "../../services/upload.Service";
import { uploadConfig } from "../../configs/upload.config";
import { AppError } from "../../utils/AppError";
import {
  imageUploadOptionsSchema,
  fileKeyParamSchema,
} from "../../validators/upload.validators";
import { AppRequest } from "../../types";

// ─── Multer Configuration ────────────────────────────────────────────────────

/**
 * Multer instance configured with memory storage for buffer access.
 * Separate limits for image and file uploads.
 */
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadConfig.maxImageSize },
});

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadConfig.maxFileSize },
});

// ─── Upload Image Handler ────────────────────────────────────────────────────

/**
 * POST /api/upload/image
 * Uploads and optimizes an image file.
 * Applies multer single file middleware, validates file exists,
 * parses options from body, delegates to Upload Service, returns 201 with UploadResult.
 */
export const uploadImage = [
  imageUpload.single("file"),
  asyncHandler(async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;

    // Validate file exists
    if (!req.file) {
      throw AppError.badRequest("A file is required");
    }

    // Parse optional image upload options from body
    const options = imageUploadOptionsSchema.parse(req.body);

    // Delegate to Upload Service
    const result = await uploadService.uploadImage(
      storeId,
      {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        encoding: req.file.encoding,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer,
      },
      options,
    );

    sendSuccess(res, { file: result }, "Image uploaded successfully", 201);
  }),
];

// ─── Upload File Handler ─────────────────────────────────────────────────────

/**
 * POST /api/upload/file
 * Uploads a general file (documents, PDFs, etc.).
 * Applies multer single file middleware, validates file exists,
 * delegates to Upload Service, returns 201 with UploadResult.
 */
export const uploadFile = [
  fileUpload.single("file"),
  asyncHandler(async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;

    // Validate file exists
    if (!req.file) {
      throw AppError.badRequest("A file is required");
    }

    // Delegate to Upload Service
    const result = await uploadService.uploadFile(storeId, {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer,
    });

    sendSuccess(res, { file: result }, "File uploaded successfully", 201);
  }),
];

// ─── Delete File Handler ─────────────────────────────────────────────────────

/**
 * DELETE /api/upload/:key(*)
 * Deletes a previously uploaded file.
 * Extracts key from route params, delegates to Upload Service, returns 200 with confirmation.
 */
export const deleteFile = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;

    // Extract and validate key from route params
    // The key is a wildcard param (e.g., "store-1/images/uuid.webp")
    const key = req.params.key || req.params[0];
    const { key: validatedKey } = fileKeyParamSchema.parse({ key });

    // Delegate to Upload Service
    await uploadService.deleteFile(validatedKey, storeId);

    sendSuccess(res, null, "File deleted");
  },
);
