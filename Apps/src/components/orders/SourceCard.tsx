"use client";

import { RadioTower } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PermissionGate } from "@/components/shared/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/hooks/useStore";
import { useAppDispatch } from "@/lib/store/hooks";
import { updateOrderSource } from "@/lib/store/slices/orders.thunks";
import type { Order, OrderSource } from "@/types";

import { ORDER_SOURCE_CHANNELS, SourceBadge } from "./SourceBadge";

const KNOWN_ERROR_CODES = [
  "INVALID_ORDER_SOURCE",
  "ORDER_NOT_FOUND",
  "FORBIDDEN",
] as const;

type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function extractErrorCode(message: string): KnownErrorCode | null {
  const upper = message.toUpperCase();
  for (const code of KNOWN_ERROR_CODES) {
    if (upper.includes(code)) return code;
  }
  return null;
}

export interface SourceCardProps {
  order: Order;
}

export function SourceCard({ order }: SourceCardProps) {
  const dispatch = useAppDispatch();
  const { currentStoreId } = useStore();
  const t = useTranslations("orders.source");

  const handleChange = async (source: OrderSource) => {
    if (currentStoreId == null || source === order.source) return;

    try {
      await dispatch(
        updateOrderSource({
          storeId: currentStoreId,
          orderId: order.id,
          payload: { source },
        }),
      ).unwrap();
      toast.success(t("toasts.updateSuccess"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const code = extractErrorCode(message);
      toast.error(code ? t(`errors.${code}`) : t("toasts.errorGeneric"));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <RadioTower className="h-5 w-5" aria-hidden="true" />
          {t("card.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SourceBadge source={order.source} />

        <PermissionGate permission="orders.manage_source">
          <Select value={order.source} onValueChange={handleChange}>
            <SelectTrigger aria-label={t("card.edit")}>
              <SelectValue placeholder={t("select.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {ORDER_SOURCE_CHANNELS.map((source) => (
                <SelectItem key={source} value={source}>
                  {t(`channels.${source}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PermissionGate>
      </CardContent>
    </Card>
  );
}

export default SourceCard;
