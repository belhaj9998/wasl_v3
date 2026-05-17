/**
 * Client-side file validation for image uploads.
 * Validates file size and MIME type before sending to server.
 *
 * Used by ImageUploader component and property tests.
 */

/** Allowed image MIME types */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Maximum file size in bytes (5MB) */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5,242,880 bytes

/** Configuration for file validation */
export interface FileValidationConfig {
  /** Maximum allowed file size in bytes. Defaults to 5MB (5,242,880 bytes). */
  maxSizeBytes?: number;
  /** Allowed MIME types. Defaults to JPEG, PNG, WebP, GIF. */
  allowedTypes?: readonly string[];
}

/** Result of file validation */
export interface FileValidationResult {
  valid: boolean;
  reason?: "size_exceeded" | "invalid_type";
}

/** Default validation configuration */
export const DEFAULT_FILE_VALIDATION_CONFIG: Required<FileValidationConfig> = {
  maxSizeBytes: MAX_FILE_SIZE_BYTES,
  allowedTypes: ALLOWED_IMAGE_TYPES,
};

/**
 * Validates a file for upload on the client side.
 *
 * Checks:
 * 1. File size must be ≤ maxSizeBytes (default 5MB)
 * 2. File MIME type must be one of the allowed types (default: JPEG, PNG, WebP, GIF)
 *
 * Size is checked first — if both size and type are invalid, 'size_exceeded' is returned.
 *
 * @param file - The File object to validate
 * @param config - Optional configuration overrides
 * @returns FileValidationResult with valid=true or valid=false with a specific reason
 */
export function validateFile(
  file: Pick<File, "size" | "type">,
  config?: FileValidationConfig,
): FileValidationResult {
  const { maxSizeBytes, allowedTypes } = {
    ...DEFAULT_FILE_VALIDATION_CONFIG,
    ...config,
  };

  // Check size first
  if (file.size > maxSizeBytes) {
    return { valid: false, reason: "size_exceeded" };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, reason: "invalid_type" };
  }

  return { valid: true };
}
