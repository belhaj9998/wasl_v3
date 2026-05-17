import { z } from "zod";

/**
 * Store Creation Validation Schema
 * Validates: Requirements 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

/**
 * Domain validation regex:
 * - Only lowercase a-z, 0-9, and hyphens
 * - Must start and end with a letter or digit
 * - No consecutive hyphens (--)
 * - Length enforced separately via min/max
 */
const DOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9]))*[a-z0-9]$/;

export const createStoreSchema = z.object({
  name: z
    .string()
    .min(2, "validation.storeName.tooShort")
    .max(100, "validation.storeName.tooLong"),
  domain: z
    .string()
    .min(3, "validation.domain.tooShort")
    .max(63, "validation.domain.tooLong")
    .regex(DOMAIN_REGEX, "validation.domain.invalid"),
});

export type CreateStoreFormData = z.infer<typeof createStoreSchema>;
