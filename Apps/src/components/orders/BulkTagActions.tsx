"use client";

/**
 * BulkTagActions
 *
 * Bulk add / bulk remove controls rendered above the orders table when the
 * user has selected one or more rows. Each action opens its own picker
 * dialog so users can choose tags before submitting.
 *
 * Both flows are atomic — the backend either applies the change to every
 * selected order or rejects the request entirely (e.g. on
 * `TAG_ORDER_LIMIT_EXCEEDED`). The component leaves the selection intact
 * on failure so the user can adjust tags and retry; on success it calls
 * `onComplete()` so the parent can refresh + clear the selection.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/shared/PermissionGate";

import { useAppDispatch } from "@/lib/store/hooks";
import {
  bulkAddOrderTags,
  bulkRemoveOrderTags,
} from "@/lib/store/slices/orderTags.thunks";
import { useStore } from "@/hooks/useStore";

import { TagPicker } from "./TagPicker";

export interface BulkTagActionsProps {
  selectedOrderIds: number[];
  onComplete: () => void;
  locale: "ar" | "en";
}

type Mode = "add" | "remove";

export function BulkTagActions({
  selectedOrderIds,
  onComplete,
  locale,
}: BulkTagActionsProps) {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("orderTags");

  const [mode, setMode] = useState<Mode | null>(null);
  const [draft, setDraft] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (selectedOrderIds.length === 0) return null;

  const open = mode !== null;

  const closeDialog = () => {
    setMode(null);
    setDraft([]);
  };

  const openDialog = (next: Mode) => {
    setDraft([]);
    setMode(next);
  };

  const handleSubmit = async () => {
    if (!currentStoreId || draft.length === 0 || mode === null) return;
    setSubmitting(true);
    try {
      const payload = {
        order_ids: selectedOrderIds,
        tag_ids: draft,
      };
      if (mode === "add") {
        const result = await dispatch(
          bulkAddOrderTags({ storeId: currentStoreId, payload }),
        ).unwrap();
        toast.success(
          t("toasts.bulkAddSuccess", {
            count: result.affected_orders,
          }),
        );
      } else {
        const result = await dispatch(
          bulkRemoveOrderTags({ storeId: currentStoreId, payload }),
        ).unwrap();
        toast.success(
          t("toasts.bulkRemoveSuccess", {
            count: result.affected_orders,
          }),
        );
      }
      closeDialog();
      onComplete();
    } catch (error: unknown) {
      const message =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "";
      const upper = message.toUpperCase();
      if (upper.includes("TAG_ORDER_LIMIT_EXCEEDED")) {
        toast.error(t("errors.TAG_ORDER_LIMIT_EXCEEDED"));
      } else if (upper.includes("TAG_NOT_FOUND_IN_STORE")) {
        toast.error(t("errors.TAG_NOT_FOUND_IN_STORE"));
      } else if (upper.includes("ORDER_NOT_FOUND_IN_STORE")) {
        toast.error(t("errors.ORDER_NOT_FOUND_IN_STORE"));
      } else if (upper.includes("FORBIDDEN")) {
        toast.error(t("errors.FORBIDDEN"));
      } else {
        toast.error(t("toasts.errorGeneric"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PermissionGate permission="orders.tags.write">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("bulk.selectionCount", { count: selectedOrderIds.length })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openDialog("add")}
        >
          <Plus className="me-1 h-4 w-4" />
          {t("bulk.addAction")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => openDialog("remove")}
        >
          <Trash2 className="me-1 h-4 w-4" />
          {t("bulk.removeAction")}
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) closeDialog();
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5" />
              {mode === "add" ? t("bulk.addAction") : t("bulk.removeAction")}
            </DialogTitle>
            <DialogDescription>
              {t("bulk.selectionCount", { count: selectedOrderIds.length })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <TagPicker value={draft} onChange={setDraft} />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={submitting}
            >
              {t("form.cancel")}
            </Button>
            <Button
              type="button"
              variant={mode === "remove" ? "destructive" : "default"}
              onClick={handleSubmit}
              disabled={submitting || draft.length === 0}
            >
              {mode === "add" ? t("bulk.addAction") : t("bulk.removeAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PermissionGate>
  );
}

export default BulkTagActions;
