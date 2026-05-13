import { z } from "zod";

/**
 * Registration request body schema.
 * Validates: name (2-100 chars), email (RFC 5322), phone (7-15 digits with optional +), password (8-128 chars).
 */
export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?\d{7,15}$/, "Invalid phone format"),
  password: z.string().min(8).max(128),
});

/**
 * Login request body schema.
 * Accepts identifier (email or phone) and password.
 */
export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1).max(128),
});

/**
 * Forgot-password request body schema.
 * Requires a valid email address.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

/**
 * Reset-password request body schema.
 * Requires a non-empty token and a new password (8-128 chars).
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(8).max(128),
});

/**
 * Change-password request body schema.
 * Requires current password and new password (8-128 chars).
 */
export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: z.string().min(8).max(128),
});

/**
 * Profile update request body schema.
 * Allows optional name (2-100 chars) and optional avatar_url (valid URL, max 2048 chars).
 */
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar_url: z.string().url().max(2048).optional(),
});

/**
 * Store creation request body schema.
 * Requires name (2-100 chars) and domain (3-63 chars, lowercase alphanumeric and hyphens,
 * must start and end with alphanumeric).
 */
export const createStoreSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z
    .string()
    .min(3)
    .max(63)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "Domain must be lowercase alphanumeric and hyphens, starting and ending with alphanumeric",
    ),
});
