/**
 * Server Validation Error Mapping Utility
 *
 * Maps HTTP 422 validation errors from the server to React Hook Form fields.
 * Errors whose path doesn't match any form field are returned as general
 * summary errors to be displayed above the form.
 *
 * Requirement: 6.2
 */

import type { UseFormSetError, FieldValues, Path } from "react-hook-form";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single validation error from the server's 422 response.
 * `path` can be either:
 *   - A string array (e.g., ["name"] or ["address", "city"])
 *   - A dot-separated string (e.g., "name" or "address.city")
 */
export interface ServerValidationError {
  path: string[] | string;
  message: string;
}

/**
 * The shape of a 422 error response body from the server.
 */
export interface ServerErrorResponse {
  success?: false;
  message?: string;
  errors?: ServerValidationError[];
  statusCode?: number;
}

/**
 * Result of parsing server errors into field-level and summary errors.
 */
export interface MappedServerErrors {
  /** Errors successfully mapped to form fields */
  fieldErrors: Array<{ field: string; message: string }>;
  /** Errors that couldn't be mapped to any form field */
  summaryErrors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the root field name from a validation error path.
 * Supports both array paths (["address", "city"]) and dot-separated strings ("address.city").
 */
function getRootField(path: string[] | string): string {
  if (Array.isArray(path)) {
    return path[0] ?? "";
  }
  return path.split(".")[0] ?? "";
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Parses a server 422 error response and separates field-level errors from
 * unmapped summary errors.
 *
 * @param error - The server error response object
 * @param fieldNames - Array of field names registered in the form
 * @returns Object with fieldErrors and summaryErrors separated
 */
export function parseServerValidationErrors(
  error: ServerErrorResponse,
  fieldNames: string[],
): MappedServerErrors {
  const fieldErrors: Array<{ field: string; message: string }> = [];
  const summaryErrors: string[] = [];

  if (!error.errors || error.errors.length === 0) {
    // No structured errors — use the top-level message as a summary error
    if (error.message) {
      summaryErrors.push(error.message);
    }
    return { fieldErrors, summaryErrors };
  }

  for (const validationError of error.errors) {
    const rootField = getRootField(validationError.path);

    if (rootField && fieldNames.includes(rootField)) {
      fieldErrors.push({ field: rootField, message: validationError.message });
    } else {
      summaryErrors.push(validationError.message);
    }
  }

  return { fieldErrors, summaryErrors };
}

/**
 * Maps server validation errors (HTTP 422) to React Hook Form's setError calls.
 *
 * For each error in the response:
 * - If `path[0]` (or the first segment of a dot-separated path) matches a
 *   registered form field, the error is set on that field via `setError`.
 * - If it doesn't match any field, the error message is collected and returned
 *   as a summary error to be displayed above the form.
 *
 * @example
 * ```ts
 * const summaryErrors = mapServerErrors(apiError, setError, ["name", "email", "phone"]);
 * if (summaryErrors.length > 0) {
 *   setGeneralError(summaryErrors.join(", "));
 * }
 * ```
 *
 * @param error - The server error response (typically from a 422 response)
 * @param setError - React Hook Form's setError function
 * @param fieldNames - Array of field names present in the form
 * @returns Array of unmapped error messages for display as general errors above the form
 */
export function mapServerErrors<T extends FieldValues>(
  error: ServerErrorResponse,
  setError: UseFormSetError<T>,
  fieldNames: string[],
): string[] {
  const { fieldErrors, summaryErrors } = parseServerValidationErrors(
    error,
    fieldNames,
  );

  for (const { field, message } of fieldErrors) {
    setError(field as Path<T>, {
      type: "server",
      message,
    });
  }

  return summaryErrors;
}
