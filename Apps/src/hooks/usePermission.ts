/**
 * Permission Hooks
 * Client-side permission checking for UI element visibility and route access.
 *
 * Requirements: 15.1, 15.3
 */

import { useAppSelector } from "@/lib/store/hooks";

/**
 * Check if the current user has a specific permission.
 * @param permission - The permission string to check (e.g., "products.create")
 * @returns true if the user has the permission
 */
export function usePermission(permission: string): boolean {
  const permissions = useAppSelector((state) => state.auth.permissions);
  return permissions.includes(permission);
}

/**
 * Check if the current user has ALL of the specified permissions.
 * @param permissions - Array of permission strings to check
 * @returns true if the user has every permission in the array
 */
export function usePermissions(permissions: string[]): boolean {
  const userPermissions = useAppSelector((state) => state.auth.permissions);
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * Check if the current user has ANY of the specified permissions.
 * @param permissions - Array of permission strings to check
 * @returns true if the user has at least one permission in the array
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const userPermissions = useAppSelector((state) => state.auth.permissions);
  return permissions.some((p) => userPermissions.includes(p));
}
