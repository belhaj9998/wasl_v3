"use client";

/**
 * Members Management Page
 * Displays a table of store members with invite, change role, and remove actions.
 * Implements invite member form with email + role selection in a dialog.
 *
 * Requirements: 13.1, 13.2, 13.3
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Users,
  Plus,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { DataTable } from "@/components/tables/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { FormField } from "@/components/forms/FormField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchMembers,
  inviteMember,
  changeMemberRole,
  removeMember,
} from "@/lib/store/slices/members.thunks";
import { useStore } from "@/hooks/useStore";
import { formatDate } from "@/lib/utils/formatDate";
import {
  inviteMemberSchema,
  type InviteMemberFormData,
} from "@/lib/validators/member.schema";
import { roleService, type Role } from "@/lib/api/services/role.service";
import { memberService, type Member } from "@/lib/api/services/member.service";

// ─── Invite Member Dialog ────────────────────────────────────────────────────

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  onSubmit: (data: InviteMemberFormData) => Promise<void>;
  isSubmitting: boolean;
}

function InviteDialog({
  open,
  onOpenChange,
  roles,
  onSubmit,
  isSubmitting,
}: InviteDialogProps) {
  const t = useTranslations("members");
  const { control, handleSubmit, reset } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role_id: undefined,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({ email: "", role_id: undefined });
    }
  }, [open, reset]);

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: String(r.id), label: r.name })),
    [roles],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>دعوة عضو جديد</DialogTitle>
          <DialogDescription>
            أدخل البريد الإلكتروني للمستخدم واختر الدور المناسب
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((data) => {
            // Convert role_id from string to number for the schema
            const payload = {
              ...data,
              role_id: Number(data.role_id),
            };
            return onSubmit(payload);
          })}
          className="space-y-4"
        >
          {/* Email */}
          <FormField
            control={control}
            name="email"
            label={t("emailLabel")}
            type="email"
            placeholder="user@example.com"
            required
          />

          {/* Role */}
          <FormField
            control={control}
            name="role_id"
            label={t("roleLabel")}
            type="select"
            placeholder={t("rolePlaceholder")}
            options={roleOptions}
            required
          />

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <SubmitButton isSubmitting={isSubmitting}>
              إرسال الدعوة
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Members Page ────────────────────────────────────────────────────────────

