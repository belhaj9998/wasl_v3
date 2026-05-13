# Implementation Plan: Phase 5 — Storefront (Customer-Facing) APIs

## Overview

This plan implements the complete customer-facing storefront layer for Wasl SaaS: domain-based store resolution middleware, optional and required customer authentication, public store/product browsing, shopping cart management (guest + authenticated), coupon application, atomic 9-step checkout transaction, payment integration (tlync + COD), payment webhook handling, guest order lookup, customer registration/login, customer account management, cart session merging on login, rate limiting, and input validation. The implementation follows the established controller → service → Prisma pattern with Zod validation, building incrementally from middlewares and validators through services, controllers, and route wiring.

## Tasks

- [x] 1. Create storefront types and validation schemas
  - [x] 1.1 Create storefront types (`src/types/storefront.types.ts`)
    - Define `StorefrontRequest` interface extending Express Request with `store`, `customer`, and `sessionId` fields
    - Define `CartIdentifier` interface with storeId, customerId?, sessionId?
    - Define `CreateCheckoutInput` interface with customer info, shipping address, payment method, notes
    - Define `CustomerRegistrationInput` interface
    - Define `AddToCartInput` interface
    - Define `CustomerJwtPayload` interface with customerId, email, storeId
    - _Requirements: 1.1, 1.2, 2.1, 3.3, 6.1, 6.2, 8.5, 11.5, 11.9_

  - [x] 1.2 Create storefront validation schemas (`src/validators/storefront.validators.ts`)
    - Implement `addToCartSchema` — product_id (positive int), variant_id (positive int), quantity (positive int, max 9999)
    - Implement `updateCartItemSchema` — quantity (int >= 0, max 9999)
    - Implement `applyCouponSchema` — code (string, min 2, max 50)
    - Implement `checkoutSchema` — customer_name (min 2, max 100), customer_phone (regex `^\+218[0-9]{9}$`), customer_email (optional valid email), shipping_address (full_name, city, street_line_1 required), payment_method enum, notes_from_customer optional
    - Implement `customerRegisterSchema` — first_name (min 1, max 100), email (valid, max 255), phone (8-20 chars), password (min 8, max 128)
    - Implement `customerLoginSchema` — email (valid), password (string)
    - Implement `updateProfileSchema` — first_name, last_name, email, phone, gender, birth_date, accepts_marketing (all optional with validation)
    - Implement `addAddressSchema` — full_name (1-200), city (1-100), street_line_1 (1-300), type, phone, region, street_line_2, postal_code, google_maps_url, is_default (all optional except required fields)
    - Implement `orderLookupSchema` — order_number (string), verification_value (string)
    - Implement `productListQuerySchema` — page, limit (max 100), category_id, min_price, max_price, sort_by, sort_order
    - Implement `productSearchQuerySchema` — query (1-200 chars), page, limit
    - Implement `customerOrdersQuerySchema` — page, limit (max 100)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 5.9, 6.13, 11.10_

