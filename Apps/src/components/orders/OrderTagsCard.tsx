"use client";

/**
 * OrderTagsCard
 *
 * Right-column card on the order detail page. Always visible. Renders the
 * order's currently-assigned tags as `TagChip`s, plus an "Edit tags"
 * affordance gated by `<PermissionGate permission="orders.tags.write">`.
 *
 * The editor is inline: clicking edit swaps the chip list for a `TagPicker`
 * with Save/Cancel actions. Saving dispatches `replaceOrderTagsForOrder`
 * and re-fetches the order so the timeline + tags reflect the new state.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/shared/PermissionGate";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  fetchOrderTags,
  replaceOrderTagsForOrder,
} from "@/lib/store/slices/orderTags.thunks";
import { fetchOrderById } from "@/lib/store/slices/orders.thunks";
import { useStore } from "@/hooks/useStore";

import { TagChip } from "./TagChip";
import { TagPicker } from "./TagPicker";
import type { Order } from "@/types";

export interface OrderTagsCardProps {
  order: Order;
  locale: "ar" | "en";
}

export function OrderTagsCard({ order }: OrderTagsCardProps) {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("orderTags");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number[]>(() =>
    (order.tags ?? []).map((tag) => tag.id).sort((a, b) => a - b),
  );
  const [saving, setSaving] = useState(false);

  // Read the cache state to drive a one-shot pre-warm fetch. We don't need
  // the cache contents here — `TagPicker` reads them itself when opened.
  const tagsLoaded = useAppSelector((state) => state.orderTags.loaded);
  const tagsLoading = useAppSelector((state) => state.orderTags.loading);

  // Pre-warm the tag cache so the picker has data on first open. We gate on
  // `loaded` (set after the first fetch settles, even when the store has no
  // tags yet) instead of `tagsCache.length === 0` to avoid an infinite
  // re-fetch loop in stores with zero tags.
  useEffect(() => {
    if (!currentStoreId) return;
    if (tagsLoaded || tagsLoading) return;
    dispatch(fetchOrderTags({ storeId: currentStoreId }));
  }, [currentStoreId, tagsLoaded, tagsLoading, dispatch]);

  // When the order's tag array changes (e.g. after refetch), reseed the
  // draft if we're not actively editing.
  useEffect(() => {
    if (!editing) {
      setDraft((order.tags ?? []).map((tag) => tag.id).sort((a, b) => a - b));
    }
  }, [order.tags, editing]);

  const initialIds = useMemo(
    () => (order.tags ?? []).map((tag) => tag.id).sort((a, b) => a - b),
    [order.tags],
  );

  const dirty =
    draft.length !== initialIds.length ||
    draft.some((id, idx) => id !== initialIds[idx]);

  const startEditing = () => {
    setDraft(initialIds);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(initialIds);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!currentStoreId) return;
    setSaving(true);
    try {
      await dispatch(
        replaceOrderTagsForOrder({
          storeId: currentStoreId,
          orderId: order.id,
          tagIds: draft,
        }),
      ).unwrap();
      // Re-fetch the order so the timeline picks up TAGS_UPDATED and the
      // visible chips reflect the latest server state.
      await dispatch(
        fetchOrderById({ storeId: currentStoreId, orderId: order.id }),
      ).unwrap();
      toast.success(t("toasts.assignSuccess"));
      setEditing(false);
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
      } else if (upper.includes("FORBIDDEN")) {
        toast.error(t("errors.FORBIDDEN"));
      } else {
        toast.error(t("toasts.errorGeneric"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TagIcon className="h-5 w-5" />
          {t("card.title")}
        </CardTitle>
        {!editing && (
          <PermissionGate permission="orders.tags.write">
            <Button variant="ghost" size="sm" onClick={startEditing}>
              {t("card.edit")}
            </Button>
          </PermissionGate>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <>
            <TagPicker value={draft} onChange={setDraft} />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                {t("form.cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={!dirty || saving}
              >
                {t("form.submitUpdate")}
              </Button>
            </div>
          </>
        ) : order.tags && order.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {order.tags.map((tag) => (
              <TagChip
                key={tag.id}
                name={tag.name}
                color_preset={tag.color_preset}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("card.empty")}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderTagsCard;
