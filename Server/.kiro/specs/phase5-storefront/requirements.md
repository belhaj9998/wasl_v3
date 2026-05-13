# Requirements Document

## Introduction

This document defines the requirements for Phase 5 — Storefront (Customer-Facing) APIs of the Wasl SaaS multi-tenant e-commerce platform. The storefront layer provides public and semi-authenticated APIs enabling end customers (guests and registered) to browse stores, manage shopping carts, complete checkouts with payment integration, and manage their accounts. Store identification is domain-based (subdomain or custom domain) rather than numeric IDs. The system supports guest checkout via session-based carts, registered customer authentication via JWT, and integrates with Stripe, Paymob/tlync, and Cash on Delivery payment methods.

## Glossary

- **Storefront_API**: The set of customer-facing HTTP endpoints under `/api/storefront/:domain/`
- **Storefront_Tenant_Middleware**: Middleware that resolves store context from the domain route parameter
- **Optional_Auth_Middleware**: Middleware that attempts JWT verification without rejecting unauthenticated requests
- **Customer_Auth_Middleware**: Middleware that requires a valid customer JWT token
- **Cart_Service**: Service responsible for shopping cart creation, item management, and total recalculation
- **Checkout_Service**: Service responsible for the atomic 9-step checkout transaction
- **Customer_Auth_Service**: Service responsible for customer registration and login (separate from admin auth)
- **Payment_Service**: Service responsible for initiating and handling payments via Stripe, Paymob/tlync, or COD
- **Store**: A tenant store identified by its subdomain or custom domain
- **Customer**: An end-user who shops at a store (distinct from admin User)
- **Guest**: An unauthenticated visitor identified only by session_id
- **Session_ID**: A cryptographically random UUID v4 stored as an HttpOnly cookie for guest cart identification
- **Checkout_Transaction**: The atomic 9-step Prisma transaction that creates an order from a cart
- **Order_Snapshot**: Immutable copy of product/variant data (name, SKU, price) stored in OrderItem at time of order placement
- **Coupon_Validation**: The multi-rule process that checks coupon eligibility (active, date range, usage limits, minimum amount)

## Requirements

### Requirement 1: Store Resolution by Domain

**User Story:** As a customer, I want to access a store by its domain name, so that I can browse the store without needing to know internal IDs.

#### Acceptance Criteria

1. WHEN a request is made to `/api/storefront/:domain/*`, THE Storefront_Tenant_Middleware SHALL resolve the store by performing a case-insensitive match of the domain parameter against the `Store.domain` or `Store.custom_domain` fields where `Store.deleted_at` is null
2. WHEN the domain matches a non-deleted store with ACTIVE status, THE Storefront_Tenant_Middleware SHALL attach the store context (id, name, domain, currency_code, locale, status) to the request
3. IF the domain does not match any store or matches a store where `deleted_at` is not null, THEN THE Storefront_Tenant_Middleware SHALL return a 404 error with the message "Store not found"
4. IF the domain matches a non-deleted store with status DRAFT, SUSPENDED, or ARCHIVED, THEN THE Storefront_Tenant_Middleware SHALL return a 403 error with the message "Store is currently unavailable"
5. WHEN a request without a valid authentication token is received, THE Storefront_Tenant_Middleware SHALL read the session_id from the `storefront_session` cookie if present, or generate a UUID v4 session_id and set it in the `storefront_session` cookie with a 30-day expiration, and attach the session_id to the request context

### Requirement 2: Optional Authentication

**User Story:** As a customer, I want to browse the store and manage my cart whether I am logged in or not, so that I have a seamless shopping experience.

#### Acceptance Criteria

1. WHEN a request includes a valid Bearer token in the Authorization header, THE Optional_Auth_Middleware SHALL verify the JWT signature and expiry, decode the customer token payload, and attach customer data (customerId, email) to the request object so that downstream handlers can identify the authenticated customer.
2. WHEN a request does not include an Authorization header, THE Optional_Auth_Middleware SHALL allow the request to proceed with no customer data attached to the request object, indicating guest mode.
3. IF a request includes a Bearer token that is malformed, has an invalid signature, or is expired, THEN THE Optional_Auth_Middleware SHALL discard the token, attach no customer data to the request object, and allow the request to proceed as guest mode without returning an error response.
4. THE Optional_Auth_Middleware SHALL never return an error response or block request flow regardless of token presence or validity.
5. WHEN customer data is attached to the request, THE Optional_Auth_Middleware SHALL include at minimum the customerId (numeric identifier) and email (string) fields decoded from the token payload.

