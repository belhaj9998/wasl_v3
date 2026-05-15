/**
 * Property-Based Tests for Auth Slice
 *
 * **Validates: Requirements 1.3, 27.2, 27.3**
 *
 * Property 2: Auth State Consistency
 * Property 15: Thunk Loading State Transitions
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import authReducer, {
  type AuthState,
  resetAuth,
  setCurrentStore,
  clearAuthError,
} from "../auth.slice";
import {
  loginThunk,
  registerThunk,
  logoutThunk,
  fetchProfileThunk,
  setCurrentStoreThunk,
} from "../auth.thunks";
import type { User, SystemRole } from "@/types/auth.types";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const systemRoleArb: fc.Arbitrary<SystemRole> = fc.constantFrom(
  "USER",
  "SUPPORT",
  "PLATFORM_ADMIN",
  "PLATFORM_OWNER",
);

const userArb: fc.Arbitrary<User> = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  name: fc.string({ minLength: 2, maxLength: 100 }),
  email: fc.emailAddress(),
  phone: fc.string({ minLength: 7, maxLength: 15 }),
  avatar_url: fc.option(fc.webUrl(), { nil: null }),
  system_role: systemRoleArb,
  is_active: fc.boolean(),
  last_login_at: fc.option(
    fc.date().map((d) => d.toISOString()),
    {
      nil: null,
    },
  ),
  created_at: fc.date().map((d) => d.toISOString()),
  updated_at: fc.date().map((d) => d.toISOString()),
});

const permissionsArb: fc.Arbitrary<string[]> = fc.array(
  fc.stringMatching(/^[a-z_]+:[a-z_]+$/),
  { minLength: 0, maxLength: 20 },
);

const storeIdArb: fc.Arbitrary<number> = fc.integer({ min: 1, max: 100000 });

const errorMessageArb: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 200,
});

// Helper to create an authenticated state
function makeAuthenticatedState(
  user: User,
  permissions: string[],
  storeId: number | null,
): AuthState {
  return {
    user,
    isAuthenticated: true,
    loading: false,
    error: null,
    permissions,
    currentStoreId: storeId,
  };
}

// Initial state for reference
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  permissions: [],
  currentStoreId: null,
};

// ---------------------------------------------------------------------------
// Property 2: Auth State Consistency
// ---------------------------------------------------------------------------

describe("Property 2: Auth State Consistency", () => {
  it("if isAuthenticated === true then user !== null (login fulfilled)", () => {
    fc.assert(
      fc.property(userArb, (user) => {
        // Simulate login fulfilled
        const state = authReducer(
          initialState,
          loginThunk.fulfilled(user, "requestId", {
            identifier: "test@test.com",
            password: "password",
          }),
        );

        // Invariant: if isAuthenticated then user is not null
        if (state.isAuthenticated) {
          expect(state.user).not.toBeNull();
        }
      }),
    );
  });

  it("if isAuthenticated === true then user !== null (register fulfilled)", () => {
    fc.assert(
      fc.property(userArb, (user) => {
        // Simulate register fulfilled
        const state = authReducer(
          initialState,
          registerThunk.fulfilled(user, "requestId", {
            name: "Test",
            email: "test@test.com",
            phone: "1234567890",
            password: "password123",
          }),
        );

        if (state.isAuthenticated) {
          expect(state.user).not.toBeNull();
        }
      }),
    );
  });

  it("if isAuthenticated === true then user !== null (fetchProfile fulfilled)", () => {
    fc.assert(
      fc.property(userArb, (user) => {
        const state = authReducer(
          initialState,
          fetchProfileThunk.fulfilled(user, "requestId", undefined),
        );

        if (state.isAuthenticated) {
          expect(state.user).not.toBeNull();
        }
      }),
    );
  });

  it("after logout fulfilled: isAuthenticated === false AND user === null AND permissions === [] AND currentStoreId === null", () => {
    fc.assert(
      fc.property(
        userArb,
        permissionsArb,
        fc.option(storeIdArb, { nil: null }),
        (user, permissions, storeId) => {
          // Start from an authenticated state
          const authenticatedState = makeAuthenticatedState(
            user,
            permissions,
            storeId,
          );

          // Dispatch logout fulfilled
          const state = authReducer(
            authenticatedState,
            logoutThunk.fulfilled(undefined, "requestId", undefined),
          );

          expect(state.isAuthenticated).toBe(false);
          expect(state.user).toBeNull();
          expect(state.permissions).toEqual([]);
          expect(state.currentStoreId).toBeNull();
        },
      ),
    );
  });

  it("after logout rejected: isAuthenticated === false AND user === null AND permissions === [] AND currentStoreId === null", () => {
    fc.assert(
      fc.property(
        userArb,
        permissionsArb,
        fc.option(storeIdArb, { nil: null }),
        errorMessageArb,
        (user, permissions, storeId, errorMsg) => {
          // Start from an authenticated state
          const authenticatedState = makeAuthenticatedState(
            user,
            permissions,
            storeId,
          );

          // Even on logout rejection, state should be reset for security
          const state = authReducer(
            authenticatedState,
            logoutThunk.rejected(
              new Error(errorMsg),
              "requestId",
              undefined,
              errorMsg,
            ),
          );

          expect(state.isAuthenticated).toBe(false);
          expect(state.user).toBeNull();
          expect(state.permissions).toEqual([]);
          expect(state.currentStoreId).toBeNull();
        },
      ),
    );
  });

  it("after resetAuth: isAuthenticated === false AND user === null AND permissions === [] AND currentStoreId === null", () => {
    fc.assert(
      fc.property(
        userArb,
        permissionsArb,
        fc.option(storeIdArb, { nil: null }),
        (user, permissions, storeId) => {
          const authenticatedState = makeAuthenticatedState(
            user,
            permissions,
            storeId,
          );

          const state = authReducer(authenticatedState, resetAuth());

          expect(state.isAuthenticated).toBe(false);
          expect(state.user).toBeNull();
          expect(state.permissions).toEqual([]);
          expect(state.currentStoreId).toBeNull();
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Thunk Loading State Transitions
// ---------------------------------------------------------------------------

describe("Property 15: Thunk Loading State Transitions", () => {
  it("loginThunk: pending sets loading=true, fulfilled sets loading=false", () => {
    fc.assert(
      fc.property(userArb, (user) => {
        // Pending: loading transitions to true
        const pendingState = authReducer(
          initialState,
          loginThunk.pending("requestId", {
            identifier: "test@test.com",
            password: "password",
          }),
        );
        expect(pendingState.loading).toBe(true);

        // Fulfilled: loading transitions back to false
        const fulfilledState = authReducer(
          pendingState,
          loginThunk.fulfilled(user, "requestId", {
            identifier: "test@test.com",
            password: "password",
          }),
        );
        expect(fulfilledState.loading).toBe(false);
      }),
    );
  });

  it("loginThunk: pending sets loading=true, rejected sets loading=false with error message", () => {
    fc.assert(
      fc.property(errorMessageArb, (errorMsg) => {
        // Pending: loading transitions to true
        const pendingState = authReducer(
          initialState,
          loginThunk.pending("requestId", {
            identifier: "test@test.com",
            password: "password",
          }),
        );
        expect(pendingState.loading).toBe(true);

        // Rejected: loading transitions back to false, error contains message
        const rejectedState = authReducer(
          pendingState,
          loginThunk.rejected(
            new Error(errorMsg),
            "requestId",
            { identifier: "test@test.com", password: "password" },
            errorMsg,
          ),
        );
        expect(rejectedState.loading).toBe(false);
        expect(rejectedState.error).toBe(errorMsg);
      }),
    );
  });

  it("registerThunk: pending sets loading=true, fulfilled sets loading=false", () => {
    fc.assert(
      fc.property(userArb, (user) => {
        const pendingState = authReducer(
          initialState,
          registerThunk.pending("requestId", {
            name: "Test",
            email: "test@test.com",
            phone: "1234567890",
            password: "password123",
          }),
        );
        expect(pendingState.loading).toBe(true);

        const fulfilledState = authReducer(
          pendingState,
          registerThunk.fulfilled(user, "requestId", {
            name: "Test",
            email: "test@test.com",
            phone: "1234567890",
            password: "password123",
          }),
        );
        expect(fulfilledState.loading).toBe(false);
      }),
    );
  });

  it("registerThunk: pending sets loading=true, rejected sets loading=false with error message", () => {
    fc.assert(
      fc.property(errorMessageArb, (errorMsg) => {
        const pendingState = authReducer(
          initialState,
          registerThunk.pending("requestId", {
            name: "Test",
            email: "test@test.com",
            phone: "1234567890",
            password: "password123",
          }),
        );
        expect(pendingState.loading).toBe(true);

        const rejectedState = authReducer(
          pendingState,
          registerThunk.rejected(
            new Error(errorMsg),
            "requestId",
            {
              name: "Test",
              email: "test@test.com",
              phone: "1234567890",
              password: "password123",
            },
            errorMsg,
          ),
        );
        expect(rejectedState.loading).toBe(false);
        expect(rejectedState.error).toBe(errorMsg);
      }),
    );
  });

  it("logoutThunk: pending sets loading=true, fulfilled sets loading=false", () => {
    fc.assert(
      fc.property(userArb, permissionsArb, (user, permissions) => {
        const authenticatedState = makeAuthenticatedState(user, permissions, 1);

        const pendingState = authReducer(
          authenticatedState,
          logoutThunk.pending("requestId", undefined),
        );
        expect(pendingState.loading).toBe(true);

        const fulfilledState = authReducer(
          pendingState,
          logoutThunk.fulfilled(undefined, "requestId", undefined),
        );
        expect(fulfilledState.loading).toBe(false);
      }),
    );
  });

  it("fetchProfileThunk: pending sets loading=true, fulfilled sets loading=false", () => {
    fc.assert(
      fc.property(userArb, (user) => {
        const pendingState = authReducer(
          initialState,
          fetchProfileThunk.pending("requestId", undefined),
        );
        expect(pendingState.loading).toBe(true);

        const fulfilledState = authReducer(
          pendingState,
          fetchProfileThunk.fulfilled(user, "requestId", undefined),
        );
        expect(fulfilledState.loading).toBe(false);
      }),
    );
  });

  it("fetchProfileThunk: pending sets loading=true, rejected sets loading=false with error message", () => {
    fc.assert(
      fc.property(errorMessageArb, (errorMsg) => {
        const pendingState = authReducer(
          initialState,
          fetchProfileThunk.pending("requestId", undefined),
        );
        expect(pendingState.loading).toBe(true);

        const rejectedState = authReducer(
          pendingState,
          fetchProfileThunk.rejected(
            new Error(errorMsg),
            "requestId",
            undefined,
            errorMsg,
          ),
        );
        expect(rejectedState.loading).toBe(false);
        expect(rejectedState.error).toBe(errorMsg);
      }),
    );
  });

  it("setCurrentStoreThunk: pending sets loading=true, fulfilled sets loading=false", () => {
    fc.assert(
      fc.property(storeIdArb, permissionsArb, (storeId, permissions) => {
        const pendingState = authReducer(
          initialState,
          setCurrentStoreThunk.pending("requestId", { storeId }),
        );
        expect(pendingState.loading).toBe(true);

        const fulfilledState = authReducer(
          pendingState,
          setCurrentStoreThunk.fulfilled(
            { storeId, permissions },
            "requestId",
            { storeId },
          ),
        );
        expect(fulfilledState.loading).toBe(false);
      }),
    );
  });

  it("setCurrentStoreThunk: pending sets loading=true, rejected sets loading=false with error message", () => {
    fc.assert(
      fc.property(storeIdArb, errorMessageArb, (storeId, errorMsg) => {
        const pendingState = authReducer(
          initialState,
          setCurrentStoreThunk.pending("requestId", { storeId }),
        );
        expect(pendingState.loading).toBe(true);

        const rejectedState = authReducer(
          pendingState,
          setCurrentStoreThunk.rejected(
            new Error(errorMsg),
            "requestId",
            { storeId },
            errorMsg,
          ),
        );
        expect(rejectedState.loading).toBe(false);
        expect(rejectedState.error).toBe(errorMsg);
      }),
    );
  });
});
