"use client";

/**
 * Store Admin Settings Page
 * Tabbed settings interface with General, Branding, SEO, and Contact tabs.
 * Each tab has its own form with corresponding validation schema.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";
import {
  Settings,
  Palette,
  Search,
  Phone,
  Plus,
  Trash2,
  Bell,
  Volume2,
} from "lucide-react";

import { useStore } from "@/hooks";
import {
  storeSettingsService,
  type StoreSettings,
} from "@/lib/api/services/storeSettings.service";
import {
  notificationSettingsService,
  type NotificationSettings,
} from "@/lib/api/services/notificationSettings.service";
import {
  generalSettingsSchema,
  seoSettingsSchema,
  contactSettingsSchema,
  type GeneralSettingsFormData,
  type SeoSettingsFormData,
  type ContactSettingsFormData,
} from "@/lib/validators/settings.schema";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { FormField, FormSummaryError, SubmitButton } from "@/components/forms";
import { mapServerErrorsToForm } from "@/components/forms";
import type { ApiError } from "@/types/api.types";

// ─── General Settings Tab ────────────────────────────────────────────────────

interface GeneralSettingsFormProps {
  defaultValues?: { name: string; domain: string };
  storeId: number;
}

function GeneralSettingsForm({
  defaultValues,
  storeId,
}: GeneralSettingsFormProps) {
  const t = useTranslations("settings");
  const tSuccess = useTranslations("success.store");
  const [summaryErrors, setSummaryErrors] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
    reset,
  } = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: defaultValues || { name: "", domain: "" },
  });

  // Reset form when defaultValues change (e.g., after loading)
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  const onSubmit = async (data: GeneralSettingsFormData) => {
    setSummaryErrors([]);
    try {
      await storeSettingsService.updateGeneral(storeId, {
        name: data.name,
      });
      toast.success(tSuccess("settingsUpdated"));
    } catch (error) {
      const apiError = error as ApiError;
      const unmapped = mapServerErrorsToForm<GeneralSettingsFormData>(
        apiError,
        setError,
        ["name", "domain"],
      );
      setSummaryErrors(unmapped);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSummaryError errors={summaryErrors} />

      <FormField
        control={control}
        name="name"
        label={t("storeName")}
        placeholder={t("storeNamePlaceholder")}
        required
      />

      <FormField
        control={control}
        name="domain"
        label={t("domain")}
        placeholder={t("domainPlaceholder")}
        description={t("domainDescription")}
        required
      />

      <div className="flex justify-end">
        <SubmitButton isSubmitting={isSubmitting}>{t("save")}</SubmitButton>
      </div>
    </form>
  );
}

// ─── Branding Settings Tab ───────────────────────────────────────────────────

interface BrandingSettingsFormProps {
  defaultValues?: { logo_url: string | null; favicon_url: string | null };
  storeId: number;
}

function BrandingSettingsForm({
  defaultValues,
  storeId,
}: BrandingSettingsFormProps) {
  const t = useTranslations("settings");
  const tSuccess = useTranslations("success.store");
  const [logoUrl, setLogoUrl] = useState<string | null>(
    defaultValues?.logo_url || null,
  );
  const [faviconUrl, setFaviconUrl] = useState<string | null>(
    defaultValues?.favicon_url || null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summaryErrors, setSummaryErrors] = useState<string[]>([]);

  useEffect(() => {
    if (defaultValues) {
      setLogoUrl(defaultValues.logo_url);
      setFaviconUrl(defaultValues.favicon_url);
    }
  }, [defaultValues]);

  const handleFileUpload = async (
    file: File,
    type: "logo" | "favicon",
  ): Promise<void> => {
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    // Validate file type
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/svg+xml",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PNG, JPG, SVG, or WebP files are allowed");
      return;
    }

    // For now, create a local URL preview. In production, this would upload to the server.
    const url = URL.createObjectURL(file);
    if (type === "logo") {
      setLogoUrl(url);
    } else {
      setFaviconUrl(url);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setSummaryErrors([]);
    try {
      await storeSettingsService.updateBranding(storeId, {
        logo: logoUrl,
        favicon: faviconUrl,
      });
      toast.success(tSuccess("settingsUpdated"));
    } catch (error) {
      const apiError = error as ApiError;
      setSummaryErrors([apiError.message || "Failed to update branding"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <FormSummaryError errors={summaryErrors} />

      {/* Logo Upload */}
      <div className="space-y-2">
        <Label>{t("logo")}</Label>
        <div className="flex items-center gap-4">
          {logoUrl && (
            <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center overflow-hidden relative">
              <Image
                src={logoUrl}
                alt="Store logo"
                fill
                sizes="64px"
                className="object-contain"
              />
            </div>
          )}
          <div>
            <label htmlFor="logo-upload">
              <Button variant="outline" size="sm" asChild>
                <span>{t("uploadLogo")}</span>
              </Button>
            </label>
            <input
              id="logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, "logo");
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("uploadHint")}
            </p>
          </div>
        </div>
      </div>

      {/* Favicon Upload */}
      <div className="space-y-2">
        <Label>{t("favicon")}</Label>
        <div className="flex items-center gap-4">
          {faviconUrl && (
            <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center overflow-hidden relative">
              <Image
                src={faviconUrl}
                alt="Store favicon"
                fill
                sizes="40px"
                className="object-contain"
              />
            </div>
          )}
          <div>
            <label htmlFor="favicon-upload">
              <Button variant="outline" size="sm" asChild>
                <span>{t("uploadFavicon")}</span>
              </Button>
            </label>
            <input
              id="favicon-upload"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, "favicon");
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("uploadHint")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton isSubmitting={isSubmitting} onClick={handleSave}>
          {t("save")}
        </SubmitButton>
      </div>
    </div>
  );
}

