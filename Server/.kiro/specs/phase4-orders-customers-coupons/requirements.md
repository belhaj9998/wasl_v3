# Requirements Document

## Introduction

Phase 4 of Wasl SaaS implements the commercial core of the multi-store e-commerce platform: Customer management, Coupon/Discount engine, Order lifecycle management (including shipments, payments, and timeline tracking), and a store-level Dashboard for analytics. These modules are tightly coupled — orders reference customers and coupons, payments and shipments belong to orders, and the dashboard aggregates data across all of them. All endpoints are scoped to a specific store via the existing `resolveStoreContext` middleware (using the `x-store-id` header) and protected by the `requirePermission` middleware for RBAC enforcement. The system is built on Express + Prisma + PostgreSQL with Zod validation and TypeScript.

## Glossary

- **Customer_Service**: The service responsible for customer CRUD operations, address book management, and order history retrieval, scoped by store_id.
- **Coupon_Service**: The service responsible for coupon CRUD, validation logic (active status, date range, usage limits, minimum order amount), discount calculation, and usage tracking.
- **Order_Service**: The service responsible for order lifecycle management including creation, status transitions, cancellation with inventory rollback, notes, and timeline tracking.
- **Order_State_Machine**: The utility responsible for enforcing valid order status transitions. It defines a deterministic, immutable set of allowed transitions and throws errors for invalid ones.
- **Shipment_Service**: The service responsible for shipment CRUD within an order, including status transitions and automatic timestamp recording.
- **Payment_Service**: The service responsible for recording payments, processing refunds, and auto-recalculating order payment status.
- **Dashboard_Service**: The service responsible for aggregating store-level analytics including overview metrics, sales statistics, and inventory alerts.
- **Customer**: A person or entity that places orders in a store, with optional email/phone (at least one required), soft-deletable via ARCHIVED status.
- **CustomerAddress**: A shipping/billing address belonging to a customer, with a single default address constraint per customer.
- **Coupon**: A discount code with configurable type (PERCENTAGE or FIXED), usage limits, date range, and minimum order amount. Codes are stored uppercase and unique per store.
- **Order**: A commercial transaction record with status lifecycle, auto-generated order number, financial totals, and associated items/addresses/timeline.
- **OrderItem**: A line item within an order capturing product/variant snapshot, quantity, unit price, and line total at time of order.
- **OrderTimeline**: An audit entry recording order events (creation, status changes, payments, notes) with actor and timestamp.
- **PaymentTransaction**: A record of a payment or refund against an order, with method, amount, and status.
- **Shipment**: A shipping record within an order tracking provider, tracking number, cost, and delivery status.
- **Order_Number**: An auto-generated sequential identifier in format `ORD-{storeId padded 4}-{sequential padded 6}` (e.g., ORD-0001-000042).
- **Payment_Status**: The computed financial state of an order: UNPAID, PARTIALLY_PAID, PAID, PARTIALLY_REFUNDED, REFUNDED.
- **Resolve_Store_Context**: The existing middleware that extracts store_id from the x-store-id header, validates the user's active membership, checks store status (ACTIVE or DRAFT), and loads the user's permission codes into the request.
- **Require_Permission**: The existing middleware that checks whether the authenticated user's loaded permissions include the required permission code before allowing access to the endpoint.

---

## Requirements

### Requirement 1: List Customers

**User Story:** As a store admin, I want to list customers in my store with filtering and search, so that I can find and manage customer records efficiently.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:view permission requests the customer list, THE Customer_Service SHALL return a paginated list of customers with page (default 1) and limit (default 20, max 100) parameters.
2. WHEN a search parameter is provided, THE Customer_Service SHALL filter results by matching the search term against first_name, last_name, email, and phone using case-insensitive partial matching.
3. WHEN a status filter parameter is provided, THE Customer_Service SHALL filter results by the specified CustomerStatus (ACTIVE, ARCHIVED).
4. WHEN an accepts_marketing filter parameter is provided, THE Customer_Service SHALL filter results by their marketing consent status.
5. WHEN sort_by and sort_order parameters are provided, THE Customer_Service SHALL sort results by the specified field (created_at, first_name, last_name) in the specified direction (asc, desc), defaulting to created_at desc.
6. THE Customer_Service SHALL return pagination metadata including total count, current page, limit, and total pages.
7. IF the authenticated user does not have the customer:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
8. WHEN validation of query parameters fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 2: Create Customer

