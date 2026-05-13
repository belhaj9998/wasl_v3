import { PaymentMethod, Order } from "../../../generated/prisma";
import { AppError } from "../../utils/AppError";

/**
 * StorefrontPaymentService handles payment initiation and webhook processing.
 *
 * MVP Implementation (COD Only):
 * - For CASH_ON_DELIVERY: no-op, order remains with payment_status UNPAID
 * - Electronic payment integrations (Stripe, Paymob/tlync) are deferred to a future phase
 * - Webhook handling is stubbed and throws "Not implemented"
 *
 * Requirements: 8.17
 */
export class StorefrontPaymentService {
  /**
   * Initiates payment for an order based on the payment method.
   *
   * For COD (Cash on Delivery): performs a no-op. The Order payment_status
   * remains UNPAID and the checkout transaction completes successfully.
   *
   * For electronic methods (CARD, WALLET, BANK_TRANSFER): deferred to future phase.
   *
   * @param order - The created order
   * @param paymentMethod - The selected payment method
   * @returns Payment result with optional paymentLink or clientSecret
   */
  async initiatePayment(
    order: Order,
    paymentMethod: PaymentMethod,
  ): Promise<{ paymentLink?: string; clientSecret?: string }> {
    if (paymentMethod === "CASH_ON_DELIVERY") {
      // COD: no-op — order stays UNPAID, checkout completes successfully
      return {};
    }

    // Electronic payment methods are deferred to a future phase
    throw AppError.badRequest(
      `Payment method "${paymentMethod}" is not yet supported. Only CASH_ON_DELIVERY is available.`,
    );
  }

  /**
   * Handles incoming payment webhooks from providers (Stripe, Paymob/tlync).
   *
   * Deferred to a future phase. Currently throws "Not implemented".
   *
   * @param _storeId - The store ID
   * @param _provider - The payment provider identifier
   * @param _payload - The raw webhook payload
   */
  async handleWebhook(
    _storeId: number,
    _provider: string,
    _payload: unknown,
  ): Promise<void> {
    throw new Error(
      "Not implemented: Payment webhook handling is deferred to a future phase.",
    );
  }
}

export const storefrontPaymentService = new StorefrontPaymentService();