// ─── SEO Settings Tab ────────────────────────────────────────────────────────

interface SeoSettingsFormProps {
  defaultValues?: {
    meta_title: string | null;
    meta_description: string | null;
  };
  storeId: number;
}

function SeoSettingsForm({ defaultValues, storeId }: SeoSettingsFormProps) {
  const t = useTranslations("settings");
  const tSuccess = useTranslations("success.store");
  const [summaryErrors, setSummaryErrors] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
    reset,
  } = useForm<SeoSettingsFormData>({
    resolver: zodResolver(seoSettingsSchema),
    defaultValues: {
      meta_title: defaultValues?.meta_title || "",
      meta_description: defaultValues?.meta_description || "",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        meta_title: defaultValues.meta_title || "",
        meta_description: defaultValues.meta_description || "",
      });
    }
  }, [defaultValues, reset]);

  const onSubmit = async (data: SeoSettingsFormData) => {
    setSummaryErrors([]);
    try {
      await storeSettingsService.updateSeo(storeId, {
        meta_title: data.meta_title || null,
        meta_description: data.meta_description || null,
      });
      toast.success(tSuccess("settingsUpdated"));
    } catch (error) {
      const apiError = error as ApiError;
      const unmapped = mapServerErrorsToForm<SeoSettingsFormData>(
        apiError,
        setError,
        ["meta_title", "meta_description"],
      );
      setSummaryErrors(unmapped);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSummaryError errors={summaryErrors} />

      <FormField
        control={control}
        name="meta_title"
        label={t("metaTitle")}
        placeholder={t("metaTitlePlaceholder")}
      />

      <FormField
        control={control}
        name="meta_description"
        label={t("metaDescription")}
        type="textarea"
        placeholder={t("metaDescriptionPlaceholder")}
      />

      <div className="flex justify-end">
        <SubmitButton isSubmitting={isSubmitting}>{t("save")}</SubmitButton>
      </div>
    </form>
  );
}

// ─── Contact Settings Tab ────────────────────────────────────────────────────

interface ContactSettingsFormProps {
  defaultValues?: {
    support_email: string | null;
    support_phone: string | null;
    social_links: Record<string, string> | null;
  };
  storeId: number;
}