**User Story:** As a store admin, I want to create a new customer record, so that I can track customer information and associate orders with them.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:create permission submits a valid customer creation request, THE Customer_Service SHALL create a new Customer record and return the created record with a 201 status.
2. THE Customer_Service SHALL validate the creation request using a Zod schema allowing optional first_name (1-100 characters), optional last_name (1-100 characters), optional email (valid email, max 255 characters), optional phone (8-20 characters), optional gender (male, female, other), optional birth_date (coerced date, must be in the past), optional notes (max 1000 characters), optional status (CustomerStatus), and optional accepts_marketing (boolean).
3. IF neither email nor phone is provided in the creation request, THEN THE Customer_Service SHALL return a 400 Bad Request error with the message "At least one of email or phone is required".
4. IF the provided email already exists for another active customer in the same store, THEN THE Customer_Service SHALL return a 409 Conflict error with the message "A customer with this email already exists".
5. IF the provided phone already exists for another active customer in the same store, THEN THE Customer_Service SHALL return a 409 Conflict error with the message "A customer with this phone already exists".
6. IF the authenticated user does not have the customer:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
7. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 3: Get Customer by ID

**User Story:** As a store admin, I want to view a specific customer's details, so that I can review their information and history.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:view permission requests a specific customer by ID, THE Customer_Service SHALL return the Customer record including all fields.
2. IF the specified customer ID does not exist within the current store, THEN THE Customer_Service SHALL return a 404 Not Found error with the message "Customer not found".
3. IF the authenticated user does not have the customer:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 4: Update Customer

**User Story:** As a store admin, I want to update a customer's information, so that I can keep customer records accurate.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:update permission submits a valid update request for an existing customer, THE Customer_Service SHALL update the Customer record with the provided fields and return the updated record.
2. THE Customer_Service SHALL validate the update request using a Zod schema allowing optional first_name (1-100 characters), optional last_name (1-100 characters), optional email (valid email, max 255 characters), optional phone (8-20 characters), optional gender (male, female, other), optional birth_date (coerced date, must be in the past), optional notes (max 1000 characters), optional status (CustomerStatus), and optional accepts_marketing (boolean).
3. IF the updated email already exists for another active customer in the same store, THEN THE Customer_Service SHALL return a 409 Conflict error with the message "A customer with this email already exists".
4. IF the updated phone already exists for another active customer in the same store, THEN THE Customer_Service SHALL return a 409 Conflict error with the message "A customer with this phone already exists".
5. IF the specified customer ID does not exist within the current store, THEN THE Customer_Service SHALL return a 404 Not Found error.
6. IF the authenticated user does not have the customer:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
7. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 5: Delete (Archive) Customer

**User Story:** As a store admin, I want to delete a customer, so that I can remove inactive customers from my active list while preserving their order history.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:delete permission submits a deletion request for an existing customer, THE Customer_Service SHALL set the customer's status to ARCHIVED (soft delete) and return a 200 success response.
2. THE Customer_Service SHALL NOT hard-delete the customer record, preserving all associated order history and data integrity.
3. IF the specified customer ID does not exist within the current store, THEN THE Customer_Service SHALL return a 404 Not Found error.
4. IF the authenticated user does not have the customer:delete permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 6: Get Customer Order History

**User Story:** As a store admin, I want to view a customer's order history, so that I can understand their purchasing patterns.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:view permission requests a customer's order history, THE Customer_Service SHALL return a paginated list of orders belonging to that customer with page and limit parameters.
2. IF the specified customer ID does not exist within the current store, THEN THE Customer_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the customer:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 7: List Customer Addresses

**User Story:** As a store admin, I want to view all addresses for a customer, so that I can manage their shipping and billing information.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:view permission requests the address list for a customer, THE Customer_Service SHALL return all CustomerAddress records for the specified customer.
2. IF the specified customer ID does not exist within the current store, THEN THE Customer_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the customer:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 8: Create Customer Address

**User Story:** As a store admin, I want to add an address to a customer's address book, so that it can be used for future orders.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:update permission submits a valid address creation request, THE Customer_Service SHALL create a new CustomerAddress record and return it with a 201 status.
2. THE Customer_Service SHALL validate the address creation request using a Zod schema requiring full_name (1-200 characters) and city (1-100 characters) and street_line_1 (1-300 characters), and allowing optional type (AddressType, default OTHER), optional phone (8-20 characters), optional region (max 100 characters), optional street_line_2 (max 300 characters), optional postal_code (max 20 characters), optional google_maps_url (valid URL), and optional is_default (boolean, default false).
3. WHEN is_default is set to true, THE Customer_Service SHALL unset is_default on all other addresses for the same customer before setting the new address as default.
4. IF the specified customer ID does not exist within the current store, THEN THE Customer_Service SHALL return a 404 Not Found error.
5. IF the authenticated user does not have the customer:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
6. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 9: Update Customer Address

**User Story:** As a store admin, I want to update an existing customer address, so that I can correct or modify address details.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:update permission submits a valid update request for an existing address, THE Customer_Service SHALL update the CustomerAddress record and return the updated record.
2. WHEN is_default is set to true in the update, THE Customer_Service SHALL unset is_default on all other addresses for the same customer.
3. IF the specified address ID does not exist for the specified customer in the current store, THEN THE Customer_Service SHALL return a 404 Not Found error with the message "Address not found".
4. IF the authenticated user does not have the customer:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
5. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 10: Delete Customer Address

