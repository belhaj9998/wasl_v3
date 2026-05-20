import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { authService } from "../../services/auth.Service";
import { tokenService } from "../../services/token.Service";
import { AppError } from "../../utils/AppError";
import { AppRequest } from "../../types";
import prisma from "../../configs/prisma";

/**
 * AuthController handles all authentication-related HTTP endpoints.
 * Validation is handled by the validate middleware in the route layer.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * POST /api/auth/register
 * Creates a new user account, sets refresh cookie, returns user + accessToken.
 */
export const register = asyncHandler(async (req: AppRequest, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.register(
    req.body,
  );

  tokenService.setRefreshCookie(res, refreshToken);

  sendSuccess(res, { user, accessToken }, "Registration successful", 201);
});

/**
 * POST /api/auth/login
 * Authenticates user, sets refresh cookie, returns user + accessToken.
 */
export const login = asyncHandler(async (req: AppRequest, res: Response) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);

  tokenService.setRefreshCookie(res, refreshToken);

  sendSuccess(res, { user, accessToken }, "Login successful");
});

/**
 * POST /api/auth/logout
 * Extracts refresh token from cookie, revokes it, clears cookie.
 */
export const logout = asyncHandler(async (req: AppRequest, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;

  if (refreshToken && req.user?.userId) {
    await authService.logout(req.user.userId, refreshToken);
  }

  tokenService.clearRefreshCookie(res);

  sendSuccess(res, null, "Logged out successfully");
});

/**
 * POST /api/auth/refresh
 * Extracts refresh token from cookie, verifies it, issues new access token.
 */
export const refresh = asyncHandler(async (req: AppRequest, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    throw AppError.unauthorized("No refresh token provided");
  }

  const payload = await tokenService.verifyRefreshToken(refreshToken);

  // Look up user's current system role for the new access token
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { system_role: true },
  });

  if (!user) {
    throw AppError.unauthorized("Unauthorized");
  }

  const accessToken = tokenService.generateAccessToken({
    userId: payload.userId,
    systemRole: user.system_role,
  });

  sendSuccess(res, { accessToken }, "Token refreshed");
});

/**
 * POST /api/auth/forgot-password
 * Initiates password reset flow. Always returns 200 regardless of email existence.
 */
export const forgotPassword = asyncHandler(
  async (req: AppRequest, res: Response) => {
    await authService.forgotPassword(req.body.email);

    sendSuccess(res, null, "If the email exists, a reset link has been sent");
  },
);

/**
 * POST /api/auth/reset-password
 * Resets user password using a valid reset token.
 */
export const resetPassword = asyncHandler(
  async (req: AppRequest, res: Response) => {
    await authService.resetPassword(req.body);

    sendSuccess(res, null, "Password reset successful");
  },
);

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
export const getProfile = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const userId = req.user!.userId;
    const user = await authService.getProfile(userId);

    sendSuccess(res, { user }, "Profile retrieved");
  },
);

/**
 * PATCH /api/auth/me
 * Updates the authenticated user's profile (name, avatar_url only).
 */
export const updateProfile = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const userId = req.user!.userId;
    const user = await authService.updateProfile(userId, req.body);

    sendSuccess(res, { user }, "Profile updated");
  },
);

/**
 * POST /api/auth/change-password
 * Changes the authenticated user's password after verifying current password.
 */
export const changePassword = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const userId = req.user!.userId;
    await authService.changePassword(userId, req.body);

    sendSuccess(res, null, "Password changed successfully");
  },
);

export const getMyStores = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const userId = req.user!.userId;
    const stores = await authService.getMyStores(userId);

    sendSuccess(res, stores, "Stores retrieved");
  },
);

export const getMySubscription = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const userId = req.user!.userId;
    const subscription = await authService.getMySubscription(userId);

    sendSuccess(res, subscription, "Subscription retrieved");
  },
);
