"use client";

/**
 * OrderActionBanners — list renderer for the Order Detail page.
 *
 * Calls the pure `deriveOrderBanners(order, locale)` to build the list of
 * banners and renders each as an `<OrderActionBanner>`. Returns `null`
 * when no banners apply, so callers can mount it unconditionally.
 *
 * No fetches, no Redux dispatches, no side effects.
 */

import { deriveOrderBanners } from "@/lib/utils/orderBanners";
import type { Order } from "@/types";

import { OrderActionBanner } from "./OrderActionBanner";

interface OrderActionBannersProps {
  order: Order;
  locale: "ar" | "en";
}

export function OrderActionBanners({ order, locale }: OrderActionBannersProps) {
  const banners = deriveOrderBanners(order, locale);

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {banners.map((b) => (
        <OrderActionBanner
          key={b.key}
          variant={b.variant}
          icon={b.icon}
          title={b.title}
          description={b.description}
        />
      ))}
    </div>
  );
}

export default OrderActionBanners;
