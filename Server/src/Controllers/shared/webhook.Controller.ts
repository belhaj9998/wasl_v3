import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { webhookService } from "../../services/webhook.Service";
import {
  PaymentWebhookDataSchema,
  ShipmentWebhookDataSchema,
} from "../../validators/webhook.validators";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum raw body size for webhook endpoints (1MB) */
const MAX_WEBHOOK_BODY_SIZE = 1 * 1024 * 1024; // 1MB

// ─── Payment Webhook Handler ─────────────────────────────────────────────────

/**
 * POST /api/webhooks/payment/:provider
 * Receives payment status updates from external payment providers.
 * Validates payload with Zod, delegates to Webhook Service, returns 200.
 *
 * Requirements: 6.9, 8.4, 8.7, 9.3
 */
export const handlePaymentWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const { provider } = req.params;

    // Read raw body (set by rawBody middleware)
    const rawBody: Buffer | undefined = (req as any).rawBody;
    if (!rawBody) {
      throw AppError.badRequest("Missing raw body");
    }

    // Enforce 1MB max body size
    if (rawBody.length > MAX_WEBHOOK_BODY_SIZE) {
      throw new AppError("Payload too large", 413);
    }

    // Parse the raw body as JSON
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw AppError.badRequest("Invalid JSON payload");
    }

    // Validate payload with Zod schema
    const validationResult = PaymentWebhookDataSchema.safeParse(parsedBody);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        errors,
      });
    }

    // Delegate to Webhook Service
    await webhookService.handlePaymentWebhook(
      provider as string,
      req.headers as Record<string, string | string[] | undefined>,
      rawBody,
      validationResult.data,
    );

    // Return 200 { received: true }
    res.status(200).json({ received: true });
  },
);

// ─── Shipment Webhook Handler ────────────────────────────────────────────────

/**
 * POST /api/webhooks/shipment/:provider
 * Receives shipment status updates from external shipping carriers.
 * Validates payload with Zod, delegates to Webhook Service, returns 200.
 *
 * Requirements: 7.8, 8.4, 8.7, 9.3
 */
export const handleShipmentWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const { provider } = req.params;

    // Read raw body (set by rawBody middleware)
    const rawBody: Buffer | undefined = (req as any).rawBody;
    if (!rawBody) {
      throw AppError.badRequest("Missing raw body");
    }

    // Enforce 1MB max body size
    if (rawBody.length > MAX_WEBHOOK_BODY_SIZE) {
      throw new AppError("Payload too large", 413);
    }

    // Parse the raw body as JSON
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw AppError.badRequest("Invalid JSON payload");
    }

    // Validate payload with Zod schema
    const validationResult = ShipmentWebhookDataSchema.safeParse(parsedBody);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        errors,
      });
    }

    // Delegate to Webhook Service
    await webhookService.handleShipmentWebhook(
      provider as string,
      req.headers as Record<string, string | string[] | undefined>,
      rawBody,
      validationResult.data,
    );

    // Return 200 { received: true }
    res.status(200).json({ received: true });
  },
);
