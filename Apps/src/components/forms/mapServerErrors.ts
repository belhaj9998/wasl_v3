import type { UseFormSetError, FieldValues, Path } from "react-hook-form";
import type { ApiError, ValidationError } from "@/types/api.types";

export interface ServerErrorMapping {
  /** Errors mapped to specific form fields (set via setError) */
  fieldErrors: ValidationError[];
  /** Errors that don't map to any form field (displayed in FormSummaryError) */
  summaryErrors: string[];
}

/**
 * Parses a 422 API error response and separates field-level errors from
 * unmapped summary errors.
 *
 * The server returns errors with a `path` property (e.g., "name", "email", "address.city").
 * This utility takes the first segment of the path (before any dot) as the field name
 * and checks if it exists in the provided field names list.
 *
 * @param error - The API error response object
 * @param fieldNames - Array of field names present in the form
 * @returns Object with fieldErrors and summaryErrors separated
 */
export function parseServerErrors(
  error: ApiError,
  fieldNames: string[],
): ServerErrorMapping {
  const fieldErrors: ValidationError[] = [];
  const summaryErrors: string[] = [];

  if (!error.errors || error.errors.length === 0) {
    // If no structured errors, use the top-level message as a summary error
    if (error.message) {
      summaryErrors.push(error.message);
    }
    return { fieldErrors, summaryErrors };
  }

  for (const validationError of error.errors) {
    // Extract the root field name from the path (e.g., "address.city" → "address")
    const rootField = validationError.path.split(".")[0];

    if (fieldNames.includes(rootField)) {
      fieldErrors.push(validationError);
    } else {
      summaryErrors.push(validationError.message);
    }
  }

  return { fieldErrors, summaryErrors };
}

/**
 * Maps server validation errors to React Hook Form's setError calls.
 * Errors whose path doesn't match a form field are returned as summary errors.
 *
 * Usage:
 * ```ts
 * const summaryErrors = mapServerErrorsToForm(apiError, setError, ["name", "email", "phone"]);
 * ```
 *
 * @param error - The API error response (typically from a 422 response)
 * @param setError - React Hook Form's setError function
 * @param fieldNames - Array of field names present in the form
 * @returns Array of unmapped error messages for display in FormSummaryError
 */
export function mapServerErrorsToForm<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
  fieldNames: string[],
): string[] {
  const { fieldErrors, summaryErrors } = parseServerErrors(error, fieldNames);

  for (const fieldError of fieldErrors) {
    const rootField = fieldError.path.split(".")[0] as Path<T>;
    setError(rootField, {
      type: "server",
      message: fieldError.message,
    });
  }

  return summaryErrors;
}
