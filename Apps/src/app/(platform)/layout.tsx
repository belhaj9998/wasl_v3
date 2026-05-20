"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, Globe, Sun, Moon, Loader2 } from "lucide-react";
import type { SystemRole } from "@/types/auth.types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/shared";
import {
  PlatformSidebar,
  PlatformMobileNav,
} from "@/components/layouts/PlatformSidebar";
import { useAppSelector, useAppDispatch } from "@/lib/store/hooks";
import { toggleSidebar, setLocale } from "@/lib/store/slices/ui.slice";
import { logoutThunk } from "@/lib/store/slices/auth.thunks";
import { STORAGE_KEYS } from "@/lib/constants/storage";
import { ROUTES } from "@/lib/constants/routes";
import { persistLocale } from "@/lib/i18n/config";
import { useTheme } from "@/hooks/useTheme";
import { useSessionValidator } from "@/hooks/useSessionValidator";
import type { SupportedLocale } from "@/lib/i18n/config";

/**
 * Platform Admin Layout
 * Provides sidebar navigation, header with user menu, theme toggle, and language toggle.
 * Supports RTL layout (sidebar on right side) and mobile responsive navigation.
 */
export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const tLang = useTranslations("language");
  const tBrand = useTranslations("brand");
  const tA11y = useTranslations("accessibility.buttons");

  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const locale = useAppSelector((state) => state.ui.locale);
  const user = useAppSelector((state) => state.auth.user);
  const authLoading = useAppSelector((state) => state.auth.loading);

  const { toggleTheme, isDark } = useTheme();

  // Validate session on mount — calls /auth/me and redirects on failure
  useSessionValidator();

  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth guard: redirect unauthenticated or unauthorized users
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const allowedRoles: SystemRole[] = ["PLATFORM_ADMIN", "PLATFORM_OWNER"];
    if (!allowedRoles.includes(user.system_role)) {
      router.push("/");
      return;
    }
  }, [user, authLoading, router]);

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.SIDEBAR_COLLAPSED,
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  // Restore sidebar state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    if (stored === "true" && !sidebarCollapsed) {
      dispatch(toggleSidebar());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleSidebar = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  const handleToggleLocale = useCallback(() => {
    const newLocale: SupportedLocale = locale === "ar" ? "en" : "ar";
    dispatch(setLocale(newLocale));
    persistLocale(newLocale);
  }, [dispatch, locale]);

  const handleLogout = useCallback(async () => {
    await dispatch(logoutThunk());
    router.replace(ROUTES.AUTH.LOGIN);
  }, [dispatch, router]);

  // Show loading state while auth is being determined
  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user doesn't have the right role, show loading while redirect happens
  const allowedRoles: SystemRole[] = ["PLATFORM_ADMIN", "PLATFORM_OWNER"];
  if (!allowedRoles.includes(user.system_role)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Determine current page title from pathname
  const getPageTitle = (): string => {
    if (pathname === ROUTES.PLATFORM.DASHBOARD) return t("dashboard");
    if (pathname.startsWith(ROUTES.PLATFORM.USERS)) return t("users");
    if (pathname.startsWith(ROUTES.PLATFORM.STORES)) return t("stores");
    if (pathname.startsWith(ROUTES.PLATFORM.PLANS)) return t("plans");
    if (pathname.startsWith(ROUTES.PLATFORM.SUBSCRIPTIONS))
      return t("subscriptions");
    if (pathname.startsWith(ROUTES.PLATFORM.PERMISSIONS))
      return t("permissions");
    return t("dashboard");
  };

  // Get user initials for avatar
  const getUserInitials = (): string => {
    if (!user?.name) return "A";
    const parts = user.name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <PlatformSidebar
        collapsed={sidebarCollapsed}
        onToggle={handleToggleSidebar}
      />

      {/* Mobile Sheet Navigation */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="border-b px-4 h-16 flex flex-row items-center gap-3">
            <Logo size="sm" />
            <SheetTitle className="text-lg font-semibold">
              {tBrand("name")}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Platform navigation menu
            </SheetDescription>
          </SheetHeader>
          <PlatformMobileNav onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between border-b bg-card px-4 h-16">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={tA11y("openMenu")}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Page title */}
            <h1 className="text-lg font-semibold text-foreground">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleLocale}
              aria-label={tLang("switchLanguage")}
            >
              <Globe className="h-4 w-4" />
            </Button>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={
                isDark ? tA11y("toggleThemeLight") : tA11y("toggleThemeDark")
              }
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* User avatar/menu */}
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
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user && (
                  <DropdownMenuItem disabled className="font-medium">
                    {user.name}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  {tAuth("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