### Requirement 3: Customer Authentication Enforcement

**User Story:** As a registered customer, I want my account endpoints to be protected, so that only I can access my profile, orders, and addresses.

#### Acceptance Criteria

1. WHEN a request to a protected customer endpoint lacks a Bearer token in the Authorization header, THE Customer_Auth_Middleware SHALL return a 401 error with a JSON response indicating authentication is required
2. WHEN a request to a protected customer endpoint includes an invalid or expired token, THE Customer_Auth_Middleware SHALL return a 401 error with a JSON response indicating the token is invalid
3. WHEN a request includes a valid customer JWT, THE Customer_Auth_Middleware SHALL decode the token and attach the customer's id, email, and store_id to the request context
4. WHEN a request includes a valid customer JWT, THE Customer_Auth_Middleware SHALL verify that the store_id in the token payload matches the store resolved from the domain in the request, and IF the store_id does not match, THEN THE Customer_Auth_Middleware SHALL return a 401 error indicating cross-store access is denied
5. IF the customer referenced in a valid JWT has a status of ARCHIVED, THEN THE Customer_Auth_Middleware SHALL return a 401 error indicating the account is inactive

### Requirement 4: Store Public Information

**User Story:** As a customer, I want to view store information and browse categories, so that I can navigate the store and find products.

#### Acceptance Criteria

1. WHEN a customer requests store information via `GET /api/storefront/:domain` and the store status is ACTIVE, THE Storefront_API SHALL return the store public profile including name, domain, logo, favicon, description, currency_code, locale, social links (facebook_url, instagram_url, tiktok_url), support contact (support_email, support_phone), and SEO metadata (meta_title, meta_description)
2. WHEN a customer requests categories via `GET /api/storefront/:domain/categories` for an ACTIVE store, THE Storefront_API SHALL return all categories where is_active is true, structured as a nested tree with parent/children relationships, ordered by sort_order ascending
3. WHEN a customer requests a category by slug via `GET /api/storefront/:domain/categories/:slug`, THE Storefront_API SHALL return the category details (name, slug, image_url, parent) with its associated products limited to those where is_published is true and status is ACTIVE, paginated with a default page size of 20 and a maximum page size of 100
4. IF the domain does not match any store or the matched store status is not ACTIVE, THEN THE Storefront_API SHALL return a 404 error indicating the store was not found
5. IF a category slug does not exist or is inactive within the resolved store, THEN THE Storefront_API SHALL return a 404 error indicating the category was not found

### Requirement 5: Product Catalog Browsing

**User Story:** As a customer, I want to browse and search published products, so that I can find items I want to purchase.

#### Acceptance Criteria

1. WHEN a customer requests products via `GET /api/storefront/:domain/products`, THE Storefront_API SHALL return only products with `is_published = true` and `status = ACTIVE`, paginated with default page 1 and default limit 20 (max 100), sorted by created_at descending.
2. WHEN a customer requests products with filter parameters, THE Storefront_API SHALL return only products matching all specified filters, supporting category_id (positive integer), min_price (decimal >= 0), and max_price (decimal >= 0 where max_price >= min_price).
3. WHEN a customer requests products with pagination parameters (page, limit), THE Storefront_API SHALL return the requested page of results along with pagination metadata including total count, current page, limit, and total pages.
4. WHEN a customer requests products with sorting parameters, THE Storefront_API SHALL return results sorted by the specified sort_by field (one of: name, price, created_at) in the specified sort_order direction (asc or desc), defaulting to created_at desc when not provided or when an unsupported sort_by field is given.
5. WHEN a customer requests a product by slug via `GET /api/storefront/:domain/products/:slug`, THE Storefront_API SHALL return the product details including only active variants (is_active = true) with their option values, media sorted by sort_order, and available_quantity per variant from the inventory record.
6. IF a product slug does not exist, or the product is not published (is_published = false), or the product status is not ACTIVE, THEN THE Storefront_API SHALL return a 404 error.
7. WHEN a customer searches products via `GET /api/storefront/:domain/products/search` with a query parameter (1-200 characters), THE Storefront_API SHALL perform case-insensitive partial matching on product name, description, and variant SKU, returning paginated results with the same pagination defaults and metadata as the product listing endpoint.
8. IF the store domain does not exist or the store status is not ACTIVE, THEN THE Storefront_API SHALL return a 404 error.
9. IF filter, sorting, or pagination parameters fail validation (invalid type, out of range, or unsupported sort_by field), THEN THE Storefront_API SHALL return a 400 Bad Request error with field-level error details.

