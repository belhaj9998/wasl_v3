"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Users,
  Store,
  CreditCard,
  Receipt,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Logo } from "@/components/shared";
import { ROUTES } from "@/lib/constants/routes";

export interface PlatformNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface PlatformSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * PlatformSidebar — sidebar navigation for the Platform Admin Dashboard.
 * Supports collapse/expand with tooltip labels when collapsed.
 * RTL-aware: sidebar appears on the right side in RTL mode.
 */
export function PlatformSidebar({ collapsed, onToggle }: PlatformSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const navItems: PlatformNavItem[] = [
    {
      label: t("dashboard"),
      href: ROUTES.PLATFORM.DASHBOARD,
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: t("users"),
      href: ROUTES.PLATFORM.USERS,
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: t("stores"),
      href: ROUTES.PLATFORM.STORES,
      icon: <Store className="h-5 w-5" />,
    },
    {
      label: t("plans"),
      href: ROUTES.PLATFORM.PLANS,
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      label: t("subscriptions"),
      href: ROUTES.PLATFORM.SUBSCRIPTIONS,
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      label: t("permissions"),
      href: ROUTES.PLATFORM.PERMISSIONS,
      icon: <Shield className="h-5 w-5" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === ROUTES.PLATFORM.DASHBOARD) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-e bg-card h-full transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex items-center border-b h-16 px-4",
          collapsed ? "justify-center" : "gap-3",
        )}
      >
        <Logo size="sm" />
        {!collapsed && (
          <span className="font-semibold text-lg text-foreground">وصل</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <TooltipProvider delayDuration={0}>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);

              if (collapsed) {
                return (
                  <li key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center justify-center rounded-md p-2.5 transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                          aria-current={active ? "page" : undefined}
                        >
                          {item.icon}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="left">{item.label}</TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </TooltipProvider>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}

/**
 * PlatformMobileNav — mobile navigation items for the Sheet component.
 * Renders the same nav items in a full-width list format.
 */
export function PlatformMobileNav({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const navItems: PlatformNavItem[] = [
    {
      label: t("dashboard"),
      href: ROUTES.PLATFORM.DASHBOARD,
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: t("users"),
      href: ROUTES.PLATFORM.USERS,
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: t("stores"),
      href: ROUTES.PLATFORM.STORES,
      icon: <Store className="h-5 w-5" />,
    },
    {
      label: t("plans"),
      href: ROUTES.PLATFORM.PLANS,
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      label: t("subscriptions"),
      href: ROUTES.PLATFORM.SUBSCRIPTIONS,
      icon: <Receipt className="h-5 w-5" />,
    },
    {
      label: t("permissions"),
      href: ROUTES.PLATFORM.PERMISSIONS,
      icon: <Shield className="h-5 w-5" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === ROUTES.PLATFORM.DASHBOARD) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex-1 overflow-y-auto py-4">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
