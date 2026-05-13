import { createHmac, timingSafeEqual } from "crypto";
import prisma from "../configs/prisma";
import { webhookConfig } from "../configs/upload.config";
import { AppError } from "../utils/AppError";
import type {
  PaymentWebhookData,
  ShipmentWebhookData,
} from "../types/upload.types";
import {
  PaymentTransactionStatus,
  PaymentStatus,
  ShipmentStatus,
} from "../../generated/prisma";

// ─── Shipment Status Ordinal (lifecycle ordering) ──────────────────────────────

const SHIPMENT_STATUS_ORDER: Record<ShipmentStatus, number> = {
  DRAFT: 0,
  PENDING: 1,
  CONFIRMED: 2,
  PROCESSING: 3,
  PREPARING: 4,
  SHIPPED: 5,
  IN_TRANSIT: 6,
  OUT_FOR_DELIVERY: 7,
  DELIVERED: 8,
  CANCELED: 9,
  RETURNED: 10,
};

// ─── Provider Shipment Status Mappings ─────────────────────────────────────────

const SHIPMENT_STATUS_MAPS: Record<string, Record<string, ShipmentStatus>> = {
  "local-carrier": {
    pending: ShipmentStatus.PENDING,
    confirmed: ShipmentStatus.CONFIRMED,
    processing: ShipmentStatus.PROCESSING,
    preparing: ShipmentStatus.PREPARING,
    shipped: ShipmentStatus.SHIPPED,
    in_transit: ShipmentStatus.IN_TRANSIT,
    out_for_delivery: ShipmentStatus.OUT_FOR_DELIVERY,
    delivered: ShipmentStatus.DELIVERED,
    canceled: ShipmentStatus.CANCELED,
    returned: ShipmentStatus.RETURNED,
  },
};

/**
 * WebhookService handles incoming payment and shipment webhook processing.
 * Verifies HMAC-SHA256 signatures, maps provider statuses to internal enums,
 * and performs atomic database updates (transaction + order + timeline).
 */
export class WebhookService {
  // ─── Signature Verification ────────────────────────────────────────────────