- [x] 2. Implement storefront middlewares
  - [x] 2.1 Create storefrontTenantMiddleware (`src/middlewares/storefrontTenant.Middleware.ts`)
    - Extract `:domain` from route params
    - Query store by `domain` or `custom_domain` (case-insensitive) where `deleted_at` is null
    - Return 404 if store not found or deleted
    - Return 403 if store status is DRAFT, SUSPENDED, or ARCHIVED
    - Attach `req.store` with id, name, domain, currency_code, locale, status
    - Read `storefront_session` cookie; if absent, generate UUID v4 and set cookie (HttpOnly, Secure, SameSite=Strict, Max-Age 7 days)
    - Attach `req.sessionId` to request
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 15.5, 15.6_

  - [x] 2.2 Create optionalAuth middleware (`src/middlewares/storefrontOptionalAuth.Middleware.ts`)
    - Check Authorization header for Bearer token
    - If present: verify customer JWT (separate signing key), decode payload, attach `req.customer` with customerId and email
    - If absent or invalid/expired: set `req.customer = undefined`, continue without error
    - Never return error response or block request flow
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.3 Create requireCustomerAuth middleware (`src/middlewares/storefrontCustomerAuth.Middleware.ts`)
    - Verify Bearer token is present; return 401 if missing
    - Decode and validate customer JWT; return 401 if invalid/expired
    - Verify store_id in token matches resolved store from domain; return 401 if mismatch
    - Check customer status is not ARCHIVED; return 401 if inactive
    - Attach `req.customer` with id, email, store_id
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.4 Create storefront rate limiters (`src/middlewares/storefrontRateLimiter.Middleware.ts`)
    - Create `checkoutRateLimiter` — 5 requests per minute per IP
    - Create `loginRateLimiter` — 5 requests per minute per IP
    - Create `registerRateLimiter` — 3 requests per minute per IP
    - Create `orderLookupRateLimiter` — 10 requests per 15 minutes per IP
    - All return 429 with RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset headers
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 10.4_

  - [x]* 2.5 Write property test for optionalAuth never blocks (Property 14)
    - **Property 14: Optional Auth Never Blocks**
    - For any request (no token, invalid token, expired token), the middleware proceeds without returning an error
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 3. Implement StorefrontStoreService and StorefrontProductService
  - [x] 3.1 Create StorefrontStoreService (`src/services/storefront/store.Service.ts`)
    - Implement `getStoreInfo(storeId)` — return public profile: name, domain, logo, favicon, description, currency_code, locale, social links, support contact, SEO metadata
    - Implement `listCategories(storeId)` — return active categories as nested tree ordered by sort_order
    - Implement `getCategoryBySlug(storeId, slug, page, limit)` — return category with published products, paginated (default 20, max 100); 404 if not found or inactive
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.2 Create StorefrontProductService (`src/services/storefront/product.Service.ts`)
    - Implement `listProducts(storeId, params)` — return published + active products, paginated (default page 1, limit 20, max 100), sorted by created_at desc by default
    - Support filters: category_id, min_price, max_price
    - Support sorting: name, price, created_at with asc/desc
    - Return pagination metadata (total, page, limit, totalPages)
    - Implement `getProductBySlug(storeId, slug)` — return product with active variants, option values, media (sorted by sort_order), available_quantity per variant; 404 if not found/not published/not active
    - Implement `searchProducts(storeId, query, page, limit)` — case-insensitive partial match on name, description, variant SKU; paginated results
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [x]* 3.3 Write property test for published products only (Property 2)
    - **Property 2: Published Products Only**
    - For any product listing or search result, all returned products have is_published=true and status=ACTIVE
    - **Validates: Requirements 5.1, 4.3**

- [x] 4. Implement StorefrontCartService
  - [x] 4.1 Create StorefrontCartService (`src/services/storefront/cart.Service.ts`)
    - Implement `getOrCreateCart(storeId, customerId?, sessionId?)` — find existing OPEN cart or create new one; enforce one OPEN cart per identifier per store
    - Implement `getCart(storeId, customerId?, sessionId?)` — return cart with items or empty cart
    - Implement `addToCart(storeId, cartId, input: AddToCartInput)` — validate product published + active, variant active + belongs to product, check inventory if track_inventory=true, upsert cart item (sum quantities if exists), set unit_price from variant.price ?? product.base_price, calculate total_price, recalculate cart totals
    - Implement `updateCartItem(storeId, cartId, itemId, quantity)` — if quantity=0 remove item, otherwise update quantity with inventory check, recalculate totals; enforce max 9999 per line item
    - Implement `removeCartItem(storeId, cartId, itemId)` — delete item, recalculate totals
    - Implement `recalculateCartTotals(tx, storeId, cartId)` — subtotal = sum(unit_price * quantity), grand_total = subtotal - discount_total + shipping_total
    - Enforce max 100 distinct line items per cart
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13_

  - [x]* 4.2 Write property test for cart total invariant (Property 3)
    - **Property 3: Cart Total Invariant**
    - For any cart after any mutation, subtotal = sum(item.unit_price * item.quantity) and each item.total_price = unit_price * quantity
    - **Validates: Requirements 6.7, 6.8**

  - [x]* 4.3 Write property test for one open cart per identifier (Property 13)
    - **Property 13: One Open Cart Per Identifier**
    - For any customer_id or session_id within a store, at most one cart with status OPEN exists
    - **Validates: Requirement 6.10**

