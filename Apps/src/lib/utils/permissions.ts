/**
 * Permission-based utilities
 * Sidebar filtering, action checks, category tree building, and order state machine helpers
 */

import type { Category } from "@/types";
import type { SidebarItem } from "@/types";
import {
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/constants";

// ─── Sidebar Items Definition ────────────────────────────────────────────────

const ALL_SIDEBAR_ITEMS: SidebarItem[] = [
  {
    path: "/admin/dashboard",
    label: "لوحة التحكم",
    icon: "LayoutDashboard",
    permission: "analytics.view",
  },
  {
    path: "/admin/products",
    label: "المنتجات",
    icon: "Package",
    permission: "products.view",
  },
  {
    path: "/admin/categories",
    label: "الفئات",
    icon: "FolderTree",
    permission: "catalog.view",
  },
  {
    path: "/admin/orders",
    label: "الطلبات",
    icon: "ShoppingCart",
    permission: "orders.view",
  },
  {
    path: "/admin/customers",
    label: "العملاء",
    icon: "Users",
    permission: "customers.view",
  },
  {
    path: "/admin/coupons",
    label: "الكوبونات",
    icon: "Ticket",
    permission: "coupons.manage",
  },
  {
    path: "/admin/inventory",
    label: "المخزون",
    icon: "Warehouse",
    permission: "inventory.view",
  },
  {
    path: "/admin/members",
    label: "الأعضاء",
    icon: "UserPlus",
    permission: "staff.manage",
  },
  {
    path: "/admin/roles",
    label: "الأدوار",
    icon: "Shield",
    permission: "staff.manage",
  },
  {
    path: "/admin/settings/order-tags",
    label: "وسوم الطلبات",
    icon: "Tag",
    permission: "orders.tags.manage",
  },
  {
    path: "/admin/settings",
    label: "الإعدادات",
    icon: "Settings",
    permission: "settings.manage",
  },
];

// ─── Order Action Type ───────────────────────────────────────────────────────

export interface OrderAction {
  type: "cancel" | "transition";
  targetStatus?: OrderStatus;
  label: string;
  variant: "default" | "destructive";
}

// ─── Permission Functions ────────────────────────────────────────────────────

/**
 * Filters sidebar items based on user permissions.
 * Returns only items whose `permission` field is present in the permissions array.
 * @param permissions - Array of permission strings the user has
 * @returns Filtered sidebar items
 */
export function buildSidebarItems(permissions: string[]): SidebarItem[] {
  return ALL_SIDEBAR_ITEMS.filter((item) =>
    permissions.includes(item.permission),
  );
}

/**
 * Checks if a user can perform a specific action.
 * @param permissions - Array of permission strings the user has
 * @param action - The action permission string to check (e.g., "products.create")
 * @returns true if the action is in the permissions array
 */
export function canPerformAction(
  permissions: string[],
  action: string,
): boolean {
  return permissions.includes(action);
}

// ─── Category Tree Builder ───────────────────────────────────────────────────

/**
 * Transforms a flat category array into a nested tree structure.
 * - Categories with null parent_id become roots
 * - Categories with invalid parent_id (not found in the list) become roots (orphan handling)
 * - Children are sorted by sort_order ascending at each level
 *
 * @param categories - Flat array of categories from the API
 * @returns Nested tree of categories sorted by sort_order
 */
export function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<number, Category & { children: Category[] }>();
  const roots: (Category & { children: Category[] })[] = [];

  // First pass: create map with empty children arrays
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  // Second pass: link children to parents, orphans become roots
  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parent_id === null || cat.parent_id === cat.id) {
      // Null parent or self-referencing — treat as root
      roots.push(node);
    } else {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // Orphan — parent not in list, treat as root
        roots.push(node);
      }
    }
  }

  // Third pass: detect cycles — any node not reachable from roots is in a cycle
  // Collect all IDs reachable from roots
  const reachable = new Set<number>();
  const collectReachable = (nodes: (Category & { children: Category[] })[]) => {
    for (const node of nodes) {
      if (reachable.has(node.id)) continue;
      reachable.add(node.id);
      collectReachable(
        node.children as (Category & { children: Category[] })[],
      );
    }
  };
  collectReachable(roots);

  // Any unreachable node is part of a cycle — break cycle by adding as root
  for (const cat of categories) {
    if (!reachable.has(cat.id)) {
      const node = map.get(cat.id)!;
      // Remove from parent's children to avoid duplication
      if (cat.parent_id !== null && cat.parent_id !== cat.id) {
        const parent = map.get(cat.parent_id);
        if (parent) {
          parent.children = parent.children.filter((c) => c.id !== cat.id);
        }
      }
      roots.push(node);
      // Mark this node and its subtree as reachable
      collectReachable([node]);
    }
  }

  // Sort by sort_order at each level recursively
  const sortNodes = (
    nodes: (Category & { children: Category[] })[],
  ): Category[] => {
    nodes.sort((a, b) => a.sort_order - b.sort_order);
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortNodes(node.children as (Category & { children: Category[] })[]);
      }
    }
    return nodes;
  };

  return sortNodes(roots);
}

// ─── Order State Machine Helpers ─────────────────────────────────────────────

/**
 * Checks if a transition from currentStatus to targetStatus is valid.
 * @param currentStatus - The current order status
 * @param targetStatus - The desired target status
 * @returns true iff target is in ORDER_STATUS_TRANSITIONS[current]
 */
export function canTransitionTo(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
): boolean {
  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus];
  return allowed.includes(targetStatus);
}

/**
 * Returns the list of valid next statuses from the given status.
 * Terminal states (CANCELED, RETURNED) return an empty array.
 * @param status - The current order status
 * @returns Array of valid target statuses
 */
export function getAvailableTransitions(status: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[status] ?? [];
}

/**
 * Returns available action buttons based on the current order status.
 * Maps each available transition to an OrderAction with label and variant.
 * @param status - The current order status
 * @returns Array of OrderAction descriptors for UI rendering
 */
export function getOrderActions(status: OrderStatus): OrderAction[] {
  const actions: OrderAction[] = [];
  const available = getAvailableTransitions(status);

  for (const targetStatus of available) {
    if (targetStatus === "CANCELED") {
      actions.push({
        type: "cancel",
        targetStatus,
        label: "إلغاء الطلب",
        variant: "destructive",
      });
    } else {
      actions.push({
        type: "transition",
        targetStatus,
        label: ORDER_STATUS_LABELS[targetStatus].ar,
        variant: "default",
      });
    }
  }

  return actions;
}
