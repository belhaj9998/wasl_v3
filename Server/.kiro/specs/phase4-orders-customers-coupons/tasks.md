# Implementation Plan: Phase 4 — Orders, Customers, Coupons, and Reports

## Overview

This plan implements the commercial core of Wasl SaaS: customer management with address books, coupon/discount engine with validation and usage tracking, full order lifecycle management (creation, status transitions, cancellation with inventory rollback, notes, timeline), shipment tracking, payment recording with auto-status recalculation, and a store-level dashboard for analytics. The implementation follows the established controller → service → Prisma pattern with Zod validation, building incrementally from validators and utilities through services, controllers, and finally route wiring.

## Tasks

- [x] 1. Create Phase 4 validation schemas
  - [x] 1.1 Create order/customer/coupon validators (`src/validators/order.validators.ts`)
    - Implement all Zod schemas as defined in the design document:
    - Customer schemas: `createCustomerSchema`, `updateCustomerSchema`, `customerListQuerySchema`
    - Address schemas: `createAddressSchema`, `updateAddressSchema`
    - Coupon schemas: `createCouponSchema`, `updateCouponSchema`, `couponListQuerySchema`
    - Order schemas: `createOrderSchema`, `orderListQuerySchema`, `updateOrderStatusSchema`, `updatePaymentStatusSchema`, `addOrderNoteSchema`
    - Shipment schemas: `createShipmentSchema`, `updateShipmentSchema`, `updateShipmentStatusSchema`
    - Payment schemas: `recordPaymentSchema`, `processRefundSchema`
    - Dashboard schemas: `salesStatQuerySchema`, `dashboardPaginationSchema`
    - Param schemas: `customerIdParamSchema`, `addressIdParamSchema`, `couponIdParamSchema`, `orderIdParamSchema`, `shipmentIdParamSchema`
    - Include `.refine()` for coupon percentage validation (1-100) and date range validation (starts_at < ends_at)
    - Include `.transform()` for coupon code uppercase conversion
    - _Requirements: 2.2, 4.2, 8.2, 9.1, 13.2, 15.2, 20.2, 22.2, 28.2, 29.2, 32.2, 33.2, 36.6_

- [x] 2. Implement OrderStateMachine and OrderNumberGenerator utilities
  - [x] 2.1 Create OrderStateMachine (`src/utils/orderStateMachine.ts`)
    - Define the valid transitions map as a readonly Record
    - Implement `canTransition(from, to): boolean`
    - Implement `getValidTransitions(from): OrderStatus[]`
    - Implement `assertTransition(from, to): void` — throws AppError.badRequest if invalid
    - Valid transitions: DRAFT→PENDING/CANCELED, PENDING→CONFIRMED/CANCELED, CONFIRMED→PROCESSING/CANCELED, PROCESSING→PREPARING/CANCELED, PREPARING→SHIPPED/CANCELED, SHIPPED→IN_TRANSIT/RETURNED, IN_TRANSIT→OUT_FOR_DELIVERY/RETURNED, OUT_FOR_DELIVERY→DELIVERED/RETURNED, DELIVERED→RETURNED
    - Terminal states: CANCELED, RETURNED (no outgoing transitions)
    - Export as singleton instance
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

  - [x] 2.2 Create OrderNumberGenerator (`src/utils/orderNumberGenerator.ts`)
    - Implement `generate(storeId, tx): Promise<string>`
    - Format: `ORD-{storeId padded 4}-{sequential padded 6}` (e.g., ORD-0001-000042)
    - Query last order for store within transaction, parse sequence, increment
    - Start at 1 for stores with no existing orders
    - Must be called within a Prisma transaction to prevent race conditions
    - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5_

  - [ ]* 2.3 Write property test for OrderStateMachine (Property 1)
    - **Property 1: Order state machine transition validity**
    - For any status S and target T, assertTransition either succeeds silently or throws AppError
    - Valid transitions set is deterministic and immutable
    - Terminal states (CANCELED, RETURNED) have no outgoing transitions
    - **Validates: Requirements 22.3, 26.1, 26.2, 26.3, 26.4, 26.5**

