import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { storefrontCartService } from "../../services/storefront/cart.Service";
import { storefrontCouponService } from "../../services/storefront/coupon.Service";
import { StorefrontRequest } from "../../types/storefront.types";
import {
  addToCartSchema,
  updateCartItemSchema,
  applyCouponSchema,
} from "../../validators/storefront.validators";

/**
 * StorefrontCartController handles shopping cart endpoints for
 * both guest (session-based) and authenticated customers.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/storefront/:domain/cart
 * Returns the current cart for the customer or session.
 * Requirements: 6.1, 6.4
 */
export const getCart = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer?.customerId;
    const sessionId = req.sessionId;

    const cart = await storefrontCartService.getCart(
      storeId,
      customerId,
      sessionId,
    );

    sendSuccess(res, { cart }, "Cart retrieved");
  },
);

/**
 * POST /api/storefront/:domain/cart/items
 * Adds an item to the cart.
 * Requirements: 6.4, 6.9
 */
export const addToCart = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer?.customerId;
    const sessionId = req.sessionId;

    const body = addToCartSchema.parse(req.body);

    const cart = await storefrontCartService.getOrCreateCart(
      storeId,
      customerId,
      sessionId,
    );

    const updatedCart = await storefrontCartService.addToCart(
      storeId,
      cart.id,
      body,
    );

    sendSuccess(res, { cart: updatedCart }, "Item added to cart", 201);
  },
);

/**
 * PATCH /api/storefront/:domain/cart/items/:itemId
 * Updates a cart item quantity.
 * Requirements: 6.11
 */
export const updateCartItem = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer?.customerId;
    const sessionId = req.sessionId;
    const itemId = parseInt(req.params.itemId as string, 10);

    const body = updateCartItemSchema.parse(req.body);

    const cart = await storefrontCartService.getOrCreateCart(
      storeId,
      customerId,
      sessionId,
    );

    const updatedCart = await storefrontCartService.updateCartItem(
      storeId,
      cart.id,
      itemId,
      body.quantity,
    );

    sendSuccess(res, { cart: updatedCart }, "Cart item updated");
  },
);

/**
 * DELETE /api/storefront/:domain/cart/items/:itemId
 * Removes an item from the cart.
 * Requirements: 6.11
 */
export const removeCartItem = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer?.customerId;
    const sessionId = req.sessionId;
    const itemId = parseInt(req.params.itemId as string, 10);

    const cart = await storefrontCartService.getOrCreateCart(
      storeId,
      customerId,
      sessionId,
    );

    const updatedCart = await storefrontCartService.removeCartItem(
      storeId,
      cart.id,
      itemId,
    );

    sendSuccess(res, { cart: updatedCart }, "Cart item removed");
  },
);

/**
 * POST /api/storefront/:domain/cart/apply-coupon
 * Applies a coupon code to the cart.
 * Requirements: 7.10
 */
export const applyCoupon = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer?.customerId;
    const sessionId = req.sessionId;

    const body = applyCouponSchema.parse(req.body);

    const cart = await storefrontCartService.getOrCreateCart(
      storeId,
      customerId,
      sessionId,
    );

    const updatedCart = await storefrontCouponService.applyCoupon(
      storeId,
      cart.id,
      body.code,
      customerId,
    );

    sendSuccess(res, { cart: updatedCart }, "Coupon applied");
  },
);

/**
 * DELETE /api/storefront/:domain/cart/coupon
 * Removes the applied coupon from the cart.
 * Requirements: 7.12
 */
export const removeCoupon = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer?.customerId;
    const sessionId = req.sessionId;

    const cart = await storefrontCartService.getOrCreateCart(
      storeId,
      customerId,
      sessionId,
    );

    const updatedCart = await storefrontCouponService.removeCoupon(
      storeId,
      cart.id,
    );

    sendSuccess(res, { cart: updatedCart }, "Coupon removed");
  },
);
