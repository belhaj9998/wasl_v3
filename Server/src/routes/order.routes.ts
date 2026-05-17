import { Router } from "express";
import {
  verifyToken,
  resolveStoreContext,
  requirePermission,
} from "../middlewares/auth.Middleware";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middlewares/validate.Middleware";
import {
  // Customer schemas
  createCustomerSchema,
  updateCustomerSchema,
  customerListQuerySchema,
  // Address schemas
  createAddressSchema,
  updateAddressSchema,
  // Coupon schemas
  createCouponSchema,
  updateCouponSchema,
  couponListQuerySchema,
  // Order schemas
  createOrderSchema,
  orderListQuerySchema,
  updateOrderStatusSchema,
  addOrderNoteSchema,
  // Shipment schemas
  createShipmentSchema,
  updateShipmentSchema,
  updateShipmentStatusSchema,
  // Payment schemas
  recordPaymentSchema,
  processRefundSchema,
  // Dashboard schemas
  salesStatQuerySchema,
  dashboardPaginationSchema,
  // Param schemas
  customerIdParamSchema,
  addressIdParamSchema,
  couponIdParamSchema,
  orderIdParamSchema,
  shipmentIdParamSchema,
} from "../validators/order.validators";
import { verifyStoreSubscriptionAccess } from "../middlewares/subscriptionAccess.Middleware";
import * as customerController from "../controllers/store-admin/customer.Controller";
import * as couponController from "../controllers/store-admin/coupon.Controller";
import * as orderController from "../controllers/store-admin/order.Controller";
import * as shipmentController from "../controllers/store-admin/shipment.Controller";
import * as paymentController from "../controllers/store-admin/payment.Controller";
import * as dashboardController from "../controllers/store-admin/dashboard.Controller";

const router = Router({ mergeParams: true });

// Apply verifyToken and resolveStoreContext to ALL order module routes
router.use(verifyToken, resolveStoreContext, verifyStoreSubscriptionAccess);

// ========== Customer Routes ==========

// GET /customers — list customers (paginated)
router.get(
  "/customers",
  requirePermission("customers.view"),
  validateQuery(customerListQuerySchema),
  customerController.list,
);

// POST /customers — create a new customer
router.post(
  "/customers",
  requirePermission("customers.manage"),
  validateBody(createCustomerSchema),
  customerController.create,
);

// GET /customers/:customerId — get customer by ID
router.get(
  "/customers/:customerId",
  requirePermission("customers.view"),
  validateParams(customerIdParamSchema),
  customerController.getById,
);

// PATCH /customers/:customerId — update customer
router.patch(
  "/customers/:customerId",
  requirePermission("customers.manage"),
  validateParams(customerIdParamSchema),
  validateBody(updateCustomerSchema),
  customerController.update,
);

// DELETE /customers/:customerId — delete customer (soft delete)
router.delete(
  "/customers/:customerId",
  requirePermission("customers.manage"),
  validateParams(customerIdParamSchema),
  customerController.remove,
);

// GET /customers/:customerId/orders — get customer order history
router.get(
  "/customers/:customerId/orders",
  requirePermission("customers.view"),
  validateParams(customerIdParamSchema),
  customerController.getOrderHistory,
);

// GET /customers/:customerId/addresses — list customer addresses
router.get(
  "/customers/:customerId/addresses",
  requirePermission("customers.view"),
  validateParams(customerIdParamSchema),
  customerController.listAddresses,
);

// POST /customers/:customerId/addresses — create address
router.post(
  "/customers/:customerId/addresses",
  requirePermission("customers.manage"),
  validateParams(customerIdParamSchema),
  validateBody(createAddressSchema),
  customerController.createAddress,
);

// PATCH /customers/:customerId/addresses/:addressId — update address
router.patch(
  "/customers/:customerId/addresses/:addressId",
  requirePermission("customers.manage"),
  validateParams(addressIdParamSchema),
  validateBody(updateAddressSchema),
  customerController.updateAddress,
);

// DELETE /customers/:customerId/addresses/:addressId — delete address
router.delete(
  "/customers/:customerId/addresses/:addressId",
  requirePermission("customers.manage"),
  validateParams(addressIdParamSchema),
  customerController.deleteAddress,
);

// PATCH /customers/:customerId/addresses/:addressId/set-default — set default address
router.patch(
  "/customers/:customerId/addresses/:addressId/set-default",
  requirePermission("customers.manage"),
  validateParams(addressIdParamSchema),
  customerController.setDefaultAddress,
);

// ========== Coupon Routes ==========

// POST /coupons/validate — validate a coupon (BEFORE :couponId to avoid route conflict)
router.post(
  "/coupons/validate",
  requirePermission("coupons.manage"),
  couponController.validateCoupon,
);

// GET /coupons — list coupons (paginated)
router.get(
  "/coupons",
  requirePermission("coupons.manage"),
  validateQuery(couponListQuerySchema),
  couponController.list,
);

// POST /coupons — create a new coupon
router.post(
  "/coupons",
  requirePermission("coupons.manage"),
  validateBody(createCouponSchema),
  couponController.create,
);

