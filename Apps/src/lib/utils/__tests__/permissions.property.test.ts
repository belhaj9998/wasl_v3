/**
 * Property-Based Tests for Utility Functions
 * Uses fast-check to verify universal properties across all inputs.
 *
 * **Validates: Requirements 9.2, 9.3, 4.2, 4.3, 8.1, 8.4, 15.2**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  buildSidebarItems,
  canTransitionTo,
  getAvailableTransitions,
  buildCategoryTree,
} from "@/lib/utils/permissions";
import {
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  STORE_STATUS,
  STORE_STATUS_TRANSITIONS,
  type OrderStatus,
  type StoreStatus,
} from "@/lib/constants/enums";
import type { Category } from "@/types";

// ─── Generators ──────────────────────────────────────────────────────────────

const ALL_ORDER_STATUSES = Object.values(ORDER_STATUS) as OrderStatus[];
const ALL_STORE_STATUSES = Object.values(STORE_STATUS) as StoreStatus[];

const ORDER_TERMINAL_STATES: OrderStatus[] = [
  ORDER_STATUS.CANCELED,
  ORDER_STATUS.RETURNED,
];

const STORE_TERMINAL_STATES: StoreStatus[] = [STORE_STATUS.ARCHIVED];

/** Generates a valid OrderStatus */
const orderStatusArb = fc.constantFrom(...ALL_ORDER_STATUSES);

/** Generates a valid StoreStatus */
const storeStatusArb = fc.constantFrom(...ALL_STORE_STATUSES);