### Requirement 6: Shopping Cart Management

**User Story:** As a customer (guest or registered), I want to manage a shopping cart, so that I can collect items before checkout.

#### Acceptance Criteria

1. WHEN an authenticated customer requests their cart, THE Cart_Service SHALL identify the cart by customer_id and store_id
2. WHEN a guest requests their cart, THE Cart_Service SHALL identify the cart by session_id and store_id
3. WHEN no OPEN cart exists for the identifier, THE Cart_Service SHALL create a new OPEN cart
4. WHEN a customer adds an item to the cart, THE Cart_Service SHALL validate that the product has `is_published = true`, the variant has `is_active = true`, and the variant belongs to the specified product within the same store
5. IF product or variant validation fails when adding an item, THEN THE Cart_Service SHALL reject the request with an error message indicating which validation failed and SHALL NOT modify the cart
6. WHEN a customer adds an item to the cart with a quantity greater than zero and the variant already exists in the cart, THE Cart_Service SHALL update the existing item quantity by adding the new quantity to the current quantity; WHEN the quantity is zero, THE Cart_Service SHALL treat it as a no-op and skip the update
7. WHEN a customer adds an item to the cart and the product has `track_inventory = true`, THE Cart_Service SHALL validate that the variant's available_quantity is greater than zero AND greater than or equal to the total requested quantity (existing cart quantity plus new quantity)
8. IF inventory validation fails when adding or updating an item (including when available_quantity is zero), THEN THE Cart_Service SHALL reject the request with an error message indicating the available quantity and SHALL NOT modify the cart
9. WHEN a cart item is added or updated, THE Cart_Service SHALL set unit_price from the variant price (or product base_price if variant price is null) and calculate total_price as unit_price multiplied by quantity
10. WHEN any cart mutation occurs (add, update, remove item), THE Cart_Service SHALL recalculate cart totals where subtotal equals the sum of all item total_price values, and grand_total equals subtotal minus discount_total plus shipping_total
11. WHEN a customer updates a cart item quantity to zero, THE Cart_Service SHALL remove the item from the cart
12. THE Cart_Service SHALL enforce that only one OPEN cart exists per customer or session per store
13. THE Cart_Service SHALL enforce a maximum item quantity of 9999 per cart line item and a maximum of 100 distinct line items per cart

### Requirement 7: Coupon Application

**User Story:** As a customer, I want to apply discount coupons to my cart, so that I can receive discounts on my purchases.

#### Acceptance Criteria

