import { Router } from "express";
import { authRateLimiter } from "../middlewares/authRateLimiter.Middleware";
import { validateBody } from "../middlewares/validate.Middleware";
import { verifyToken } from "../middlewares/auth.Middleware";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  createStoreSchema,
} from "../validators/auth.validators";
import * as authController from "../controllers/auth/auth.Controller";
import * as storeCreationController from "../controllers/auth/storeCreation.Controller";

const router = Router();

// ========== Public endpoints ==========

// POST /register — validated (no strict rate limit on registration)
router.post("/register", validateBody(registerSchema), authController.register);

// POST /login — rate limited + validated
router.post(
  "/login",
  authRateLimiter,
  validateBody(loginSchema),
  authController.login,
);

// POST /forgot-password — rate limited + validated
router.post(
  "/forgot-password",
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);

// POST /reset-password — validated (no auth required, token in body)
router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  authController.resetPassword,
);

// POST /refresh — no auth required (uses cookie)
router.post("/refresh", authController.refresh);

// ========== Protected endpoints (require verifyToken) ==========

// POST /logout
router.post("/logout", verifyToken, authController.logout);

// GET /me — get current user profile
router.get("/me", verifyToken, authController.getProfile);

// PATCH /me — update current user profile
router.patch(
  "/me",
  verifyToken,
  validateBody(updateProfileSchema),
  authController.updateProfile,
);

// POST /change-password
router.post(
  "/change-password",
  verifyToken,
  validateBody(changePasswordSchema),
  authController.changePassword,
);

// POST /stores — create a new store
router.post(
  "/stores",
  verifyToken,
  validateBody(createStoreSchema),
  storeCreationController.create,
);

export default router;
