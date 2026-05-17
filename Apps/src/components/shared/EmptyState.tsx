"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { FileX, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps {
  /** Lucide icon component or ReactNode to display */
  icon?: LucideIcon | React.ReactNode | undefined;
  /** Title text (displayed as heading) */
  title?: string;
  /** Description text or simple message */
  description?: string;
  /** Simple message (alias for description, used in table contexts) */
  message?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyState — displays an icon, message, and optional action when no data is available.
 * Requirements: 22.4, 25.3
 */
export function EmptyState({
  icon,
  title,
  description,
  message,
  action,
  className,
}: EmptyStateProps) {
  const t = useTranslations("table");
  const displayMessage = description || message || t("noData");

  // Determine how to render the icon
  const renderIcon = () => {
    if (!icon) {
      return (
        <FileX className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      );
    }
    // Check if icon is a LucideIcon component (function component)
    if (typeof icon === "function") {
      const IconComponent = icon as LucideIcon;
      return (
        <IconComponent
          className="h-8 w-8 text-muted-foreground"
          aria-hidden="true"
        />
      );
    }
    // Otherwise it's a ReactNode
    return icon;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">{renderIcon()}</div>
      {title && (
        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      )}
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {displayMessage}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="default">
          {action.label}
        </Button>
      )}
    </div>
  );
}
