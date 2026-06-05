"use client";

/**
 * TagPicker
 *
 * Multi-select interface for choosing tags from the current store's
 * vocabulary. Used by:
 *   - `OrderTagsCard` — choosing tags for a single order
 *   - `OrderTagsFilter` — filtering the orders list by tag
 *   - `BulkTagActions` — choosing tags for bulk add / bulk remove
 *
 * The component is uncontrolled wrt the data layer: it reads the tag list
 * from `state.orderTags.tags` and only emits the selected ids to its parent
 * through `onChange`. Parents own commit semantics (e.g., commit on dialog
 * close, commit on save).
 *
 * The "Create new tag" affordance is permission-gated by
 * `usePermission("orders.tags.manage")`. When the user lacks the permission,
 * the trigger renders disabled with a tooltip explaining why.
 *
 * shadcn/ui has no `Popover` or `Command` primitive in this project, so
 * the picker is rendered inside a small `Dialog` for a familiar
 * accessible pattern (focus trap, escape-to-close, RTL-safe).
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Plus, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchOrderTags } from "@/lib/store/slices/orderTags.thunks";
import { useStore } from "@/hooks/useStore";
import { usePermission } from "@/hooks/usePermission";
import { ORDER_TAG_COLORS } from "@/lib/constants/orderTagColors";
import { cn } from "@/lib/utils/cn";

import { TagChip } from "./TagChip";
import { TagFormDialog } from "./TagFormDialog";
import type { OrderTag } from "@/types/orderTag.types";

export interface TagPickerProps {
  /** Currently selected tag ids. */
  value: number[];
  /** Emits the next selection (already deduplicated). */
  onChange: (next: number[]) => void;
  /** Maximum number of tags allowed. Defaults to 10 (per-order cap). */
  max?: number;
  /** Visible label on the trigger button. */
  triggerLabel?: string;
  /** Disable the entire trigger (e.g., user lacks `orders.tags.write`). */
  disabled?: boolean;
  /** Optional className applied to the trigger button. */
  triggerClassName?: string;
}

const DEFAULT_MAX_TAGS = 10;

