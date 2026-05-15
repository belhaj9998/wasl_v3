import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { PermissionGate } from "../PermissionGate";
import authReducer from "@/lib/store/slices/auth.slice";

/**
 * Helper to create a test store with specific permissions.
 */
function createTestStore(permissions: string[]) {
  return configureStore({
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
}

function renderWithStore(ui: React.ReactElement, permissions: string[]) {
  const store = createTestStore(permissions);
  return render(<Provider store={store}>{ui}</Provider>);
}

describe("PermissionGate", () => {
  describe("single permission", () => {
    it("renders children when user has the permission", () => {
      renderWithStore(
        <PermissionGate permission="product:create">
          <button>Add Product</button>
        </PermissionGate>,
        ["product:create", "product:view"],
      );

      expect(screen.getByText("Add Product")).toBeInTheDocument();
    });

    it("renders nothing when user lacks the permission", () => {
      renderWithStore(
        <PermissionGate permission="product:create">
          <button>Add Product</button>
        </PermissionGate>,
        ["product:view"],
      );

      expect(screen.queryByText("Add Product")).not.toBeInTheDocument();
    });

    it("renders fallback when user lacks the permission and fallback is provided", () => {
      renderWithStore(
        <PermissionGate
          permission="product:create"
          fallback={<span>No access</span>}
        >
          <button>Add Product</button>
        </PermissionGate>,
        ["product:view"],
      );

      expect(screen.queryByText("Add Product")).not.toBeInTheDocument();
      expect(screen.getByText("No access")).toBeInTheDocument();
    });
  });

  describe("multiple permissions with mode='all'", () => {
    it("renders children when user has ALL permissions", () => {
      renderWithStore(
        <PermissionGate
          permission={["product:create", "product:edit"]}
          mode="all"
        >
          <button>Bulk Edit</button>
        </PermissionGate>,
        ["product:create", "product:edit", "product:view"],
      );

      expect(screen.getByText("Bulk Edit")).toBeInTheDocument();
    });

    it("renders nothing when user is missing one permission", () => {
      renderWithStore(
        <PermissionGate
          permission={["product:create", "product:edit"]}
          mode="all"
        >
          <button>Bulk Edit</button>
        </PermissionGate>,
        ["product:create", "product:view"],
      );

      expect(screen.queryByText("Bulk Edit")).not.toBeInTheDocument();
    });

    it("defaults to mode='all' when mode is not specified", () => {
      renderWithStore(
        <PermissionGate permission={["product:create", "product:edit"]}>
          <button>Bulk Edit</button>
        </PermissionGate>,
        ["product:create"], // missing product:edit
      );

      expect(screen.queryByText("Bulk Edit")).not.toBeInTheDocument();
    });

    it("renders fallback when user lacks permissions", () => {
      renderWithStore(
        <PermissionGate
          permission={["product:create", "product:edit"]}
          mode="all"
          fallback={<span>Restricted</span>}
        >
          <button>Bulk Edit</button>
        </PermissionGate>,
        ["product:create"],
      );

      expect(screen.queryByText("Bulk Edit")).not.toBeInTheDocument();
      expect(screen.getByText("Restricted")).toBeInTheDocument();
    });
  });

  describe("multiple permissions with mode='any'", () => {
    it("renders children when user has at least one permission", () => {
      renderWithStore(
        <PermissionGate permission={["order:view", "order:manage"]} mode="any">
          <button>Orders</button>
        </PermissionGate>,
        ["order:view"],
      );

      expect(screen.getByText("Orders")).toBeInTheDocument();
    });

    it("renders nothing when user has none of the permissions", () => {
      renderWithStore(
        <PermissionGate permission={["order:view", "order:manage"]} mode="any">
          <button>Orders</button>
        </PermissionGate>,
        ["product:view"],
      );

      expect(screen.queryByText("Orders")).not.toBeInTheDocument();
    });

    it("renders fallback when user has none of the permissions", () => {
      renderWithStore(
        <PermissionGate
          permission={["order:view", "order:manage"]}
          mode="any"
          fallback={<span>No order access</span>}
        >
          <button>Orders</button>
        </PermissionGate>,
        ["product:view"],
      );

      expect(screen.queryByText("Orders")).not.toBeInTheDocument();
      expect(screen.getByText("No order access")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("renders nothing with empty permissions array", () => {
      renderWithStore(
        <PermissionGate permission="product:view">
          <button>Products</button>
        </PermissionGate>,
        [],
      );

      expect(screen.queryByText("Products")).not.toBeInTheDocument();
    });

    it("renders children when permission array is empty (vacuous truth for mode='all')", () => {
      renderWithStore(
        <PermissionGate permission={[]} mode="all">
          <button>Always Visible</button>
        </PermissionGate>,
        [],
      );

      // Empty array with .every() returns true (vacuous truth)
      expect(screen.getByText("Always Visible")).toBeInTheDocument();
    });

    it("renders nothing when permission array is empty with mode='any'", () => {
      renderWithStore(
        <PermissionGate permission={[]} mode="any">
          <button>Never Visible</button>
        </PermissionGate>,
        ["product:view"],
      );

      // Empty array with .some() returns false
      expect(screen.queryByText("Never Visible")).not.toBeInTheDocument();
    });
  });
});
