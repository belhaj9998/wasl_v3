import { z } from "zod";
import { MembershipStatus } from "../../generated/prisma";

// ─── Store Settings Schemas ──────────────────────────────────────────────────

/**
 * Update general store settings schema.
 * All fields optional for PATCH semantics.
 * Validates: name (2-100), currency_code (3 uppercase), locale (BCP 47), timezone (max 50).
 */
export const updateGeneralSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  currency_code: z
    .string()
    .regex(/^[A-Z]{3}$/, "Currency code must be exactly 3 uppercase letters")
    .optional(),
  locale: z
    .string()
    .min(2)
    .max(10)
    .regex(
      /^[a-z]{2}(-[A-Z]{2})?$/,
      "Locale must be in BCP 47 format (e.g., en-US)",
    )
    .optional(),
  timezone: z.string().max(50).optional(),
});

/**
 * Update store branding schema.
 * Uses .nullable().optional() for PATCH semantics (can set to null or omit).
 */
export const updateBrandingSchema = z.object({
  logo: z.string().url().max(2048).nullable().optional(),
  favicon: z.string().url().max(2048).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

/**
 * Update store SEO settings schema.
 * Uses .nullable().optional() for PATCH semantics.
 */
export const updateSeoSchema = z.object({
  meta_title: z.string().max(70).nullable().optional(),
  meta_description: z.string().max(160).nullable().optional(),
});

/**
 * Update store contact information schema.
 * Uses .nullable().optional() for PATCH semantics.
 */
export const updateContactSchema = z.object({
  support_email: z.string().email().nullable().optional(),
  support_phone: z
    .string()
    .regex(/^\+?\d{7,15}$/, "Invalid phone format")
    .nullable()
    .optional(),
  facebook_url: z.string().url().max(2048).nullable().optional(),
  instagram_url: z.string().url().max(2048).nullable().optional(),
  tiktok_url: z.string().url().max(2048).nullable().optional(),
});

// ─── Member Schemas ──────────────────────────────────────────────────────────

/**
 * Invite member request body schema.
 * Requires email (valid format) and role_id (positive integer).
 */
export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role_id: z.number().int().positive(),
});

/**
 * Update member role request body schema.
 * Requires role_id (positive integer).
 */
export const updateMemberRoleSchema = z.object({
  role_id: z.number().int().positive(),
});

// ─── Role Schemas ────────────────────────────────────────────────────────────

/**
 * Create role request body schema.
 * Requires name (2-50 chars), optional description (max 255 chars).
 */
export const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(255).optional(),
});

/**
 * Update role request body schema.
 * All fields optional for PATCH semantics.
 * Description is nullable (can be explicitly set to null).
 */
export const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(255).nullable().optional(),
});

/**
 * Update role permissions request body schema.
 * Requires permission_ids array of positive integers (0-200 items).
 */
export const updateRolePermissionsSchema = z.object({
  permission_ids: z.array(z.number().int().positive()).min(0).max(200),
});

// ─── Param Schemas ───────────────────────────────────────────────────────────

/**
 * Route params schema for member endpoints.
 * Coerces string params to positive integers.
 */
export const memberIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  memberId: z.coerce.number().int().positive(),
});

/**
 * Route params schema for role endpoints.
 * Coerces string params to positive integers.
 */
export const roleIdParamSchema = z.object({
  storeId: z.coerce.number().int().positive(),
  roleId: z.coerce.number().int().positive(),
});

// ─── Query Schemas ───────────────────────────────────────────────────────────

/**
 * Member list query schema.
 * Supports pagination (page, limit), optional status filter, and optional search.
 */
export const memberListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(MembershipStatus).optional(),
  search: z.string().optional(),
});
