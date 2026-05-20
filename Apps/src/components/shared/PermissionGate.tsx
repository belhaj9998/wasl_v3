"use client";

/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions.
 * Renders nothing (or a fallback) when the user lacks the required permission(s).
 *
 * Requirements: 15.1, 15.3
 */

import { type ReactNode } from "react";
import {
  usePermission,
  usePermissions,
  useHasAnyPermission,
} from "@/hooks/usePermission";

export interface PermissionGateProps {
  /** Single permission string or array of permission strings to check */
  permission: string | string[];
  /** When permission is an array, "all" requires all permissions, "any" requires at least one */
  mode?: "all" | "any";
  /** Content to render when the user has the required permission(s) */
  children: ReactNode;
  /** Optional fallback to render when the user lacks the required permission(s) */
  fallback?: ReactNode;
}

/**
 * Internal component for single permission check.
 */
function SinglePermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hasPermission = usePermission(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Internal component for checking ALL permissions in an array.
 */
function AllPermissionsGate({
  permissions,
  children,
  fallback = null,
}: {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hasAll = usePermissions(permissions);
  return hasAll ? <>{children}</> : <>{fallback}</>;
}

/**
 * Internal component for checking ANY permission in an array.
 */
function AnyPermissionGate({
  permissions,
  children,
  fallback = null,
}: {
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hasAny = useHasAnyPermission(permissions);
  return hasAny ? <>{children}</> : <>{fallback}</>;
}

/**
 * PermissionGate renders its children only when the current user
 * has the required permission(s). Otherwise renders the fallback (or null).
 *
 * @example
 * // Single permission
 * <PermissionGate permission="products.create">
 *   <AddProductButton />
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions - user needs ALL
 * <PermissionGate permission={["products.create", "products.update"]} mode="all">
 *   <BulkEditPanel />
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions - user needs ANY
 * <PermissionGate permission={["orders.view", "orders.manage_status"]} mode="any">
 *   <OrdersLink />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate permission="settings.manage" fallback={<ReadOnlySettings />}>
 *   <EditableSettings />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  mode = "all",
  children,
  fallback,
}: PermissionGateProps) {
  // Single permission string
  if (typeof permission === "string") {
    return (
      <SinglePermissionGate permission={permission} fallback={fallback}>
        {children}
      </SinglePermissionGate>
    );
  }

  // Array of permissions with mode
  if (mode === "any") {
    return (
      <AnyPermissionGate permissions={permission} fallback={fallback}>
        {children}
      </AnyPermissionGate>
    );
  }

  // Default: mode === "all"
  return (
    <AllPermissionsGate permissions={permission} fallback={fallback}>
      {children}
    </AllPermissionsGate>
  );
}

export default PermissionGate;
