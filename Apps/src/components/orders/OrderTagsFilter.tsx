"use client";

/**
 * OrderTagsFilter
 *
 * Multi-select tag filter rendered alongside the orders list filters. The
 * component holds a local *draft* selection while the popover is open and
 * commits to the parent (and therefore to the URL) only when the user
 * closes the popover or presses Apply. This avoids spamming `router.replace`
 * with intermediate states.
 *
 * The trigger button shows the count of selected tags so the user has a
 * compact summary even when the popover is closed.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Tag as TagIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchOrderTags } from "@/lib/store/slices/orderTags.thunks";
import { useStore } from "@/hooks/useStore";
import { ORDER_TAG_COLORS } from "@/lib/constants/orderTagColors";
import { cn } from "@/lib/utils/cn";

export interface OrderTagsFilterProps {
  /** Currently committed tag-id selection (sorted ascending). */
  value: number[];
  /** Emitted on commit (popover close / Apply / clear). */
  onChange: (next: number[]) => void;
  locale: "ar" | "en";
}

function arraysEqual(a: number[], b: number[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function OrderTagsFilter({
  value,
  onChange,
  locale,
}: OrderTagsFilterProps) {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("orderTags");

  const tags = useAppSelector((state) => state.orderTags.tags);
  const loading = useAppSelector((state) => state.orderTags.loading);
  const loaded = useAppSelector((state) => state.orderTags.loaded);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number[]>(value);

  // Keep the draft in sync with externally-driven changes (e.g. URL hydration).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  // Lazy-load the tag vocabulary the first time the filter opens. Gating on
  // `loaded` (rather than `tags.length === 0`) is critical: in a store with
  // no tags, an empty array would otherwise keep this effect re-firing
  // after every fulfilled fetch.
  useEffect(() => {
    if (!open || !currentStoreId) return;
    if (loaded || loading) return;
    dispatch(fetchOrderTags({ storeId: currentStoreId }));
  }, [open, currentStoreId, loaded, loading, dispatch]);

  const draftSet = useMemo(() => new Set(draft), [draft]);

  const toggle = (tagId: number) => {
    setDraft((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId].sort((a, b) => a - b),
    );
  };

  const clear = () => {
    setDraft([]);
    onChange([]);
  };

  // Commit on close. Uses a stable equality check so closing without a
  // change is a no-op (prevents redundant URL updates).
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && !arraysEqual(draft, value)) {
      onChange(draft);
    }
  };

  const triggerLabel =
    value.length > 0
      ? t("filter.selected", { count: value.length })
      : t("filter.placeholder");

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-2">
          <TagIcon className="h-4 w-4" />
          <span className="truncate">{triggerLabel}</span>
          {value.length > 0 && (
            <span
              className="ms-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {value.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-2">
        <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-2">
          <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            {t("filter.placeholder")}
          </div>

          <div
            role="listbox"
            aria-multiselectable="true"
            aria-label={t("filter.placeholder")}
            className="max-h-72 overflow-y-auto"
          >
            {loading && tags.length === 0 ? (
              <p className="p-3 text-center text-sm text-muted-foreground">
                {t("picker.loading")}
              </p>
            ) : tags.length === 0 ? (
              <p className="p-3 text-center text-sm text-muted-foreground">
                {t("picker.empty")}
              </p>
            ) : (
              <ul className="space-y-1">
                {tags.map((tag) => {
                  const checked = draftSet.has(tag.id);
                  const swatch = ORDER_TAG_COLORS[tag.color_preset].swatch;
                  return (
                    <li key={tag.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={checked}
                        onClick={() => toggle(tag.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent",
                          checked && "bg-accent/60",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 rounded-full",
                            swatch,
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex-1 truncate">{tag.name}</span>
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

          {value.length > 0 && (
            <div className="border-t pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                onClick={clear}
              >
                <X className="me-1 h-3.5 w-3.5" />
                {t("filter.clear")}
              </Button>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default OrderTagsFilter;
