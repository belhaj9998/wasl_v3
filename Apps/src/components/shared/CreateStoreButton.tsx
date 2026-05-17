"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

export interface CreateStoreButtonProps {
  /** Button variant: "default" for dashboard header, "first-store" for store selection prompt */
  variant?: "default" | "first-store";
  /** Current number of active stores (excluding ARCHIVED and soft-deleted) */
  storeCount: number;
  /** Maximum stores allowed by subscription plan (null = unlimited) */
  maxStores: number | null;
  /** Whether the user has an active subscription */
  hasActiveSubscription: boolean;
  /** Callback to open the create store dialog */
  onOpenDialog: () => void;
}

/**
 * CreateStoreButton — renders a button to initiate store creation.
 * Disables (via aria-disabled) when the store limit is reached or no active subscription,
 * and shows a tooltip explaining why.
 */
export function CreateStoreButton({
  variant = "default",
  storeCount,
  maxStores,
  hasActiveSubscription,
  onOpenDialog,
}: CreateStoreButtonProps) {
  const t = useTranslations("createStore");

  const isLimitReached = maxStores !== null && storeCount >= maxStores;
  const isDisabled = !hasActiveSubscription || isLimitReached;

  const tooltipMessage = !hasActiveSubscription
    ? t("tooltip.noSubscription")
    : isLimitReached
      ? t("tooltip.limitReached")
      : undefined;

  const label = variant === "first-store" ? t("buttonFirstStore") : t("button");

  const handleClick = () => {
    if (!isDisabled) {
      onOpenDialog();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (isDisabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
    }
  };

  const button = (
    <Button
      variant={variant === "first-store" ? "default" : "default"}
      size={variant === "first-store" ? "lg" : "default"}
      className={cn(
        isDisabled && "pointer-events-auto opacity-50 cursor-not-allowed",
      )}
      aria-disabled={isDisabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      type="button"
    >
      <Plus className="h-4 w-4 me-2" aria-hidden="true" />
      {label}
    </Button>
  );

  if (isDisabled && tooltipMessage) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltipMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