**User Story:** As a store admin, I want to delete a customer address, so that I can remove outdated or incorrect addresses.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:update permission submits a deletion request for an existing address, THE Customer_Service SHALL delete the CustomerAddress record and return a 200 success response.
2. IF the specified address ID does not exist for the specified customer in the current store, THEN THE Customer_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the customer:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 11: Set Default Customer Address

**User Story:** As a store admin, I want to set a specific address as the customer's default, so that it is pre-selected for new orders.

#### Acceptance Criteria

1. WHEN an authenticated member with customer:update permission submits a set-default request for an existing address, THE Customer_Service SHALL set is_default to true on the specified address and set is_default to false on all other addresses for the same customer.
2. THE Customer_Service SHALL ensure that at most one address per customer has is_default set to true at any point in time.
3. IF the specified address ID does not exist for the specified customer in the current store, THEN THE Customer_Service SHALL return a 404 Not Found error.
4. IF the authenticated user does not have the customer:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.


### Requirement 12: List Coupons

**User Story:** As a store admin, I want to list all coupons in my store with filtering, so that I can manage discount codes.

#### Acceptance Criteria

1. WHEN an authenticated member with coupon:view permission requests the coupon list, THE Coupon_Service SHALL return a paginated list of coupons with page (default 1) and limit (default 20, max 100) parameters.
2. WHEN a search parameter is provided, THE Coupon_Service SHALL filter results by matching the search term against code and description using case-insensitive partial matching.
3. WHEN an is_active filter parameter is provided, THE Coupon_Service SHALL filter results by their active status.
4. WHEN a type filter parameter is provided, THE Coupon_Service SHALL filter results by the specified DiscountType (PERCENTAGE, FIXED).
5. WHEN sort_by and sort_order parameters are provided, THE Coupon_Service SHALL sort results by the specified field (created_at, code, starts_at, ends_at) in the specified direction (asc, desc), defaulting to created_at desc.
6. THE Coupon_Service SHALL return pagination metadata including total count, current page, limit, and total pages.
7. IF the authenticated user does not have the coupon:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
8. WHEN validation of query parameters fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 13: Create Coupon

**User Story:** As a store admin, I want to create a new coupon, so that I can offer discounts to customers.

#### Acceptance Criteria

1. WHEN an authenticated member with coupon:create permission submits a valid coupon creation request, THE Coupon_Service SHALL create a new Coupon record with the code stored in uppercase and return the created record with a 201 status.
2. THE Coupon_Service SHALL validate the creation request using a Zod schema requiring code (2-50 characters, auto-uppercased) and type (DiscountType) and value (positive number), and allowing optional description (max 500 characters), optional minimum_order_amount (non-negative number), optional maximum_discount_amount (positive number), optional usage_limit (positive integer), optional usage_limit_per_customer (positive integer), optional starts_at (coerced date), optional ends_at (coerced date), and optional is_active (boolean, default true).
3. IF the coupon type is PERCENTAGE, THEN THE Coupon_Service SHALL validate that value is between 1 and 100 inclusive, returning a 422 error if not.
4. IF both starts_at and ends_at are provided, THEN THE Coupon_Service SHALL validate that starts_at is before ends_at, returning a 422 error if not.
5. IF a coupon with the same code (case-insensitive) already exists in the current store, THEN THE Coupon_Service SHALL return a 409 Conflict error with the message "A coupon with this code already exists".
6. IF the authenticated user does not have the coupon:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
7. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 14: Get Coupon by ID

**User Story:** As a store admin, I want to view a specific coupon's details, so that I can review its configuration and usage.

#### Acceptance Criteria

1. WHEN an authenticated member with coupon:view permission requests a specific coupon by ID, THE Coupon_Service SHALL return the Coupon record including all fields.
2. IF the specified coupon ID does not exist within the current store, THEN THE Coupon_Service SHALL return a 404 Not Found error with the message "Coupon not found".
3. IF the authenticated user does not have the coupon:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 15: Update Coupon

**User Story:** As a store admin, I want to update a coupon's configuration, so that I can adjust discount rules and limits.

#### Acceptance Criteria

1. WHEN an authenticated member with coupon:update permission submits a valid update request for an existing coupon, THE Coupon_Service SHALL update the Coupon record with the provided fields and return the updated record.
2. THE Coupon_Service SHALL validate the update request using a Zod schema allowing optional code (2-50 characters, auto-uppercased), optional description (max 500 characters), optional type (DiscountType), optional value (positive number), optional minimum_order_amount (non-negative number), optional maximum_discount_amount (positive number), optional usage_limit (positive integer), optional usage_limit_per_customer (positive integer), optional starts_at (coerced date), optional ends_at (coerced date), and optional is_active (boolean).
3. IF the coupon type is PERCENTAGE (either existing or updated), THEN THE Coupon_Service SHALL validate that value is between 1 and 100 inclusive.
4. IF the updated code (case-insensitive) conflicts with another coupon in the same store, THEN THE Coupon_Service SHALL return a 409 Conflict error with the message "A coupon with this code already exists".
5. IF the specified coupon ID does not exist within the current store, THEN THE Coupon_Service SHALL return a 404 Not Found error.
6. IF the authenticated user does not have the coupon:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
7. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 16: Delete Coupon

