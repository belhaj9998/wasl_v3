import type { OrderSource } from "@/types";

export type SourceFilterValue =
  | { kind: "none" }
  | { kind: "channels"; channels: OrderSource[] };

const ORDER_SOURCE_ORDER: OrderSource[] = [
  "STOREFRONT",
  "ADMIN",
  "WHATSAPP",
  "PHONE",
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "OTHER",
];

const ORDER_SOURCE_SET = new Set<OrderSource>(ORDER_SOURCE_ORDER);

function normalizeChannels(channels: readonly OrderSource[]): OrderSource[] {
  const selected = new Set(channels.filter((channel) => ORDER_SOURCE_SET.has(channel)));
  return ORDER_SOURCE_ORDER.filter((channel) => selected.has(channel));
}

export function parseSourceParam(value: string | null): SourceFilterValue {
  if (value == null) return { kind: "none" };

  const channels = normalizeChannels(
    value
      .split(",")
      .map((token) => token.trim())
      .filter((token): token is OrderSource =>
        ORDER_SOURCE_SET.has(token as OrderSource),
      ),
  );

  return channels.length === 0 ? { kind: "none" } : { kind: "channels", channels };
}

export function serializeSourceParam(value: SourceFilterValue): string | null {
  if (value.kind === "none") {
    return null;
  }

  const channels = normalizeChannels(value.channels);
  return channels.length === 0 ? null : channels.join(",");
}