export function TagPicker({
  value,
  onChange,
  max = DEFAULT_MAX_TAGS,
  triggerLabel,
  disabled = false,
  triggerClassName,
}: TagPickerProps) {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("orderTags");

  const tags = useAppSelector((state) => state.orderTags.tags);
  const loading = useAppSelector((state) => state.orderTags.loading);
  const loaded = useAppSelector((state) => state.orderTags.loaded);

  const canCreateTag = usePermission("orders.tags.manage");

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // Lazy-load the tag vocabulary the first time the picker opens. We gate
  // on `loaded` instead of `tags.length === 0` so that an empty store does
  // not cause the effect to re-fire after every fulfilled fetch (which
  // would re-set `tags` to `[]` and re-trigger this same effect — a tight
  // infinite loop that previously hammered the API at >3k requests/second).
  useEffect(() => {
    if (!open || !currentStoreId) return;
    if (loaded || loading) return;
    dispatch(fetchOrderTags({ storeId: currentStoreId }));
  }, [open, currentStoreId, loaded, loading, dispatch]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedSet.has(tag.id)),
    [tags, selectedSet],
  );

  const filteredTags = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [tags, search]);

  const toggleTag = (tagId: number) => {
    if (selectedSet.has(tagId)) {
      onChange(value.filter((id) => id !== tagId));
      return;
    }
    if (value.length >= max) {
      return;
    }
    // Keep the array sorted ascending so URL serialization is stable.
    onChange([...value, tagId].sort((a, b) => a - b));
  };

  const handleCreated = (created: OrderTag) => {
    // Auto-select the freshly created tag if there's room.
    if (!selectedSet.has(created.id) && value.length < max) {
      onChange([...value, created.id].sort((a, b) => a - b));
    }
    setCreateOpen(false);
    // Re-open the picker once the create dialog finishes closing so the
    // user can confirm the new selection. We toggled it closed in
    // `handleOpenCreate` to avoid Radix focus-trap conflicts between
    // two simultaneously-mounted modal Dialogs (the inner Input would
    // refuse keystrokes because the outer FocusScope kept stealing focus).
    setOpen(true);
  };

  const handleOpenCreate = () => {
    // Close the picker before opening the create dialog. Two stacked Radix
    // Dialogs share the same focus-trap stack and the second one's
    // `autoFocus` Input ends up unable to receive keystrokes — that's the
    // user-reported "تنشي وسم بداخل الطلب نفسه ما ينشئ" symptom.
    setOpen(false);
    setCreateOpen(true);
  };

  const handleCreateOpenChange = (next: boolean) => {
    setCreateOpen(next);
    // If the user dismissed the create dialog without saving, restore the
    // picker so they don't lose their place in the multi-select flow.
    if (!next) {
      setOpen(true);
    }
  };

  const triggerText =
    triggerLabel ??
    (selectedTags.length > 0
      ? selectedTags.map((tag) => tag.name).join(", ")
      : t("picker.placeholder"));

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn("h-auto min-h-9 justify-start", triggerClassName)}
      >
        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1">
            {selectedTags.map((tag) => (
              <TagChip
                key={tag.id}
                name={tag.name}
                color_preset={tag.color_preset}
                size="sm"
              />
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">{triggerText}</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("picker.placeholder")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("picker.placeholder")}
                className="ps-9"
                autoFocus
              />
            </div>

            <div
              role="listbox"
              aria-label={t("picker.placeholder")}
              aria-multiselectable="true"
              className="max-h-72 overflow-y-auto rounded-md border"
            >
              {loading && tags.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {t("picker.loading")}
                </p>
              ) : filteredTags.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {t("picker.empty")}
                </p>
              ) : (
                <ul className="divide-y">
                  {filteredTags.map((tag) => {
                    const checked = selectedSet.has(tag.id);
                    const swatch = ORDER_TAG_COLORS[tag.color_preset].swatch;
                    const limitReached = !checked && value.length >= max;
                    return (
                      <li key={tag.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={checked}
                          disabled={limitReached}
                          onClick={() => toggleTag(tag.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2 text-start text-sm transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
                            checked && "bg-accent/60",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 rounded-full",
                              swatch,
                            )}
                            aria-hidden="true"
                          />
                          <span className="flex-1 truncate font-medium">
                            {tag.name}
                          </span>
                          {checked && (
                            <Check
                              className="h-4 w-4 text-foreground"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {value.length} / {max}
              </span>
              <CreateTagAffordance
                canCreate={canCreateTag}
                tooltipLabel={t("permissions.cannotCreateTag")}
                buttonLabel={t("picker.createNew")}
                onClick={handleOpenCreate}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setOpen(false)}>
              {t("form.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canCreateTag && (
        <TagFormDialog
          open={createOpen}
          onOpenChange={handleCreateOpenChange}
          mode="create"
          onSuccess={handleCreated}
        />
      )}
    </>
  );
}

interface CreateTagAffordanceProps {
  canCreate: boolean;
  tooltipLabel: string;
  buttonLabel: string;
  onClick: () => void;
}

function CreateTagAffordance({
  canCreate,
  tooltipLabel,
  buttonLabel,
  onClick,
}: CreateTagAffordanceProps) {
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={!canCreate}
      onClick={canCreate ? onClick : undefined}
      aria-disabled={!canCreate}
    >
      <Plus className="me-1 h-4 w-4" />
      {buttonLabel}
    </Button>
  );

  if (canCreate) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Wrap in span — disabled buttons don't fire pointer events,
              so the tooltip needs a container that can receive them. */}
          <span tabIndex={0}>{button}</span>
        </TooltipTrigger>
        <TooltipContent>{tooltipLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default TagPicker;
