"use client";

/**
 * DashboardHeader — Page header for the Store Admin Dashboard.
 * Renders the page title, a personalized welcome message, and the CreateStoreButton.
 * Manages the CreateStoreDialog open state internally.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

import { useState } from "react";
import { useTranslations } from "next-intl";

import { CreateStoreButton } from "@/components/shared/CreateStoreButton";
import { CreateStoreDialog } from "@/components/forms/CreateStoreDialog";
import type { Store } from "@/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DashboardHeaderProps {
  /** Authenticated user's first name (null if unavailable) */
  userName: string | null;
  /** Current number of active stores (excluding ARCHIVED and soft-deleted) */
  storeCount: number;
  /** Maximum stores allowed by subscription plan (null = unlimited) */
  maxStores: number | null;
  /** Whether the user has an active subscription */
  hasActiveSubscription: boolean;
  /** Callback when a new store is successfully created */
  onStoreCreated: (newStore: Store) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardHeader({
  userName,
  storeCount,
  maxStores,
  hasActiveSubscription,
  onStoreCreated,
}: DashboardHeaderProps) {
  const t = useTranslations("dashboard");
  const [dialogOpen, setDialogOpen] = useState(false);

  const welcomeMessage = userName
    ? t("welcomeMessage", { name: userName })
    : t("welcomeMessageGeneric");

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Title and welcome message */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("pageTitle")}
          </h1>
          <p className="text-muted-foreground">{welcomeMessage}</p>
        </div>

        {/* Create Store action */}
        <div className="shrink-0">
          <CreateStoreButton
            storeCount={storeCount}
            maxStores={maxStores}
            hasActiveSubscription={hasActiveSubscription}
            onOpenDialog={() => setDialogOpen(true)}
          />
        </div>
      </header>

      {/* Create Store Dialog */}
      <CreateStoreDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={onStoreCreated}
        storeCount={storeCount}
        maxStores={maxStores}
      />
    </>
  );
}
