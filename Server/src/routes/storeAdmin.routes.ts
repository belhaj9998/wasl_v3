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
  updateGeneralSchema,
  updateBrandingSchema,
  updateSeoSchema,
  updateContactSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  createRoleSchema,
  updateRoleSchema,
  updateRolePermissionsSchema,
  memberIdParamSchema,
  roleIdParamSchema,
  memberListQuerySchema,
} from "../validators/storeAdmin.validators";
import * as storeSettingsController from "../controllers/store-admin/storeSettings.Controller";
import * as storeMemberController from "../controllers/store-admin/storeMember.Controller";
import * as storeRoleController from "../controllers/store-admin/storeRole.Controller";

const router = Router({ mergeParams: true });

// Apply verifyToken and resolveStoreContext to ALL store-admin routes
router.use(verifyToken, resolveStoreContext);

// ========== Settings Routes ==========

// GET /settings — retrieve store settings
router.get(
  "/settings",
  requirePermission("store:view"),
  storeSettingsController.getSettings,
);

// PATCH /settings/general — update general settings
router.patch(
  "/settings/general",
  requirePermission("store:update"),
  validateBody(updateGeneralSchema),
  storeSettingsController.updateGeneral,
);

// PATCH /settings/branding — update branding settings
router.patch(
  "/settings/branding",
  requirePermission("store:update"),
  validateBody(updateBrandingSchema),
  storeSettingsController.updateBranding,
);

// PATCH /settings/seo — update SEO settings
router.patch(
  "/settings/seo",
  requirePermission("store:update"),
  validateBody(updateSeoSchema),
  storeSettingsController.updateSeo,
);

// PATCH /settings/contact — update contact information
router.patch(
  "/settings/contact",
  requirePermission("store:update"),
  validateBody(updateContactSchema),
  storeSettingsController.updateContact,
);

// ========== Member Routes ==========

// GET /members — list store members (paginated)
router.get(
  "/members",
  requirePermission("member:view"),
  validateQuery(memberListQuerySchema),
  storeMemberController.list,
);

// POST /members/invite — invite a new member
router.post(
  "/members/invite",
  requirePermission("member:invite"),
  validateBody(inviteMemberSchema),
  storeMemberController.invite,
);

// GET /members/:memberId — get member details
router.get(
  "/members/:memberId",
  requirePermission("member:view"),
  validateParams(memberIdParamSchema),
  storeMemberController.getById,
);

// PATCH /members/:memberId/role — update member's role
router.patch(
  "/members/:memberId/role",
  requirePermission("member:update"),
  validateParams(memberIdParamSchema),
  validateBody(updateMemberRoleSchema),
  storeMemberController.updateRole,
);

// DELETE /members/:memberId — remove member from store
router.delete(
  "/members/:memberId",
  requirePermission("member:remove"),
  validateParams(memberIdParamSchema),
  storeMemberController.remove,
);

// POST /members/:memberId/resend-invite — resend invitation
router.post(
  "/members/:memberId/resend-invite",
  requirePermission("member:invite"),
  validateParams(memberIdParamSchema),
  storeMemberController.resendInvitation,
);

// ========== Role Routes ==========

// GET /roles — list all store roles
router.get("/roles", requirePermission("role:view"), storeRoleController.list);

// POST /roles — create a new role
router.post(
  "/roles",
  requirePermission("role:create"),
  validateBody(createRoleSchema),
  storeRoleController.create,
);

// GET /roles/:roleId — get role details
router.get(
  "/roles/:roleId",
  requirePermission("role:view"),
  validateParams(roleIdParamSchema),
  storeRoleController.getById,
);

// PATCH /roles/:roleId — update role
router.patch(
  "/roles/:roleId",
  requirePermission("role:update"),
  validateParams(roleIdParamSchema),
  validateBody(updateRoleSchema),
  storeRoleController.update,
);

// DELETE /roles/:roleId — delete role
router.delete(
  "/roles/:roleId",
  requirePermission("role:delete"),
  validateParams(roleIdParamSchema),
  storeRoleController.remove,
);

// PUT /roles/:roleId/permissions — replace role permissions
router.put(
  "/roles/:roleId/permissions",
  requirePermission("role:update"),
  validateParams(roleIdParamSchema),
  validateBody(updateRolePermissionsSchema),
  storeRoleController.updatePermissions,
);

export default router;
