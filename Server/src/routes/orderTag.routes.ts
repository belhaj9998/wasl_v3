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
import { verifyStoreSubscriptionAccess } from "../middlewares/subscriptionAccess.Middleware";
import {
  createOrderTagSchema,
  updateOrderTagSchema,
  orderTagsListQuerySchema,
  orderTagIdParamSchema,
} from "../validators/orderTag.validators";
import * as orderTagController from "../controllers/store-admin/orderTag.Controller";

/**
 * Router for tag-definition CRUD under `/api/stores/:storeId/order-tags`.
 *
 * - `mergeParams: true` so `:storeId` reaches downstream middleware.
 * - The standard tenant chain (`verifyToken → resolveStoreContext →
 *   verifyStoreSubscriptionAccess`) is applied to every route, identical
 *   to the existing store-admin routers.
 *
 * Validates: Requirements 6.1, 6.3, 6.4
 */
const router = Router({ mergeParams: true });

router.use(verifyToken, resolveStoreContext, verifyStoreSubscriptionAccess);

// GET /order-tags — list all tags in the store
router.get(
  "/order-tags",
  requirePermission("orders.tags.read"),
  validateQuery(orderTagsListQuerySchema),
  orderTagController.list,
);

// POST /order-tags — create a new tag definition
router.post(
  "/order-tags",
  requirePermission("orders.tags.manage"),
  validateBody(createOrderTagSchema),
  orderTagController.create,
);

// PATCH /order-tags/:id — partially update a tag
router.patch(
  "/order-tags/:id",
  requirePermission("orders.tags.manage"),
  validateParams(orderTagIdParamSchema),
  validateBody(updateOrderTagSchema),
  orderTagController.update,
);

// DELETE /order-tags/:id — delete a tag (cascade-deletes assignments)
router.delete(
  "/order-tags/:id",
  requirePermission("orders.tags.manage"),
  validateParams(orderTagIdParamSchema),
  orderTagController.remove,
);

export default router;
