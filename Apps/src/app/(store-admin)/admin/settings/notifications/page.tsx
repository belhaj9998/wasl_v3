"use client";

/**
 * Notification Settings Page
 * Allows users to enable/disable each notification type independently
 * and toggle notification sound. Saves preferences via PATCH.
 *
 * Requirements: 14.4
 */

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, Volume2, Loader2 } from "lucide-react";

import { useStore } from "@/hooks";
import {
  notificationSettingsService,
  type NotificationSettings,
} from "@/lib/api/services/notificationSettings.service";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function NotificationSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Notification Settings Page ──────────────────────────────────────────────

export default function NotificationSettingsPage() {
  const t = useTranslations("notificationSettings");
  const tSuccess = useTranslations("success.store");
  const { currentStoreId } = useStore();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local state for toggles (optimistic UI)
  const [newOrder, setNewOrder] = useState(true);
  const [orderStatusChange, setOrderStatusChange] = useState(true);
  const [lowStock, setLowStock] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!currentStoreId) return;

    setLoading(true);
    setError(null);

    try {
      const response =
        await notificationSettingsService.getSettings(currentStoreId);
      const data = response.data;
      setSettings(data);
      setNewOrder(data.newOrder);
      setOrderStatusChange(data.orderStatusChange);
      setLowStock(data.lowStock);
      setSoundEnabled(data.soundEnabled);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    if (!currentStoreId) return;

    setSaving(true);
    try {
      const payload = {
        newOrder,
        orderStatusChange,
        lowStock,
        soundEnabled,
      };
      const response = await notificationSettingsService.updateSettings(
        currentStoreId,
        payload,
      );
      setSettings(response.data);
      toast.success(tSuccess("settingsUpdated"));
    } catch {
      toast.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    settings !== null &&
    (newOrder !== settings.newOrder ||
      orderStatusChange !== settings.orderStatusChange ||
      lowStock !== settings.lowStock ||
      soundEnabled !== settings.soundEnabled);

  if (loading) {
    return <NotificationSettingsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Bell className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium mb-2">{error}</p>
        <Button variant="link" onClick={fetchSettings}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("notificationTypes")}
          </CardTitle>
          <CardDescription>{t("notificationTypesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* New Order */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new-order" className="text-base font-medium">
                {t("newOrder")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("newOrderDescription")}
              </p>
            </div>
            <Switch
              id="new-order"
              checked={newOrder}
              onCheckedChange={setNewOrder}
              aria-label={t("newOrder")}
            />
          </div>

          <Separator />

          {/* Order Status Change */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="order-status-change"
                className="text-base font-medium"
              >
                {t("orderStatusChange")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("orderStatusChangeDescription")}
              </p>
            </div>
            <Switch
              id="order-status-change"
              checked={orderStatusChange}
              onCheckedChange={setOrderStatusChange}
              aria-label={t("orderStatusChange")}
            />
          </div>

          <Separator />

          {/* Low Stock */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="low-stock" className="text-base font-medium">
                {t("lowStock")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("lowStockDescription")}
              </p>
            </div>
            <Switch
              id="low-stock"
              checked={lowStock}
              onCheckedChange={setLowStock}
              aria-label={t("lowStock")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            {t("soundSettings")}
          </CardTitle>
          <CardDescription>{t("soundSettingsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sound-enabled" className="text-base font-medium">
                {t("soundEnabled")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("soundEnabledDescription")}
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
              aria-label={t("soundEnabled")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          {saving && (
            <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
