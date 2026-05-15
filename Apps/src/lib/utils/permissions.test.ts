import { describe, it, expect } from "vitest";
import {
  buildSidebarItems,
  canPerformAction,
  buildCategoryTree,
  canTransitionTo,
  getAvailableTransitions,
  getOrderActions,
} from "./permissions";
import type { Category } from "@/types";

describe("buildSidebarItems", () => {
  it("returns only items matching provided permissions", () => {
    const permissions = ["product:view", "order:view"];
    const items = buildSidebarItems(permissions);
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.path)).toEqual(["/products", "/orders"]);
  });

  it("returns empty array for empty permissions", () => {
    expect(buildSidebarItems([])).toEqual([]);
  });

  it("returns all items when all permissions are provided", () => {
    const allPermissions = [
      "dashboard:view",
      "product:view",
      "category:view",
      "order:view",
      "customer:view",
      "coupon:view",
      "inventory:view",
      "member:view",
      "role:view",
      "store:view",
    ];
    expect(buildSidebarItems(allPermissions)).toHaveLength(10);
  });
});

describe("canPerformAction", () => {
  it("returns true when action is in permissions", () => {
    expect(
      canPerformAction(["product:create", "order:view"], "product:create"),
    ).toBe(true);
  });

  it("returns false when action is not in permissions", () => {
    expect(canPerformAction(["product:view"], "product:create")).toBe(false);
  });

  it("returns false for empty permissions", () => {
    expect(canPerformAction([], "product:view")).toBe(false);
  });
});

describe("buildCategoryTree", () => {
  it("builds a tree from flat categories", () => {
    const categories: Category[] = [
      {
        id: 1,
        name: "Root",
        slug: "root",
        description: null,
        parent_id: null,
        image_url: null,
        sort_order: 0,
        is_active: true,
      },
      {
        id: 2,
        name: "Child",
        slug: "child",
        description: null,
        parent_id: 1,
        image_url: null,
        sort_order: 0,
        is_active: true,
      },
    ];
    const tree = buildCategoryTree(categories);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].name).toBe("Child");
  });

  it("sorts by sort_order", () => {
    const categories: Category[] = [
      {
        id: 1,
        name: "B",
        slug: "b",
        description: null,
        parent_id: null,
        image_url: null,
        sort_order: 2,
        is_active: true,
      },
      {
        id: 2,
        name: "A",
        slug: "a",
        description: null,
        parent_id: null,
        image_url: null,
        sort_order: 1,
        is_active: true,
      },
    ];
    const tree = buildCategoryTree(categories);
    expect(tree[0].name).toBe("A");
    expect(tree[1].name).toBe("B");
  });

  it("handles orphans as roots", () => {
    const categories: Category[] = [
      {
        id: 1,
        name: "Orphan",
        slug: "orphan",
        description: null,
        parent_id: 999,
        image_url: null,
        sort_order: 0,
        is_active: true,
      },
    ];
    const tree = buildCategoryTree(categories);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("Orphan");
  });

  it("returns empty array for empty input", () => {
    expect(buildCategoryTree([])).toEqual([]);
  });
});

describe("canTransitionTo", () => {
  it("returns true for valid transitions", () => {
    expect(canTransitionTo("DRAFT", "PENDING")).toBe(true);
    expect(canTransitionTo("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionTo("DELIVERED", "RETURNED")).toBe(true);
  });

  it("returns false for invalid transitions", () => {
    expect(canTransitionTo("DRAFT", "DELIVERED")).toBe(false);
    expect(canTransitionTo("CANCELED", "PENDING")).toBe(false);
  });

  it("returns false for terminal states", () => {
    expect(canTransitionTo("CANCELED", "PENDING")).toBe(false);
    expect(canTransitionTo("RETURNED", "PENDING")).toBe(false);
  });
});

describe("getAvailableTransitions", () => {
  it("returns valid transitions for non-terminal states", () => {
    expect(getAvailableTransitions("DRAFT")).toEqual(["PENDING", "CANCELED"]);
    expect(getAvailableTransitions("PENDING")).toEqual([
      "CONFIRMED",
      "CANCELED",
    ]);
  });

  it("returns empty array for terminal states", () => {
    expect(getAvailableTransitions("CANCELED")).toEqual([]);
    expect(getAvailableTransitions("RETURNED")).toEqual([]);
  });
});

describe("getOrderActions", () => {
  it("returns action buttons for non-terminal status", () => {
    const actions = getOrderActions("DRAFT");
    expect(actions).toHaveLength(2);
    expect(actions[0].type).toBe("transition");
    expect(actions[1].type).toBe("cancel");
    expect(actions[1].variant).toBe("destructive");
  });

  it("returns empty array for terminal status", () => {
    expect(getOrderActions("CANCELED")).toEqual([]);
    expect(getOrderActions("RETURNED")).toEqual([]);
  });

  it("labels cancel action correctly", () => {
    const actions = getOrderActions("PENDING");
    const cancelAction = actions.find((a) => a.type === "cancel");
    expect(cancelAction?.label).toBe("إلغاء الطلب");
  });
});
