import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { storefrontCheckoutService } from "../../services/storefront/checkout.Service";
import { storefrontPaymentService } from "../../services/storefront/payment.Service";
import { storefrontCartService } from "../../services/storefront/cart.Service";
import { StorefrontRequest } from "../../types/storefront.types";
import { checkoutSchema } from "../../validators/storefront.validators";

/**
 * StorefrontCheckoutController handles the checkout process and payment webhooks.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 *
 * Requirements: 8.1, 8.18, 8.19, 9.1
 */

/**
 * POST /api/storefront/:domain/checkout
 * Validates checkout input, identifies the cart, executes the atomic checkout
 * transaction, initiates payment if needed, and responds with the order
 * and payment link/secret.
 */
export const createCheckout = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer?.customerId;
    const sessionId = req.sessionId;

    // Validate request body against checkout schema
    const input = checkoutSchema.parse(req.body);

    // Identify the cart for this customer/session
    const cart = await storefrontCartService.getOrCreateCart(
      storeId,
      customerId,
      sessionId,
    );

    // Execute the atomic 9-step checkout transaction
    const { order, paymentTransactionId } =
      await storefrontCheckoutService.executeCheckout(
        storeId,
        cart.id,
        input,
        customerId,
      );

    // Initiate payment if method is not COD
    let paymentResult: { paymentLink?: string; clientSecret?: string } = {};
    if (input.payment_method !== "CASH_ON_DELIVERY") {
      paymentResult = await storefrontPaymentService.initiatePayment(
        order,
        input.payment_method,
      );
    }

    sendSuccess(
      res,
      {
        order,
        payment_link: paymentResult.paymentLink ?? null,
        client_secret: paymentResult.clientSecret ?? null,
      },
      "Checkout completed",
      201,
    );
  },
);

/**
 * POST /api/storefront/:domain/payments/webhook/:provider
 * Handles incoming payment webhooks from providers (Stripe, Paymob/tlync).
 * Extracts the provider from route params, passes the raw body to the
 * payment service for signature verification and processing.
 */
export const paymentWebhook = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const provider = req.params.provider as string;

    // Pass raw body to payment service for signature verification and processing
    await storefrontPaymentService.handleWebhook(storeId, provider, req.body);

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({ received: true });
  },
);