1. WHEN a customer applies a coupon code, THE Cart_Service SHALL validate the coupon exists in the store using case-insensitive code matching and the code is between 2 and 50 characters
2. WHEN a customer applies a coupon, THE Cart_Service SHALL verify the coupon is_active is true
3. WHEN a customer applies a coupon, THE Cart_Service SHALL verify the current date is within the coupon starts_at and ends_at range (inclusive of both boundaries), treating null starts_at as no lower bound and null ends_at as no upper bound
4. WHEN a customer applies a coupon with a usage_limit, THE Cart_Service SHALL verify total CouponUsage records for that coupon have not reached the limit
5. WHEN an authenticated customer applies a coupon with a usage_limit_per_customer, THE Cart_Service SHALL verify the customer's CouponUsage count for that coupon has not reached the per-customer limit
6. IF a guest (unauthenticated) customer applies a coupon that has a usage_limit_per_customer, THEN THE Cart_Service SHALL skip the per-customer usage check and allow application based on other validations
7. WHEN a customer applies a coupon with a minimum_order_amount, THE Cart_Service SHALL verify the cart subtotal (sum of item quantities multiplied by unit prices) meets or exceeds the minimum_order_amount
8. WHEN a PERCENTAGE coupon is applied, THE Cart_Service SHALL calculate the discount as subtotal multiplied by (value / 100), where value is between 1 and 100, capped at maximum_discount_amount if specified
9. WHEN a FIXED coupon is applied, THE Cart_Service SHALL calculate the discount as the minimum of the coupon value and the cart subtotal, ensuring the discount never exceeds the subtotal
10. WHEN a coupon passes all validations, THE Cart_Service SHALL create a CouponUsage record linking the coupon to the cart and update the cart's discount_total to the calculated discount amount and grand_total to (subtotal - discount_total + shipping_total)
11. WHEN a customer applies a coupon to a cart that already has a coupon applied, THE Cart_Service SHALL remove the existing coupon (delete its CouponUsage record) before applying the new coupon
12. WHEN a customer removes a coupon, THE Cart_Service SHALL delete the CouponUsage record and recalculate cart totals setting discount_total to zero and grand_total to (subtotal + shipping_total)
13. IF coupon validation fails, THEN THE Cart_Service SHALL return an error message indicating the specific reason for failure (e.g., coupon not found, coupon inactive, coupon expired, usage limit reached, minimum order amount not met)

### Requirement 8: Checkout Process

**User Story:** As a customer, I want to complete my purchase through a reliable checkout process, so that my order is created correctly with all associated data.

#### Acceptance Criteria

1. WHEN a customer initiates checkout, THE Checkout_Service SHALL validate the cart status is OPEN and the cart contains at least one item
2. IF the cart status is not OPEN or the cart contains zero items, THEN THE Checkout_Service SHALL reject the checkout with an error message indicating the cart is not eligible for checkout
3. WHEN a customer initiates checkout, THE Checkout_Service SHALL validate that all cart items reference products with status ACTIVE and is_published true, variants with is_active true, and available_quantity greater than or equal to the requested quantity for each inventory-tracked variant
4. IF any cart item references a product that is not ACTIVE or not published, a variant that is not active, or a variant with insufficient available_quantity, THEN THE Checkout_Service SHALL reject the checkout with an error message indicating which item failed validation
5. THE Checkout_Service SHALL execute all checkout steps within a single Prisma database transaction
6. IF any step in the checkout transaction fails, THEN THE Checkout_Service SHALL roll back all changes with no partial order state persisted
7. WHEN the checkout transaction succeeds, THE Checkout_Service SHALL create an Order with status PENDING, payment_status UNPAID, and a unique order_number following the format ORD-{storeId padded to 4 digits}-{sequential padded to 6 digits}
8. WHEN creating OrderItems, THE Checkout_Service SHALL snapshot the product_name, variant_title, sku, and unit_price from the variant (falling back to product base_price if variant price is null) at the time of order placement, and set line_total to unit_price multiplied by quantity
9. WHEN the checkout transaction succeeds and a variant's associated product has track_inventory set to true, THE Checkout_Service SHALL decrement available_quantity by the ordered quantity and increment reserved_quantity by the ordered quantity for each variant
10. WHEN the checkout transaction succeeds, THE Checkout_Service SHALL create an InventoryMovement record of type RESERVED with a negative quantity_change equal to the ordered quantity for each inventory-tracked item, enforced at the database level via a constraint ensuring quantity_change is negative for RESERVED movement types
11. WHEN the checkout transaction succeeds, THE Checkout_Service SHALL create an OrderAddress of type SHIPPING from the provided shipping address
12. WHEN the cart has an applied coupon, THE Checkout_Service SHALL validate the coupon (active status, date range, usage limits, minimum order amount) and link the CouponUsage record with the calculated discount_amount to the created order
13. IF the cart has an applied coupon that fails validation at checkout time, THEN THE Checkout_Service SHALL reject the checkout with an error message indicating the coupon is no longer valid
14. WHEN the checkout transaction succeeds, THE Checkout_Service SHALL calculate the Order grand_total as subtotal minus discount_total plus shipping_total
15. WHEN the checkout transaction succeeds, THE Checkout_Service SHALL create an OrderTimeline entry with event ORDER_PLACED and to_status PENDING
16. WHEN the checkout transaction succeeds, THE Checkout_Service SHALL update the cart status to CONVERTED
17. WHEN the checkout transaction succeeds, THE Checkout_Service SHALL create a PaymentTransaction record with the specified payment method and status PENDING
18. WHEN the payment method is CARD (Stripe), THE Payment_Service SHALL create a Stripe PaymentIntent and return the client_secret to the caller
19. WHEN the payment method is WALLET (Paymob/tlync), THE Payment_Service SHALL create a payment session and return the payment_url to the caller