- [x] 3. Implement CustomerService
  - [x] 3.1 Create CustomerService (`src/services/store-admin/customer.Service.ts`)
    - Implement `list(storeId, params)` — paginated listing with search (first_name, last_name, email, phone), status filter, accepts_marketing filter, sorting (created_at, first_name, last_name)
    - Implement `getById(storeId, customerId)` — fetch single customer, 404 if not found
    - Implement `create(storeId, data)` — validate at least email or phone provided (400), check email uniqueness among active customers (409), check phone uniqueness among active customers (409), create record
    - Implement `update(storeId, customerId, data)` — validate email/phone uniqueness excluding current customer (409), 404 if not found
    - Implement `delete(storeId, customerId)` — soft delete by setting status to ARCHIVED, 404 if not found
    - Implement `getOrderHistory(storeId, customerId, params)` — paginated orders for customer, 404 if customer not found
    - Implement `listAddresses(storeId, customerId)` — return all addresses for customer
    - Implement `createAddress(storeId, customerId, data)` — if is_default=true, unset previous default; create address
    - Implement `updateAddress(storeId, customerId, addressId, data)` — if is_default=true, unset previous default; 404 if not found
    - Implement `deleteAddress(storeId, customerId, addressId)` — hard delete address, 404 if not found
    - Implement `setDefaultAddress(storeId, customerId, addressId)` — unset all defaults, set specified as default, 404 if not found
    - _Requirements: 1.1-1.8, 2.1-2.7, 3.1-3.3, 4.1-4.7, 5.1-5.4, 6.1-6.3, 7.1-7.3, 8.1-8.6, 9.1-9.5, 10.1-10.3, 11.1-11.4_

  - [ ]* 3.2 Write property test for customer uniqueness constraints (Property 6)
    - **Property 6: Customer uniqueness constraints**
    - For any store, never two active customers with same non-null email
    - For any store, never two active customers with same non-null phone
    - **Validates: Requirements 2.4, 2.5, 4.3, 4.4**

  - [ ]* 3.3 Write property test for default address uniqueness (Property 10)
    - **Property 10: Default address uniqueness**
    - For any customer, at most one address has is_default=true at any time
    - Setting new default atomically unsets previous default
    - **Validates: Requirements 8.3, 9.2, 11.1, 11.2**

- [x] 4. Implement CouponService
  - [x] 4.1 Create CouponService (`src/services/store-admin/coupon.Service.ts`)
    - Implement `list(storeId, params)` — paginated listing with search (code, description), is_active filter, type filter, sorting (created_at, code, starts_at, ends_at)
    - Implement `getById(storeId, couponId)` — fetch single coupon, 404 if not found
    - Implement `create(storeId, data)` — store code uppercase, validate percentage 1-100, validate starts_at < ends_at, check code uniqueness per store (409)
    - Implement `update(storeId, couponId, data)` — validate percentage if type is PERCENTAGE, check code uniqueness if changed (409), 404 if not found
    - Implement `delete(storeId, couponId)` — check for existing CouponUsage records (409 if any), hard delete, 404 if not found
    - Implement `getUsageHistory(storeId, couponId, params)` — paginated CouponUsage records, 404 if coupon not found
    - Implement `validateCoupon(storeId, code, customerId, orderSubtotal)` — full validation chain: find by code (404), check is_active (400), check date range (400), check minimum_order_amount (400), check usage_limit (400), check usage_limit_per_customer (400), calculate discount (PERCENTAGE or FIXED), apply maximum_discount_amount cap, ensure discount <= subtotal
    - _Requirements: 12.1-12.8, 13.1-13.7, 14.1-14.3, 15.1-15.7, 16.1-16.4, 17.1-17.3, 18.1-18.12_

  - [ ]* 4.2 Write property test for coupon discount bounds (Property 3)
    - **Property 3: Coupon discount bounds**
    - For any valid coupon application with subtotal S: 0 < discount_amount <= S
    - If maximum_discount_amount M is set: discount_amount <= M
    - If type is PERCENTAGE with value V: discount_amount <= S * V / 100
    - **Validates: Requirements 18.9, 18.10, 18.11, 18.12**

  - [ ]* 4.3 Write property test for coupon usage limit enforcement (Property 7)
    - **Property 7: Coupon usage limit enforcement**
    - For any coupon with usage_limit=N, total CouponUsage count never exceeds N
    - For usage_limit_per_customer=M, no single customer has more than M usages
    - **Validates: Requirements 18.7, 18.8**

