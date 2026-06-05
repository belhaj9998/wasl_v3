"use client";

import { useLocale, useTranslations } from "next-intl";

import { formatRelativeDate } from "@/lib/utils/formatDate";
import type { SourceChangedTimelinePayload, TimelineEvent } from "@/types";

import { isOrderSource } from "./SourceBadge";

export interface SourceChangedTimelineLineProps {
  event: TimelineEvent;
}

export function SourceChangedTimelineLine({
  event,
}: SourceChangedTimelineLineProps) {
  const t = useTranslations("orders.timeline");
  const tChannels = useTranslations("orders.source.channels");
  const intlLocale = useLocale();
  const locale: "ar" | "en" = intlLocale === "en" ? "en" : "ar";

  const payload = event.payload as SourceChangedTimelinePayload | undefined;

  const labelFor = (value: unknown): string =>
    isOrderSource(value) ? tChannels(value) : tChannels("UNKNOWN");

  const message = t("sourceChanged", {
    from: labelFor(payload?.from),
    to: labelFor(payload?.to),
  });

  return (
    <div className="flex gap-3 border-s-2 border-muted ps-4 pb-4 last:pb-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{message}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {event.actor_name && <span>{event.actor_name}</span>}
          {event.actor_name && <span aria-hidden="true">•</span>}
          <span>{formatRelativeDate(event.created_at, locale)}</span>
        </div>
      </div>
    </div>
  );
}

export default SourceChangedTimelineLine;