**User Story:** As a store admin, I want to delete a coupon, so that I can remove discount codes that are no longer needed.

#### Acceptance Criteria

1. WHEN an authenticated member with coupon:delete permission submits a deletion request for an existing coupon, THE Coupon_Service SHALL delete the Coupon record and return a 200 success response.
2. IF the specified coupon has existing CouponUsage records, THEN THE Coupon_Service SHALL return a 409 Conflict error with the message "Cannot delete coupon with existing usages".
3. IF the specified coupon ID does not exist within the current store, THEN THE Coupon_Service SHALL return a 404 Not Found error.
4. IF the authenticated user does not have the coupon:delete permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 17: Get Coupon Usage History

**User Story:** As a store admin, I want to view the usage history of a coupon, so that I can track how it has been redeemed.

#### Acceptance Criteria

1. WHEN an authenticated member with coupon:view permission requests the usage history for a coupon, THE Coupon_Service SHALL return a paginated list of CouponUsage records with page and limit parameters.
2. IF the specified coupon ID does not exist within the current store, THEN THE Coupon_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the coupon:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 18: Validate Coupon

**User Story:** As a store admin, I want to validate a coupon code before applying it to an order, so that I can confirm the discount is applicable.

#### Acceptance Criteria

1. WHEN a coupon code is submitted for validation with a store ID and order subtotal, THE Coupon_Service SHALL perform all validation checks and return the validation result including validity status, discount amount, and the coupon record.
2. IF the coupon code does not exist in the current store (case-insensitive lookup), THEN THE Coupon_Service SHALL return a 404 Not Found error with the message "Coupon not found".
3. IF the coupon is_active is false, THEN THE Coupon_Service SHALL return a 400 Bad Request error with the message "Coupon is not active".
4. IF the current date is before the coupon's starts_at date, THEN THE Coupon_Service SHALL return a 400 Bad Request error with the message "Coupon is not yet valid".
5. IF the current date is after the coupon's ends_at date, THEN THE Coupon_Service SHALL return a 400 Bad Request error with the message "Coupon has expired".
6. IF the order subtotal is less than the coupon's minimum_order_amount, THEN THE Coupon_Service SHALL return a 400 Bad Request error with the message "Minimum order amount is {amount}".
7. IF the coupon has a usage_limit and the total CouponUsage count has reached that limit, THEN THE Coupon_Service SHALL return a 400 Bad Request error with the message "Coupon usage limit reached".
8. IF the coupon has a usage_limit_per_customer and a customer_id is provided and that customer's usage count has reached the per-customer limit, THEN THE Coupon_Service SHALL return a 400 Bad Request error with the message "You have reached the usage limit for this coupon".
9. WHEN the coupon type is PERCENTAGE, THE Coupon_Service SHALL calculate discount_amount as subtotal multiplied by (value / 100).
10. WHEN the coupon type is FIXED, THE Coupon_Service SHALL calculate discount_amount as the minimum of the coupon value and the order subtotal.
11. WHEN maximum_discount_amount is set, THE Coupon_Service SHALL cap the discount_amount at the maximum_discount_amount value.
12. THE Coupon_Service SHALL ensure the final discount_amount does not exceed the order subtotal.


### Requirement 19: List Orders

**User Story:** As a store admin, I want to list orders with comprehensive filtering, so that I can manage and track all store orders.

#### Acceptance Criteria

1. WHEN an authenticated member with order:view permission requests the order list, THE Order_Service SHALL return a paginated list of orders with page (default 1) and limit (default 20, max 100) parameters.
2. WHEN a search parameter is provided, THE Order_Service SHALL filter results by matching the search term against order_number, customer_name, and customer_phone using case-insensitive partial matching.
3. WHEN a status filter parameter is provided, THE Order_Service SHALL filter results by the specified order status.
4. WHEN a payment_status filter parameter is provided, THE Order_Service SHALL filter results by the specified payment status.
5. WHEN a source filter parameter is provided, THE Order_Service SHALL filter results by the specified order source.
6. WHEN a customer_id filter parameter is provided, THE Order_Service SHALL filter results to orders belonging to the specified customer.
7. WHEN date_from and/or date_to filter parameters are provided, THE Order_Service SHALL filter results by placed_at within the specified date range.
8. WHEN amount_min and/or amount_max filter parameters are provided, THE Order_Service SHALL filter results by grand_total within the specified range.
9. WHEN sort_by and sort_order parameters are provided, THE Order_Service SHALL sort results by the specified field (placed_at, grand_total, order_number) in the specified direction (asc, desc), defaulting to placed_at desc.
10. THE Order_Service SHALL return pagination metadata including total count, current page, limit, and total pages.
11. IF the authenticated user does not have the order:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
12. WHEN validation of query parameters fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 20: Create Order