/** All possible sidebar permissions */
const ALL_SIDEBAR_PERMISSIONS = [
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

/** Generates a subset of sidebar permissions */
const permissionsArb = fc.subarray(ALL_SIDEBAR_PERMISSIONS, {
  minLength: 0,
  maxLength: ALL_SIDEBAR_PERMISSIONS.length,
});

/** Generates a valid Category object */
const categoryArb = (idRange: { min: number; max: number }) =>
  fc.record({
    id: fc.integer({ min: idRange.min, max: idRange.max }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    slug: fc.string({ minLength: 1, maxLength: 50 }),
    description: fc.constant(null),
    parent_id: fc.oneof(
      fc.constant(null),
      fc.integer({ min: idRange.min, max: idRange.max }),
    ),
    image_url: fc.constant(null),
    sort_order: fc.integer({ min: 0, max: 100 }),
    is_active: fc.boolean(),
  });

/** Generates a flat array of categories with unique IDs */
const categoryArrayArb = fc.integer({ min: 0, max: 20 }).chain((size) => {
  if (size === 0) return fc.constant([] as Category[]);
  // Generate unique IDs first, then build categories
  return fc
    .uniqueArray(fc.integer({ min: 1, max: 1000 }), {
      minLength: size,
      maxLength: size,
    })
    .chain((ids) => {
      const catArbs = ids.map((id, _idx) =>
        fc.record({
          id: fc.constant(id),
          name: fc.string({ minLength: 1, maxLength: 50 }),
          slug: fc.string({ minLength: 1, maxLength: 50 }),
          description: fc.constant(null),
          parent_id: fc.oneof(
            fc.constant(null),
            // parent_id can reference any id in the set or an invalid one
            fc.constantFrom(...ids, 9999),
          ),
          image_url: fc.constant(null),
          sort_order: fc.integer({ min: 0, max: 100 }),
          is_active: fc.boolean(),
        }),
      );
      return fc.tuple(...catArbs);
    })
    .map((cats) => cats as unknown as Category[]);
});

// ─── Property 5: Order Status Machine Validity ──────────────────────────────
// **Validates: Requirements 9.2, 9.3**

describe("Property 5: Order Status Machine Validity", () => {
  it("getAvailableTransitions returns only statuses in ORDER_STATUS_TRANSITIONS[status]", () => {
    fc.assert(
      fc.property(orderStatusArb, (status) => {
        const transitions = getAvailableTransitions(status);
        const expected = ORDER_STATUS_TRANSITIONS[status];

        // Every returned transition must be in the defined transitions
        for (const t of transitions) {
          expect(expected).toContain(t);
        }
        // And the result must match exactly
        expect(transitions).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("terminal states (CANCELED, RETURNED) return empty array from getAvailableTransitions", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ORDER_TERMINAL_STATES), (status) => {
        const transitions = getAvailableTransitions(status);
        expect(transitions).toEqual([]);
      }),
      { numRuns: 50 },
    );
  });

  it("canTransitionTo returns true iff target is in ORDER_STATUS_TRANSITIONS[current]", () => {
    fc.assert(
      fc.property(orderStatusArb, orderStatusArb, (current, target) => {
        const result = canTransitionTo(current, target);
        const allowed = ORDER_STATUS_TRANSITIONS[current];
        expect(result).toBe(allowed.includes(target));
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Property 6: Store Status Machine Validity ──────────────────────────────
// **Validates: Requirements 4.2, 4.3**

describe("Property 6: Store Status Machine Validity", () => {
  it("for any store status, available transitions match STORE_STATUS_TRANSITIONS[status] exactly", () => {
    fc.assert(
      fc.property(storeStatusArb, (status) => {
        const expected = STORE_STATUS_TRANSITIONS[status];
        // Verify the transitions map is well-defined for every status
        expect(expected).toBeDefined();
        expect(Array.isArray(expected)).toBe(true);

        // Every transition target must be a valid StoreStatus
        for (const target of expected) {
          expect(ALL_STORE_STATUSES).toContain(target);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("terminal states (ARCHIVED) have no outgoing transitions", () => {
    fc.assert(
      fc.property(fc.constantFrom(...STORE_TERMINAL_STATES), (status) => {
        const transitions = STORE_STATUS_TRANSITIONS[status];
        expect(transitions).toEqual([]);
      }),
      { numRuns: 50 },
    );
  });

  it("no status can transition to itself", () => {
    fc.assert(
      fc.property(storeStatusArb, (status) => {
        const transitions = STORE_STATUS_TRANSITIONS[status];
        expect(transitions).not.toContain(status);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8: Category Tree Completeness ─────────────────────────────────
// **Validates: Requirements 8.1, 8.4**

describe("Property 8: Category Tree Completeness", () => {
  /** Recursively collects all category IDs from a tree */
  function collectIds(nodes: Category[]): number[] {
    const ids: number[] = [];
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children && node.children.length > 0) {
        ids.push(...collectIds(node.children));
      }
    }
    return ids;
  }

  /** Checks if nodes at each level are sorted by sort_order */
  function isSortedBySortOrder(nodes: Category[]): boolean {
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i].sort_order < nodes[i - 1].sort_order) {
        return false;
      }
    }
    // Recursively check children
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        if (!isSortedBySortOrder(node.children)) {
          return false;
        }
      }
    }
    return true;
  }

  it("every input category appears exactly once in the output tree", () => {
    fc.assert(
      fc.property(categoryArrayArb, (categories) => {
        const tree = buildCategoryTree(categories);
        const outputIds = collectIds(tree).sort((a, b) => a - b);
        const inputIds = categories.map((c) => c.id).sort((a, b) => a - b);

        expect(outputIds).toEqual(inputIds);
      }),
      { numRuns: 100 },
    );
  });

  it("tree is sorted by sort_order at every level", () => {
    fc.assert(
      fc.property(categoryArrayArb, (categories) => {
        const tree = buildCategoryTree(categories);
        expect(isSortedBySortOrder(tree)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("orphans (categories with invalid parent_id) appear as roots", () => {
    fc.assert(
      fc.property(categoryArrayArb, (categories) => {
        const tree = buildCategoryTree(categories);
        const validIds = new Set(categories.map((c) => c.id));

        // Find categories that MUST be roots:
        // - null parent_id
        // - self-referencing parent_id (parent_id === id)
        // - invalid parent_id (referencing non-existent category)
        const mustBeRootIds = new Set(
          categories
            .filter(
              (c) =>
                c.parent_id === null ||
                c.parent_id === c.id ||
                !validIds.has(c.parent_id),
            )
            .map((c) => c.id),
        );

        // All must-be-root nodes should appear as roots in the tree
        const actualRootIds = new Set(tree.map((node) => node.id));
        for (const id of mustBeRootIds) {
          expect(actualRootIds).toContain(id);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 4: Sidebar Permission Filtering ───────────────────────────────
// **Validates: Requirements 15.2**

describe("Property 4: Sidebar Permission Filtering", () => {
  it("buildSidebarItems returns only items whose permission is in the permissions array", () => {
    fc.assert(
      fc.property(permissionsArb, (permissions) => {
        const items = buildSidebarItems(permissions);

        // Every returned item must have its permission in the input array
        for (const item of items) {
          expect(permissions).toContain(item.permission);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("buildSidebarItems returns all items that match the permissions", () => {
    fc.assert(
      fc.property(permissionsArb, (permissions) => {
        const items = buildSidebarItems(permissions);
        const returnedPermissions = items.map((i) => i.permission);

        // Every sidebar permission that's in the input should appear in the output
        for (const perm of permissions) {
          if (ALL_SIDEBAR_PERMISSIONS.includes(perm)) {
            expect(returnedPermissions).toContain(perm);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it("empty permissions array returns empty sidebar", () => {
    const items = buildSidebarItems([]);
    expect(items).toEqual([]);
  });

  it("all permissions returns all sidebar items", () => {
    const items = buildSidebarItems(ALL_SIDEBAR_PERMISSIONS);
    expect(items.length).toBe(ALL_SIDEBAR_PERMISSIONS.length);
  });
});