- [x] 5. Implement StorefrontCouponService
  - [x] 5.1 Create StorefrontCouponService (`src/services/storefront/coupon.Service.ts`)
    - Implement `applyCoupon(storeId, cartId, code, customerId?)` — validate coupon (exists, active, date range, usage limits, minimum order amount), calculate discount (PERCENTAGE capped at max_discount_amount, FIXED capped at subtotal), remove existing coupon if any, create CouponUsage, update cart discount_total and grand_total
    - Implement `removeCoupon(storeId, cartId)` — delete CouponUsage, set discount_total=0, recalculate grand_total
    - Implement `validateCouponForCart(storeId, code, cartSubtotal, customerId?)` — full validation chain: exists (case-insensitive), is_active, date range (null = no bound), usage_limit, usage_limit_per_customer (skip for guests), minimum_order_amount; return discount amount or error
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13_

  - [x]* 5.2 Write property test for coupon discount calculation (Property 7)
    - **Property 7: Coupon Discount Calculation**
    - For PERCENTAGE coupon: discount = subtotal * (value/100) capped at maximum_discount_amount
    - For FIXED coupon: discount = min(coupon.value, subtotal)
    - Discount never exceeds subtotal
    - **Validates: Requirements 7.7, 7.8**

  - [x]* 5.3 Write property test for coupon validation rules (Property 8)
    - **Property 8: Coupon Validation Rules**
    - Coupon rejected if: inactive, outside date range, usage_limit reached, per-customer limit reached, minimum_order_amount not met
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6**

- [x] 6. Checkpoint — Verify middlewares, validators, store/product/cart/coupon services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement StorefrontCheckoutService
  - [x] 7.1 Create StorefrontCheckoutService (`src/services/storefront/checkout.Service.ts`)
    - Implement `executeCheckout(storeId, cartId, input, customerId?)` — atomic 9-step Prisma transaction:
      - Step 1: Validate cart (OPEN, has items), validate all items (product active+published, variant active, inventory sufficient)
      - Step 2: Create Order (status PENDING, payment_status UNPAID) + OrderItems with snapshot data (product_name, variant_title, sku, unit_price, line_total)
      - Step 3: Deduct inventory (decrement available_quantity, increment reserved_quantity) + create InventoryMovement (type RESERVED, negative quantity_change)
      - Step 4: Create OrderAddress (SHIPPING) from input
      - Step 5: Link CouponUsage to order (if coupon applied, re-validate at checkout time)
      - Step 6: Create OrderTimeline (event ORDER_PLACED, to_status PENDING)
      - Step 7: Update cart status to CONVERTED
      - Step 8: Create PaymentTransaction (method, status PENDING, amount, currency)
      - Step 9: Final order totals recalculation (subtotal - discount_total + shipping_total)
    - Generate order_number: `ORD-{storeId padded 4}-{sequential padded 6}`
    - If any step fails, entire transaction rolls back
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 8.15, 8.16, 8.17_

  - [x]* 7.2 Write property test for checkout atomicity (Property 4)
    - **Property 4: Checkout Atomicity**
    - Either all 9 steps complete or none persist — no partial order state in database
    - **Validates: Requirements 8.3, 8.4**

  - [x]* 7.3 Write property test for price snapshot integrity (Property 5)
    - **Property 5: Price Snapshot Integrity**
    - OrderItem product_name, variant_title, sku, unit_price reflect values at order placement time
    - **Validates: Requirement 8.6**

  - [x]* 7.4 Write property test for inventory balance after checkout (Property 6)
    - **Property 6: Inventory Balance After Checkout**
    - After checkout: available_quantity decreases by ordered quantity, reserved_quantity increases by same amount
    - total_quantity = available_quantity + reserved_quantity holds
    - **Validates: Requirements 8.7, 6.6**

- [x] 8. Implement StorefrontPaymentService (COD Only MVP)
  - [x] 8.1 Create StorefrontPaymentService (`src/services/storefront/payment.Service.ts`)
    - Implement `initiatePayment(order, paymentMethod)` — for COD (Cash on Delivery): perform a no-op. Leave the Order payment_status as UNPAID and allow the checkout transaction to complete successfully.
    - Note: Electronic payment integrations and Webhook handling (handleWebhook) are deferred to a future phase.
    - _Requirements: 8.17_

  - [x]* 8.2 Write property test for payment webhook idempotency (Property 10)
    - **Property 10: Payment Webhook Idempotency**
    - For any webhook received for a PaymentTransaction already CAPTURED, system returns 200 without modifying data
    - **Validates: Requirement 9.7**

- [x] 9. Implement StorefrontCustomerAuthService
  - [x] 9.1 Create StorefrontCustomerAuthService (`src/services/storefront/customerAuth.Service.ts`)
    - Implement `register(storeId, input)` — validate uniqueness (email, phone per store), hash password with bcrypt, create Customer (status ACTIVE), issue JWT (7-day expiry, separate signing key, includes store_id + customer_id)
    - Implement `login(storeId, email, password)` — find customer by email+store_id, verify password hash, return 401 generic error if invalid, issue JWT
    - Use separate JWT signing key from admin User JWTs (e.g., `CUSTOMER_JWT_SECRET` env var)
    - Include store_id and customerId in JWT payload
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10_

  - [x]* 9.2 Write property test for store-scoped customer uniqueness (Property 11)
    - **Property 11: Store-Scoped Customer Uniqueness**
    - Same email/phone may exist in different stores but not duplicated within same store
    - **Validates: Requirements 11.2, 11.3**

