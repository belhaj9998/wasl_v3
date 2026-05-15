"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import {
  Search,
  Users,
  MoreHorizontal,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  fetchPlatformUsers,
  updatePlatformUser,
  deletePlatformUser,
} from "@/lib/store/slices/platform.thunks";
import { usePagination } from "@/hooks/usePagination";
import { formatDate } from "@/lib/utils/formatDate";
import { ROUTES } from "@/lib/constants/routes";
import type { User, SystemRole, PaginationParams } from "@/types";

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
 * Platform Users Management Page
 * Displays a paginated, searchable, filterable table of all platform users.
 * Supports activate/deactivate, role change, and delete actions.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */
export default function PlatformUsersPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const {
    items: users,
    meta,
    loading,
    error,
  } = useAppSelector((state) => state.platform.users);
  const currentUser = useAppSelector((state) => state.auth.user);

  const {
    page,
    limit,
    sortBy,
    sortOrder,
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
  } = usePagination(1, 20);

  // Search and filter state
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users when params change
  useEffect(() => {
    const fetchParams: Record<string, unknown> = {
      page,
      limit,
    };

    if (sortBy) {
      fetchParams.sortBy = sortBy;
      fetchParams.sortOrder = sortOrder;
    }

    if (search.trim()) {
      fetchParams.search = search.trim();
    }

    if (roleFilter !== "all") {
      fetchParams.system_role = roleFilter;
    }

    if (activeFilter !== "all") {
      fetchParams.is_active = activeFilter;
    }

    dispatch(fetchPlatformUsers(fetchParams as PaginationParams));
  }, [
    dispatch,
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    roleFilter,
    activeFilter,
  ]);

  // Handle search with debounce effect
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setPage]);

  // Handle sort change from DataTable
  const handleSortChange = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      setSortBy(newSortBy || undefined);
      setSortOrder(newSortOrder);
    },
    [setSortBy, setSortOrder],
  );

  // Handle activate/deactivate
  const handleToggleActive = useCallback(
    async (user: User) => {
      if (user.id === currentUser?.id) {
        toast.error("لا يمكنك تعديل حسابك الخاص");
        return;
      }

      setActionLoading(true);
      try {
        await dispatch(
          updatePlatformUser({
            userId: user.id,
            payload: { is_active: !user.is_active },
          }),
        ).unwrap();
        toast.success(
          user.is_active
            ? "تم تعطيل المستخدم بنجاح"
            : "تم تفعيل المستخدم بنجاح",
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
    },
    [dispatch, currentUser],
  );

  // Handle role change
  const handleRoleChange = useCallback(
    async (user: User, newRole: SystemRole) => {
      if (user.id === currentUser?.id) {
        toast.error("لا يمكنك تعديل حسابك الخاص");
        return;
      }

      if (newRole === user.system_role) return;

      setActionLoading(true);
      try {
        await dispatch(
          updatePlatformUser({
            userId: user.id,
            payload: { system_role: newRole },
          }),
        ).unwrap();
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
    [dispatch, currentUser],
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deleteDialog.user) return;

    if (deleteDialog.user.id === currentUser?.id) {
      toast.error("لا يمكنك حذف حسابك الخاص");
      setDeleteDialog({ open: false, user: null });
      return;
    }

    setActionLoading(true);
    try {
      await dispatch(deletePlatformUser(deleteDialog.user.id)).unwrap();
      toast.success("تم حذف المستخدم بنجاح");
    } catch (err: unknown) {
      const message = typeof err === "string" ? err : "فشلت العملية";
      if (message.includes("403") || message.includes("self")) {
        toast.error("لا يمكنك حذف حسابك الخاص");
      } else {
        toast.error(message);
      }
    } finally {
      setActionLoading(false);
      setDeleteDialog({ open: false, user: null });
    }
  }, [dispatch, deleteDialog.user, currentUser]);

  // Handle retry on error
  const handleRetry = useCallback(() => {
    dispatch(fetchPlatformUsers({ page, limit }));
  }, [dispatch, page, limit]);

  // Table columns definition
  const columns: ColumnDef<User, unknown>[] = useMemo(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "الاسم",
        enableSorting: true,
      },
      {
        id: "email",
        accessorKey: "email",
        header: "البريد الإلكتروني",
        enableSorting: true,
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "الهاتف",
        enableSorting: false,
      },
      {
        id: "system_role",
        accessorKey: "system_role",
        header: "الدور",
        enableSorting: true,
        cell: ({ row }) => {
          const role = row.original.system_role;
          const variant =
            role === "PLATFORM_OWNER"
              ? "info"
              : role === "PLATFORM_ADMIN"
                ? "warning"
                : role === "SUPPORT"
                  ? "neutral"
                  : "neutral";
          return <StatusBadge label={ROLE_LABELS[role]} variant={variant} />;
        },
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: "الحالة",
        enableSorting: true,
        cell: ({ row }) => {
          const isActive = row.original.is_active;
          return (
            <StatusBadge
              label={isActive ? "نشط" : "معطل"}
              variant={isActive ? "success" : "error"}
            />
          );
        },
      },
      {
        id: "last_login_at",
        accessorKey: "last_login_at",
        header: "آخر دخول",
        enableSorting: true,
        cell: ({ row }) => {
          const date = row.original.last_login_at;
          return date ? formatDate(date) : "—";
        },
      },
      {
        id: "actions",
        header: "الإجراءات",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          const isSelf = user.id === currentUser?.id;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">إجراءات</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* View user detail */}
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`${ROUTES.PLATFORM.USERS}/${user.id}`)
                  }
                >
                  <Eye className="me-2 h-4 w-4" />
                  عرض التفاصيل
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Activate/Deactivate */}
                <DropdownMenuItem
                  onClick={() => handleToggleActive(user)}
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
                </DropdownMenuItem>

                {/* Change Role */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={isSelf}>
                    <Shield className="me-2 h-4 w-4" />
                    تغيير الدور
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {SYSTEM_ROLES.map((role) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => handleRoleChange(user, role)}
                        disabled={
                          role === user.system_role || isSelf || actionLoading
                        }
                      >
                        {ROLE_LABELS[role]}
                        {role === user.system_role && " ✓"}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {/* Delete */}
                <DropdownMenuItem
                  onClick={() => setDeleteDialog({ open: true, user })}
                  disabled={isSelf || actionLoading}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [currentUser, handleToggleActive, handleRoleChange, actionLoading, router],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            إدارة المستخدمين
          </h2>
          <p className="text-muted-foreground">
            عرض وإدارة جميع المستخدمين المسجلين في المنصة
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد أو الهاتف..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Role filter */}
        <Select
          value={roleFilter}
          onValueChange={(value) => {
            setRoleFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="الدور" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأدوار</SelectItem>
            {SYSTEM_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {ROLE_LABELS[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active status filter */}
        <Select
          value={activeFilter}
          onValueChange={(value) => {
            setActiveFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="true">نشط</SelectItem>
            <SelectItem value="false">معطل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={users}
        meta={meta}
        loading={loading}
        error={error}
        onPageChange={setPage}
        onLimitChange={setLimit}
        onSortChange={handleSortChange}
        onRetry={handleRetry}
        emptyMessage="لا يوجد مستخدمون"
        emptyIcon={<Users className="h-12 w-12" />}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, user: null });
        }}
        title="حذف المستخدم"
        description={`هل أنت متأكد من حذف المستخدم "${deleteDialog.user?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        onConfirm={handleDelete}
        destructive
        loading={actionLoading}
      />
    </div>
  );
}
