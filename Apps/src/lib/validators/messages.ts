/**
 * Translated Validation Messages Utility
 * Provides a function to get translated Zod error messages
 * for use with React Hook Form + Zod schemas.
 *
 * Validates: Requirement 3.2
 */

/**
 * Translation function type compatible with next-intl's useTranslations
 */
export type TranslationFn = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/**
 * Validation messages object with all translated messages
 */
export interface ValidationMessages {
  required: string;
  minLength: (min: number) => string;
  maxLength: (max: number) => string;
  email: string;
  phone: string;
  passwordMatch: string;
  invalidFormat: string;
  minValue: (min: number) => string;
  maxValue: (max: number) => string;
}

/**
 * Creates a set of translated validation messages using the provided
 * translation function from next-intl.
 *
 * Usage in a component:
 * ```tsx
 * const t = useTranslations("validation");
 * const messages = getValidationMessages(t);
 * ```
 */
export function getValidationMessages(t: TranslationFn): ValidationMessages {
  return {
    required: t("required"),
    minLength: (min: number) => t("minLength", { min }),
    maxLength: (max: number) => t("maxLength", { max }),
    email: t("email"),
    phone: t("phone"),
    passwordMatch: t("passwordMatch"),
    invalidFormat: t("invalidFormat"),
    minValue: (min: number) => t("minValue", { min }),
    maxValue: (max: number) => t("maxValue", { max }),
  };
}

/**
 * Default (English) validation messages for use in non-component contexts
 * or as fallback when translations are not available.
 */
export const defaultValidationMessages: ValidationMessages = {
  required: "This field is required",
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be at most ${max} characters`,
  email: "Invalid email address",
  phone: "Phone must be in format +218XXXXXXXXX",
  passwordMatch: "Passwords do not match",
  invalidFormat: "Invalid format",
  minValue: (min: number) => `Must be at least ${min}`,
  maxValue: (max: number) => `Must be at most ${max}`,
};

/**
 * Creates a Zod-compatible error map that uses translated messages.
 * Can be passed to Zod's `z.setErrorMap()` or used per-schema.
 *
 * Usage:
 * ```tsx
 * import { z } from "zod";
 * const t = useTranslations("validation");
 * const errorMap = createZodErrorMap(t);
 * // Use with zodResolver
 * zodResolver(schema, { errorMap })
 * ```
 */
export function createZodErrorMap(t: TranslationFn) {
  return (
    issue: { code: string; minimum?: number; maximum?: number; type?: string },
    ctx: { defaultError: string },
  ) => {
    switch (issue.code) {
      case "invalid_type":
        if (issue.type === "undefined" || ctx.defaultError === "Required") {
          return { message: t("required") };
        }
        return { message: t("invalidFormat") };

      case "too_small":
        return { message: t("minLength", { min: issue.minimum ?? 0 }) };

      case "too_big":
        return { message: t("maxLength", { max: issue.maximum ?? 0 }) };

      case "invalid_string":
        return { message: t("invalidFormat") };

      default:
        return { message: ctx.defaultError };
    }
  };
}