- [x] 10. Implement StorefrontCartMergeService
  - [x] 10.1 Create cart merge logic in StorefrontCartService (`src/services/storefront/cart.Service.ts`)
    - Implement `mergeSessionCartOnLogin(storeId, customerId, sessionId)` — called after successful login
    - If session cart exists (OPEN) and customer cart exists (OPEN): merge items (for duplicate variants, take max quantity capped at 9999), skip inactive/out-of-stock variants, recalculate totals, set session cart to ABANDONED
    - If session cart exists but no customer cart: assign session cart to customer (set customer_id, clear session_id)
    - If no session cart: no-op
    - Complete within 5 seconds
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [x]* 10.2 Write property test for cart merge correctness (Property 12)
    - **Property 12: Cart Merge Correctness**
    - For duplicate variants in both carts, resulting quantity = max of the two, capped at 9999
    - **Validates: Requirements 16.1, 16.2**

- [x] 11. Checkpoint — Verify checkout, payment, customer auth, and cart merge services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement storefront controllers
  - [x] 12.1 Create StorefrontStoreController (`src/controllers/storefront/store.Controller.ts`)
    - Implement `getStoreInfo` — call StorefrontStoreService.getStoreInfo, respond with sendSuccess
    - Implement `listCategories` — call service, respond with sendSuccess
    - Implement `getCategoryBySlug` — extract slug and pagination params, call service, respond with sendPaginated
    - Wrap all handlers with asyncHandler
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 12.2 Create StorefrontProductController (`src/controllers/storefront/product.Controller.ts`)
    - Implement `listProducts` — extract query params (page, limit, category_id, min_price, max_price, sort_by, sort_order), call service, respond with sendPaginated
    - Implement `getProductBySlug` — extract slug, call service, respond with sendSuccess
    - Implement `searchProducts` — extract query and pagination, call service, respond with sendPaginated
    - Wrap all handlers with asyncHandler
    - _Requirements: 5.1, 5.5, 5.7_

  - [x] 12.3 Create StorefrontCartController (`src/controllers/storefront/cart.Controller.ts`)
    - Implement `getCart` — identify by customerId or sessionId, call service, respond with sendSuccess
    - Implement `addToCart` — validate body, call service, respond with sendSuccess (201)
    - Implement `updateCartItem` — extract itemId, validate body, call service, respond with sendSuccess
    - Implement `removeCartItem` — extract itemId, call service, respond with sendSuccess
    - Implement `applyCoupon` — validate body, call coupon service, respond with sendSuccess
    - Implement `removeCoupon` — call coupon service, respond with sendSuccess
    - Wrap all handlers with asyncHandler
    - _Requirements: 6.1, 6.4, 6.9, 6.11, 7.10, 7.12_

  - [x] 12.4 Create StorefrontCheckoutController (`src/controllers/storefront/checkout.Controller.ts`)
    - Implement `createCheckout` — validate body, identify cart, call checkout service, initiate payment if needed, respond with order + payment link/secret
    - Implement `paymentWebhook` — extract provider from params, call payment service handleWebhook, respond with 200
    - Wrap all handlers with asyncHandler
    - _Requirements: 8.1, 8.18, 8.19, 9.1_

  - [x] 12.5 Create StorefrontOrderController (`src/controllers/storefront/order.Controller.ts`)
    - Implement `lookupOrder` — validate query params (order_number + verification_value), call service, respond with sendSuccess; return generic 404 on mismatch
    - Wrap with asyncHandler
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 12.6 Create StorefrontCustomerController (`src/controllers/storefront/customer.Controller.ts`)
    - Implement `register` — validate body, call auth service, trigger cart merge, respond with customer + token (201)
    - Implement `login` — validate body, call auth service, trigger cart merge, respond with customer + token
    - Implement `getProfile` — call service, respond with sendSuccess
    - Implement `updateProfile` — validate body, call service, respond with sendSuccess
    - Implement `getCustomerOrders` — extract pagination, call service, respond with sendPaginated
    - Implement `addAddress` — validate body, call service, respond with sendSuccess (201)
    - Wrap all handlers with asyncHandler
    - _Requirements: 11.1, 11.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [x] 13. Checkpoint — Verify all controllers compile correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement storefront routes and wire into main router
  - [x] 14.1 Create storefront routes file (`src/routes/storefront.routes.ts`)
    - Apply `storefrontTenantMiddleware` to all routes via `router.use()`
    - Apply `optionalAuth` to public/mixed routes
    - Store info routes: GET `/:domain`, GET `/:domain/categories`, GET `/:domain/categories/:slug`
    - Product routes: GET `/:domain/products`, GET `/:domain/products/search`, GET `/:domain/products/:slug`
    - Cart routes (optionalAuth): GET `/:domain/cart`, POST `/:domain/cart/items`, PATCH `/:domain/cart/items/:itemId`, DELETE `/:domain/cart/items/:itemId`, POST `/:domain/cart/apply-coupon`, DELETE `/:domain/cart/coupon`
    - Checkout routes: POST `/:domain/checkout` (checkoutRateLimiter)
    - Order lookup: GET `/:domain/orders/lookup` (orderLookupRateLimiter)
    - Customer auth: POST `/:domain/customers/register`, POST `/:domain/customers/login`
    - Customer protected (requireCustomerAuth): GET `/:domain/customers/me`, PATCH `/:domain/customers/me`, GET `/:domain/customers/me/orders`, POST `/:domain/customers/me/addresses`

  - [x] 14.2 Wire storefront routes into main router (`src/routes/index.ts`)
    - Import `storefrontRoutes` from `./storefront.routes`
    - Mount at `/api/storefront` before the 404 catch-all
    - Ensure storefront routes are separate from admin routes
    - _Requirements: 13.1, 13.2_