### Requirement 9: Payment Webhook Handling

**User Story:** As the system, I want to process payment provider callbacks reliably, so that order payment statuses are updated correctly.

#### Acceptance Criteria

1. WHEN a payment webhook is received, THE Payment_Service SHALL verify the provider signature (Stripe signature header or Paymob HMAC)
2. IF the webhook signature verification fails, THEN THE Payment_Service SHALL return a 401 error and not process the payload
3. WHEN a webhook with a successful payment event is received and signature is valid, THE Payment_Service SHALL update the PaymentTransaction status to CAPTURED, set paid_at to the current timestamp, and store the raw webhook payload in the PaymentTransaction raw_payload field
4. WHEN a webhook with a successful payment event is received and signature is valid, THE Payment_Service SHALL update the associated Order payment_status to PAID
5. WHEN a webhook with a failed payment event is received and signature is valid, THE Payment_Service SHALL update the PaymentTransaction status to FAILED and the Order payment_status to FAILED
6. WHEN a payment status change occurs via webhook, THE Payment_Service SHALL create an OrderTimeline entry with the event field set to a value indicating the payment status transition (e.g., "payment_captured" or "payment_failed") and store the provider transaction reference in the payload field
7. WHEN a duplicate webhook is received during active webhook processing for a PaymentTransaction whose status is already CAPTURED, THE Payment_Service SHALL return HTTP 200 without modifying any records (idempotent handling), where duplication is determined by matching the provider transaction_reference
8. IF a webhook references a PaymentTransaction that does not exist (no matching transaction_reference found), THEN THE Payment_Service SHALL return HTTP 400 and not modify any records
9. IF a duplicate webhook is received for a PaymentTransaction that is not yet in CAPTURED status, THEN THE Payment_Service SHALL reject it as an invalid duplicate and return HTTP 400
10. WHEN a webhook is processed successfully (status update applied or duplicate detected), THE Payment_Service SHALL return HTTP 200 to the payment provider within 5 seconds of receiving the request

### Requirement 10: Guest Order Lookup

**User Story:** As a guest customer, I want to look up my order using my order number and contact information, so that I can track my order without creating an account.

#### Acceptance Criteria

1. WHEN a guest provides an order_number and a verification value (email or phone) within a valid store context, THE Storefront_API SHALL return the order details only if both the order_number matches AND the verification value matches either customer_email (case-insensitive) or customer_phone (exact match) on the order
2. IF the order_number does not exist or the verification value does not match, THEN THE Storefront_API SHALL return a generic not-found error with no indication of whether the order_number exists, preventing order enumeration
3. WHEN an order is found, THE Storefront_API SHALL return order_number, status, payment_status, currency_code, items (product_name, variant_title, quantity, unit_price, line_total), shipping address, order timeline entries, subtotal, discount_total, shipping_total, grand_total, and placed_at, excluding notes_internal, customer_id, and store-admin-only fields
4. WHILE the guest order lookup endpoint is unauthenticated, THE Storefront_API SHALL enforce a rate limit of no more than 10 requests per 15-minute window per IP address, returning an error indicating rate limit exceeded when the threshold is surpassed

### Requirement 11: Customer Registration and Login

**User Story:** As a visitor, I want to register and log in to a store, so that I can have a persistent account with order history and saved addresses.

#### Acceptance Criteria

