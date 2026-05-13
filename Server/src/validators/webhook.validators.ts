import { z } from "zod";

// ─── Payment Webhook Schema ──────────────────────────────────────────────────

/**
 * Zod schema for payment webhook payload validation.
 * Uses .strip() to remove unknown fields from incoming payloads.
 * Validates: Requirements 9.1, 9.3, 9.4
 */
export const PaymentWebhookDataSchema = z
  .object({
    transaction_reference: z.string().min(1).max(255),
    status: z.enum(["authorized", "captured", "failed", "refunded"]),
    amount: z.number().positive(),
    currency: z.string().min(1).max(10),
    paid_at: z.string().datetime({ offset: true }).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strip();

// ─── Shipment Webhook Schema ─────────────────────────────────────────────────

/**
 * Zod schema for shipment webhook payload validation.
 * Uses .strip() to remove unknown fields from incoming payloads.
 * Validates: Requirements 9.2, 9.3, 9.4
 */
export const ShipmentWebhookDataSchema = z
  .object({
    tracking_number: z.string().min(1).max(255),
    status: z.string().min(1).max(50),
    provider: z.string().min(1).max(100),
    shipped_at: z.string().datetime({ offset: true }).optional(),
    delivered_at: z.string().datetime({ offset: true }).optional(),
    expected_delivery_at: z.string().datetime({ offset: true }).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strip();