- [x] 5. Checkpoint — Verify validators, utilities, customer, and coupon services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement OrderService
  - [x] 6.1 Create OrderService (`src/services/store-admin/order.Service.ts`)
    - Implement `list(storeId, params)` — paginated listing with search (order_number, customer_name, customer_phone), filters (status, payment_status, source, customer_id, date_from, date_to, amount_min, amount_max), sorting (placed_at, grand_total, order_number)
    - Implement `getById(storeId, orderId)` — fetch order with items, addresses, timeline, payments, shipments; 404 if not found
    - Implement `create(storeId, data, actorUserId)` — full creation flow in transaction:
      - Validate customer_id if provided (404 if not found/not active)
      - Resolve each item: validate variant exists + active + belongs to product_id (404), validate product is ACTIVE (400), check available inventory (400)
      - Calculate subtotal as sum of (unit_price * quantity)
      - If coupon_code: call CouponService.validateCoupon for discount
      - Calculate grand_total = subtotal - discount_total + shipping_total
      - Generate order number via OrderNumberGenerator
      - Create Order record (status=PENDING, payment_status=UNPAID)
      - Create OrderItems with price snapshots
      - Create OrderAddresses (shipping + optional billing)
      - Reserve inventory (decrement available, increment reserved, create RESERVED movements)
      - Create CouponUsage if coupon applied
      - Create OrderTimeline entry (ORDER_CREATED)
    - Implement `updateStatus(storeId, orderId, data, actorUserId)` — validate transition via OrderStateMachine, update status, create timeline entry (STATUS_CHANGED)
    - Implement `updatePaymentStatus(storeId, orderId, data, actorUserId)` — update payment_status, create timeline entry
    - Implement `cancel(storeId, orderId, actorUserId, reason?)` — validate transition to CANCELED, release inventory (increment available, decrement reserved, create RELEASED movements), create timeline entry, all in transaction
    - Implement `addNote(storeId, orderId, note, actorUserId)` — create timeline entry (NOTE_ADDED), 404 if order not found
    - Implement `getTimeline(storeId, orderId, params)` — paginated timeline entries ordered by created_at desc, 404 if order not found
    - _Requirements: 19.1-19.12, 20.1-20.16, 21.1-21.3, 22.1-22.7, 23.1-23.8, 24.1-24.3, 25.1-25.3, 39.1-39.5, 40.1-40.5_

  - [ ]* 6.2 Write property test for inventory conservation (Property 2)
    - **Property 2: Inventory conservation on order lifecycle**
    - For any order creation followed by cancellation, net change to available_quantity and reserved_quantity is zero
    - Creation: available -= Q, reserved += Q; Cancellation: available += Q, reserved -= Q
    - **Validates: Requirements 20.11, 23.2, 23.3**

  - [ ]* 6.3 Write property test for order total calculation (Property 5)
    - **Property 5: Order total calculation integrity**
    - For any order: grand_total = subtotal - discount_total + shipping_total
    - subtotal = SUM(unit_price * quantity) for all items
    - Invariant holds at creation time
    - **Validates: Requirements 20.8, 20.10, 39.1, 39.2, 39.3**

  - [ ]* 6.4 Write property test for timeline completeness (Property 8)
    - **Property 8: Timeline completeness**
    - For any order status change, exactly one OrderTimeline entry is created with correct from_status, to_status, event, and actor_user_id
    - No status change occurs without a corresponding timeline record
    - **Validates: Requirements 20.13, 22.4, 23.4, 32.7, 33.7**

- [x] 7. Implement ShipmentService
  - [x] 7.1 Create ShipmentService (`src/services/store-admin/shipment.Service.ts`)
    - Implement `listByOrder(storeId, orderId)` — return all shipments for order, 404 if order not found
    - Implement `getById(storeId, shipmentId)` — fetch single shipment, 404 if not found
    - Implement `create(storeId, orderId, data)` — validate order exists (404), validate order not CANCELED/RETURNED (400), create shipment with status PENDING
    - Implement `update(storeId, shipmentId, data)` — update shipment fields, 404 if not found
    - Implement `updateStatus(storeId, shipmentId, data)` — validate status transition, auto-set shipped_at on SHIPPED, auto-set delivered_at on DELIVERED, 404 if not found
    - _Requirements: 27.1-27.3, 28.1-28.6, 29.1-29.5, 30.1-30.6_