function ContactSettingsForm({
  defaultValues,
  storeId,
}: ContactSettingsFormProps) {
  const t = useTranslations("settings");
  const tSuccess = useTranslations("success.store");
  const [summaryErrors, setSummaryErrors] = useState<string[]>([]);
  const [socialLinks, setSocialLinks] = useState<
    { platform: string; url: string }[]
  >([]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
    reset,
  } = useForm<ContactSettingsFormData>({
    resolver: zodResolver(contactSettingsSchema),
    defaultValues: {
      support_email: defaultValues?.support_email || "",
      support_phone: defaultValues?.support_phone || "",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        support_email: defaultValues.support_email || "",
        support_phone: defaultValues.support_phone || "",
      });
      // Parse social links from record to array
      if (defaultValues.social_links) {
        const links = Object.entries(defaultValues.social_links).map(
          ([platform, url]) => ({ platform, url }),
        );
        setSocialLinks(links);
      }
    }
  }, [defaultValues, reset]);

  const addSocialLink = () => {
    setSocialLinks((prev) => [...prev, { platform: "", url: "" }]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSocialLink = (
    index: number,
    field: "platform" | "url",
    value: string,
  ) => {
    setSocialLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)),
    );
  };

  const onSubmit = async (data: ContactSettingsFormData) => {
    setSummaryErrors([]);

    // Convert social links array to record
    const socialLinksRecord: Record<string, string> = {};
    for (const link of socialLinks) {
      if (link.platform && link.url) {
        socialLinksRecord[link.platform] = link.url;
      }
    }

    try {
      await storeSettingsService.updateContact(storeId, {
        support_email: data.support_email || null,
        support_phone: data.support_phone || null,
        facebook_url: socialLinksRecord.facebook || null,
        instagram_url: socialLinksRecord.instagram || null,
        tiktok_url: socialLinksRecord.tiktok || null,
      });
      toast.success(tSuccess("settingsUpdated"));
    } catch (error) {
      const apiError = error as ApiError;
      const unmapped = mapServerErrorsToForm<ContactSettingsFormData>(
        apiError,
        setError,
        ["support_email", "support_phone", "social_links"],
      );
      setSummaryErrors(unmapped);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSummaryError errors={summaryErrors} />

      <FormField
        control={control}
        name="support_email"
        label={t("supportEmail")}
        type="email"
        placeholder={t("supportEmailPlaceholder")}
      />

      <FormField
        control={control}
        name="support_phone"
        label={t("supportPhone")}
        placeholder={t("supportPhonePlaceholder")}
      />

      {/* Social Links */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t("socialLinks")}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSocialLink}
          >
            <Plus className="h-4 w-4 me-1" />
            {t("addSocialLink")}
          </Button>
        </div>

        {socialLinks.length > 0 && (
          <div className="space-y-3">
            {socialLinks.map((link, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={t("platform")}
                  value={link.platform}
                  onChange={(e) =>
                    updateSocialLink(index, "platform", e.target.value)
                  }
                  className="w-1/3"
                />
                <Input
                  placeholder={t("url")}
                  value={link.url}
                  onChange={(e) =>
                    updateSocialLink(index, "url", e.target.value)
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSocialLink(index)}
                  aria-label={t("removeSocialLink")}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <SubmitButton isSubmitting={isSubmitting}>{t("save")}</SubmitButton>
      </div>
    </form>
  );
}

// ─── Notification Settings Tab ───────────────────────────────────────────────

interface NotificationSettingsTabProps {
  storeId: number;
}

function NotificationSettingsTab({ storeId }: NotificationSettingsTabProps) {
  const t = useTranslations("notificationSettings");
  const tSuccess = useTranslations("success.store");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  // Local state for toggles
  const [newOrder, setNewOrder] = useState(true);
  const [orderStatusChange, setOrderStatusChange] = useState(true);
  const [lowStock, setLowStock] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationSettingsService.getSettings(storeId);
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
  }, [storeId, t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        newOrder,
        orderStatusChange,
        lowStock,
        soundEnabled,
      };
      const response = await notificationSettingsService.updateSettings(
        storeId,
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
    return (
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
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium mb-2">{error}</p>
          <Button variant="link" onClick={fetchSettings}>
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
              <Label
                htmlFor="new-order-setting"
                className="text-base font-medium"
              >
                {t("newOrder")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("newOrderDescription")}
              </p>
            </div>
            <Switch
              id="new-order-setting"
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
                htmlFor="order-status-change-setting"
                className="text-base font-medium"
              >
                {t("orderStatusChange")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("orderStatusChangeDescription")}
              </p>
            </div>
            <Switch
              id="order-status-change-setting"
              checked={orderStatusChange}
              onCheckedChange={setOrderStatusChange}
              aria-label={t("orderStatusChange")}
            />
          </div>

          <Separator />

          {/* Low Stock */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="low-stock-setting"
                className="text-base font-medium"
              >
                {t("lowStock")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("lowStockDescription")}
              </p>
            </div>
            <Switch
              id="low-stock-setting"
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
              <Label
                htmlFor="sound-enabled-setting"
                className="text-base font-medium"
              >
                {t("soundEnabled")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("soundEnabledDescription")}
              </p>
            </div>
            <Switch
              id="sound-enabled-setting"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
              aria-label={t("soundEnabled")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <SubmitButton
          isSubmitting={saving}
          disabled={!hasChanges}
          onClick={handleSave}
        >
          {t("save")}
        </SubmitButton>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-md" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32 ms-auto" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Settings Page ───────────────────────────────────────────────────────────

export default function StoreSettingsPage() {
  const t = useTranslations("settings");
  const { currentStoreId } = useStore();

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!currentStoreId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await storeSettingsService.getSettings(currentStoreId);
      const store = response.data.store;

      setSettings({
        general: {
          name: store.name,
          domain: store.domain,
          description: store.description,
          currency: store.currency_code,
          timezone: store.timezone,
          language: store.locale,
        },
        branding: {
          logo_url: store.logo,
          favicon_url: store.favicon,
          primary_color: null,
          secondary_color: null,
        },
        seo: {
          meta_title: store.meta_title,
          meta_description: store.meta_description,
          og_image_url: null,
        },
        contact: {
          support_email: store.support_email,
          support_phone: store.support_phone,
          social_links: {
            facebook: store.facebook_url ?? "",
            instagram: store.instagram_url ?? "",
            tiktok: store.tiktok_url ?? "",
          },
        },
      });
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (loading) {
    return <SettingsLoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Settings className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium mb-2">{error}</p>
        <Button variant="link" onClick={fetchSettings}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="general" className="gap-1.5">
            <Settings className="h-4 w-4 hidden sm:inline-block" />
            {t("general")}
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5">
            <Palette className="h-4 w-4 hidden sm:inline-block" />
            {t("branding")}
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5">
            <Search className="h-4 w-4 hidden sm:inline-block" />
            {t("seo")}
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5">
            <Phone className="h-4 w-4 hidden sm:inline-block" />
            {t("contact")}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4 hidden sm:inline-block" />
            {t("notifications")}
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t("general")}</CardTitle>
              <CardDescription>
                {t("storeName")} & {t("domain")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GeneralSettingsForm
                defaultValues={
                  settings?.general
                    ? {
                        name: settings.general.name,
                        domain: settings.general.domain,
                      }
                    : undefined
                }
                storeId={currentStoreId!}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>{t("branding")}</CardTitle>
              <CardDescription>
                {t("logo")} & {t("favicon")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BrandingSettingsForm
                defaultValues={
                  settings?.branding
                    ? {
                        logo_url: settings.branding.logo_url,
                        favicon_url: settings.branding.favicon_url,
                      }
                    : undefined
                }
                storeId={currentStoreId!}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Settings */}
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>{t("seo")}</CardTitle>
              <CardDescription>
                {t("metaTitle")} & {t("metaDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SeoSettingsForm
                defaultValues={
                  settings?.seo
                    ? {
                        meta_title: settings.seo.meta_title,
                        meta_description: settings.seo.meta_description,
                      }
                    : undefined
                }
                storeId={currentStoreId!}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Settings */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>{t("contact")}</CardTitle>
              <CardDescription>
                {t("supportEmail")} & {t("supportPhone")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactSettingsForm
                defaultValues={
                  settings
                    ? {
                        support_email: settings.contact.support_email,
                        support_phone: settings.contact.support_phone,
                        social_links: settings.contact.social_links,
                      }
                    : undefined
                }
                storeId={currentStoreId!}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <NotificationSettingsTab storeId={currentStoreId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
