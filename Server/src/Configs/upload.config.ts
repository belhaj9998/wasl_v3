import path from "path";

// Helper: parse a numeric env var with a fallback default
function parseNumericEnv(
  value: string | undefined,
  defaultValue: number,
): number {
  if (value === undefined || value === "") return defaultValue;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

// Helper: parse a comma-separated list env var with a fallback default
function parseListEnv(value: string | undefined, defaults: string[]): string[] {
  if (value === undefined || value.trim() === "") return defaults;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// --- Upload Configuration ---

export interface UploadConfig {
  maxImageSize: number;
  maxFileSize: number;
  imageQuality: number;
  imageMaxWidth: number;
  imageMaxHeight: number;
  uploadsDir: string;
  allowedImageTypes: string[];
  allowedFileTypes: string[];
}

export const uploadConfig: UploadConfig = {
  maxImageSize: parseNumericEnv(
    process.env.UPLOAD_MAX_IMAGE_SIZE,
    5 * 1024 * 1024,
  ),
  maxFileSize: parseNumericEnv(
    process.env.UPLOAD_MAX_FILE_SIZE,
    10 * 1024 * 1024,
  ),
  imageQuality: parseNumericEnv(process.env.UPLOAD_IMAGE_QUALITY, 80),
  imageMaxWidth: parseNumericEnv(process.env.UPLOAD_MAX_WIDTH, 1920),
  imageMaxHeight: parseNumericEnv(process.env.UPLOAD_MAX_HEIGHT, 1920),
  uploadsDir: process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve("./uploads"),
  allowedImageTypes: parseListEnv(process.env.UPLOAD_ALLOWED_IMAGE_TYPES, [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ]),
  allowedFileTypes: parseListEnv(process.env.UPLOAD_ALLOWED_FILE_TYPES, [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain",
    "application/zip",
  ]),
};

// --- Webhook Configuration ---

export interface WebhookProviderConfig {
  secret: string;
  signatureHeader: string;
}

export interface WebhookConfig {
  paymentProviders: Record<string, WebhookProviderConfig>;
  shipmentProviders: Record<string, WebhookProviderConfig>;
}

export const webhookConfig: WebhookConfig = {
  paymentProviders: {
    tlync: {
      secret: process.env.WEBHOOK_PAYMENT_TLYNC_SECRET || "",
      signatureHeader:
        process.env.WEBHOOK_PAYMENT_TLYNC_HEADER || "x-tlync-signature",
    },
  },
  shipmentProviders: {
    "local-carrier": {
      secret: process.env.WEBHOOK_SHIPMENT_SECRET || "",
      signatureHeader:
        process.env.WEBHOOK_SHIPMENT_HEADER || "x-carrier-signature",
    },
  },
};
