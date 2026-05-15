"use client";

/**
 * StorefrontFooter
 * Public storefront footer with store info and links.
 * Requirements: 16.1
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/constants/routes";
import type { Store } from "@/types";

export interface StorefrontFooterProps {
  store: Store;
  domain: string;
}

export function StorefrontFooter({ store, domain }: StorefrontFooterProps) {
  const t = useTranslations("storefront");

  return (
    <footer className="border-t bg-card mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Store Info */}
          <div>
            <h3 className="text-lg font-bold text-foreground">{store.name}</h3>
            {store.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {store.description}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {t("quickLinks")}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href={ROUTES.STOREFRONT.PRODUCTS(domain)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {t("products")}
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.STOREFRONT.CART(domain)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {t("cart")}
                </Link>
              </li>
              <li>
                <Link
                  href={ROUTES.STOREFRONT.ORDER_LOOKUP(domain)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {t("orderLookup")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {t("contact")}
            </h4>
            <ul className="space-y-2">
              {store.support_email && (
                <li className="text-sm text-muted-foreground">
                  {store.support_email}
                </li>
              )}
              {store.support_phone && (
                <li className="text-sm text-muted-foreground">
                  {store.support_phone}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {store.name}. {t("allRightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
}