**User Story:** As a store admin, I want to create a new order, so that I can process customer purchases and track sales.

#### Acceptance Criteria

1. WHEN an authenticated member with order:create permission submits a valid order creation request, THE Order_Service SHALL create a new Order record with status PENDING and payment_status UNPAID, and return the created record with a 201 status.
2. THE Order_Service SHALL validate the creation request using a Zod schema requiring items (array of at least one item, each with product_id, variant_id, and quantity 1-9999) and shipping_address, and allowing optional customer_id (positive integer), optional source (OrderSource, default ADMIN), optional billing_address, optional coupon_code (string), optional shipping_total (non-negative number, default 0), optional notes_from_customer (max 1000 characters), and optional notes_internal (max 1000 characters).
3. THE Order_Service SHALL auto-generate a sequential order number in the format ORD-{storeId padded to 4 digits}-{sequential padded to 6 digits} within a database transaction to prevent race conditions.
4. WHEN a customer_id is provided, THE Order_Service SHALL validate that the customer exists in the same store with ACTIVE status, returning a 404 error with the message "Customer not found" if not.
5. FOR EACH item in the order, THE Order_Service SHALL validate that the variant exists, is active, and belongs to the referenced product_id in the same store, returning a 404 error if not.
6. FOR EACH item in the order, THE Order_Service SHALL validate that the product is in ACTIVE status, returning a 400 error with the message "Product \"{name}\" is not active" if not.
7. FOR EACH item in the order, THE Order_Service SHALL validate that sufficient available inventory exists for the requested quantity, returning a 400 error with the message "Insufficient stock for \"{title}\". Available: {qty}" if not.
8. THE Order_Service SHALL calculate subtotal as the sum of (unit_price × quantity) for all items, where unit_price is the variant's price (or product base_price as fallback).
9. WHEN a coupon_code is provided, THE Order_Service SHALL call Coupon_Service.validateCoupon to validate and calculate the discount_amount.
10. THE Order_Service SHALL calculate grand_total as subtotal minus discount_total plus shipping_total.
11. THE Order_Service SHALL reserve inventory for each item by decrementing available_quantity and incrementing reserved_quantity, and creating an InventoryMovement record with type RESERVED.
12. WHEN a coupon is successfully applied, THE Order_Service SHALL create a CouponUsage record linking the coupon, customer, and order with the discount_amount.
13. THE Order_Service SHALL create an OrderTimeline entry with event ORDER_CREATED and to_status PENDING.
14. THE Order_Service SHALL execute the entire order creation within a single database transaction to ensure atomicity.
15. IF the authenticated user does not have the order:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
16. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 21: Get Order by ID

**User Story:** As a store admin, I want to view a specific order's full details, so that I can review items, addresses, payments, shipments, and timeline.

#### Acceptance Criteria

1. WHEN an authenticated member with order:view permission requests a specific order by ID, THE Order_Service SHALL return the Order record with all related data including items, addresses, timeline entries, payments, and shipments.
2. IF the specified order ID does not exist within the current store, THEN THE Order_Service SHALL return a 404 Not Found error with the message "Order not found".
3. IF the authenticated user does not have the order:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 22: Update Order Status

**User Story:** As a store admin, I want to update an order's status, so that I can track the order through its fulfillment lifecycle.

#### Acceptance Criteria

1. WHEN an authenticated member with order:update permission submits a valid status update request, THE Order_Service SHALL validate the transition via the Order_State_Machine and update the order's status.
2. THE Order_Service SHALL validate the status update request using a Zod schema requiring status (valid order status) and allowing optional note (string).
3. IF the requested status transition is not valid according to the Order_State_Machine, THEN THE Order_Service SHALL return a 400 Bad Request error with the message "Cannot transition from {from} to {to}".
4. WHEN the status is successfully updated, THE Order_Service SHALL create an OrderTimeline entry with event STATUS_CHANGED, from_status, to_status, and optional note.
5. IF the specified order ID does not exist within the current store, THEN THE Order_Service SHALL return a 404 Not Found error.
6. IF the authenticated user does not have the order:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
7. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 23: Cancel Order

**User Story:** As a store admin, I want to cancel an order, so that I can void orders that cannot be fulfilled and release reserved inventory.

#### Acceptance Criteria