  /**
   * Verifies an HMAC-SHA256 webhook signature using timing-safe comparison.
   * Returns true if the signature matches, false otherwise.
   *
   * Handles length mismatch by returning false without leaking timing info.
   *
   * @param rawBody - The raw request body as a Buffer
   * @param signature - The hex-encoded signature from the provider header
   * @param secret - The shared secret for this provider
   */
  verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
    const expectedSignature = createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    // Handle length mismatch — timingSafeEqual requires equal-length buffers
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  }

  // ─── Payment Webhook Handler ───────────────────────────────────────────────

  /**
   * Processes a payment webhook from an external provider.
   * Verifies signature, finds the PaymentTransaction, skips duplicates,
   * maps status, and atomically updates transaction + order + timeline.
   *
   * @param provider - The payment provider key (e.g., "tlync")
   * @param headers - The request headers (lowercased keys)
   * @param rawBody - The raw request body as a Buffer
   * @param parsedBody - The validated payment webhook payload
   */
  async handlePaymentWebhook(
    provider: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
    parsedBody: PaymentWebhookData,
  ): Promise<void> {
    // Step 1: Get provider config
    const providerConfig = webhookConfig.paymentProviders[provider];
    if (!providerConfig) {
      throw AppError.notFound(`Unknown payment provider: ${provider}`);
    }

    // Step 2: Verify signature
    const signatureHeader = headers[providerConfig.signatureHeader];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;

    if (!signature) {
      throw AppError.unauthorized("Missing webhook signature");
    }

    if (!this.verifySignature(rawBody, signature, providerConfig.secret)) {
      throw AppError.unauthorized("Invalid webhook signature");
    }

    // Step 3: Find the payment transaction
    const transaction = await prisma.paymentTransaction.findFirst({
      where: { transaction_reference: parsedBody.transaction_reference },
      include: { order: true },
    });

    if (!transaction) {
      throw AppError.notFound("Payment transaction not found");
    }

    // Step 4: Map provider status to internal status
    const statusMap: Record<string, PaymentTransactionStatus> = {
      authorized: PaymentTransactionStatus.AUTHORIZED,
      captured: PaymentTransactionStatus.CAPTURED,
      failed: PaymentTransactionStatus.FAILED,
      refunded: PaymentTransactionStatus.REFUNDED,
    };

    const newStatus = statusMap[parsedBody.status];
    if (!newStatus) {
      throw AppError.badRequest(`Unknown payment status: ${parsedBody.status}`);
    }

    // Step 5: Skip if duplicate status (idempotency)
    if (transaction.status === newStatus) {
      return; // Already processed — skip silently
    }

    // Step 6: Atomic update — transaction + order + timeline
    const orderPaymentStatus = mapToOrderPaymentStatus(newStatus);

    await prisma.$transaction(async (tx) => {
      // Update PaymentTransaction
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: newStatus,
          paid_at:
            newStatus === PaymentTransactionStatus.CAPTURED
              ? parsedBody.paid_at
                ? new Date(parsedBody.paid_at)
                : new Date()
              : parsedBody.paid_at
                ? new Date(parsedBody.paid_at)
                : undefined,
          raw_payload: parsedBody as any,
        },
      });

      // Update Order payment_status
      await tx.order.update({
        where: {
          id_store_id: {
            id: transaction.order_id,
            store_id: transaction.store_id,
          },
        },
        data: { payment_status: orderPaymentStatus },
      });

      // Create OrderTimeline entry
      await tx.orderTimeline.create({
        data: {
          store_id: transaction.store_id,
          order_id: transaction.order_id,
          event: "payment_status_changed",
          note: `Payment ${parsedBody.status} via ${provider}`,
          payload: {
            from_payment_status: transaction.status,
            to_payment_status: newStatus,
            provider,
            transaction_reference: parsedBody.transaction_reference,
          },
        },
      });
    });
  }

  // ─── Shipment Webhook Handler ──────────────────────────────────────────────

  /**
   * Processes a shipment webhook from a shipping carrier.
   * Verifies signature, finds the Shipment, skips same/earlier status,
   * maps status, and atomically updates shipment + order + timeline.
   *
   * @param provider - The shipment provider key (e.g., "local-carrier")
   * @param headers - The request headers (lowercased keys)
   * @param rawBody - The raw request body as a Buffer
   * @param parsedBody - The validated shipment webhook payload
   */
  async handleShipmentWebhook(
    provider: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
    parsedBody: ShipmentWebhookData,
  ): Promise<void> {
    // Step 1: Get provider config
    const providerConfig = webhookConfig.shipmentProviders[provider];
    if (!providerConfig) {
      throw AppError.notFound(`Unknown shipment provider: ${provider}`);
    }

    // Step 2: Verify signature
    const signatureHeader = headers[providerConfig.signatureHeader];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;

    if (!signature) {
      throw AppError.unauthorized("Missing webhook signature");
    }

    if (!this.verifySignature(rawBody, signature, providerConfig.secret)) {
      throw AppError.unauthorized("Invalid webhook signature");
    }

    // Step 3: Find the shipment by tracking_number + provider
    const shipment = await prisma.shipment.findFirst({
      where: {
        tracking_number: parsedBody.tracking_number,
        provider: provider,
      },
      include: { order: true },
    });

    if (!shipment) {
      throw AppError.notFound("Shipment not found");
    }

    // Step 4: Map provider status to internal ShipmentStatus
    const newStatus = mapProviderShipmentStatus(provider, parsedBody.status);

    // Step 5: Skip if same status (idempotency)
    if (shipment.status === newStatus) {
      return; // Already at this status — skip silently
    }

    // Step 6: Skip if earlier lifecycle stage (backward transition)
    const currentOrdinal = SHIPMENT_STATUS_ORDER[shipment.status];
    const newOrdinal = SHIPMENT_STATUS_ORDER[newStatus];

    if (newOrdinal < currentOrdinal) {
      return; // Earlier status — ignore
    }

    // Step 7: Atomic update — shipment + order + timeline
    const previousStatus = shipment.status;

    await prisma.$transaction(async (tx) => {
      // Update Shipment status and timestamps
      await tx.shipment.update({
        where: {
          id_store_id: { id: shipment.id, store_id: shipment.store_id },
        },
        data: {
          status: newStatus,
          shipped_at: parsedBody.shipped_at
            ? new Date(parsedBody.shipped_at)
            : newStatus === ShipmentStatus.SHIPPED && !shipment.shipped_at
              ? new Date()
              : undefined,
          delivered_at: parsedBody.delivered_at
            ? new Date(parsedBody.delivered_at)
            : newStatus === ShipmentStatus.DELIVERED && !shipment.delivered_at
              ? new Date()
              : undefined,
          expected_delivery_at: parsedBody.expected_delivery_at
            ? new Date(parsedBody.expected_delivery_at)
            : undefined,
        },
      });

      // Update Order status to match shipment
      await tx.order.update({
        where: {
          id_store_id: {
            id: shipment.order_id,
            store_id: shipment.store_id,
          },
        },
        data: { status: newStatus },
      });

      // Create OrderTimeline entry
      await tx.orderTimeline.create({
        data: {
          store_id: shipment.store_id,
          order_id: shipment.order_id,
          event: `shipment.${parsedBody.status}`,
          from_status: previousStatus,
          to_status: newStatus,
          note: `Shipment status updated to ${newStatus} via ${provider}`,
          payload: {
            tracking_number: parsedBody.tracking_number,
            provider,
            provider_status: parsedBody.status,
          },
        },
      });
    });
  }
}

