"use client";

/**
 * Store Admin Layout
 * Provides the shell for all store admin pages: sidebar, header with store selector,
 * and main content area. If no store is selected, shows a store selection prompt.
 *
 * Requirements: 6.1, 6.6, 6.7, 15.2, 15.5
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { Store as StoreIcon, Moon, Sun, Globe, LogOut } from "lucide-react";
import { toast } from "sonner";

import { useAuth, useStore, useTheme, useSessionValidator } from "@/hooks";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setLocale } from "@/lib/store/slices/ui.slice";
import { persistLocale } from "@/lib/i18n/config";
import { apiClient } from "@/lib/api/client";
import { storeService } from "@/lib/api/services/store.service";
import { STORAGE_KEYS } from "@/lib/constants/storage";
import {
  StoreSubscriptionContext,
  type StoreSubscriptionContextValue,
} from "@/lib/providers/StoreSubscriptionProvider";
import type { SupportedLocale } from "@/lib/i18n/config";
import type { Store, ApiResponse } from "@/types";
import type { UserSubscriptionInfo } from "@/lib/api/services/store.service";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/shared";
import { CreateStoreButton } from "@/components/shared/CreateStoreButton";
import { CreateStoreDialog } from "@/components/forms/CreateStoreDialog";
import {
  StoreAdminSidebar,
  StoreAdminMobileSidebar,
} from "@/components/layouts/StoreAdminSidebar";
import { ROUTES } from "@/lib/constants/routes";

// ─── Store Selection Prompt ──────────────────────────────────────────────────

interface StoreSelectionPromptProps {
  stores: Store[];
  loading: boolean;
  onSelect: (storeId: number) => void;
  storeCount: number;
  maxStores: number | null;
  hasActiveSubscription: boolean;
  onStoreCreated: (newStore: Store) => void;
}

function StoreSelectionPrompt({
  stores,
  loading,
  onSelect,
  storeCount,
  maxStores,
  hasActiveSubscription,
  onStoreCreated,
}: StoreSelectionPromptProps) {
  const t = useTranslations("store");
  const [dialogOpen, setDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-6 text-center">
          <Skeleton className="mx-auto h-16 w-16 rounded-lg" />
          <Skeleton className="mx-auto h-6 w-48" />
          <Skeleton className="mx-auto h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {t("storeSelectionPrompt")}
          </h1>
          <p className="text-muted-foreground">
            {t("storeSelectionDescription")}
          </p>
        </div>

        {stores.length === 0 ? (
          <div className="rounded-lg border bg-card p-6">
            <StoreIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">{t("noStores")}</p>
            <div className="mt-4">
              <CreateStoreButton
                variant="first-store"
                storeCount={storeCount}
                maxStores={maxStores}
                hasActiveSubscription={hasActiveSubscription}
                onOpenDialog={() => setDialogOpen(true)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => onSelect(store.id)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-4 text-start transition-colors hover:bg-accent"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <StoreIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {store.name}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {store.domain}
                  </p>
                </div>
              </button>
            ))}
            <div className="pt-2">
              <CreateStoreButton
                variant="first-store"
                storeCount={storeCount}
                maxStores={maxStores}
                hasActiveSubscription={hasActiveSubscription}
                onOpenDialog={() => setDialogOpen(true)}
              />
            </div>
          </div>
        )}
      </div>

      <CreateStoreDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={onStoreCreated}
      />
    </div>
  );
}

// ─── Store Selector Dropdown ─────────────────────────────────────────────────

interface StoreSelectorProps {
  stores: Store[];
  currentStoreId: number | null;
  onStoreChange: (storeId: number) => void;
}

function StoreSelector({
  stores,
  currentStoreId,
  onStoreChange,
}: StoreSelectorProps) {
  const t = useTranslations("store");

  const currentStore = stores.find((s) => s.id === currentStoreId);

  return (
    <Select
      value={currentStoreId ? String(currentStoreId) : undefined}
      onValueChange={(value) => onStoreChange(Number(value))}
    >
      <SelectTrigger className="w-[200px]" aria-label={t("selectStore")}>
        <SelectValue placeholder={t("selectStore")}>
          {currentStore ? currentStore.name : t("selectStore")}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {stores.map((store) => (
          <SelectItem key={store.id} value={String(store.id)}>
            {store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

interface StoreAdminHeaderProps {
  stores: Store[];
  currentStoreId: number | null;
  onStoreChange: (storeId: number) => void;
}

function StoreAdminHeader({
  stores,
  currentStoreId,
  onStoreChange,
}: StoreAdminHeaderProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const dispatch = useAppDispatch();
  const locale = useAppSelector((state) => state.ui.locale);
  const tNav = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const tTheme = useTranslations("theme");
  const tLang = useTranslations("language");
  const tA11y = useTranslations("accessibility.buttons");
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale: SupportedLocale = locale === "ar" ? "en" : "ar";
    dispatch(setLocale(newLocale));
    persistLocale(newLocale);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Derive page title from pathname
  const getPageTitle = (): string => {
    const segment = pathname.split("/").filter(Boolean).pop() || "dashboard";
    // Known nav keys that have translations
    const navKeys = [
      "dashboard",
      "products",
      "orders",
      "categories",
      "customers",
      "coupons",
      "inventory",
      "members",
      "roles",
      "settings",
    ];
    if (navKeys.includes(segment)) {
      return tNav(segment as "dashboard");
    }
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <StoreAdminMobileSidebar />

        {/* Page title */}
        <h1 className="text-lg font-semibold text-foreground hidden sm:block">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Store selector */}
        <StoreSelector
          stores={stores}
          currentStoreId={currentStoreId}
          onStoreChange={onStoreChange}
        />

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? tTheme("light") : tTheme("dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Language toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLocale}
          aria-label={tLang("switchLanguage")}
        >
          <Globe className="h-5 w-5" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label={tA11y("userMenu")}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="me-2 h-4 w-4" />
              {tAuth("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function StoreAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentStoreId, switchStore } = useStore();
  const { user } = useAuth();
  const router = useRouter();
  const tCreateStore = useTranslations("createStore");
  const [userStores, setUserStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] =
    useState<UserSubscriptionInfo | null>(null);

  // Validate session on mount — calls /auth/me and redirects on failure
  useSessionValidator();

  // Fetch user's stores and subscription info on mount
  const fetchUserStores = useCallback(async () => {
    try {
      setStoresLoading(true);
      const [storesResponse, subscriptionResponse] = await Promise.allSettled([
        apiClient<ApiResponse<Store[]>>("/auth/me/stores"),
        storeService.getUserSubscriptionInfo(),
      ]);

      if (storesResponse.status === "fulfilled") {
        setUserStores(storesResponse.value.data);
      } else {
        setUserStores([]);
      }

      if (subscriptionResponse.status === "fulfilled") {
        setSubscriptionInfo(subscriptionResponse.value.data);
      } else {
        // Default to no subscription info on failure
        setSubscriptionInfo(null);
      }
    } catch {
      setUserStores([]);
      setSubscriptionInfo(null);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Restore persisted store on mount if currentStoreId is set but permissions not loaded
  useEffect(() => {
    if (currentStoreId && !storesLoading && userStores.length > 0) {
      // Verify the persisted store is still in user's stores
      const storeExists = userStores.some((s) => s.id === currentStoreId);
      if (!storeExists) {
        // Persisted store no longer accessible, clear it
        localStorage.removeItem(STORAGE_KEYS.CURRENT_STORE_ID);
      }
    }
  }, [currentStoreId, storesLoading, userStores]);

  const handleStoreSelect = useCallback(
    (storeId: number) => {
      switchStore(storeId);
    },
    [switchStore],
  );

  // Handle store creation from the StoreSelectionPrompt:
  // Set currentStoreId in Redux, persist to localStorage, fetch permissions, navigate to dashboard
  const handleStoreCreatedFromPrompt = useCallback(
    async (newStore: Store) => {
      // Add the new store to the local list
      setUserStores((prev) => [...prev, newStore]);

      // Switch to the new store (sets Redux, persists to localStorage, fetches permissions)
      await switchStore(newStore.id);

      // Show success toast
      toast.success(tCreateStore("successToast"), { duration: 5000 });

      // Navigate to dashboard
      router.push(ROUTES.STORE_ADMIN.DASHBOARD);
    },
    [switchStore, tCreateStore, router],
  );

  // Compute storeCount: exclude ARCHIVED stores (soft-deleted are filtered server-side)
  const storeCount = useMemo(
    () => userStores.filter((s) => s.status !== "ARCHIVED").length,
    [userStores],
  );

  // Build subscription context value
  const subscriptionContextValue = useMemo<StoreSubscriptionContextValue>(
    () => ({
      storeCount,
      maxStores: subscriptionInfo?.maxStores ?? null,
      hasActiveSubscription: subscriptionInfo?.hasActiveSubscription ?? false,
      userStores,
      storesLoading,
      refreshStores: fetchUserStores,
    }),
    [storeCount, subscriptionInfo, userStores, storesLoading, fetchUserStores],
  );

  // Show store selection prompt if no store is selected
  if (!currentStoreId) {
    return (
      <StoreSubscriptionContext.Provider value={subscriptionContextValue}>
        <StoreSelectionPrompt
          stores={userStores}
          loading={storesLoading}
          onSelect={handleStoreSelect}
          storeCount={storeCount}
          maxStores={subscriptionInfo?.maxStores ?? null}
          hasActiveSubscription={
            subscriptionInfo?.hasActiveSubscription ?? false
          }
          onStoreCreated={handleStoreCreatedFromPrompt}
        />
      </StoreSubscriptionContext.Provider>
    );
  }

  return (
    <StoreSubscriptionContext.Provider value={subscriptionContextValue}>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <StoreAdminSidebar />

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <StoreAdminHeader
            stores={userStores}
            currentStoreId={currentStoreId}
            onStoreChange={handleStoreSelect}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </StoreSubscriptionContext.Provider>
  );
}