1. WHEN an authenticated member with order:cancel permission submits a cancellation request for an existing order, THE Order_Service SHALL validate the transition to CANCELED via the Order_State_Machine and update the order's status to CANCELED.
2. WHEN an order is canceled, THE Order_Service SHALL release reserved inventory for each order item by incrementing available_quantity and decrementing reserved_quantity.
3. WHEN an order is canceled, THE Order_Service SHALL create an InventoryMovement record with type RELEASED for each order item.
4. WHEN an order is canceled, THE Order_Service SHALL create an OrderTimeline entry with event STATUS_CHANGED, from_status, to_status CANCELED, and optional reason.
5. THE Order_Service SHALL execute the entire cancellation within a single database transaction to ensure atomicity.
6. IF the order is already in a terminal state (CANCELED or RETURNED), THEN THE Order_Service SHALL return a 400 Bad Request error with the message "Cannot transition from {status} to CANCELED".
7. IF the specified order ID does not exist within the current store, THEN THE Order_Service SHALL return a 404 Not Found error.
8. IF the authenticated user does not have the order:cancel permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 24: Add Order Note

**User Story:** As a store admin, I want to add internal notes to an order, so that I can record important information about the order.

#### Acceptance Criteria

1. WHEN an authenticated member with order:update permission submits a note for an existing order, THE Order_Service SHALL create an OrderTimeline entry with event NOTE_ADDED and the provided note text.
2. IF the specified order ID does not exist within the current store, THEN THE Order_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the order:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 25: Get Order Timeline

**User Story:** As a store admin, I want to view the timeline of events for an order, so that I can track all changes and actions taken.

#### Acceptance Criteria

1. WHEN an authenticated member with order:view permission requests the timeline for an order, THE Order_Service SHALL return a paginated list of OrderTimeline entries ordered by created_at descending.
2. IF the specified order ID does not exist within the current store, THEN THE Order_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the order:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 26: Order State Machine Transitions

**User Story:** As a system component, I want to enforce valid order status transitions, so that orders follow a predictable lifecycle.

#### Acceptance Criteria

1. THE Order_State_Machine SHALL define the following valid transitions: DRAFT → PENDING or CANCELED; PENDING → CONFIRMED or CANCELED; CONFIRMED → PROCESSING or CANCELED; PROCESSING → PREPARING or CANCELED; PREPARING → SHIPPED or CANCELED; SHIPPED → IN_TRANSIT or RETURNED; IN_TRANSIT → OUT_FOR_DELIVERY or RETURNED; OUT_FOR_DELIVERY → DELIVERED or RETURNED; DELIVERED → RETURNED.
2. THE Order_State_Machine SHALL treat CANCELED and RETURNED as terminal states with no outgoing transitions.
3. WHEN a valid transition is requested, THE Order_State_Machine SHALL return successfully without error.
4. WHEN an invalid transition is requested, THE Order_State_Machine SHALL throw an AppError.badRequest with a message describing the invalid transition.
5. THE Order_State_Machine SHALL expose a method to retrieve all valid target statuses from a given current status.


### Requirement 27: List Shipments for Order

**User Story:** As a store admin, I want to view all shipments for an order, so that I can track delivery progress.

#### Acceptance Criteria

1. WHEN an authenticated member with shipment:view permission requests the shipment list for an order, THE Shipment_Service SHALL return all Shipment records for the specified order.
2. IF the specified order ID does not exist within the current store, THEN THE Shipment_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the shipment:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 28: Create Shipment

**User Story:** As a store admin, I want to create a shipment for an order, so that I can record shipping details and track delivery.

#### Acceptance Criteria

1. WHEN an authenticated member with shipment:create permission submits a valid shipment creation request for an order, THE Shipment_Service SHALL create a new Shipment record and return it with a 201 status.
2. THE Shipment_Service SHALL validate the creation request using a Zod schema requiring provider (1-100 characters), and allowing optional service_name (max 100 characters), optional tracking_number (max 100 characters), optional shipping_cost (non-negative number, default 0), and optional expected_delivery_at (coerced date, must be in the future).
3. IF the order is in CANCELED or RETURNED status, THEN THE Shipment_Service SHALL return a 400 Bad Request error with the message "Cannot create shipment for canceled/returned order".
4. IF the specified order ID does not exist within the current store, THEN THE Shipment_Service SHALL return a 404 Not Found error.
5. IF the authenticated user does not have the shipment:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
6. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 29: Update Shipment

**User Story:** As a store admin, I want to update shipment details, so that I can correct or add tracking information.

#### Acceptance Criteria

1. WHEN an authenticated member with shipment:update permission submits a valid update request for an existing shipment, THE Shipment_Service SHALL update the Shipment record and return the updated record.
2. THE Shipment_Service SHALL validate the update request using a Zod schema allowing optional provider (1-100 characters), optional service_name (max 100 characters), optional tracking_number (max 100 characters), optional shipping_cost (non-negative number), and optional expected_delivery_at (coerced date).
3. IF the specified shipment ID does not exist within the current store, THEN THE Shipment_Service SHALL return a 404 Not Found error with the message "Shipment not found".
4. IF the authenticated user does not have the shipment:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
5. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 30: Update Shipment Status

**User Story:** As a store admin, I want to update a shipment's delivery status, so that I can track the shipment through its delivery lifecycle.

#### Acceptance Criteria

