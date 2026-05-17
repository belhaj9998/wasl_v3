"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/tables/DataTable";
import { FormField, FormSummaryError, SubmitButton } from "@/components/forms";
import { StatusBadge, ConfirmDialog } from "@/components/shared";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchPlatformPlans,
  createPlatformPlan,
  updatePlatformPlan,
  deletePlatformPlan,
} from "@/lib/store/slices/platform.thunks";
import { planSchema, type PlanFormData } from "@/lib/validators/plan.schema";
import { toastSuccess, toastError } from "@/lib/toast/toastManager";
import type { Plan } from "@/types";

/**
 * Platform Plans Management Page
 * Allows platform admins to create, edit, and delete subscription plans.
 * Handles 409 for duplicate plan codes and prevents deletion of plans with active subscriptions.
 *
 * Requirements: 9.6
 */
export default function PlansPage() {
  const dispatch = useAppDispatch();
  const t = useTranslations("planForm");
  const tA11y = useTranslations("accessibility.buttons");
  const {
    items: plans,
    loading,
    error,
  } = useAppSelector((state) => state.platform.plans);

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    plan: Plan | null;
  }>({ open: false, plan: null });
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: "",
      code: "",
      price_monthly: 0,
      price_yearly: null,
      max_stores: null,
      max_products: null,
      max_staff: null,
      is_active: true,
    },
  });

  useEffect(() => {
    dispatch(fetchPlatformPlans(undefined));
  }, [dispatch]);

  const handleOpenCreate = useCallback(() => {
    setEditingPlan(null);
    setServerErrors([]);
    reset({
      name: "",
      code: "",
      price_monthly: 0,
      price_yearly: null,
      max_stores: null,
      max_products: null,
      max_staff: null,
      is_active: true,
    });
    setFormOpen(true);
  }, [reset]);

  const handleOpenEdit = useCallback(
    (plan: Plan) => {
      setEditingPlan(plan);
      setServerErrors([]);
      reset({
        name: plan.name,
        code: plan.code,
        price_monthly: parseFloat(plan.price_monthly),
        price_yearly: plan.price_yearly ? parseFloat(plan.price_yearly) : null,
        max_stores: (plan.features?.max_stores as number) ?? null,
        max_products: (plan.features?.max_products as number) ?? null,
        max_staff: (plan.features?.max_staff as number) ?? null,
        is_active: plan.is_active,
      });
      setFormOpen(true);
    },
    [reset],
  );

  const handleDelete = useCallback((plan: Plan) => {
    setDeleteError(null);
    setDeleteConfirm({ open: true, plan });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirm.plan) return;
    try {
      await dispatch(deletePlatformPlan(deleteConfirm.plan.id)).unwrap();
      setDeleteConfirm({ open: false, plan: null });
      setDeleteError(null);
      toastSuccess(t("deleteSuccess"));
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : t("deleteActiveError");
      setDeleteError(message);
    }
  }, [deleteConfirm.plan, dispatch, t]);

  const onSubmit = useCallback(
    async (data: PlanFormData) => {
      setServerErrors([]);

      try {
        if (editingPlan) {
          // PATCH: only send modified fields (excluding code which can't be changed)
          const payload: Record<string, unknown> = {};
          if (data.name !== editingPlan.name) payload.name = data.name;
          if (data.price_monthly !== parseFloat(editingPlan.price_monthly))
            payload.price_monthly = String(data.price_monthly);
          if (
            data.price_yearly !==
            (editingPlan.price_yearly
              ? parseFloat(editingPlan.price_yearly)
              : null)
          )
            payload.price_yearly = data.price_yearly
              ? String(data.price_yearly)
              : undefined;
          if (
            data.max_stores !==
            ((editingPlan.features?.max_stores as number) ?? null)
          )
            payload.max_stores = data.max_stores;
          if (
            data.max_products !==
            ((editingPlan.features?.max_products as number) ?? null)
          )
            payload.max_products = data.max_products;
          if (
            data.max_staff !==
            ((editingPlan.features?.max_staff as number) ?? null)
          )
            payload.max_staff = data.max_staff;
          if (data.is_active !== editingPlan.is_active)
            payload.is_active = data.is_active;

          // Only send if there are changes
          if (Object.keys(payload).length === 0) {
            setFormOpen(false);
            return;
          }

          await dispatch(
            updatePlatformPlan({
              planId: editingPlan.id,
              payload: payload as Record<string, string>,
            }),
          ).unwrap();
          toastSuccess(t("updateSuccess"));
        } else {
          // Create new plan
          await dispatch(
            createPlatformPlan({
              code: data.code,
              name: data.name,
              price_monthly: String(data.price_monthly),
              price_yearly: data.price_yearly
                ? String(data.price_yearly)
                : undefined,
              features: {
                max_stores: data.max_stores,
                max_products: data.max_products,
                max_staff: data.max_staff,
              },
              is_active: data.is_active,
            }),
          ).unwrap();
          toastSuccess(t("createSuccess"));
        }

        setFormOpen(false);
        reset();
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : t("unexpectedError");

        // Handle 409 duplicate plan code
        if (
          message.includes("409") ||
          message.toLowerCase().includes("duplicate") ||
          message.toLowerCase().includes("already")
        ) {
          setServerErrors([t("duplicateCode")]);
        } else {
          setServerErrors([message]);
          toastError(t("saveError"));
        }
      }
    },
    [editingPlan, dispatch, reset, t],
  );

  const columns: ColumnDef<Plan, unknown>[] = [
    {
      id: "code",
      header: t("fields.code"),
      accessorKey: "code",
      enableSorting: true,
    },
    {
      id: "name",
      header: t("fields.name"),
      accessorKey: "name",
      enableSorting: true,
    },
    {
      id: "price_monthly",
      header: t("fields.priceMonthly"),
      accessorKey: "price_monthly",
      cell: ({ row }) => `${row.original.price_monthly} د.ل`,
    },
    {
      id: "price_yearly",
      header: t("fields.priceYearly"),
      accessorKey: "price_yearly",
      cell: ({ row }) =>
        row.original.price_yearly ? `${row.original.price_yearly} د.ل` : "—",
    },
    {
      id: "is_active",
      header: t("fields.status"),
      accessorKey: "is_active",
      cell: ({ row }) => (
        <StatusBadge
          label={row.original.is_active ? t("active") : t("inactive")}
          variant={row.original.is_active ? "success" : "neutral"}
        />
      ),
    },
    {
      id: "actions",
      header: t("fields.actions"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEdit(row.original)}
            aria-label={tA11y("editItem")}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original)}
            aria-label={tA11y("deleteItem")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <Button onClick={handleOpenCreate}>
          <Plus className="me-2 h-4 w-4" />
          {t("addPlan")}
        </Button>
      </div>

      {/* Plans Table */}
      <DataTable
        columns={columns}
        data={plans}
        meta={null}
        loading={loading}
        error={error}
        onRetry={() => dispatch(fetchPlatformPlans(undefined))}
        emptyMessage={t("emptyMessage")}
        emptyIcon={<CreditCard className="h-12 w-12" />}
      />

      {/* Create/Edit Plan Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? t("editTitle") : t("createTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingPlan ? t("editDescription") : t("createDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormSummaryError errors={serverErrors} />

            <FormField
              control={control}
              name="name"
              label={t("fields.name")}
              placeholder={t("placeholders.name")}
              required
            />

            <FormField
              control={control}
              name="code"
              label={t("fields.code")}
              placeholder={t("placeholders.code")}
              required
              disabled={!!editingPlan}
              description={t("codeDescription")}
            />

            <FormField
              control={control}
              name="price_monthly"
              label={t("fields.priceMonthly")}
              type="number"
              placeholder={t("placeholders.priceMonthly")}
              required
            />

            <FormField
              control={control}
              name="price_yearly"
              label={t("fields.priceYearly")}
              type="number"
              placeholder={t("placeholders.priceYearly")}
              description={t("priceYearlyDescription")}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={control}
                name="max_products"
                label={t("fields.maxProducts")}
                type="number"
                placeholder={t("placeholders.maxProducts")}
              />

              <FormField
                control={control}
                name="max_staff"
                label={t("fields.maxStaff")}
                type="number"
                placeholder={t("placeholders.maxStaff")}
              />

              <FormField
                control={control}
                name="max_stores"
                label={t("fields.maxStores")}
                type="number"
                placeholder={t("placeholders.maxStores")}
              />
            </div>

            <SubmitButton isSubmitting={isSubmitting} className="w-full">
              {editingPlan ? t("saveChanges") : t("createPlan")}
            </SubmitButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm({ open: false, plan: null });
            setDeleteError(null);
          }
        }}
        title={t("deleteTitle")}
        description={
          deleteError
            ? deleteError
            : t("deleteDescription", { name: deleteConfirm.plan?.name ?? "" })
        }
        confirmLabel={t("deleteConfirm")}
        onConfirm={confirmDelete}
        destructive
      />
    </div>
  );
}
