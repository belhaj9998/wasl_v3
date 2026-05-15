/**
 * Property-Based Tests for usePermission Hook
 *
 * **Validates: Requirements 15.1, 15.3**
 *
 * Property 3: Permission Guard Correctness
 * For any permission P and permissions array A, `usePermission(P)` returns true iff P ∈ A.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import React from "react";
import authReducer, { setCurrentStore } from "@/lib/store/slices/auth.slice";
import { usePermission } from "../usePermission";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate a valid permission string in the format "resource:action" */
const permissionArb: fc.Arbitrary<string> = fc
  .tuple(
    fc.stringOf(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz_".split("")), {
      minLength: 2,
      maxLength: 15,
    }),
    fc.stringOf(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz_".split("")), {
      minLength: 2,
      maxLength: 15,
    }),
  )
  .map(([resource, action]) => `${resource}:${action}`);

/** Generate a unique permissions array */
const permissionsArrayArb: fc.Arbitrary<string[]> = fc
  .uniqueArray(permissionArb, { minLength: 0, maxLength: 20 })
  .filter((arr) => new Set(arr).size === arr.length);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a test store with the given permissions and render the usePermission hook.
 */
function renderUsePermission(permissions: string[], permissionToCheck: string) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        isAuthenticated: true,
        loading: false,
        error: null,
        permissions,
        currentStoreId: 1,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Provider, { store }, children);

  const { result } = renderHook(() => usePermission(permissionToCheck), {
    wrapper,
  });

  return result.current;
}

// ---------------------------------------------------------------------------
// Property 3: Permission Guard Correctness
// ---------------------------------------------------------------------------

describe("Property 3: Permission Guard Correctness", () => {
  it("usePermission(P) returns true when P is in the permissions array", () => {
    fc.assert(
      fc.property(
        permissionsArrayArb.filter((arr) => arr.length > 0),
        (permissions) => {
          // Pick a random permission from the array — it must return true
          const index = Math.floor(Math.random() * permissions.length);
          const permissionToCheck = permissions[index];

          const result = renderUsePermission(permissions, permissionToCheck);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("usePermission(P) returns false when P is NOT in the permissions array", () => {
    fc.assert(
      fc.property(
        permissionsArrayArb,
        permissionArb,
        (permissions, extraPermission) => {
          // Precondition: the extra permission is not already in the array
          fc.pre(!permissions.includes(extraPermission));

          const result = renderUsePermission(permissions, extraPermission);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("usePermission(P) returns true iff P ∈ A (bidirectional check)", () => {
    fc.assert(
      fc.property(
        permissionsArrayArb,
        permissionArb,
        (permissions, permissionToCheck) => {
          const result = renderUsePermission(permissions, permissionToCheck);
          const expected = permissions.includes(permissionToCheck);

          expect(result).toBe(expected);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("usePermission returns false for empty permissions array", () => {
    fc.assert(
      fc.property(permissionArb, (permissionToCheck) => {
        const result = renderUsePermission([], permissionToCheck);
        expect(result).toBe(false);
      }),
      { numRuns: 50 },
    );
  });
});
