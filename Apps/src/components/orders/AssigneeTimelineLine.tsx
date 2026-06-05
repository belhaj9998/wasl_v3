"use client";

/**
 * AssigneeTimelineLine
 *
 * Renders a single `ASSIGNEE_CHANGED` order-timeline event as one row that is
 * visually consistent with the other event rows on the order detail page
 * (`app/(store-admin)/admin/orders/[id]/page.tsx`). It is designed as a
 * drop-in replacement for the generic timeline row inside that page's
 * `sortedTimeline.map(...)` switch (mounted by Task 11.1), so it reuses the
 * same wrapper classes (`border-s-2`, `ps-4`, `pb-4 last:pb-0`) and the same
 * actor-name + relative-timestamp footer.
 *
 * The event's `payload` carries `{ from, to }` snapshot sides (after the
 * server mapper projection — see Task 5.3). Each side is either `null`
 * ("no assignee") or `{ id, name, avatar_url, is_deleted }`. We branch on the
 * `(from, to)` tuple to pick the localized sentence and inline the rendered
 * names into the `{from}`/`{to}` placeholders. When a side is flagged
 * `is_deleted`, the localized `(deleted)` suffix is appended to its name.
 *
 * Spacing uses logical RTL-safe utilities so the row mirrors correctly under
 * `dir="rtl"`. The timestamp uses the same `formatRelativeDate` helper the
 * existing timeline uses, with the active next-intl locale (kept in sync with
 * the Redux `ui.locale` by `IntlProvider`).
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 */

import { useTranslations, useLocale } from "next-intl";

import { formatRelativeDate } from "@/lib/utils/formatDate";
import type {
  TimelineEvent,
  AssigneeChangedTimelinePayload,
  AssigneeTimelineSnapshot,
} from "@/types";

export interface AssigneeTimelineLineProps {
  /** The `ASSIGNEE_CHANGED` event. Its `payload` is the {from,to} snapshot. */
  event: TimelineEvent;
}

export function AssigneeTimelineLine({ event }: AssigneeTimelineLineProps) {
  const t = useTranslations("orders.timeline");
  const intlLocale = useLocale();
  const locale: "ar" | "en" = intlLocale === "en" ? "en" : "ar";

  const payload = event.payload as AssigneeChangedTimelinePayload | undefined;
  const from: AssigneeTimelineSnapshot = payload?.from ?? null;
  const to: AssigneeTimelineSnapshot = payload?.to ?? null;

  /**
   * Display name for a snapshot side: the stored name, with the localized
   * "(deleted)" suffix appended when the live user could not be resolved.
   * Returns "" for a null side (never inlined into a sentence).
   */
  const displayName = (side: AssigneeTimelineSnapshot): string => {
    if (!side) return "";
    return side.is_deleted
      ? `${side.name} ${t("deletedUserSuffix")}`
      : side.name;
  };

  const message = ((): string => {
    // Assigned (null -> someone), with the self-assign nuance.
    if (from === null && to !== null) {
      if (event.actor_user_id != null && event.actor_user_id === to.id) {
        return t("selfAssigned");
      }
      return t("assigned", { to: displayName(to) });
    }

    // Unassigned (someone -> null).
    if (from !== null && to === null) {
      return t("unassigned", { from: displayName(from) });
    }

    // Reassigned (someone -> someone different).
    if (from !== null && to !== null && from.id !== to.id) {
      return t("reassigned", { from: displayName(from), to: displayName(to) });
    }

    // Defensive fallback — the server only writes ASSIGNEE_CHANGED on a real
    // transition, so both-null / same-id should never reach the client.
    if (to !== null) return t("assigned", { to: displayName(to) });
    if (from !== null) return t("unassigned", { from: displayName(from) });
    return event.event;
  })();

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

export default AssigneeTimelineLine;