export default function MembersPage() {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const tSuccess = useTranslations("success");

  const {
    items: members,
    loading,
    error,
  } = useAppSelector((state) => state.members);

  const user = useAppSelector((state) => state.auth.user);

  // Roles for invite and change role
  const [roles, setRoles] = useState<Role[]>([]);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Remove confirmation state
  const [removeDialog, setRemoveDialog] = useState<{
    open: boolean;
    member: Member | null;
  }>({ open: false, member: null });
  const [removeLoading, setRemoveLoading] = useState(false);

  // Action loading state
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch members on mount
  useEffect(() => {
    if (!currentStoreId) return;
    dispatch(fetchMembers({ storeId: currentStoreId }));
  }, [dispatch, currentStoreId]);

  // Fetch roles for dropdowns
  useEffect(() => {
    if (!currentStoreId) return;

    const loadRoles = async () => {
      try {
        const response = await roleService.getAll(currentStoreId);
        setRoles(response.data);
      } catch {
        // Roles fetch failure is non-critical, toast a warning
        toast.error(t("loadRolesFailed"));
      }
    };

    loadRoles();
  }, [currentStoreId]);

  // Determine if a member is the store owner (cannot change their role)
  const isOwner = useCallback((member: Member) => {
    // The owner is the user whose user_id matches the current user
    // and has the highest-level role, or we check if the role name indicates owner
    // A safer approach: check if the member's role name is "owner" or similar
    // But per the spec, we exclude the store owner's membership from role change
    // We'll check if the member's user_id matches the store owner
    // Since we don't have store.owner_id readily available, we check role name
    return (
      member.role.name.toLowerCase() === "owner" ||
      member.role.name === "مالك المتجر"
    );
  }, []);

  // Handle invite submit
  const handleInvite = useCallback(
    async (data: InviteMemberFormData) => {
      if (!currentStoreId) return;

      setIsSubmitting(true);
      try {
        await dispatch(
          inviteMember({
            storeId: currentStoreId,
            payload: { email: data.email, role_id: data.role_id },
          }),
        ).unwrap();
        toast.success(tSuccess("member.invited"));
        setInviteOpen(false);
      } catch (err: unknown) {
        const message = typeof err === "string" ? err : "";

        // Handle specific error codes
        if (message.includes("409") || message.includes("already")) {
          toast.error(t("alreadyMember"));
        } else if (
          message.includes("404") ||
          message.includes("not registered") ||
          message.includes("not found")
        ) {
          toast.error(t("userNotRegistered"));
        } else if (message.includes("role") || message.includes("invalid")) {
          toast.error(t("invalidRole"));
        } else {
          toast.error(message || t("inviteFailed"));
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [dispatch, currentStoreId],
  );

  // Handle change role
  const handleChangeRole = useCallback(
    async (member: Member, newRoleId: number) => {
      if (!currentStoreId) return;

      setActionLoading(true);
      try {
        await dispatch(
          changeMemberRole({
            storeId: currentStoreId,
            memberId: member.id,
            payload: { role_id: newRoleId },
          }),
        ).unwrap();
        toast.success(tSuccess("member.roleChanged"));
      } catch (err: unknown) {
        const message = typeof err === "string" ? err : t("roleChangeFailed");
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [dispatch, currentStoreId],
  );

  // Handle remove member
  const handleRemove = useCallback(async () => {
    if (!currentStoreId || !removeDialog.member) return;

    setRemoveLoading(true);
    try {
      await dispatch(
        removeMember({
          storeId: currentStoreId,
          memberId: removeDialog.member.id,
        }),
      ).unwrap();
      toast.success(tSuccess("member.removed"));
    } catch (err: unknown) {
      const message = typeof err === "string" ? err : t("removeFailed");
      toast.error(message);
    } finally {
      setRemoveLoading(false);
      setRemoveDialog({ open: false, member: null });
    }
  }, [dispatch, currentStoreId, removeDialog.member]);

  // Handle resend invite
  const handleResendInvite = useCallback(
    async (member: Member) => {
      if (!currentStoreId) return;

      setActionLoading(true);
      try {
        await memberService.resendInvite(currentStoreId, member.id);
        toast.success(tSuccess("member.invited"));
      } catch (err: unknown) {
        const message = typeof err === "string" ? err : t("resendFailed");
        toast.error(message);
      } finally {
        setActionLoading(false);
      }
    },
    [currentStoreId],
  );

  // Handle retry on error
  const handleRetry = useCallback(() => {
    if (!currentStoreId) return;
    dispatch(fetchMembers({ storeId: currentStoreId }));
  }, [dispatch, currentStoreId]);

  // Table columns definition
  const columns: ColumnDef<Member, unknown>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("headerName"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.user.name}</span>
        ),
      },
      {
        id: "email",
        header: t("headerEmail"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.user.email}
          </span>
        ),
      },
      {
        id: "role",
        header: t("headerRole"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {row.original.role.name}
          </span>
        ),
      },
      {
        id: "joined_at",
        header: t("headerJoinedAt"),
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.joined_at),
      },
      {
        id: "actions",
        header: t("headerActions"),
        enableSorting: false,
        cell: ({ row }) => {
          const member = row.original;
          const memberIsOwner = isOwner(member);
          const isSelf = user?.id === member.user_id;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">إجراءات</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Change Role — exclude owner */}
                {!memberIsOwner && !isSelf && (
                  <PermissionGate permission="member:update">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <RefreshCw className="me-2 h-4 w-4" />
                        تغيير الدور
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {roles
                          .filter((r) => r.id !== member.role_id)
                          .map((role) => (
                            <DropdownMenuItem
                              key={role.id}
                              onClick={() => handleChangeRole(member, role.id)}
                              disabled={actionLoading}
                            >
                              {role.name}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </PermissionGate>
                )}

                {/* Resend Invite */}
                <PermissionGate permission="member:create">
                  <DropdownMenuItem
                    onClick={() => handleResendInvite(member)}
                    disabled={actionLoading}
                  >
                    <Mail className="me-2 h-4 w-4" />
                    إعادة إرسال الدعوة
                  </DropdownMenuItem>
                </PermissionGate>

                {/* Remove — exclude owner and self */}
                {!memberIsOwner && !isSelf && (
                  <>
                    <DropdownMenuSeparator />
                    <PermissionGate permission="member:delete">
                      <DropdownMenuItem
                        onClick={() => setRemoveDialog({ open: true, member })}
                        disabled={actionLoading}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="me-2 h-4 w-4" />
                        إزالة العضو
                      </DropdownMenuItem>
                    </PermissionGate>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [roles, user, isOwner, handleChangeRole, handleResendInvite, actionLoading],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">الأعضاء</h2>
          <p className="text-muted-foreground">
            إدارة أعضاء فريق العمل في متجرك
          </p>
        </div>

        {/* Invite Member button — permission-gated */}
        <PermissionGate permission="member:create">
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            دعوة عضو
          </Button>
        </PermissionGate>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={members}
        meta={null}
        loading={loading}
        error={error}
        onRetry={handleRetry}
        emptyMessage={t("noMembers")}
        emptyIcon={<Users className="h-12 w-12" />}
      />

      {/* Invite Member Dialog */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={roles}
        onSubmit={handleInvite}
        isSubmitting={isSubmitting}
      />

      {/* Remove Confirmation Dialog */}
      <ConfirmDialog
        open={removeDialog.open}
        onOpenChange={(open) => {
          if (!open) setRemoveDialog({ open: false, member: null });
        }}
        title={t("removeTitle")}
        description={`هل أنت متأكد من إزالة "${removeDialog.member?.user.name}" من فريق العمل؟ سيفقد العضو جميع صلاحياته في المتجر.`}
        confirmLabel={t("removeConfirmLabel")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleRemove}
        destructive
        loading={removeLoading}
      />
    </div>
  );
}
