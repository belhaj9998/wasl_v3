"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField, SubmitButton } from "@/components/forms";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { toast } from "sonner";
import {
  platformService,
  type Permission,
  type CreatePermissionPayload,
  type UpdatePermissionPayload,
} from "@/lib/api/services/platform.service";

// --- Validation Schema ---
const permissionSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(100, "Code must be at most 100 characters")
    .regex(
      /^[a-z][a-z0-9_:.-]*$/,
      "Code must start with a lowercase letter and contain only lowercase letters, numbers, underscores, colons, dots, or hyphens",
    ),
  name: z
    .string()
    .min(1, "Action/name is required")
    .max(100, "Name must be at most 100 characters"),
  group: z
    .string()
    .min(1, "Module/group is required")
    .max(100, "Module must be at most 100 characters"),
  description: z
    .string()
    .max(500, "Description must be at most 500 characters")
    .optional()
    .or(z.literal("")),
});

type PermissionFormValues = z.infer<typeof permissionSchema>;

/**
 * Platform Permissions Management Page
 * Displays all permissions in a table with create/edit/delete functionality.
 * Requirements: 5.1
 */
export default function PermissionsPage() {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const tSuccess = useTranslations("success");

  // State
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null,
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingPermission, setDeletingPermission] =
    useState<Permission | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form
  const form = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      code: "",
      name: "",
      group: "",
      description: "",
    },
  });

  const { control, handleSubmit, reset, formState } = form;
  const { isSubmitting } = formState;

  // Fetch permissions
  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await platformService.permissions.getAll();
      setPermissions(response.data ?? []);
    } catch (err) {
      setError("Failed to load permissions");
      console.error("Failed to fetch permissions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Open create dialog
  const handleCreate = useCallback(() => {
    setEditingPermission(null);
    reset({ code: "", name: "", group: "", description: "" });
    setDialogOpen(true);
  }, [reset]);

  // Open edit dialog
  const handleEdit = useCallback(
    (permission: Permission) => {
      setEditingPermission(permission);
      reset({
        code: permission.code,
        name: permission.name,
        group: permission.group,
        description: permission.description ?? "",
      });
      setDialogOpen(true);
    },
    [reset],
  );

  // Submit form (create or update)
  const onSubmit = useCallback(
    async (values: PermissionFormValues) => {
      try {
        if (editingPermission) {
          // Update
          const payload: UpdatePermissionPayload = {
            code: values.code,
            name: values.name,
            group: values.group,
            description: values.description || undefined,
          };
          await platformService.permissions.update(
            editingPermission.id,
            payload,
          );
          toast.success(tSuccess("crud.updated"));
        } else {
          // Create
          const payload: CreatePermissionPayload = {
            code: values.code,
            name: values.name,
            group: values.group,
            description: values.description || undefined,
          };
          await platformService.permissions.create(payload);
          toast.success(tSuccess("crud.created"));
        }
        setDialogOpen(false);
        fetchPermissions();
      } catch (err) {
        console.error("Failed to save permission:", err);
        toast.error(
          editingPermission
            ? "Failed to update permission"
            : "Failed to create permission",
        );
      }
    },
    [editingPermission, fetchPermissions, tSuccess],
  );

  // Delete permission
  const handleDeleteClick = useCallback((permission: Permission) => {
    setDeletingPermission(permission);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingPermission) return;
    setDeleteLoading(true);
    try {
      await platformService.permissions.delete(deletingPermission.id);
      toast.success(tSuccess("crud.deleted"));
      setDeleteConfirmOpen(false);
      setDeletingPermission(null);
      fetchPermissions();
    } catch (err) {
      console.error("Failed to delete permission:", err);
      toast.error("Failed to delete permission");
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingPermission, fetchPermissions, tSuccess]);

  // Group permissions by module for display
  const groupedPermissions = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.group]) {
        acc[perm.group] = [];
      }
      acc[perm.group].push(perm);
      return acc;
    },
    {} as Record<string, Permission[]>,
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {tNav("permissions")}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage platform permissions for role-based access control
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="me-2 h-4 w-4" />
          {t("create")}
        </Button>
      </div>

      {/* Permissions table */}
      {loading ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="mb-4 text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchPermissions}>
            {t("retry")}
          </Button>
        </div>
      ) : permissions.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-12 w-12" />}
          message="No permissions found. Create your first permission."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedPermissions).map(([group, perms]) =>
                perms.map((permission, index) => (
                  <TableRow key={permission.id}>
                    <TableCell className="font-mono text-sm">
                      {permission.code}
                    </TableCell>
                    <TableCell>
                      {index === 0 ? (
                        <Badge variant="secondary">{group}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {group}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{permission.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                      {permission.description || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(permission)}
                          aria-label={`${t("edit")} ${permission.code}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(permission)}
                          aria-label={`${t("delete")} ${permission.code}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingPermission
                ? `${t("edit")} Permission`
                : `${t("create")} Permission`}
            </DialogTitle>
            <DialogDescription>
              {editingPermission
                ? "Update the permission details below."
                : "Fill in the details to create a new permission."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={control}
              name="code"
              label="Code"
              placeholder="e.g. product:create"
              required
              description="Unique permission identifier (lowercase, use colons for namespacing)"
              disabled={!!editingPermission}
            />

            <FormField
              control={control}
              name="group"
              label="Module"
              placeholder="e.g. product"
              required
              description="The module or feature area this permission belongs to"
            />

            <FormField
              control={control}
              name="name"
              label="Action"
              placeholder="e.g. Create Product"
              required
              description="Human-readable name for this permission"
            />

            <FormField
              control={control}
              name="description"
              label="Description"
              type="textarea"
              placeholder="Optional description of what this permission allows"
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t("cancel")}
              </Button>
              <SubmitButton isSubmitting={isSubmitting}>
                {editingPermission ? t("save") : t("create")}
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Permission"
        description={`Are you sure you want to delete the permission "${deletingPermission?.code}"? This action cannot be undone.`}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={handleDeleteConfirm}
        destructive
        loading={deleteLoading}
      />
    </div>
  );
}
