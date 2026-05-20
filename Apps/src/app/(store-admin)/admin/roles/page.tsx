"use client";

/**
 * Roles Management Page
 * Displays roles list with create/edit dialog.
 * Columns: name, description, permissions count.
 * Implements create/edit form with roleSchema (name: 2-50, description: max 255).
 * Implements permissions assignment (checkbox list of all available permissions).
 * Handles delete with confirmation.
 *
 * Requirements: 14.1
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Shield,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Key,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/tables/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { FormField } from "@/components/forms/FormField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useStore } from "@/hooks/useStore";
import {
  roleService,
  type Role,
  type CreateRolePayload,
} from "@/lib/api/services/role.service";
import { roleSchema, type RoleFormData } from "@/lib/validators/role.schema";
import {
  platformService,
  type Permission,
} from "@/lib/api/services/platform.service";

// ─── Role Form Dialog ────────────────────────────────────────────────────────

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRole: Role | null;
  onSubmit: (data: RoleFormData) => Promise<void>;
  isSubmitting: boolean;
}

function RoleDialog({
  open,
  onOpenChange,
  editingRole,
  onSubmit,
  isSubmitting,
}: RoleDialogProps) {
  const t = useTranslations("roles");
  const tCommon = useTranslations("common");
  const { control, handleSubmit, reset } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Reset form when dialog opens or editing role changes
  useEffect(() => {
    if (open) {
      if (editingRole) {
        reset({
          name: editingRole.name,
          description: editingRole.description || "",
        });
      } else {
        reset({ name: "", description: "" });
      }
    }
  }, [open, editingRole, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingRole ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {editingRole ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={control}
            name="name"
            label={t("nameLabel")}
            type="text"
            placeholder={t("namePlaceholder")}
            required
          />

          <FormField
            control={control}
            name="description"
            label={t("descriptionLabel")}
            type="textarea"
            placeholder={t("descriptionPlaceholder")}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <SubmitButton isSubmitting={isSubmitting}>
              {editingRole ? tCommon("save") : tCommon("create")}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Permissions Dialog ──────────────────────────────────────────────────────

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  allPermissions: Permission[];
  onSave: (roleId: number, permissions: number[]) => Promise<void>;
  isSaving: boolean;
}

function PermissionsDialog({
  open,
  onOpenChange,
  role,
  allPermissions,
  onSave,
  isSaving,
}: PermissionsDialogProps) {
  const t = useTranslations("roles");
  const tCommon = useTranslations("common");
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  useEffect(() => {
    if (open && role) {
      setSelectedPermissions(role.permissions || []);
    }
  }, [open, role]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const perm of allPermissions) {
      const group = perm.group || perm.code.split(":")[0] || "other";
      if (!groups[group]) groups[group] = [];
      groups[group].push(perm);
    }
    return groups;
  }, [allPermissions]);

  const handleToggle = useCallback((permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  }, []);

  const handleSelectAll = useCallback(
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

  const handleSave = useCallback(() => {
    if (!role) return;
    onSave(role.id, selectedPermissions);
  }, [role, selectedPermissions, onSave]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إدارة صلاحيات: {role?.name}</DialogTitle>
          <DialogDescription>
            حدد الصلاحيات المتاحة لهذا الدور
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(groupedPermissions).map(([group, perms]) => {
            const ids = perms.map((p) => p.id);
            const allSelected = ids.every((id) =>
              selectedPermissions.includes(id),
            );
            const someSelected =
              !allSelected &&
              ids.some((id) => selectedPermissions.includes(id));

            return (
              <div key={group} className="space-y-3">
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
                    onCheckedChange={() => handleSelectAll(perms)}
                  />
                  <Label
                    htmlFor={`group-${group}`}
                    className="font-semibold capitalize cursor-pointer"
                  >
                    {group}
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {
                      ids.filter((id) => selectedPermissions.includes(id))
                        .length
                    }
                    /{perms.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ps-6">
                  {perms.map((perm) => (
                    <div key={perm.code} className="flex items-center gap-2">
                      <Checkbox
                        id={`perm-${perm.code}`}
                        checked={selectedPermissions.includes(perm.id)}
                        onCheckedChange={() => handleToggle(perm.id)}
                      />
                      <Label
                        htmlFor={`perm-${perm.code}`}
                        className="text-sm cursor-pointer"
                      >
                        {perm.name || perm.code}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {allPermissions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              لا توجد صلاحيات متاحة
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("savingPermissions") : t("savePermissions")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// ─── Roles Page ──────────────────────────────────────────────────────────────

export default function RolesPage() {
  const { currentStoreId } = useStore();
  const t = useTranslations("roles");
  const tCommon = useTranslations("common");
  const tSuccess = useTranslations("success");

  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role form dialog
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Permissions dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    role: Role | null;
  }>({ open: false, role: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ========== Data Fetching ==========

  const fetchRoles = useCallback(async () => {
    if (!currentStoreId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await roleService.getAll(currentStoreId);
      setRoles(response.data);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : t("loadFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentStoreId]);

  const fetchPermissions = useCallback(async () => {
    try {
      const response = await platformService.permissions.getAll();
      setAllPermissions(response.data ?? []);
    } catch {
      // Non-critical — permissions list may fail
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  // ========== Create/Edit Role ==========

  const handleOpenCreate = useCallback(() => {
    setEditingRole(null);
    setRoleDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((role: Role) => {
    setEditingRole(role);
    setRoleDialogOpen(true);
  }, []);

  const handleRoleSubmit = useCallback(
    async (data: RoleFormData) => {
      if (!currentStoreId) return;

      setIsSubmitting(true);
      try {
        if (editingRole) {
          // Update
          await roleService.update(currentStoreId, editingRole.id, {
            name: data.name,
            description: data.description || undefined,
          });
          toast.success(tSuccess("role.updated"));
        } else {
          // Create
          const payload: CreateRolePayload = {
            name: data.name,
            description: data.description || undefined,
          };
          await roleService.create(currentStoreId, payload);
          toast.success(tSuccess("role.created"));
        }
        setRoleDialogOpen(false);
        fetchRoles();
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : editingRole
              ? t("updateFailed")
              : t("createFailed");
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentStoreId, editingRole, fetchRoles],
  );

  // ========== Permissions Assignment ==========

  const handleOpenPermissions = useCallback((role: Role) => {
    setPermRole(role);
    setPermDialogOpen(true);
  }, []);

  const handleSavePermissions = useCallback(
    async (roleId: number, permissions: number[]) => {
      if (!currentStoreId) return;

      setIsSavingPerms(true);
      try {
        await roleService.updatePermissions(currentStoreId, roleId, {
          permission_ids: permissions,
        });
        toast.success(tSuccess("role.permissionsUpdated"));
        setPermDialogOpen(false);
        fetchRoles();
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as { message: string }).message
            : t("permissionsUpdateFailed");
        toast.error(message);
      } finally {
        setIsSavingPerms(false);
      }
    },
    [currentStoreId, fetchRoles, t, tSuccess],
  );
  // ========== Delete Role ==========

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.role || !currentStoreId) return;

    setDeleteLoading(true);
    try {
      await roleService.delete(currentStoreId, deleteDialog.role.id);
      toast.success(tSuccess("crud.deleted"));
      setDeleteDialog({ open: false, role: null });
      fetchRoles();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : t("deleteFailed");
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteDialog.role, currentStoreId, fetchRoles, t, tSuccess]);

  // ========== Retry ==========

  const handleRetry = useCallback(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ========== Table Columns ==========

  const columns: ColumnDef<Role, unknown>[] = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: t("headerName"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
            {row.original.is_system && (
              <Badge variant="secondary" className="text-xs">
                نظام
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: t("headerDescription"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.description || "—"}
          </span>
        ),
      },
      {
        id: "permissions_count",
        header: t("permissionsCount"),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="outline">
            {row.original.permissions?.length ?? 0} صلاحية
          </Badge>
        ),
      },
      {
        id: "actions",
        header: t("headerActions"),
        enableSorting: false,
        cell: ({ row }) => {
          const role = row.original;
          const isProtected = role.is_system;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">إجراءات</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <PermissionGate permission="staff.manage">
                  <DropdownMenuItem
                    onClick={() => handleOpenEdit(role)}
                    disabled={isProtected}
                  >
                    <Pencil className="me-2 h-4 w-4" />
                    تعديل
                  </DropdownMenuItem>
                </PermissionGate>

                <PermissionGate permission="staff.manage">
                  <DropdownMenuItem onClick={() => handleOpenPermissions(role)}>
                    <Key className="me-2 h-4 w-4" />
                    إدارة الصلاحيات
                  </DropdownMenuItem>
                </PermissionGate>

                <DropdownMenuSeparator />

                <PermissionGate permission="staff.manage">
                  <DropdownMenuItem
                    onClick={() => setDeleteDialog({ open: true, role })}
                    disabled={isProtected}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="me-2 h-4 w-4" />
                    حذف
                  </DropdownMenuItem>
                </PermissionGate>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, handleOpenEdit, handleOpenPermissions],
  );
  // ========== Render ==========

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الأدوار</h2>
          <p className="text-muted-foreground">
            إدارة أدوار وصلاحيات فريق العمل
          </p>
        </div>

        {/* Create Role button — permission-gated */}
        <PermissionGate permission="staff.manage">
          <Button onClick={handleOpenCreate}>
            <Plus className="me-2 h-4 w-4" />
            إنشاء دور
          </Button>
        </PermissionGate>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={roles}
        meta={null}
        loading={loading}
        error={error}
        onRetry={handleRetry}
        emptyMessage={t("noRoles")}
        emptyIcon={<Shield className="h-12 w-12" />}
      />

      {/* Create/Edit Role Dialog */}
      <RoleDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        editingRole={editingRole}
        onSubmit={handleRoleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Permissions Assignment Dialog */}
      <PermissionsDialog
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        role={permRole}
        allPermissions={allPermissions}
        onSave={handleSavePermissions}
        isSaving={isSavingPerms}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, role: null });
        }}
        title={t("deleteTitle")}
        description={t("deleteDescription", {
          name: deleteDialog.role?.name || "",
        })}
        confirmLabel={tCommon("delete")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleDeleteConfirm}
        destructive
        loading={deleteLoading}
      />
    </div>
  );
}