- [x] 8. Implement PaymentService
  - [x] 8.1 Create PaymentService (`src/services/store-admin/payment.Service.ts`)
    - Implement `listByOrder(storeId, orderId)` — return all payment transactions for order, 404 if order not found
    - Implement `recordPayment(storeId, orderId, data, actorUserId)` — in transaction: validate order exists (404), validate amount <= remaining balance (400), create PaymentTransaction (status=CAPTURED), recalculate payment_status, create timeline entry (PAYMENT_RECORDED)
    - Implement `processRefund(storeId, orderId, data, actorUserId)` — in transaction: validate order exists (404), validate amount <= net paid (400), create PaymentTransaction (status=REFUNDED), recalculate payment_status, create timeline entry (REFUND_PROCESSED)
    - Implement `recalculatePaymentStatus(storeId, orderId, tx)` — sum captured payments, sum refunds, compute net paid, determine status (UNPAID/PARTIALLY_PAID/PAID/PARTIALLY_REFUNDED/REFUNDED), update order
    - _Requirements: 31.1-31.3, 32.1-32.11, 33.1-33.11, 34.1-34.6_

  - [ ]* 8.2 Write property test for payment status consistency (Property 4)
    - **Property 4: Payment status consistency**
    - For any order with grand_total G: if net paid >= G then PAID; if > 0 but < G then PARTIALLY_PAID; if refunds > 0 and net <= 0 then REFUNDED; if 0 then UNPAID
    - Status always accurately reflects financial state
    - **Validates: Requirements 32.4, 32.5, 32.6, 33.4, 33.5, 33.6, 34.1-34.6**

- [x] 9. Checkpoint — Verify order, shipment, and payment services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement DashboardService
  - [x] 10.1 Create DashboardService (`src/services/store-admin/dashboard.Service.ts`)
    - Implement `getOverview(storeId)` — aggregate: total_orders, total_revenue (excluding CANCELED/RETURNED), total_customers, orders_today, revenue_today, pending_orders, average_order_value
    - Implement `getSalesStats(storeId, params)` — group orders by period (day/week/month) based on placed_at, return array of {date, orders_count, revenue}, exclude CANCELED/RETURNED, filter by from_date/to_date
    - Implement `getInventoryAlerts(storeId, params)` — paginated list of variants where available_quantity <= low_stock_threshold, include product_name, variant_title, sku
    - Use `prisma.order.aggregate()` for efficient calculations
    - _Requirements: 35.1-35.5, 36.1-36.6, 37.1-37.4_

