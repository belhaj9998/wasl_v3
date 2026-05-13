import { Router } from "express";
import { rawBody } from "../middlewares/rawBody.Middleware";
import * as webhookController from "../controllers/shared/webhook.Controller";

const router = Router();

// Webhook routes do NOT require authentication — they are called by external providers.
// The rawBody middleware preserves the exact bytes for HMAC signature verification.

// POST /payment/:provider — receive payment status updates
router.post(
  "/payment/:provider",
  rawBody,
  webhookController.handlePaymentWebhook,
);

// POST /shipment/:provider — receive shipment status updates
router.post(
  "/shipment/:provider",
  rawBody,
  webhookController.handleShipmentWebhook,
);

export default router;
