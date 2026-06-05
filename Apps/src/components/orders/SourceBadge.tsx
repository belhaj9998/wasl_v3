"use client";

import type { LucideIcon } from "lucide-react";
import {
  Camera,
  CircleHelp,
  Facebook,
  Instagram,
  MessageCircle,
  MonitorCog,
  Music2,
  Phone,
  Store,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { OrderSource } from "@/types";

export const ORDER_SOURCE_CHANNELS: OrderSource[] = [
  "STOREFRONT",
  "ADMIN",
  "WHATSAPP",
  "PHONE",
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "OTHER",
];

const SOURCE_ICONS: Record<OrderSource, LucideIcon> = {
  STOREFRONT: Store,
  ADMIN: MonitorCog,
  WHATSAPP: MessageCircle,
  PHONE: Phone,
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
  TIKTOK: Music2,
  OTHER: Camera,
};

export function isOrderSource(value: unknown): value is OrderSource {
  return (
    typeof value === "string" &&
    ORDER_SOURCE_CHANNELS.includes(value as OrderSource)
  );
}

export interface SourceBadgeProps {
  source: OrderSource | string | null | undefined;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const t = useTranslations("orders.source.channels");
  const tSource = useTranslations("orders.source");
  const knownSource = isOrderSource(source) ? source : null;
  const Icon = knownSource ? SOURCE_ICONS[knownSource] : CircleHelp;
  const label = knownSource ? t(knownSource) : t("UNKNOWN");

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 font-medium",
        className,
      )}
      aria-label={`${tSource("badge.label")}: ${label}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Badge>
  );
}

export default SourceBadge;