- [x] 15. Implement tenant data isolation verification
  - [x] 15.1 Verify all storefront services include store_id in queries
    - Audit all Phase 5 service methods to confirm store_id is included in every Prisma where clause
    - Ensure no query can return or modify data from another store
    - Verify StorefrontStoreService, StorefrontProductService, StorefrontCartService, StorefrontCouponService, StorefrontCheckoutService, StorefrontPaymentService, StorefrontCustomerAuthService
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [x]* 15.2 Write property test for tenant data isolation (Property 1)
    - **Property 1: Tenant Data Isolation**
    - For any storefront request, all returned data belongs exclusively to the resolved store_id
    - Customer JWT with mismatched store_id is rejected
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5**

  - [x]* 15.3 Write property test for order lookup security (Property 9)
    - **Property 9: Order Lookup Security**
    - Order data returned only when BOTH order_number AND verification value match
    - Partial/mismatched returns 404
    - **Validates: Requirement 10.1**

- [x] 16. Install new dependencies and add environment variables
  - [x] 16.1 Install uuid package and setup environment variables
    - Run `npm install uuid` and `npm install -D @types/uuid`
    - Add `CUSTOMER_JWT_SECRET` to environment config (`src/configs/App.config.ts`) to be used for signing customer JWTs independently from admin JWTs.
    - _Requirements: 11.8_
- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript with Express 5 + Prisma 7 + PostgreSQL + Zod 4
- Existing infrastructure (asyncHandler, AppError, sendSuccess/sendPaginated, validateBody/validateQuery) is reused
- The `src/controllers/storefront/` directory already exists (empty)
- A new `src/services/storefront/` directory will be created for storefront services
- Customer JWT uses a separate signing key (`CUSTOMER_JWT_SECRET`) from admin User JWT
- The storefront routes are mounted at `/api/storefront/:domain/` — separate from admin routes at `/api/stores/:storeId/`
- Session cookies use `storefront_session` name with HttpOnly, Secure, SameSite=Strict
- The checkout transaction reuses the existing `orderNumberGenerator.ts` utility from Phase 4
- Payment integration with tlync uses adapter pattern for extensibility
- Cart merge is triggered automatically on customer login/register
- All monetary calculations use Prisma Decimal type to avoid floating-point issues
- The `/products/search` route must be defined BEFORE `/:slug` to avoid route conflicts

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["2.5", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3", "7.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "8.1"] },
    { "id": 7, "tasks": ["8.2", "9.1"] },
    { "id": 8, "tasks": ["9.2", "10.1"] },
    { "id": 9, "tasks": ["10.2", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6"] },
    { "id": 10, "tasks": ["14.1", "16.1"] },
    { "id": 11, "tasks": ["14.2", "15.1"] },
    { "id": 12, "tasks": ["15.2", "15.3"] }
  ]
}
```