- [x] 11. Implement controllers
  - [x] 11.1 Create CustomerController (`src/controllers/store-admin/customer.Controller.ts`)
    - Implement `list` — extract storeId and query params, call service, respond with sendPaginated
    - Implement `create` — extract storeId and body, call service, respond with sendSuccess (201)
    - Implement `getById` — extract storeId and customerId, call service, respond with sendSuccess
    - Implement `update` — extract storeId, customerId, and body, call service, respond with sendSuccess
    - Implement `delete` — extract storeId and customerId, call service, respond with sendSuccess
    - Implement `getOrderHistory` — extract storeId, customerId, and query params, call service, respond with sendPaginated
    - Implement `listAddresses` — extract storeId and customerId, call service, respond with sendSuccess
    - Implement `createAddress` — extract storeId, customerId, and body, call service, respond with sendSuccess (201)
    - Implement `updateAddress` — extract storeId, customerId, addressId, and body, call service, respond with sendSuccess
    - Implement `deleteAddress` — extract storeId, customerId, and addressId, call service, respond with sendSuccess
    - Implement `setDefaultAddress` — extract storeId, customerId, and addressId, call service, respond with sendSuccess
    - Wrap all handlers with asyncHandler
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1_

  - [x] 11.2 Create CouponController (`src/controllers/store-admin/coupon.Controller.ts`)
    - Implement `list` — extract storeId and query params, call service, respond with sendPaginated
    - Implement `create` — extract storeId and body, call service, respond with sendSuccess (201)
    - Implement `getById` — extract storeId and couponId, call service, respond with sendSuccess
    - Implement `update` — extract storeId, couponId, and body, call service, respond with sendSuccess
    - Implement `delete` — extract storeId and couponId, call service, respond with sendSuccess
    - Implement `getUsageHistory` — extract storeId, couponId, and query params, call service, respond with sendPaginated
    - Implement `validateCoupon` — extract storeId and body (code, subtotal, customer_id?), call service, respond with sendSuccess
    - Wrap all handlers with asyncHandler
    - _Requirements: 12.1, 13.1, 14.1, 15.1, 16.1, 17.1, 18.1_

  - [x] 11.3 Create OrderController (`src/controllers/store-admin/order.Controller.ts`)
    - Implement `list` — extract storeId and query params, call service, respond with sendPaginated
    - Implement `create` — extract storeId, body, and req.user.userId, call service, respond with sendSuccess (201)
    - Implement `getById` — extract storeId and orderId, call service, respond with sendSuccess
    - Implement `updateStatus` — extract storeId, orderId, body, and req.user.userId, call service, respond with sendSuccess
    - Implement `cancel` — extract storeId, orderId, req.user.userId, and optional reason from body, call service, respond with sendSuccess
    - Implement `addNote` — extract storeId, orderId, body.note, and req.user.userId, call service, respond with sendSuccess (201)
    - Implement `getTimeline` — extract storeId, orderId, and query params, call service, respond with sendPaginated
    - Wrap all handlers with asyncHandler
    - _Requirements: 19.1, 20.1, 21.1, 22.1, 23.1, 24.1, 25.1_

  - [x] 11.4 Create ShipmentController (`src/controllers/store-admin/shipment.Controller.ts`)
    - Implement `listByOrder` — extract storeId and orderId, call service, respond with sendSuccess
    - Implement `getById` — extract storeId and shipmentId, call service, respond with sendSuccess
    - Implement `create` — extract storeId, orderId, and body, call service, respond with sendSuccess (201)
    - Implement `update` — extract storeId, shipmentId, and body, call service, respond with sendSuccess
    - Implement `updateStatus` — extract storeId, shipmentId, and body, call service, respond with sendSuccess
    - Wrap all handlers with asyncHandler
    - _Requirements: 27.1, 28.1, 29.1, 30.1_

  - [x] 11.5 Create PaymentController (`src/controllers/store-admin/payment.Controller.ts`)
    - Implement `listByOrder` — extract storeId and orderId, call service, respond with sendSuccess
    - Implement `recordPayment` — extract storeId, orderId, body, and req.user.userId, call service, respond with sendSuccess (201)
    - Implement `processRefund` — extract storeId, orderId, body, and req.user.userId, call service, respond with sendSuccess (201)
    - Wrap all handlers with asyncHandler
    - _Requirements: 31.1, 32.1, 33.1_

  - [x] 11.6 Create DashboardController (`src/controllers/store-admin/dashboard.Controller.ts`)
    - Implement `getOverview` — extract storeId, call service, respond with sendSuccess
    - Implement `getSalesStats` — extract storeId and query params, call service, respond with sendSuccess
    - Implement `getInventoryAlerts` — extract storeId and query params, call service, respond with sendPaginated
    - Wrap all handlers with asyncHandler
    - _Requirements: 35.1, 36.1, 37.1_