// ─── Helper Functions (exported for testing) ─────────────────────────────────

/**
 * Maps a PaymentTransactionStatus to the corresponding Order PaymentStatus.
 *
 * Mapping:
 *   AUTHORIZED → PENDING
 *   CAPTURED   → PAID
 *   FAILED     → FAILED
 *   REFUNDED   → REFUNDED
 *
 * @param transactionStatus - The PaymentTransactionStatus enum value
 * @returns The corresponding PaymentStatus enum value
 */
export function mapToOrderPaymentStatus(
  transactionStatus: PaymentTransactionStatus,
): PaymentStatus {
  const mapping: Record<PaymentTransactionStatus, PaymentStatus> = {
    [PaymentTransactionStatus.PENDING]: PaymentStatus.PENDING,
    [PaymentTransactionStatus.AUTHORIZED]: PaymentStatus.PENDING,
    [PaymentTransactionStatus.CAPTURED]: PaymentStatus.PAID,
    [PaymentTransactionStatus.FAILED]: PaymentStatus.FAILED,
    [PaymentTransactionStatus.CANCELED]: PaymentStatus.FAILED,
    [PaymentTransactionStatus.REFUNDED]: PaymentStatus.REFUNDED,
    [PaymentTransactionStatus.PARTIALLY_REFUNDED]:
      PaymentStatus.PARTIALLY_REFUNDED,
  };

  const result = mapping[transactionStatus];
  if (!result) {
    throw AppError.badRequest(
      `Cannot map transaction status "${transactionStatus}" to order payment status`,
    );
  }

  return result;
}

/**
 * Maps a provider-specific shipment status string to the internal ShipmentStatus enum.
 * Each provider has its own mapping table.
 *
 * @param provider - The provider key (e.g., "local-carrier")
 * @param providerStatus - The status string from the provider's webhook payload
 * @returns The corresponding ShipmentStatus enum value
 * @throws AppError.badRequest if the status cannot be mapped
 */
export function mapProviderShipmentStatus(
  provider: string,
  providerStatus: string,
): ShipmentStatus {
  const providerMap = SHIPMENT_STATUS_MAPS[provider];

  if (!providerMap) {
    // Fallback: try direct mapping for unknown providers
    const normalizedStatus = providerStatus.toUpperCase().replace(/-/g, "_");
    if (normalizedStatus in ShipmentStatus) {
      return normalizedStatus as ShipmentStatus;
    }
    throw AppError.badRequest(
      `Unknown shipment status "${providerStatus}" for provider "${provider}"`,
    );
  }

  const mappedStatus = providerMap[providerStatus.toLowerCase()];
  if (!mappedStatus) {
    throw AppError.badRequest(
      `Unknown shipment status "${providerStatus}" for provider "${provider}"`,
    );
  }

  return mappedStatus;
}

export const webhookService = new WebhookService();
