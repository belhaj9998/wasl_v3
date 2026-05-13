// ─── Upload System Types ───

export interface UploadResult {
  key: string; // Unique file key (e.g., "store-1/images/uuid.webp")
  url: string; // Relative URL path (e.g., "/uploads/store-1/images/uuid.webp")
  originalName: string; // Original filename from client
  mimetype: string; // Final mimetype after optimization
  size: number; // Final file size in bytes
}

export interface ImageUploadOptions {
  maxWidth?: number; // Max width for resize (default: 1920)
  maxHeight?: number; // Max height for resize (default: 1920)
  quality?: number; // Compression quality 1-100 (default: 80)
  format?: "webp" | "jpeg" | "png"; // Output format (default: "webp")
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

// ─── Webhook System Types ───

export interface PaymentWebhookData {
  transaction_reference: string;
  status: "authorized" | "captured" | "failed" | "refunded";
  amount: number;
  currency: string;
  paid_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ShipmentWebhookData {
  tracking_number: string;
  status: string;
  provider: string;
  shipped_at?: string;
  delivered_at?: string;
  expected_delivery_at?: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookProviderConfig {
  secret: string;
  signatureHeader: string;
}