// GET /coupons/:couponId — get coupon by ID
router.get(
  "/coupons/:couponId",
  requirePermission("coupons.manage"),
  validateParams(couponIdParamSchema),
  couponController.getById,
);

// PATCH /coupons/:couponId — update coupon
router.patch(
  "/coupons/:couponId",
  requirePermission("coupons.manage"),
  validateParams(couponIdParamSchema),
  validateBody(updateCouponSchema),
  couponController.update,
);

// DELETE /coupons/:couponId — delete coupon
router.delete(
  "/coupons/:couponId",
  requirePermission("coupons.manage"),
  validateParams(couponIdParamSchema),
  couponController.remove,
);

// GET /coupons/:couponId/usages — get coupon usage history
router.get(
  "/coupons/:couponId/usages",
  requirePermission("coupons.manage"),
  validateParams(couponIdParamSchema),
  couponController.getUsageHistory,
);

// ========== Order Routes ==========

// GET /orders — list orders (paginated)
router.get(
  "/orders",
  requirePermission("orders.view"),
  validateQuery(orderListQuerySchema),
  orderController.list,
);

// POST /orders — create a new order
router.post(
  "/orders",
  requirePermission("orders.create"),
  validateBody(createOrderSchema),
  orderController.create,
);

// GET /orders/:orderId — get order by ID
router.get(
  "/orders/:orderId",
  requirePermission("orders.view"),
  validateParams(orderIdParamSchema),
  orderController.getById,
);

// PATCH /orders/:orderId/status — update order status
router.patch(
  "/orders/:orderId/status",
  requirePermission("orders.manage_status"),
  validateParams(orderIdParamSchema),
  validateBody(updateOrderStatusSchema),
  orderController.updateStatus,
);

// POST /orders/:orderId/cancel — cancel order
router.post(
  "/orders/:orderId/cancel",
  requirePermission("orders.manage_status"),
  validateParams(orderIdParamSchema),
  orderController.cancel,
);

// POST /orders/:orderId/notes — add note to order
router.post(
  "/orders/:orderId/notes",
  requirePermission("orders.update"),
  validateParams(orderIdParamSchema),
  validateBody(addOrderNoteSchema),
  orderController.addNote,
);

// GET /orders/:orderId/timeline — get order timeline
router.get(
  "/orders/:orderId/timeline",
  requirePermission("orders.view"),
  validateParams(orderIdParamSchema),
  orderController.getTimeline,
);

// ========== Shipment Routes ==========

// GET /orders/:orderId/shipments — list shipments for an order
router.get(
  "/orders/:orderId/shipments",
  requirePermission("shipments.manage"),
  validateParams(orderIdParamSchema),
  shipmentController.listByOrder,
);

// POST /orders/:orderId/shipments — create shipment for an order
router.post(
  "/orders/:orderId/shipments",
  requirePermission("shipments.manage"),
  validateParams(orderIdParamSchema),
  validateBody(createShipmentSchema),
  shipmentController.create,
);

// GET /shipments/:shipmentId — get shipment by ID
router.get(
  "/shipments/:shipmentId",
  requirePermission("shipments.manage"),
  validateParams(shipmentIdParamSchema),
  shipmentController.getById,
);

// PATCH /shipments/:shipmentId — update shipment
router.patch(
  "/shipments/:shipmentId",
  requirePermission("shipments.manage"),
  validateParams(shipmentIdParamSchema),
  validateBody(updateShipmentSchema),
  shipmentController.update,
);

// PATCH /shipments/:shipmentId/status — update shipment status
router.patch(
  "/shipments/:shipmentId/status",
  requirePermission("shipments.manage"),
  validateParams(shipmentIdParamSchema),
  validateBody(updateShipmentStatusSchema),
  shipmentController.updateStatus,
);

// ========== Payment Routes ==========

// GET /orders/:orderId/payments — list payments for an order
router.get(
  "/orders/:orderId/payments",
  requirePermission("payments.view"),
  validateParams(orderIdParamSchema),
  paymentController.listByOrder,
);

// POST /orders/:orderId/payments — record a payment
router.post(
  "/orders/:orderId/payments",
  requirePermission("payments.view"),
  validateParams(orderIdParamSchema),
  validateBody(recordPaymentSchema),
  paymentController.recordPayment,
);

// POST /orders/:orderId/refunds — process a refund
router.post(
  "/orders/:orderId/refunds",
  requirePermission("payments.view"),
  validateParams(orderIdParamSchema),
  validateBody(processRefundSchema),
  paymentController.processRefund,
);

// ========== Dashboard Routes ==========

// GET /dashboard/overview — get store dashboard overview
router.get(
  "/dashboard/overview",
  requirePermission("analytics.view"),
  dashboardController.getOverview,
);

// GET /dashboard/sales-stats — get sales statistics
router.get(
  "/dashboard/sales-stats",
  requirePermission("analytics.view"),
  validateQuery(salesStatQuerySchema),
  dashboardController.getSalesStats,
);

// GET /dashboard/inventory-alerts — get low-stock inventory alerts
router.get(
  "/dashboard/inventory-alerts",
  requirePermission("analytics.view"),
  validateQuery(dashboardPaginationSchema),
  dashboardController.getInventoryAlerts,
);

export default router;
