"use client";

/**
 * StorefrontHeader
 * Public storefront header with store name, navigation, cart icon with count,
 * and customer account link. Supports RTL/LTR.
 * Requirements: 16.1, 16.2
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  User,
  Menu,
  ChevronDown,
  FolderTree,
} from "lucide-react";

import { useAppSelector } from "@/lib/store/hooks";
import { selectCartItemCount } from "@/lib/store/slices/cart.slice";
import { ROUTES } from "@/lib/constants/routes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProductSearch } from "@/components/storefront/ProductSearch";
import type { Store, Category } from "@/types";

export interface StorefrontHeaderProps {
  store: Store;
  categories?: Category[];
  domain: string;
}

export function StorefrontHeader({
  store,
  categories = [],
  domain,
}: StorefrontHeaderProps) {
  const t = useTranslations("storefront");
  const cartItemCount = useAppSelector(selectCartItemCount);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Store Name */}
          <Link
            href={ROUTES.STOREFRONT.HOME(domain)}
            className="flex items-center gap-2"
          >
            {store.logo_url && (
              <Image
                src={store.logo_url}
                alt={store.name}
                width={32}
                height={32}
                className="h-8 w-8 rounded object-cover"
              />
            )}
            <span className="text-lg font-bold text-foreground">
              {store.name}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href={ROUTES.STOREFRONT.HOME(domain)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("home")}
            </Link>
            <Link
              href={ROUTES.STOREFRONT.PRODUCTS(domain)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("products")}
            </Link>

            {/* Categories with hover dropdown */}
            {categories.length > 0 && (
              <div className="relative group">
                <Link
                  href={ROUTES.STOREFRONT.CATEGORIES_LIST(domain)}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  الأقسام
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                </Link>

                {/* Dropdown panel */}
                <div className="invisible opacity-0 translate-y-1 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 focus-within:visible focus-within:opacity-100 focus-within:translate-y-0 absolute top-full start-0 pt-2 w-64 z-50 transition-all duration-150">
                  <div className="rounded-md border bg-popover shadow-lg overflow-hidden">
                    <ul className="py-2 max-h-96 overflow-y-auto">
                      {categories.map((category) => (
                        <li key={category.id}>
                          <Link
                            href={ROUTES.STOREFRONT.CATEGORY(
                              domain,
                              category.slug,
                            )}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                          >
                            {category.image_url ? (
                              <Image
                                src={category.image_url}
                                alt=""
                                width={24}
                                height={24}
                                className="h-6 w-6 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <FolderTree className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="truncate">{category.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={ROUTES.STOREFRONT.CATEGORIES_LIST(domain)}
                      className="block border-t px-3 py-2 text-sm font-medium text-primary hover:bg-accent transition-colors text-center"
                    >
                      عرض كل الأقسام
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </nav>

          {/* Product Search */}
          <ProductSearch className="hidden md:block w-64 lg:w-80" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link href={ROUTES.STOREFRONT.CART(domain)}>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
                <span className="sr-only">{t("cart")}</span>
              </Button>
            </Link>

            {/* Account */}
            <Link href={ROUTES.STOREFRONT.ACCOUNT.LOGIN(domain)}>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">{t("account")}</span>
              </Button>
            </Link>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t("menu")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <nav className="flex flex-col gap-4 mt-8">
                  {/* Mobile Search */}
                  <ProductSearch className="w-full" />
                  <Link
                    href={ROUTES.STOREFRONT.HOME(domain)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-foreground"
                  >
                    {t("home")}
                  </Link>
                  <Link
                    href={ROUTES.STOREFRONT.PRODUCTS(domain)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-foreground"
                  >
                    {t("products")}
                  </Link>
                  {categories.length > 0 && (
                    <>
                      <Link
                        href={ROUTES.STOREFRONT.CATEGORIES_LIST(domain)}
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-base font-medium text-foreground"
                      >
                        الأقسام
                      </Link>
                      {categories.map((category) => (
                        <Link
                          key={category.id}
                          href={ROUTES.STOREFRONT.CATEGORY(
                            domain,
                            category.slug,
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                          className="text-sm text-muted-foreground ps-4"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </>
                  )}
                  <hr className="my-2" />
                  <Link
                    href={ROUTES.STOREFRONT.ACCOUNT.LOGIN(domain)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-foreground"
                  >
                    {t("account")}
                  </Link>
                  <Link
                    href={ROUTES.STOREFRONT.CART(domain)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-medium text-foreground"
                  >
                    {t("cart")} {cartItemCount > 0 && `(${cartItemCount})`}
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