- [x] 12. Checkpoint — Verify controllers compile correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement routes and wire into main router
  - [x] 13.1 Create order module routes file (`src/routes/order.routes.ts`)
    - Apply `verifyToken` and `resolveStoreContext` to all routes via `router.use()`
    - Define customer routes: GET /customers, POST /customers, GET /customers/:customerId, PATCH /customers/:customerId, DELETE /customers/:customerId, GET /customers/:customerId/orders, GET /customers/:customerId/addresses, POST /customers/:customerId/addresses, PATCH /customers/:customerId/addresses/:addressId, DELETE /customers/:customerId/addresses/:addressId, PATCH /customers/:customerId/addresses/:addressId/set-default
    - Define coupon routes: GET /coupons, POST /coupons, GET /coupons/:couponId, PATCH /coupons/:couponId, DELETE /coupons/:couponId, GET /coupons/:couponId/usages, POST /coupons/validate
    - Define order routes: GET /orders, POST /orders, GET /orders/:orderId, PATCH /orders/:orderId/status, POST /orders/:orderId/cancel, POST /orders/:orderId/notes, GET /orders/:orderId/timeline
    - Define shipment routes: GET /orders/:orderId/shipments, POST /orders/:orderId/shipments, GET /shipments/:shipmentId, PATCH /shipments/:shipmentId, PATCH /shipments/:shipmentId/status
    - Define payment routes: GET /orders/:orderId/payments, POST /orders/:orderId/payments, POST /orders/:orderId/refunds
    - Define dashboard routes: GET /dashboard/overview, GET /dashboard/sales-stats, GET /dashboard/inventory-alerts
    - Apply `requirePermission` per endpoint with correct permission codes (customer:view, customer:create, customer:update, customer:delete, coupon:view, coupon:create, coupon:update, coupon:delete, order:view, order:create, order:update, order:cancel, shipment:view, shipment:create, shipment:update, payment:view, payment:create, payment:refund, dashboard:view)
    - Apply `validateBody`, `validateQuery`, `validateParams` with appropriate Zod schemas
    - _Requirements: 1.7, 2.6, 4.6, 5.4, 6.3, 8.5, 9.4, 10.3, 11.4, 12.7, 13.6, 14.3, 15.6, 16.4, 19.11, 20.15, 21.3, 22.6, 23.8, 27.3, 28.5, 29.4, 30.6, 31.3, 32.10, 33.10, 35.5, 38.7_

  - [x] 13.2 Wire order routes into main router (`src/routes/index.ts`)
    - Import `orderRoutes` from `./order.routes`
    - Mount at `/api/stores/:storeId` alongside existing storeAdmin and catalog routes
    - Ensure route is mounted before the 404 catch-all
    - _Requirements: 38.7_

- [x] 14. Implement multi-tenant isolation verification
  - [x] 14.1 Verify all services include store_id in queries
    - Audit all Phase 4 service methods to confirm store_id is included in every Prisma where clause
    - Ensure no query can return or modify data from another store
    - Verify CustomerService, CouponService, OrderService, ShipmentService, PaymentService, DashboardService
    - _Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6_

  - [ ]* 14.2 Write property test for multi-tenant data isolation (Property 9)
    - **Property 9: Multi-tenant isolation**
    - For any service method call with storeId=X, all database queries include store_id=X
    - No query returns or modifies data belonging to a different store
    - **Validates: Requirements 38.1, 38.2, 38.3, 38.4, 38.5, 38.6, 38.7**

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript with Express + Prisma + PostgreSQL + Zod
- Existing infrastructure (asyncHandler, AppError, sendSuccess/sendPaginated, verifyToken, resolveStoreContext, requirePermission, validateBody/validateQuery/validateParams) is reused
- The `src/services/store-admin/` directory already exists from Phase 2
- All nullable fields in schemas use `.nullable().optional()` pattern for PATCH semantics
- OrderService depends on CouponService (for validation) and uses OrderStateMachine + OrderNumberGenerator utilities
- PaymentService.recalculatePaymentStatus is called internally after each payment/refund recording
- ShipmentService reuses the same state machine logic for shipment status transitions
- DashboardService is read-only and has no cross-service dependencies
- The coupon validate endpoint (POST /coupons/validate) should be defined BEFORE the `:couponId` param route to avoid route conflicts
- All monetary calculations should use Prisma Decimal type to avoid floating-point issues

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "3.1", "4.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "4.2", "4.3"] },
    { "id": 4, "tasks": ["6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "7.1", "8.1"] },
    { "id": 6, "tasks": ["8.2", "10.1"] },
    { "id": 7, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5", "11.6"] },
    { "id": 8, "tasks": ["13.1"] },
    { "id": 9, "tasks": ["13.2", "14.1"] },
    { "id": 10, "tasks": ["14.2"] }
  ]
}
```
