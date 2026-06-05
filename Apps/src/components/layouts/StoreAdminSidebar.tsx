"use client";

/**
 * StoreAdminSidebar
 * Sidebar navigation for the store admin dashboard.
 * Filters navigation items based on user permissions using buildSidebarItems.
 * Supports collapse/expand with localStorage persistence and mobile responsive navigation.
 *
 * Requirements: 6.1, 6.6, 6.7, 15.2, 15.5
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Ticket,
  Warehouse,
  UserPlus,
  Shield,
  Settings,
  Tag,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { buildSidebarItems } from "@/lib/utils/permissions";
import { STORAGE_KEYS } from "@/lib/constants/storage";
import { useStore } from "@/hooks";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Logo } from "@/components/shared";
import type { SidebarItem } from "@/types";

// ─── Icon Map ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Ticket,
  Warehouse,
  UserPlus,
  Shield,
  Settings,
  Tag,
};

// ─── Sidebar Nav Item ────────────────────────────────────────────────────────

interface SidebarNavItemProps {
  item: SidebarItem;
  isActive: boolean;
  collapsed: boolean;
}

function SidebarNavItem({ item, isActive, collapsed }: SidebarNavItemProps) {
  const Icon = ICON_MAP[item.icon] || LayoutDashboard;

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href={item.path}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={item.path}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ─── Mobile Sidebar Nav Item ─────────────────────────────────────────────────

interface MobileSidebarNavItemProps {
  item: SidebarItem;
  isActive: boolean;
  onNavigate: () => void;
}

function MobileSidebarNavItem({
  item,
  isActive,
  onNavigate,
}: MobileSidebarNavItemProps) {
  const Icon = ICON_MAP[item.icon] || LayoutDashboard;

  return (
    <Link
      href={item.path}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────────────

export interface StoreAdminSidebarProps {
  className?: string;
}

export function StoreAdminSidebar({ className }: StoreAdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const { permissions } = useStore();

  const [collapsed, setCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(next));
  };

  const sidebarItems = buildSidebarItems(permissions);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden md:flex flex-col border-e bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          className,
        )}
        aria-label={t("navigation")}
      >
        {/* Logo / Brand */}
        <div
          className={cn(
            "flex h-16 items-center border-b px-4",
            collapsed ? "justify-center" : "gap-3",
          )}
        >
          <Logo size="sm" />
          {!collapsed && (
            <span className="text-lg font-bold text-foreground">وصل</span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {sidebarItems.map((item) => (
            <SidebarNavItem
              key={item.path}
              item={item}
              isActive={pathname === item.path}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={cn("w-full", collapsed ? "justify-center px-0" : "")}
            aria-label={collapsed ? t("expand") : t("collapse")}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 me-2" />
                <span>{t("collapse")}</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// ─── Mobile Sidebar ──────────────────────────────────────────────────────────

export function StoreAdminMobileSidebar() {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const { permissions } = useStore();
  const [open, setOpen] = useState(false);

  const sidebarItems = buildSidebarItems(permissions);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t("menu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="flex h-16 flex-row items-center gap-3 border-b px-4">
          <Logo size="sm" />
          <SheetTitle className="text-lg font-bold">وصل</SheetTitle>
        </SheetHeader>
        <nav
          className="flex-1 space-y-1 overflow-y-auto p-3"
          aria-label={t("navigation")}
        >
          {sidebarItems.map((item) => (
            <MobileSidebarNavItem
              key={item.path}
              item={item}
              isActive={pathname === item.path}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
