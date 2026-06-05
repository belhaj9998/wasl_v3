"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RadioTower, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import type { SourceFilterValue } from "@/lib/utils/orderSourceUrl";
import type { OrderSource } from "@/types";

import { ORDER_SOURCE_CHANNELS, SourceBadge } from "./SourceBadge";

export interface SourceFilterProps {
  value: SourceFilterValue;
  onChange: (next: SourceFilterValue) => void;
  locale: "ar" | "en";
}

function normalize(channels: readonly OrderSource[]): OrderSource[] {
  const selected = new Set(channels);
  return ORDER_SOURCE_CHANNELS.filter((channel) => selected.has(channel));
}

function valuesEqual(a: SourceFilterValue, b: SourceFilterValue): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "channels" && b.kind === "channels") {
    const left = normalize(a.channels);
    const right = normalize(b.channels);
    if (left.length !== right.length) return false;
    return left.every((channel, index) => channel === right[index]);
  }
  return true;
}

function activeCount(value: SourceFilterValue): number {
  return value.kind === "channels" ? normalize(value.channels).length : 0;
}

function toggleChannel(
  value: SourceFilterValue,
  channel: OrderSource,
): SourceFilterValue {
  const current = value.kind === "channels" ? value.channels : [];
  const selected = new Set(current);
  if (selected.has(channel)) {
    selected.delete(channel);
  } else {
    selected.add(channel);
  }
  const channels = normalize(Array.from(selected));
  return channels.length === 0 ? { kind: "none" } : { kind: "channels", channels };
}

export function SourceFilter({ value, onChange, locale }: SourceFilterProps) {
  const t = useTranslations("orders.source.filter");

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SourceFilterValue>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const draftChannels = useMemo(
    () => new Set(draft.kind === "channels" ? draft.channels : []),
    [draft],
  );

  const count = activeCount(value);
  const triggerLabel =
    count > 0 ? t("selected", { count }) : t("label");

  const clear = () => {
    const next: SourceFilterValue = { kind: "none" };
    setDraft(next);
    onChange(next);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next && !valuesEqual(draft, value)) {
      onChange(draft);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-2">
          <RadioTower className="h-4 w-4" aria-hidden="true" />
          <span className="truncate">{triggerLabel}</span>
          {count > 0 && (
            <span
              className="ms-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-2">
        <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-2">
          <div className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            {t("label")}
          </div>

          <div
            role="listbox"
            aria-multiselectable="true"
            aria-label={t("label")}
            className="max-h-72 overflow-y-auto"
          >
            <ul className="space-y-1">
              {ORDER_SOURCE_CHANNELS.map((channel) => {
                const selected = draftChannels.has(channel);
                return (
                  <li key={channel}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setDraft((prev) => toggleChannel(prev, channel))}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent",
                        selected && "bg-accent/60",
                      )}
                    >
                      <SourceBadge source={channel} className="min-w-0 flex-1" />
                      {selected && (
                        <Check
                          className="h-4 w-4 shrink-0 text-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {count > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-start gap-2"
              onClick={clear}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              {t("clear")}
            </Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SourceFilter;
