/**
 * Property-Based Tests for Validation Error Mapping
 *
 * **Validates: Requirement 21.2**
 *
 * Property 14: Validation Error Field Mapping
 * For any 422 response with error array where each error has a path property,
 * the Form_System maps path[0] to the corresponding form field.
 *
 * Properties tested:
 * 1. Every error whose path[0] matches a field name is set via setError,
 *    and every error whose path[0] doesn't match appears in summaryErrors.
 * 2. If no errors array is present, the top-level message appears in summaryErrors.
 * 3. The function never loses any error — total fieldErrors + summaryErrors
 *    equals total input errors (or 1 for message-only).
 */

import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";
import type { ApiError, ValidationError } from "@/types/api.types";
import { parseServerErrors, mapServerErrorsToForm } from "../mapServerErrors";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate a valid field name (simple lowercase identifier) */
const fieldNameArb: fc.Arbitrary<string> = fc.stringOf(
  fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz_".split("")),
  { minLength: 1, maxLength: 20 },
);

/** Generate a unique array of field names */
const fieldNamesArb: fc.Arbitrary<string[]> = fc.uniqueArray(fieldNameArb, {
  minLength: 1,
  maxLength: 10,
});

/** Generate a validation error message */
const messageArb: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 100,
});

/** Generate a path string (possibly dotted like "address.city") */
const pathArb: fc.Arbitrary<string> = fc
  .tuple(fieldNameArb, fc.option(fieldNameArb, { nil: undefined }))
  .map(([root, nested]) => (nested ? `${root}.${nested}` : root));

/** Generate a single ValidationError */
const validationErrorArb: fc.Arbitrary<ValidationError> = fc
  .tuple(pathArb, messageArb)
  .map(([path, message]) => ({ path, message }));

/** Generate an array of ValidationErrors */
const validationErrorsArb: fc.Arbitrary<ValidationError[]> = fc.array(
  validationErrorArb,
  { minLength: 1, maxLength: 15 },
);

/** Generate an ApiError with errors array */
const apiErrorWithErrorsArb: fc.Arbitrary<ApiError> = fc
  .tuple(messageArb, validationErrorsArb)
  .map(([message, errors]) => ({
    success: false as const,
    message,
    errors,
  }));

/** Generate an ApiError without errors array (message-only) */
const apiErrorMessageOnlyArb: fc.Arbitrary<ApiError> = messageArb.map(
  (message) => ({
    success: false as const,
    message,
  }),
);

// ---------------------------------------------------------------------------
// Property Tests for parseServerErrors
// ---------------------------------------------------------------------------

describe("Property 14: Validation Error Field Mapping — parseServerErrors", () => {
  it("errors whose path[0] matches a field name go to fieldErrors, others to summaryErrors", () => {
    fc.assert(
      fc.property(
        apiErrorWithErrorsArb,
        fieldNamesArb,
        (apiError, fieldNames) => {
          const { fieldErrors, summaryErrors } = parseServerErrors(
            apiError,
            fieldNames,
          );

          for (const err of apiError.errors!) {
            const rootField = err.path.split(".")[0];
            if (fieldNames.includes(rootField)) {
              // Should be in fieldErrors
              expect(fieldErrors).toContainEqual(err);
            } else {
              // Should be in summaryErrors
              expect(summaryErrors).toContain(err.message);
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("if no errors array is present, the top-level message appears in summaryErrors", () => {
    fc.assert(
      fc.property(
        apiErrorMessageOnlyArb,
        fieldNamesArb,
        (apiError, fieldNames) => {
          const { fieldErrors, summaryErrors } = parseServerErrors(
            apiError,
            fieldNames,
          );

          expect(fieldErrors).toHaveLength(0);
          expect(summaryErrors).toHaveLength(1);
          expect(summaryErrors[0]).toBe(apiError.message);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("never loses any error — fieldErrors.length + summaryErrors.length equals input errors count (or 1 for message-only)", () => {
    fc.assert(
      fc.property(
        fc.oneof(apiErrorWithErrorsArb, apiErrorMessageOnlyArb),
        fieldNamesArb,
        (apiError, fieldNames) => {
          const { fieldErrors, summaryErrors } = parseServerErrors(
            apiError,
            fieldNames,
          );

          if (apiError.errors && apiError.errors.length > 0) {
            expect(fieldErrors.length + summaryErrors.length).toBe(
              apiError.errors.length,
            );
          } else {
            // Message-only: exactly 1 summary error
            expect(fieldErrors.length + summaryErrors.length).toBe(1);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property Tests for mapServerErrorsToForm
// ---------------------------------------------------------------------------

describe("Property 14: Validation Error Field Mapping — mapServerErrorsToForm", () => {
  it("calls setError for each field-matching error and returns non-matching as summaryErrors", () => {
    fc.assert(
      fc.property(
        apiErrorWithErrorsArb,
        fieldNamesArb,
        (apiError, fieldNames) => {
          const setError = vi.fn();

          const summaryErrors = mapServerErrorsToForm(
            apiError,
            setError,
            fieldNames,
          );

          // Count expected field errors
          const expectedFieldErrors = apiError.errors!.filter((err) =>
            fieldNames.includes(err.path.split(".")[0]),
          );
          const expectedSummaryErrors = apiError.errors!.filter(
            (err) => !fieldNames.includes(err.path.split(".")[0]),
          );

          // setError called once per field error
          expect(setError).toHaveBeenCalledTimes(expectedFieldErrors.length);

          // Each field error was set with correct field name and message
          for (const err of expectedFieldErrors) {
            const rootField = err.path.split(".")[0];
            expect(setError).toHaveBeenCalledWith(rootField, {
              type: "server",
              message: err.message,
            });
          }

          // Summary errors match non-field errors
          expect(summaryErrors).toHaveLength(expectedSummaryErrors.length);
          for (const err of expectedSummaryErrors) {
            expect(summaryErrors).toContain(err.message);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("returns message in summaryErrors when no errors array present", () => {
    fc.assert(
      fc.property(
        apiErrorMessageOnlyArb,
        fieldNamesArb,
        (apiError, fieldNames) => {
          const setError = vi.fn();

          const summaryErrors = mapServerErrorsToForm(
            apiError,
            setError,
            fieldNames,
          );

          expect(setError).not.toHaveBeenCalled();
          expect(summaryErrors).toEqual([apiError.message]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("total setError calls + summaryErrors length equals total input errors (conservation)", () => {
    fc.assert(
      fc.property(
        fc.oneof(apiErrorWithErrorsArb, apiErrorMessageOnlyArb),
        fieldNamesArb,
        (apiError, fieldNames) => {
          const setError = vi.fn();

          const summaryErrors = mapServerErrorsToForm(
            apiError,
            setError,
            fieldNames,
          );

          const totalInputErrors =
            apiError.errors && apiError.errors.length > 0
              ? apiError.errors.length
              : 1;

          expect(setError.mock.calls.length + summaryErrors.length).toBe(
            totalInputErrors,
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