1. WHEN an authenticated member with shipment:update permission submits a valid status update for an existing shipment, THE Shipment_Service SHALL update the shipment's status.
2. WHEN the shipment status transitions to SHIPPED, THE Shipment_Service SHALL auto-set the shipped_at timestamp to the current date/time.
3. WHEN the shipment status transitions to DELIVERED, THE Shipment_Service SHALL auto-set the delivered_at timestamp to the current date/time.
4. IF the requested shipment status transition is invalid, THEN THE Shipment_Service SHALL return a 400 Bad Request error with the message "Invalid shipment status transition".
5. IF the specified shipment ID does not exist within the current store, THEN THE Shipment_Service SHALL return a 404 Not Found error.
6. IF the authenticated user does not have the shipment:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 31: List Payments for Order

**User Story:** As a store admin, I want to view all payment transactions for an order, so that I can track the payment history.

#### Acceptance Criteria

1. WHEN an authenticated member with payment:view permission requests the payment list for an order, THE Payment_Service SHALL return all PaymentTransaction records for the specified order.
2. IF the specified order ID does not exist within the current store, THEN THE Payment_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the payment:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 32: Record Payment

**User Story:** As a store admin, I want to record a payment against an order, so that I can track money received and update the order's payment status.

#### Acceptance Criteria

1. WHEN an authenticated member with payment:create permission submits a valid payment recording request, THE Payment_Service SHALL create a new PaymentTransaction record with status CAPTURED and return it with a 201 status.
2. THE Payment_Service SHALL validate the payment request using a Zod schema requiring method (PaymentMethod) and amount (positive number), and allowing optional currency_code (3 characters, default store currency), optional provider (max 100 characters), optional transaction_reference (max 255 characters), optional payment_link (valid URL), and optional paid_at (coerced date).
3. IF the payment amount exceeds the order's remaining unpaid balance (grand_total minus sum of existing captured payments plus refunds), THEN THE Payment_Service SHALL return a 400 Bad Request error with the message "Payment amount exceeds remaining balance".
4. WHEN a payment is successfully recorded, THE Payment_Service SHALL auto-recalculate the order's payment_status based on total captured payments versus grand_total.
5. WHEN total captured payments minus refunds equals or exceeds grand_total, THE Payment_Service SHALL set payment_status to PAID.
6. WHEN total captured payments minus refunds is greater than zero but less than grand_total, THE Payment_Service SHALL set payment_status to PARTIALLY_PAID.
7. WHEN a payment is recorded, THE Payment_Service SHALL create an OrderTimeline entry with event PAYMENT_RECORDED.
8. THE Payment_Service SHALL execute the payment recording and status recalculation within a single database transaction.
9. IF the specified order ID does not exist within the current store, THEN THE Payment_Service SHALL return a 404 Not Found error.
10. IF the authenticated user does not have the payment:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
11. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 33: Process Refund

**User Story:** As a store admin, I want to process a refund for an order, so that I can return money to customers and update the payment status accordingly.

#### Acceptance Criteria

1. WHEN an authenticated member with payment:refund permission submits a valid refund request, THE Payment_Service SHALL create a new PaymentTransaction record with status REFUNDED and return it with a 201 status.
2. THE Payment_Service SHALL validate the refund request using a Zod schema requiring amount (positive number) and allowing optional reason (string).
3. IF the refund amount exceeds the net paid amount (total captured minus total already refunded), THEN THE Payment_Service SHALL return a 400 Bad Request error with the message "Refund amount exceeds total paid amount".
4. WHEN a refund is successfully processed, THE Payment_Service SHALL auto-recalculate the order's payment_status.
5. WHEN total refunds equal or exceed total captured payments (net paid is zero or negative), THE Payment_Service SHALL set payment_status to REFUNDED.
6. WHEN total refunds are greater than zero but net paid is still positive and less than grand_total, THE Payment_Service SHALL set payment_status to PARTIALLY_REFUNDED.
7. WHEN a refund is processed, THE Payment_Service SHALL create an OrderTimeline entry with event REFUND_PROCESSED.
8. THE Payment_Service SHALL execute the refund processing and status recalculation within a single database transaction.
9. IF the specified order ID does not exist within the current store, THEN THE Payment_Service SHALL return a 404 Not Found error.
10. IF the authenticated user does not have the payment:refund permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
11. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 34: Payment Status Recalculation

**User Story:** As a system component, I want payment status to be automatically recalculated after each payment or refund, so that the order always reflects its true financial state.

#### Acceptance Criteria

1. WHEN recalculating payment status, THE Payment_Service SHALL sum all CAPTURED payment transactions and all REFUNDED transactions for the order.
2. WHEN net paid (captured minus refunded) is zero, THE Payment_Service SHALL set payment_status to UNPAID.
3. WHEN net paid is greater than zero but less than grand_total, THE Payment_Service SHALL set payment_status to PARTIALLY_PAID.
4. WHEN net paid equals or exceeds grand_total, THE Payment_Service SHALL set payment_status to PAID.
5. WHEN refunds exist and net paid is zero or negative, THE Payment_Service SHALL set payment_status to REFUNDED.
6. WHEN refunds exist and net paid is positive but less than grand_total, THE Payment_Service SHALL set payment_status to PARTIALLY_REFUNDED.


