import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../configs/prisma";
import { config } from "../configs/App.config";
import { AppError } from "../utils/AppError";
import { tokenService } from "./token.Service";
import {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
  ResetPasswordInput,
  UserProfile,
} from "../types/auth.types";
const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Strips the password field from a User record and returns a UserProfile DTO.
 */
function toUserProfile(user: {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  system_role: any;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url,
    system_role: user.system_role,
    is_active: user.is_active,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

/**
 * AuthService handles user registration, login/logout, profile management,
 * and password reset flows.
 */
export class AuthService {
  /**
   * Registers a new user.
   * Validates email uniqueness first, then phone uniqueness.
   * Hashes password with bcrypt 12 rounds, creates user, generates tokens.
   */
  async register(data: RegisterInput): Promise<{
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
  }> {
    // Check email uniqueness first
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw AppError.conflict("A user with this email already exists");
    }

    // Check phone uniqueness second
    const existingPhone = await prisma.user.findUnique({
      where: { phone: data.phone },
    });
    if (existingPhone) {
      throw AppError.conflict("A user with this phone already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
      },
    });

    // Generate tokens
    const accessToken = tokenService.generateAccessToken({
      userId: user.id,
      systemRole: user.system_role,
    });
    const refreshToken = await tokenService.generateRefreshToken(user.id);

    return {
      user: toUserProfile(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Authenticates a user by email or phone + password.
   * Checks is_active status, verifies password, updates last_login_at, generates tokens.
   */
  async login(data: LoginInput): Promise<{
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
  }> {
    // Determine if identifier is email or phone and find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.identifier }, { phone: data.identifier }],
      },
    });

    if (!user) {
      throw AppError.unauthorized("Invalid credentials");
    }

    // Check if account is active
    if (!user.is_active) {
      throw AppError.forbidden("Account is deactivated");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid credentials");
    }

    // Update last_login_at
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    // Generate tokens
    const accessToken = tokenService.generateAccessToken({
      userId: updatedUser.id,
      systemRole: updatedUser.system_role,
    });
    const refreshToken = await tokenService.generateRefreshToken(
      updatedUser.id,
    );

    return {
      user: toUserProfile(updatedUser),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logs out a user by revoking their refresh token from the database.
   */
  async logout(userId: number, refreshToken: string): Promise<void> {
    await tokenService.revokeRefreshToken(userId, refreshToken);
  }

  /**
   * Retrieves a user's profile by ID, excluding password.
   * Returns 401 if user is soft-deleted.
   */
  async getProfile(userId: number): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deleted_at) {
      throw AppError.unauthorized("Unauthorized");
    }

    return toUserProfile(user);
  }

  /**
   * Updates a user's profile. Only name and avatar_url are permitted fields.
   * All other fields are silently ignored.
   */
  async updateProfile(
    userId: number,
    data: UpdateProfileInput,
  ): Promise<UserProfile> {
    // Only allow name and avatar_url
    const updateData: { name?: string; avatar_url?: string } = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.avatar_url !== undefined) {
      updateData.avatar_url = data.avatar_url;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return toUserProfile(user);
  }

  /**
   * Changes a user's password.
   * Verifies the current password before updating to the new hashed password.
   */
  async changePassword(
    userId: number,
    data: ChangePasswordInput,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.unauthorized("Unauthorized");
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(
      data.current_password,
      user.password,
    );
    if (!isCurrentValid) {
      throw AppError.unauthorized("Current password is incorrect");
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(data.new_password, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }

  /**
   * Initiates a password reset flow.
   * Generates a crypto-random token, hashes it, stores with 1-hour expiry.
   * Always returns success regardless of whether the email exists (prevents email enumeration).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Always return success to prevent email enumeration
      return;
    }

    // Generate reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    // Store hashed token and expiry on user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        reset_token: hashedToken,
        reset_token_expires_at: expiresAt,
      },
    });

    // In a real implementation, send email with rawToken here.
    // For now, the token is generated and stored but not sent.
  }

  /**
   * Resets a user's password using a valid reset token.
   * Hashes the provided token, finds matching user, verifies expiry,
   * updates password, and clears reset token fields.
   */
  async resetPassword(data: ResetPasswordInput): Promise<void> {
    // Hash the provided token to match against stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(data.token)
      .digest("hex");

    // Find user with matching reset token
    const user = await prisma.user.findFirst({
      where: { reset_token: hashedToken },
    });

    if (!user) {
      throw AppError.badRequest("Invalid reset token");
    }

    // Check token expiry
    if (
      !user.reset_token_expires_at ||
      user.reset_token_expires_at < new Date()
    ) {
      throw AppError.badRequest("Reset token has expired");
    }

    // Hash new password and update, clear reset token fields
    const hashedPassword = await bcrypt.hash(data.new_password, BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_token: null,
        reset_token_expires_at: null,
      },
    });
  }

  async getMyStores(userId: number) {
    const memberships = await prisma.storeMembership.findMany({
      where: {
        user_id: userId,
        status: "ACTIVE",
        store: {
          is: {
            deleted_at: null,
            status: {
              not: "ARCHIVED",
            },
          },
        },
      },
      include: {
        store: true,
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: "asc" },
    });

    const storeIds = memberships.map((membership) => membership.store_id);

    const ownerMemberships = storeIds.length
      ? await prisma.storeMembership.findMany({
          where: {
            store_id: { in: storeIds },
            status: "ACTIVE",
            role: {
              is: {
                slug: "owner",
              },
            },
          },
          select: {
            store_id: true,
            user_id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })
      : [];

    const ownerByStoreId = new Map(
      ownerMemberships.map((owner) => [owner.store_id, owner]),
    );

    return memberships.map((membership) => {
      const store = membership.store;
      const owner = ownerByStoreId.get(store.id);

      const social_links: Record<string, string> = {};
      if (store.facebook_url) social_links.facebook = store.facebook_url;
      if (store.instagram_url) social_links.instagram = store.instagram_url;
      if (store.tiktok_url) social_links.tiktok = store.tiktok_url;

      return {
        id: store.id,
        name: store.name,
        domain: store.domain,
        status: store.status,
        owner_id: owner?.user_id ?? membership.user_id,
        logo_url: store.logo,
        favicon_url: store.favicon,
        description: store.description,
        meta_title: store.meta_title,
        meta_description: store.meta_description,
        support_email: store.support_email,
        support_phone: store.support_phone,
        social_links: Object.keys(social_links).length ? social_links : null,
        owner: owner?.user,
        role: {
          id: membership.role.id,
          name: membership.role.name,
          slug: membership.role.slug,
        },
        permissions: membership.role.permissions.map(
          (item) => item.permission.code,
        ),
        created_at: store.created_at,
        updated_at: store.updated_at,
      };
    });
  }

  async getMySubscription(userId: number) {
    const memberships = await prisma.storeMembership.findMany({
      where: {
        user_id: userId,
        status: "ACTIVE",
        store: {
          is: {
            deleted_at: null,
            status: {
              not: "ARCHIVED",
            },
          },
        },
      },
      select: {
        store: {
          select: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    const currentStoreCount = memberships.length;

    const activeSubscription = memberships
      .map((membership) => membership.store.subscription)
      .find(
        (subscription) =>
          subscription &&
          (subscription.status === "ACTIVE" ||
            subscription.status === "TRIALING"),
      );

    if (activeSubscription) {
      return {
        hasActiveSubscription: true,
        maxStores: activeSubscription.plan.max_stores,
        currentStoreCount,
      };
    }

    const starterPlan = await prisma.subscriptionPlan.findFirst({
      where: {
        code: "starter",
        deleted_at: null,
      },
      select: {
        max_stores: true,
      },
    });

    return {
      hasActiveSubscription: Boolean(starterPlan),
      maxStores: starterPlan?.max_stores ?? null,
      currentStoreCount,
    };
  }
}

export const authService = new AuthService();