1. WHEN a visitor submits a registration request with first_name (1-100 characters), email (valid format, max 255 characters), phone (8-20 characters), and password (minimum 8 characters, maximum 128 characters), THE Customer_Auth_Service SHALL create a Customer record scoped to the store with status ACTIVE
2. IF a visitor registers with an email that already exists for another customer in the same store, THEN THE Customer_Auth_Service SHALL reject the request with a 409 conflict error indicating the email is already in use
3. IF a visitor registers with a phone that already exists for another customer in the same store, THEN THE Customer_Auth_Service SHALL reject the request with a 409 conflict error indicating the phone is already in use
4. WHEN a visitor registers, THE Customer_Auth_Service SHALL hash the password using bcrypt before storage and never store or return the plaintext password
5. WHEN a visitor registers successfully, THE Customer_Auth_Service SHALL return the customer record (id, first_name, email, phone, store_id, status, created_at) and a signed JWT token with an expiration of 7 days
6. WHEN a customer logs in with valid credentials (email + password), THE Customer_Auth_Service SHALL verify the password against the stored hash and return a signed JWT token with an expiration of 7 days
7. IF login credentials are invalid, THEN THE Customer_Auth_Service SHALL return a 401 error with a generic message that does not reveal whether the email or password was incorrect
8. THE Customer_Auth_Service SHALL issue customer JWTs with a separate signing key from admin User JWTs
9. THE Customer_Auth_Service SHALL include store_id and customer_id in the customer JWT payload to prevent cross-store access
10. IF a visitor submits a registration request missing any required field (first_name, email, phone, or password) or with values outside the allowed length bounds, THEN THE Customer_Auth_Service SHALL return a 400 validation error indicating which fields failed validation

### Requirement 12: Customer Account Management

**User Story:** As a registered customer, I want to manage my profile, view my orders, and manage my addresses, so that I have a complete account experience.

#### Acceptance Criteria

1. WHEN an authenticated customer requests their profile via `GET /customers/me`, THE Storefront_API SHALL return the customer's first_name, last_name, email, phone, gender, birth_date, accepts_marketing, status, created_at, and updated_at fields
2. WHEN an authenticated customer updates their profile via `PATCH /customers/me`, THE Storefront_API SHALL update only the provided fields limited to first_name (max 100 characters), last_name (max 100 characters), email (max 255 characters, valid email format), phone (8–20 characters), gender, birth_date (must be in the past), and accepts_marketing
3. IF a customer updates their profile with values that fail validation, THEN THE Storefront_API SHALL return a 422 error indicating which fields are invalid without modifying any existing data
4. WHEN an authenticated customer requests their orders via `GET /customers/me/orders`, THE Storefront_API SHALL return orders belonging to that customer in the current store, paginated with a default page size of 20 and a maximum page size of 100, sorted by placed_at descending
5. WHEN an authenticated customer adds an address via `POST /customers/me/addresses`, THE Storefront_API SHALL validate that full_name (1–200 characters), city (1–100 characters), and street_line_1 (1–300 characters) are provided, create a CustomerAddress record linked to the customer and store, and if is_default is true unset the previous default address
6. IF a customer updates their email or phone to a value already used by another customer in the same store, THEN THE Storefront_API SHALL return a 409 conflict error without modifying any existing data
7. IF an unauthenticated request is made to any `/customers/me` endpoint, THEN THE Storefront_API SHALL return a 401 unauthorized error

### Requirement 13: Tenant Data Isolation

**User Story:** As a store owner, I want all storefront data to be isolated per store, so that customers of one store cannot access data from another store.

#### Acceptance Criteria

