"use client";

/**
 * Role Detail Page
 * Displays role name and description with a permissions assignment interface.
 * Permissions are shown as checkboxes grouped by module.
 * Save button sends PUT request with array of permission_ids.
 *
 * Requirements: 9.3
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Shield, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { useStore } from "@/hooks/useStore";
import { roleService, type Role } from "@/lib/api/services/role.service";
import {
  platformService,
  type Permission,
} from "@/lib/api/services/platform.service";

// ─── Permission Module Order ─────────────────────────────────────────────────

const MODULE_ORDER = [
  "product",
  "order",
  "customer",
  "category",
  "coupon",
  "inventory",
  "member",
  "role",
  "store",
];

// ─── Role Detail Page ────────────────────────────────────────────────────────

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentStoreId } = useStore();
  const t = useTranslations("roles");
  const tCommon = useTranslations("common");
  const tSuccess = useTranslations("success");

  const roleId = Number(params.id);

  // State
  const [role, setRole] = useState<Role | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ========== Data Fetching ==========

  const fetchData = useCallback(async () => {
    if (!currentStoreId || !roleId) return;

    setLoading(true);
    setError(null);
    try {
      const [roleResponse, permissionsResponse] = await Promise.all([
        roleService.getById(currentStoreId, roleId),
        platformService.permissions.getAll(),
      ]);

      const roleData = (roleResponse as any).data ?? roleResponse;
      setRole(roleData);
      setSelectedPermissions(roleData.permissions || []);

      const permsData =
        (permissionsResponse as any).data ?? permissionsResponse;
      setAllPermissions(Array.isArray(permsData) ? permsData : []);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : t("loadFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, roleId, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ========== Permissions Grouping ==========

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const perm of allPermissions) {
      const group = perm.group || perm.code.split(":")[0] || "other";
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(perm);
    }

    // Sort groups by MODULE_ORDER, then alphabetically for unknown groups
    const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
      const indexA = MODULE_ORDER.indexOf(a);
      const indexB = MODULE_ORDER.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedEntries;
  }, [allPermissions]);

  // ========== Permission Toggle Handlers ==========

  const handleToggle = useCallback((permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  }, []);

  const handleToggleGroup = useCallback(
    (perms: Permission[]) => {
      const ids = perms.map((p) => p.id);
      const allSelected = ids.every((id) => selectedPermissions.includes(id));

      if (allSelected) {
        setSelectedPermissions((prev) =>
          prev.filter((id) => !ids.includes(id)),
        );
      } else {
        setSelectedPermissions((prev) => [
          ...prev,
          ...ids.filter((id) => !prev.includes(id)),
        ]);
      }
    },
    [selectedPermissions],
  );

  const handleSave = useCallback(async () => {
    if (!currentStoreId || !roleId) return;

    setIsSaving(true);
    try {
      await roleService.updatePermissions(currentStoreId, roleId, {
        permission_ids: selectedPermissions,
      });
      toast.success(tSuccess("role.permissionsUpdated"));
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : t("permissionsUpdateFailed");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [currentStoreId, roleId, selectedPermissions, t, tSuccess]);
  // ========== Loading State ==========

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ========== Error State ==========

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchData} variant="outline">
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  if (!role) return null;

  // ========== Render ==========

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/roles")}
            aria-label={tCommon("back")}
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{role.name}</h1>
            {role.description && (
              <p className="text-muted-foreground text-sm mt-1">
                {role.description}
              </p>
            )}
          </div>
          {role.is_system && (
            <Badge variant="secondary">{t("systemRole")}</Badge>
          )}
        </div>

        {/* Save button */}
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="me-2 h-4 w-4" />
          )}
          {isSaving ? t("savingPermissions") : t("savePermissions")}
        </Button>
      </div>

      {/* Permissions count summary */}
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          {selectedPermissions.length} / {allPermissions.length}{" "}
          {t("permissionsSelected")}
        </Badge>
      </div>

      {/* Permissions grouped by module */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedPermissions.map(([group, perms]) => {
          const ids = perms.map((p) => p.id);
          const allSelected = ids.every((id) =>
            selectedPermissions.includes(id),
          );
          const someSelected =
            !allSelected && ids.some((id) => selectedPermissions.includes(id));
          return (
            <Card key={group}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <fieldset>
                    <legend className="sr-only">
                      {t("modulePermissions", { module: group })}
                    </legend>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`group-${group}`}
                        checked={allSelected}
                        ref={(el) => {
                          if (el) {
                            (el as unknown as HTMLInputElement).indeterminate =
                              someSelected;
                          }
                        }}
                        onCheckedChange={() => handleToggleGroup(perms)}
                        aria-label={t("selectAllModule", { module: group })}
                      />
                      <Label
                        htmlFor={`group-${group}`}
                        className="font-semibold capitalize cursor-pointer text-base"
                      >
                        {group}
                      </Label>
                    </div>
                  </fieldset>
                  <Badge variant="secondary" className="text-xs">
                    {
                      ids.filter((id) => selectedPermissions.includes(id))
                        .length
                    }
                    /{perms.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {perms.map((perm) => (
                  <div key={perm.code} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${perm.code}`}
                      checked={selectedPermissions.includes(perm.id)}
                      onCheckedChange={() => handleToggle(perm.id)}
                      aria-label={perm.name || perm.code}
                    />
                    <Label
                      htmlFor={`perm-${perm.code}`}
                      className="text-sm cursor-pointer font-normal"
                    >
                      {perm.name || perm.code}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty state when no permissions available */}
      {allPermissions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t("noPermissionsAvailable")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
