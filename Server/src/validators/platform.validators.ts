import { z } from "zod";
import {
  SystemRole,
  StoreStatus,
  SubscriptionStatus,
  BillingCycle,
} from "../../generated/prisma";

/**
 * Platform user update schema.
 * Allows updating is_active and system_role fields.
 */
export const platformUpdateUserSchema = z.object({
  is_active: z.boolean().optional(),
  system_role: z.nativeEnum(SystemRole).optional(),
});

/**
 * Platform store status update schema.
 * Requires a valid StoreStatus value.
 */
export const platformUpdateStoreStatusSchema = z.object({
  status: z.nativeEnum(StoreStatus),
});

/**
 * Create subscription plan schema.
 * Validates code (1-50 chars, lowercase alphanumeric and hyphens), name, pricing, and limits.
 */
export const createPlanSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Code must be lowercase alphanumeric and hyphens"),
  name: z.string().min(1).max(100),
  price_monthly: z.number().min(0.01).max(999999.99),
  price_yearly: z.number().min(0.01).max(9999999.99).optional(),
  max_stores: z.number().int().min(1).max(10000).optional(),
  max_products: z.number().int().min(1).max(1000000).optional(),
  max_staff: z.number().int().min(1).max(10000).optional(),
});

/**
 * Update subscription plan schema.
 * All fields are optional — only provided fields are updated.
 */
export const updatePlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  price_monthly: z.number().min(0.01).max(999999.99).optional(),
  price_yearly: z.number().min(0.01).max(9999999.99).nullable().optional(),
  max_stores: z.number().int().min(1).max(10000).nullable().optional(),
  max_products: z.number().int().min(1).max(1000000).nullable().optional(),
  max_staff: z.number().int().min(1).max(10000).nullable().optional(),
});

/**
 * Update subscription schema.
 * Supports status transitions, period extension, and plan changes.
 */
export const updateSubscriptionSchema = z.object({
  status: z.nativeEnum(SubscriptionStatus).optional(),
  current_period_ends_at: z.coerce.date().optional(),
  plan_id: z.number().int().positive().optional(),
  billing_cycle: z.nativeEnum(BillingCycle).optional(),
});

/**
 * Create permission schema.
 * Requires code (1-100 chars), module (1-50 chars), action (1-50 chars), optional description.
 */
export const createPermissionSchema = z.object({
  code: z.string().min(1).max(100),
  module: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
});

/**
 * Update permission schema.
 * All fields are optional — only provided fields are updated.
 */
export const updatePermissionSchema = z.object({
  code: z.string().min(1).max(100).optional(),
  module: z.string().min(1).max(50).optional(),
  action: z.string().min(1).max(50).optional(),
  description: z.string().max(255).nullable().optional(),
});

/**
 * Pagination query schema for platform endpoints.
 * Coerces string inputs to numbers. Supports search and filter params.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
  system_role: z.nativeEnum(SystemRole).optional(),
  is_active: z
    .string()
    .transform((val) => val === "true")
    .optional(),
});

/**
 * Route param schema for a single resource ID.
 * Coerces string param to a positive integer.
 */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Dashboard growth query schema.
 * Accepts optional start_month and end_month in YYYY-MM format.
 * Defaults to last 12 months if not provided.
 */
export const growthQuerySchema = z.object({
  start_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM")
    .optional(),
  end_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM")
    .optional(),
});
