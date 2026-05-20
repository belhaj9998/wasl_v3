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
import { sendSuccess } from "../utils/apiResponse";
import type { AppRequest } from "../types";
import { verifyStoreSubscriptionAccess } from "../middlewares/subscriptionAccess.Middleware";
import * as storeSettingsController from "../controllers/store-admin/storeSettings.Controller";
import * as storeMemberController from "../controllers/store-admin/storeMember.Controller";
import * as storeRoleController from "../controllers/store-admin/storeRole.Controller";

const router = Router({ mergeParams: true });

// Apply verifyToken and resolveStoreContext to ALL store-admin routes
router.use(verifyToken, resolveStoreContext, verifyStoreSubscriptionAccess);

// GET /memberships — retrieve current user's membership context for this store
router.get("/memberships", (req, res) => {
  const appReq = req as AppRequest;

  sendSuccess(
    res,
    {
      storeId: appReq.storeId,
      role: appReq.storeRole,
      permissions: appReq.permissions ?? [],
    },
    "Membership retrieved",
  );
});

// ========== Settings Routes ==========

// GET /settings — retrieve store settings
router.get(
  "/settings",
  requirePermission("settings.manage"),
  storeSettingsController.getSettings,
);
// PATCH /settings/general — update general settings
router.patch(
  "/settings/general",
  requirePermission("settings.manage"),
  validateBody(updateGeneralSchema),
  storeSettingsController.updateGeneral,
);

// PATCH /settings/branding — update branding settings
router.patch(
  "/settings/branding",
  requirePermission("settings.manage"),
  validateBody(updateBrandingSchema),
  storeSettingsController.updateBranding,
);

// PATCH /settings/seo — update SEO settings
router.patch(
  "/settings/seo",
  requirePermission("settings.manage"),
  validateBody(updateSeoSchema),
  storeSettingsController.updateSeo,
);

// PATCH /settings/contact — update contact information
router.patch(
  "/settings/contact",
  requirePermission("settings.manage"),
  validateBody(updateContactSchema),
  storeSettingsController.updateContact,
);

// ========== Member Routes ==========

// GET /members — list store members (paginated)
router.get(
  "/members",
  requirePermission("staff.manage"),
  validateQuery(memberListQuerySchema),
  storeMemberController.list,
);

// POST /members/invite — invite a new member
router.post(
  "/members/invite",
  requirePermission("staff.manage"),
  validateBody(inviteMemberSchema),
  storeMemberController.invite,
);

// GET /members/:memberId — get member details
router.get(
  "/members/:memberId",
  requirePermission("staff.manage"),
  validateParams(memberIdParamSchema),
  storeMemberController.getById,
);

// PATCH /members/:memberId/role — update member's role
router.patch(
  "/members/:memberId/role",
  requirePermission("staff.manage"),
  validateParams(memberIdParamSchema),
  validateBody(updateMemberRoleSchema),
  storeMemberController.updateRole,
);

// DELETE /members/:memberId — remove member from store
router.delete(
  "/members/:memberId",
  requirePermission("staff.manage"),
  validateParams(memberIdParamSchema),
  storeMemberController.remove,
);

// POST /members/:memberId/resend-invite — resend invitation
router.post(
  "/members/:memberId/resend-invite",
  requirePermission("staff.manage"),
  validateParams(memberIdParamSchema),
  storeMemberController.resendInvitation,
);

// ========== Role Routes ==========

// GET /roles — list all store roles
router.get(
  "/roles",
  requirePermission("staff.manage"),
  storeRoleController.list,
);

// POST /roles — create a new role
router.post(
  "/roles",
  requirePermission("staff.manage"),
  validateBody(createRoleSchema),
  storeRoleController.create,
);

// GET /roles/:roleId — get role details
router.get(
  "/roles/:roleId",
  requirePermission("staff.manage"),
  validateParams(roleIdParamSchema),
  storeRoleController.getById,
);

// PATCH /roles/:roleId — update role
router.patch(
  "/roles/:roleId",
  requirePermission("staff.manage"),
  validateParams(roleIdParamSchema),
  validateBody(updateRoleSchema),
  storeRoleController.update,
);

// DELETE /roles/:roleId — delete role
router.delete(
  "/roles/:roleId",
  requirePermission("staff.manage"),
  validateParams(roleIdParamSchema),
  storeRoleController.remove,
);

// PUT /roles/:roleId/permissions — replace role permissions
router.put(
  "/roles/:roleId/permissions",
  requirePermission("staff.manage"),
  validateParams(roleIdParamSchema),
  validateBody(updateRolePermissionsSchema),
  storeRoleController.updatePermissions,
);

export default router;