1. WHEN a storefront request is received, THE Storefront_API SHALL resolve the store_id from the request domain (matching against the Store's `domain` or `custom_domain` field) and ensure all returned data (products, categories, carts, orders) belongs exclusively to that resolved store_id
2. IF the request domain does not match any active store's `domain` or `custom_domain`, THEN THE Storefront_API SHALL reject the request with a 404 error indicating the store was not found
3. THE Cart_Service SHALL include the resolved store_id in all cart creation, update, retrieval, and deletion operations, and SHALL reject any operation where the target cart's store_id does not match the resolved store_id
4. THE Checkout_Service SHALL include the resolved store_id in all order creation and inventory reservation operations, and SHALL reject any operation where referenced entities (cart, products, variants) do not belong to the resolved store_id
5. THE Customer_Auth_Service SHALL scope customer registration and login to the resolved store_id, such that a customer account registered under one store_id cannot authenticate against a different store_id
6. WHEN a customer JWT contains a store_id that does not match the request domain's resolved store_id, THE Customer_Auth_Middleware SHALL reject the request with a 401 error and SHALL NOT process the request further
7. WHEN a request lacks valid authentication entirely (no JWT or invalid JWT), THE Customer_Auth_Middleware SHALL return a 403 error indicating authentication is required, distinct from the 401 error used for store_id mismatch
8. IF a storefront request references an entity ID (product, category, cart, or order) that exists but belongs to a different store_id, THEN THE Storefront_API SHALL respond with a 404 error as if the entity does not exist

### Requirement 14: Input Validation

**User Story:** As the system, I want all customer inputs to be validated, so that invalid or malicious data is rejected before processing.

#### Acceptance Criteria

1. THE Storefront_API SHALL validate all request bodies against their corresponding Zod schema before processing any business logic
2. WHEN checkout input is received, THE Storefront_API SHALL validate customer_name (min 2, max 100 characters), customer_phone (Libyan format matching regex `^\+218[0-9]{9}$`), and shipping address required fields: city (min 1, max 100 characters) and street_line_1 (min 1, max 300 characters)
3. WHEN customer registration input is received, THE Storefront_API SHALL validate first_name (min 2, max 100 characters), email (RFC 5322 format, max 255 characters), phone (matching regex `^\+?\d{7,15}$`), and password (min 8, max 128 characters)
4. WHEN cart item input is received, THE Storefront_API SHALL validate that product_id and variant_id are positive integers and quantity is a positive integer not exceeding 9999
5. IF validation fails on any field, THEN THE Storefront_API SHALL return a 422 response containing an array of field-level error objects, each identifying the failing field path and a human-readable error message
6. IF the request body is missing or not valid JSON, THEN THE Storefront_API SHALL return a 422 response with an error message indicating the body could not be parsed
7. WHEN validation succeeds, THE Storefront_API SHALL replace the raw request body with the parsed and coerced output from the Zod schema before passing control to the route handler

### Requirement 15: Rate Limiting and Security

**User Story:** As the system, I want to prevent abuse of storefront endpoints, so that the platform remains available and secure.

#### Acceptance Criteria

1. THE Storefront_API SHALL apply rate limiting of 5 requests per minute per client IP address on checkout endpoints
2. THE Storefront_API SHALL apply rate limiting of 5 requests per minute per client IP address on customer login endpoints
3. THE Storefront_API SHALL apply rate limiting of 3 requests per minute per client IP address on customer registration endpoints
4. WHEN a client exceeds the rate limit on any storefront endpoint, THE Storefront_API SHALL respond with HTTP 429 and include RateLimit-Limit, RateLimit-Remaining, and RateLimit-Reset headers in the response
5. THE Storefront_API SHALL set session_id cookies with HttpOnly, Secure, SameSite=Strict attributes and a Max-Age of 7 days
6. THE Storefront_API SHALL use cryptographically random UUID v4 values for session_id generation

### Requirement 16: Cart Session Merging

**User Story:** As a customer who was browsing as a guest, I want my cart to be preserved when I log in, so that I do not lose items I added before authenticating.

#### Acceptance Criteria

1. WHEN a customer logs in and has an existing session-based cart (status OPEN) with items, and the customer has an existing authenticated cart (status OPEN), THE Cart_Service SHALL merge each session cart item into the authenticated cart
2. WHEN a customer logs in and has an existing session-based cart (status OPEN) with items, and the customer does not have an existing authenticated cart, THE Cart_Service SHALL assign the session cart to the customer by setting its customer_id and clearing its session_id
3. WHEN merging carts and a variant exists in both carts, THE Cart_Service SHALL set the quantity to the higher of the two values, capped at a maximum of 9999 per line item
4. IF a session cart item references a variant that is inactive or has zero available inventory at the time of merge, THEN THE Cart_Service SHALL skip the entire quantity of that item and not add it to the authenticated cart, regardless of how many units were originally in the session cart
5. WHEN cart merging is complete, THE Cart_Service SHALL recalculate the authenticated cart totals (subtotal, discount_total, shipping_total, grand_total) and set the session-based cart status to ABANDONED
6. THE Cart_Service SHALL complete the cart merge operation within 5 seconds of the login event
