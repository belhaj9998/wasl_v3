import { Router } from "express";
import { verifyToken, platformGuard } from "../middlewares/auth.Middleware";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middlewares/validate.Middleware";
import {
  platformUpdateUserSchema,
  platformUpdateStoreStatusSchema,
  createPlanSchema,
  updatePlanSchema,
  updateSubscriptionSchema,
  createPermissionSchema,
  updatePermissionSchema,
  paginationSchema,
  idParamSchema,
  growthQuerySchema,
} from "../validators/platform.validators";
import * as platformUserController from "../controllers/platform/platformUser.Controller";
import * as platformStoreController from "../controllers/platform/platformStore.Controller";
import * as planController from "../controllers/platform/plan.Controller";
import * as subscriptionController from "../controllers/platform/subscription.Controller";
import * as permissionController from "../controllers/platform/permission.Controller";
import * as dashboardController from "../controllers/platform/dashboard.Controller";

const router = Router();

// Apply verifyToken and platformGuard to ALL platform routes
router.use(verifyToken, platformGuard);

// ========== Users ==========

// GET /users — paginated list with filters
router.get(
  "/users",
  validateQuery(paginationSchema),
  platformUserController.list,
);

// GET /users/:id — single user by ID
router.get(
  "/users/:id",
  validateParams(idParamSchema),
  platformUserController.getById,
);

// PATCH /users/:id — update user fields
router.patch(
  "/users/:id",
  validateParams(idParamSchema),
  validateBody(platformUpdateUserSchema),
  platformUserController.update,
);

// DELETE /users/:id — soft-delete user
router.delete(
  "/users/:id",
  validateParams(idParamSchema),
  platformUserController.remove,
);

// ========== Stores ==========

// GET /stores — paginated list with filters
router.get(
  "/stores",
  validateQuery(paginationSchema),
  platformStoreController.list,
);

// GET /stores/:id — single store by ID
router.get(
  "/stores/:id",
  validateParams(idParamSchema),
  platformStoreController.getById,
);

// PATCH /stores/:id/status — update store status
router.patch(
  "/stores/:id/status",
  validateParams(idParamSchema),
  validateBody(platformUpdateStoreStatusSchema),
  platformStoreController.updateStatus,
);

// DELETE /stores/:id — soft-delete store
router.delete(
  "/stores/:id",
  validateParams(idParamSchema),
  platformStoreController.remove,
);

// ========== Plans ==========

// GET /plans — list all plans
router.get("/plans", planController.list);

// POST /plans — create a new plan
router.post("/plans", validateBody(createPlanSchema), planController.create);

// GET /plans/:id — single plan by ID
router.get("/plans/:id", validateParams(idParamSchema), planController.getById);

// PATCH /plans/:id — update plan fields
router.patch(
  "/plans/:id",
  validateParams(idParamSchema),
  validateBody(updatePlanSchema),
  planController.update,
);

// DELETE /plans/:id — soft-delete plan
router.delete(
  "/plans/:id",
  validateParams(idParamSchema),
  planController.remove,
);

// ========== Subscriptions ==========

// GET /subscriptions — paginated list
router.get(
  "/subscriptions",
  validateQuery(paginationSchema),
  subscriptionController.list,
);

// GET /subscriptions/:id — single subscription by ID
router.get(
  "/subscriptions/:id",
  validateParams(idParamSchema),
  subscriptionController.getById,
);

// PATCH /subscriptions/:id — update subscription
router.patch(
  "/subscriptions/:id",
  validateParams(idParamSchema),
  validateBody(updateSubscriptionSchema),
  subscriptionController.update,
);

// ========== Permissions ==========

// GET /permissions — list all permissions
router.get("/permissions", permissionController.list);

// POST /permissions — create a new permission
router.post(
  "/permissions",
  validateBody(createPermissionSchema),
  permissionController.create,
);

// PATCH /permissions/:id — update permission
router.patch(
  "/permissions/:id",
  validateParams(idParamSchema),
  validateBody(updatePermissionSchema),
  permissionController.update,
);

// DELETE /permissions/:id — delete permission
router.delete(
  "/permissions/:id",
  validateParams(idParamSchema),
  permissionController.remove,
);

// ========== Dashboard ==========

// GET /dashboard/stats — platform-wide statistics
router.get("/dashboard/stats", dashboardController.getStats);

// GET /dashboard/revenue — aggregated revenue data
router.get("/dashboard/revenue", dashboardController.getRevenue);

// GET /dashboard/growth — store growth metrics by month
router.get(
  "/dashboard/growth",
  validateQuery(growthQuerySchema),
  dashboardController.getGrowth,
);

export default router;
