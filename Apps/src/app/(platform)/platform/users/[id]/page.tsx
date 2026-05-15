"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  updatePlatformUser,
  deletePlatformUser,
} from "@/lib/store/slices/platform.thunks";
import { platformService } from "@/lib/api/services/platform.service";
import { formatDate } from "@/lib/utils/formatDate";
import { ROUTES } from "@/lib/constants/routes";
import type { User, SystemRole } from "@/types";

const SYSTEM_ROLES: SystemRole[] = [
  "USER",
  "SUPPORT",
  "PLATFORM_ADMIN",
  "PLATFORM_OWNER",
];

const ROLE_LABELS: Record<SystemRole, string> = {
  USER: "مستخدم",
  SUPPORT: "دعم فني",
  PLATFORM_ADMIN: "مدير المنصة",
  PLATFORM_OWNER: "مالك المنصة",
};

/**
 * Platform User Detail Page
 * Displays detailed information about a specific user with actions.
 *
 * Requirements: 3.1, 3.3, 3.4, 3.5, 3.6
 */
export default function PlatformUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const currentUser = useAppSelector((state) => state.auth.user);
  const userId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // Fetch user details
  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      setError(null);
      try {
        const response = await platformService.users.getById(userId);
        setUser(response.data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "فشل تحميل بيانات المستخدم";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const isSelf = user?.id === currentUser?.id;

  // Handle activate/deactivate
  const handleToggleActive = useCallback(async () => {
    if (!user || isSelf) {
      toast.error("لا يمكنك تعديل حسابك الخاص");
      return;
    }

    setActionLoading(true);
    try {
      const result = await dispatch(
        updatePlatformUser({
          userId: user.id,
          payload: { is_active: !user.is_active },
        }),
      ).unwrap();
      setUser(result);
      toast.success(
        user.is_active ? "تم تعطيل المستخدم بنجاح" : "تم تفعيل المستخدم بنجاح",
      );
    } catch (err: unknown) {
      const message = typeof err === "string" ? err : "فشلت العملية";
      if (message.includes("403") || message.includes("self")) {
        toast.error("لا يمكنك تعديل حسابك الخاص");
      } else {
        toast.error(message);
      }
    } finally {
      setActionLoading(false);
    }
  }, [dispatch, user, isSelf]);

  // Handle role change
  const handleRoleChange = useCallback(
    async (newRole: string) => {
      if (!user || isSelf) {
        toast.error("لا يمكنك تعديل حسابك الخاص");
        return;
      }

      if (newRole === user.system_role) return;

      setActionLoading(true);
      try {
        const result = await dispatch(
          updatePlatformUser({
            userId: user.id,
            payload: { system_role: newRole },
          }),
        ).unwrap();
        setUser(result);
        toast.success("تم تغيير الدور بنجاح");
      } catch (err: unknown) {
        const message = typeof err === "string" ? err : "فشلت العملية";
        if (message.includes("403") || message.includes("self")) {
          toast.error("لا يمكنك تعديل حسابك الخاص");
        } else {
          toast.error(message);
        }
      } finally {
        setActionLoading(false);
      }
    },
    [dispatch, user, isSelf],
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!user || isSelf) {
      toast.error("لا يمكنك حذف حسابك الخاص");
      setDeleteDialog(false);
      return;
    }

    setActionLoading(true);
    try {
      await dispatch(deletePlatformUser(user.id)).unwrap();
      toast.success("تم حذف المستخدم بنجاح");
      router.push(ROUTES.PLATFORM.USERS);
    } catch (err: unknown) {
      const message = typeof err === "string" ? err : "فشلت العملية";
      if (message.includes("403") || message.includes("self")) {
        toast.error("لا يمكنك حذف حسابك الخاص");
      } else {
        toast.error(message);
      }
    } finally {
      setActionLoading(false);
      setDeleteDialog(false);
    }
  }, [dispatch, user, isSelf, router]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="mb-4 text-destructive">{error || "المستخدم غير موجود"}</p>
        <Button
          variant="outline"
          onClick={() => router.push(ROUTES.PLATFORM.USERS)}
        >
          العودة للقائمة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(ROUTES.PLATFORM.USERS)}
            aria-label="العودة"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{user.name}</h2>
            <p className="text-muted-foreground">تفاصيل المستخدم</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant={user.is_active ? "outline" : "default"}
            size="sm"
            onClick={handleToggleActive}
            disabled={isSelf || actionLoading}
          >
            {user.is_active ? (
              <>
                <UserX className="me-2 h-4 w-4" />
                تعطيل
              </>
            ) : (
              <>
                <UserCheck className="me-2 h-4 w-4" />
                تفعيل
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialog(true)}
            disabled={isSelf || actionLoading}
          >
            <Trash2 className="me-2 h-4 w-4" />
            حذف
          </Button>
        </div>
      </div>

      {/* User info cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  البريد الإلكتروني
                </p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">رقم الهاتف</p>
                <p className="font-medium">{user.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">الدور</p>
                <StatusBadge
                  label={ROLE_LABELS[user.system_role]}
                  variant={
                    user.system_role === "PLATFORM_OWNER"
                      ? "info"
                      : user.system_role === "PLATFORM_ADMIN"
                        ? "warning"
                        : "neutral"
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">الحالة</p>
                <StatusBadge
                  label={user.is_active ? "نشط" : "معطل"}
                  variant={user.is_active ? "success" : "error"}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity & Role Management */}
        <Card>
          <CardHeader>
            <CardTitle>النشاط والإدارة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">آخر دخول</p>
                <p className="font-medium">
                  {user.last_login_at
                    ? formatDate(user.last_login_at)
                    : "لم يسجل دخول بعد"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">تاريخ التسجيل</p>
                <p className="font-medium">{formatDate(user.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">آخر تحديث</p>
                <p className="font-medium">{formatDate(user.updated_at)}</p>
              </div>
            </div>

            {/* Role change */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">تغيير الدور</p>
              <Select
                value={user.system_role}
                onValueChange={handleRoleChange}
                disabled={isSelf || actionLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSelf && (
                <p className="mt-2 text-xs text-muted-foreground">
                  لا يمكنك تغيير دور حسابك الخاص
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        onOpenChange={setDeleteDialog}
        title="حذف المستخدم"
        description={`هل أنت متأكد من حذف المستخدم "${user.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        destructive
        loading={actionLoading}
      />
    </div>
  );
}
