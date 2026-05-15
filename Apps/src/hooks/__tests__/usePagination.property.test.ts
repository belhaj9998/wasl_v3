/**
 * Property-Based Tests for usePagination Hook
 * Tests that pagination and sort query params are generated correctly.
 *
 * **Validates: Requirements 3.5, 22.1, 22.2**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { renderHook, act } from "@testing-library/react";
import { usePagination } from "@/hooks/usePagination";

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generates a valid page number (≥ 1) */
const pageArb = fc.integer({ min: 1, max: 10000 });

/** Generates a valid limit (≥ 1, ≤ 100) */
const limitArb = fc.integer({ min: 1, max: 100 });

/** Generates a valid sort order */
const sortOrderArb = fc.constantFrom("asc" as const, "desc" as const);

/** Generates an optional sortBy field name */
const sortByArb = fc.oneof(
  fc.constant(undefined),
  fc.stringOf(
    fc.char().filter((c) => /[a-z_]/.test(c)),
    {
      minLength: 1,
      maxLength: 30,
    },
  ),
);

/** Generates valid pagination + sort params together */
const paginationParamsArb = fc.record({
  page: pageArb,
  limit: limitArb,
  sortBy: sortByArb,
  sortOrder: sortOrderArb,
});

// ─── Property 12: Pagination and Sort Query Generation ──────────────────────
// **Validates: Requirements 3.5, 22.1, 22.2**

describe("Property 12: Pagination and Sort Query Generation", () => {
  it("params object contains correct page and limit for any valid initial values", () => {
    fc.assert(
      fc.property(pageArb, limitArb, (page, limit) => {
        const { result } = renderHook(() => usePagination(page, limit));

        expect(result.current.params.page).toBe(page);
        expect(result.current.params.limit).toBe(limit);
      }),
      { numRuns: 100 },
    );
  });

  it("params object reflects updated page value after setPage", () => {
    fc.assert(
      fc.property(pageArb, pageArb, limitArb, (initialPage, newPage, limit) => {
        const { result } = renderHook(() => usePagination(initialPage, limit));

        act(() => {
          result.current.setPage(newPage);
        });

        expect(result.current.params.page).toBe(newPage);
        expect(result.current.params.limit).toBe(limit);
      }),
      { numRuns: 100 },
    );
  });

  it("params object reflects updated limit and resets page to 1 after setLimit", () => {
    fc.assert(
      fc.property(
        pageArb,
        limitArb,
        limitArb,
        (initialPage, initialLimit, newLimit) => {
          const { result } = renderHook(() =>
            usePagination(initialPage, initialLimit),
          );

          act(() => {
            result.current.setLimit(newLimit);
          });

          // Page resets to 1 when limit changes
          expect(result.current.params.page).toBe(1);
          expect(result.current.params.limit).toBe(newLimit);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("params object contains correct sortBy and sortOrder after setting sort", () => {
    fc.assert(
      fc.property(paginationParamsArb, ({ page, limit, sortBy, sortOrder }) => {
        const { result } = renderHook(() => usePagination(page, limit));

        act(() => {
          result.current.setSortBy(sortBy);
          result.current.setSortOrder(sortOrder);
        });

        expect(result.current.params.sortBy).toBe(sortBy);
        expect(result.current.params.sortOrder).toBe(sortOrder);
      }),
      { numRuns: 100 },
    );
  });

  it("setSortBy resets page to 1", () => {
    fc.assert(
      fc.property(pageArb, limitArb, sortByArb, (page, limit, sortBy) => {
        const { result } = renderHook(() => usePagination(page, limit));

        // First set page to something other than 1
        act(() => {
          result.current.setPage(page);
        });

        act(() => {
          result.current.setSortBy(sortBy);
        });

        // Page should reset to 1 when sort changes
        expect(result.current.params.page).toBe(1);
        expect(result.current.params.sortBy).toBe(sortBy);
      }),
      { numRuns: 100 },
    );
  });

  it("setSortOrder resets page to 1", () => {
    fc.assert(
      fc.property(pageArb, limitArb, sortOrderArb, (page, limit, sortOrder) => {
        const { result } = renderHook(() => usePagination(page, limit));

        // First set page to something other than 1
        act(() => {
          result.current.setPage(page);
        });

        act(() => {
          result.current.setSortOrder(sortOrder);
        });

        // Page should reset to 1 when sort order changes
        expect(result.current.params.page).toBe(1);
        expect(result.current.params.sortOrder).toBe(sortOrder);
      }),
      { numRuns: 100 },
    );
  });

  it("params always contains all required fields (page, limit, sortBy, sortOrder)", () => {
    fc.assert(
      fc.property(pageArb, limitArb, (page, limit) => {
        const { result } = renderHook(() => usePagination(page, limit));

        const params = result.current.params;

        // All fields must be present
        expect(params).toHaveProperty("page");
        expect(params).toHaveProperty("limit");
        expect(params).toHaveProperty("sortBy");
        expect(params).toHaveProperty("sortOrder");

        // Types are correct
        expect(typeof params.page).toBe("number");
        expect(typeof params.limit).toBe("number");
        expect(
          params.sortBy === undefined || typeof params.sortBy === "string",
        ).toBe(true);
        expect(["asc", "desc"]).toContain(params.sortOrder);
      }),
      { numRuns: 100 },
    );
  });
});
