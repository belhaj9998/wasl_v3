import { Router } from "express";
import { storefrontTenantMiddleware } from "../middlewares/storefrontTenant.Middleware";
import { storefrontOptionalAuth } from "../middlewares/storefrontOptionalAuth.Middleware";
import { requireCustomerAuth } from "../middlewares/storefrontCustomerAuth.Middleware";
import {
  checkoutRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  orderLookupRateLimiter,
} from "../middlewares/storefrontRateLimiter.Middleware";
import {verifyStorefrontSubscriptionAccess} from "../middlewares/storefrontSubscriptionAccess.Middleware"
import * as storeController from "../controllers/storefront/store.Controller";
import * as productController from "../controllers/storefront/product.Controller";
import * as cartController from "../controllers/storefront/cart.Controller";
import * as checkoutController from "../controllers/storefront/checkout.Controller";
import * as orderController from "../controllers/storefront/order.Controller";
import * as customerController from "../controllers/storefront/customer.Controller";

const router = Router({ mergeParams: true });

// Apply storefrontTenantMiddleware to ALL storefront routes
router.use("/:domain", storefrontTenantMiddleware,verifyStorefrontSubscriptionAccess);

// ========== Store Info Routes (public, optionalAuth) ==========

router.get("/:domain", storefrontOptionalAuth, storeController.getStoreInfo);

router.get(
  "/:domain/categories",
  storefrontOptionalAuth,
  storeController.listCategories,
);

router.get(
  "/:domain/categories/:slug",
  storefrontOptionalAuth,
  storeController.getCategoryBySlug,
);

// ========== Product Routes (public, optionalAuth) ==========

router.get(
  "/:domain/products",
  storefrontOptionalAuth,
  productController.listProducts,
);

// IMPORTANT: /products/search MUST be defined BEFORE /products/:slug to avoid route conflicts
router.get(
  "/:domain/products/search",
  storefrontOptionalAuth,
  productController.searchProducts,
);

router.get(
  "/:domain/products/:slug",
  storefrontOptionalAuth,
  productController.getProductBySlug,
);

// ========== Cart Routes (optionalAuth) ==========

router.get("/:domain/cart", storefrontOptionalAuth, cartController.getCart);

router.post(
  "/:domain/cart/items",
  storefrontOptionalAuth,
  cartController.addToCart,
);

router.patch(
  "/:domain/cart/items/:itemId",
  storefrontOptionalAuth,
  cartController.updateCartItem,
);

router.delete(
  "/:domain/cart/items/:itemId",
  storefrontOptionalAuth,
  cartController.removeCartItem,
);

router.post(
  "/:domain/cart/apply-coupon",
  storefrontOptionalAuth,
  cartController.applyCoupon,
);

router.delete(
  "/:domain/cart/coupon",
  storefrontOptionalAuth,
  cartController.removeCoupon,
);

// ========== Checkout Routes ==========

router.post(
  "/:domain/checkout",
  storefrontOptionalAuth,
  checkoutRateLimiter,
  checkoutController.createCheckout,
);

// ========== Order Lookup (public, rate-limited) ==========

router.get(
  "/:domain/orders/lookup",
  storefrontOptionalAuth,
  orderLookupRateLimiter,
  orderController.lookupOrder,
);

// ========== Customer Auth Routes (public, rate-limited) ==========

router.post(
  "/:domain/customers/register",
  registerRateLimiter,
  customerController.register,
);

router.post(
  "/:domain/customers/login",
  loginRateLimiter,
  customerController.login,
);

// ========== Customer Protected Routes (requireCustomerAuth) ==========

router.get(
  "/:domain/customers/me",
  requireCustomerAuth,
  customerController.getProfile,
);

router.patch(
  "/:domain/customers/me",
  requireCustomerAuth,
  customerController.updateProfile,
);

router.get(
  "/:domain/customers/me/orders",
  requireCustomerAuth,
  customerController.getCustomerOrders,
);

router.post(
  "/:domain/customers/me/addresses",
  requireCustomerAuth,
  customerController.addAddress,
);

export default router;