### Requirement 35: Dashboard Overview

**User Story:** As a store admin, I want to see an overview of my store's performance metrics, so that I can quickly assess business health.

#### Acceptance Criteria

1. WHEN an authenticated member with dashboard:view permission requests the dashboard overview, THE Dashboard_Service SHALL return an overview object containing total_orders, total_revenue, total_customers, orders_today, revenue_today, pending_orders, and average_order_value.
2. THE Dashboard_Service SHALL calculate total_revenue and revenue_today by summing grand_total of orders excluding those with status CANCELED or RETURNED.
3. THE Dashboard_Service SHALL calculate average_order_value as total_revenue divided by total_orders (excluding CANCELED and RETURNED orders).
4. THE Dashboard_Service SHALL calculate pending_orders as the count of orders with status PENDING in the current store.
5. IF the authenticated user does not have the dashboard:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 36: Dashboard Sales Statistics

**User Story:** As a store admin, I want to view sales statistics over time, so that I can identify trends and plan accordingly.

#### Acceptance Criteria

1. WHEN an authenticated member with dashboard:view permission requests sales statistics with a period parameter (day, week, month), THE Dashboard_Service SHALL return an array of data points each containing date, orders_count, and revenue.
2. WHEN from_date and/or to_date parameters are provided, THE Dashboard_Service SHALL filter the statistics to the specified date range.
3. THE Dashboard_Service SHALL group results by the specified period (day, week, or month) based on the order's placed_at timestamp.
4. THE Dashboard_Service SHALL exclude orders with status CANCELED or RETURNED from revenue calculations.
5. IF the authenticated user does not have the dashboard:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
6. WHEN validation of query parameters fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 37: Dashboard Inventory Alerts

**User Story:** As a store admin, I want to see which products are running low on stock, so that I can reorder before running out.

#### Acceptance Criteria

1. WHEN an authenticated member with dashboard:view permission requests inventory alerts, THE Dashboard_Service SHALL return a paginated list of variants where available_quantity is at or below the low_stock_threshold.
2. THE Dashboard_Service SHALL include variant_id, product_name, variant_title, sku, available_quantity, and low_stock_threshold for each alert.
3. THE Dashboard_Service SHALL support page and limit pagination parameters.
4. IF the authenticated user does not have the dashboard:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 38: Multi-Tenant Data Isolation

**User Story:** As a platform operator, I want all data to be strictly isolated between stores, so that no store can access another store's data.

#### Acceptance Criteria

1. THE Customer_Service SHALL include store_id in all database queries to ensure customers are scoped to the requesting store.
2. THE Coupon_Service SHALL include store_id in all database queries to ensure coupons are scoped to the requesting store.
3. THE Order_Service SHALL include store_id in all database queries to ensure orders are scoped to the requesting store.
4. THE Shipment_Service SHALL include store_id in all database queries to ensure shipments are scoped to the requesting store.
5. THE Payment_Service SHALL include store_id in all database queries to ensure payment transactions are scoped to the requesting store.
6. THE Dashboard_Service SHALL include store_id in all aggregation queries to ensure metrics reflect only the requesting store's data.
7. THE Resolve_Store_Context middleware SHALL validate the x-store-id header and the user's active membership before any service method is invoked.

### Requirement 39: Order Total Calculation

**User Story:** As a system component, I want order totals to be calculated correctly, so that financial records are accurate.

#### Acceptance Criteria

1. THE Order_Service SHALL calculate subtotal as the sum of (unit_price × quantity) for all order items.
2. THE Order_Service SHALL calculate grand_total using the formula: grand_total = subtotal - discount_total + shipping_total.
3. THE Order_Service SHALL ensure grand_total is never negative (minimum value is zero).
4. THE Order_Service SHALL use the variant's price (falling back to product base_price) as the unit_price for each order item.
5. THE Order_Service SHALL store the unit_price and line_total on each OrderItem record as a snapshot at the time of order creation.

### Requirement 40: Order Number Generation

**User Story:** As a system component, I want order numbers to be auto-generated in a predictable format, so that orders are easily identifiable and unique.

#### Acceptance Criteria

1. THE Order_Service SHALL generate order numbers in the format ORD-{storeId padded to 4 digits}-{sequential padded to 6 digits} (e.g., ORD-0001-000042).
2. THE Order_Service SHALL generate order numbers within a database transaction to prevent duplicate numbers under concurrent requests.
3. THE Order_Service SHALL determine the next sequential number by parsing the last order number for the store and incrementing by one.
4. THE Order_Service SHALL start the sequence at 1 for stores with no existing orders.
5. THE Order_Service SHALL enforce uniqueness of order numbers per store via a database unique constraint.
