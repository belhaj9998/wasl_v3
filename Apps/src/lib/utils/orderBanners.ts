/**
 * Order Required-Action Banners — pure derivation utility
 *
 * Computes a list of contextual banners (unpaid, incomplete address,
 * missing phone, long-pending, terminal) for a given Order and locale.
 *
 * Pure function: no I/O, no Redux, no fetches. Deterministic for the same
 * `(order, locale, now)` triple. The optional `now` parameter is exposed
 * so tests can pin the clock.
 */

import type { Order } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export type OrderBannerVariant = "warning" | "info" | "neutral";

export type OrderBannerKey =
  | "unpaid"
  | "incomplete_address"
  | "missing_phone"
  | "long_pending"
  | "terminal_canceled"
  | "terminal_returned";

export type OrderBannerIcon =
  | "alert"
  | "map-off"
  | "phone-off"
  | "clock"
  | "ban";

export interface OrderBanner {
  key: OrderBannerKey;
  variant: OrderBannerVariant;
  title: string;
  description: string;
  icon: OrderBannerIcon;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const BANNER_PRESENTATION: Record<
  OrderBannerKey,
  { variant: OrderBannerVariant; icon: OrderBannerIcon }
> = {
  unpaid: { variant: "warning", icon: "alert" },
  incomplete_address: { variant: "warning", icon: "map-off" },
  missing_phone: { variant: "warning", icon: "phone-off" },
  long_pending: { variant: "info", icon: "clock" },
  terminal_canceled: { variant: "neutral", icon: "ban" },
  terminal_returned: { variant: "neutral", icon: "ban" },
};

const BANNER_COPY: Record<
  OrderBannerKey,
  Record<"ar" | "en", { title: string; description: string }>
> = {
  unpaid: {
    ar: {
      title: "الطلب غير مدفوع",
      description: "يجب تسجيل دفعة أو إرسال رابط الدفع للعميل قبل المتابعة",
    },
    en: {
      title: "Order is unpaid",
      description:
        "Record a payment or send a payment link to the customer before proceeding",
    },
  },
  incomplete_address: {
    ar: {
      title: "عنوان الشحن غير مكتمل",
      description: "يرجى إضافة العنوان الكامل قبل التحويل لحالة الشحن",
    },
    en: {
      title: "Shipping address is incomplete",
      description:
        "Please add a complete address before transitioning to shipping",
    },
  },
  missing_phone: {
    ar: {
      title: "لا يوجد رقم هاتف للعميل",
      description: "لن تتمكن من التواصل مع العميل بسهولة. أضف رقماً للسجل",
    },
    en: {
      title: "No customer phone",
      description:
        "You won't be able to contact the customer easily. Add a phone number to the record",
    },
  },
  long_pending: {
    ar: {
      title: "الطلب في قائمة الانتظار منذ أكثر من 24 ساعة",
      description: "راجع الطلب وأكده أو ألغِه",
    },
    en: {
      title: "Order has been pending for over 24 hours",
      description: "Review and either confirm or cancel the order",
    },
  },
  terminal_canceled: {
    ar: {
      title: "تم إلغاء الطلب",
      description: "هذا الطلب في حالة نهائية ولا يمكن تغيير حالته",
    },
    en: {
      title: "Order canceled",
      description:
        "This order is in a terminal state and cannot be transitioned",
    },
  },
  terminal_returned: {
    ar: {
      title: "تم إرجاع الطلب",
      description: "هذا الطلب في حالة نهائية ولا يمكن تغيير حالته",
    },
    en: {
      title: "Order returned",
      description:
        "This order is in a terminal state and cannot be transitioned",
    },
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeBanner(key: OrderBannerKey, locale: "ar" | "en"): OrderBanner {
  const presentation = BANNER_PRESENTATION[key];
  const copy = BANNER_COPY[key][locale];
  return {
    key,
    variant: presentation.variant,
    icon: presentation.icon,
    title: copy.title,
    description: copy.description,
  };
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

// ─── Deriver ────────────────────────────────────────────────────────────────

/**
 * Derive the list of banners to show for the given order.
 *
 * - Terminal status (`CANCELED`, `RETURNED`) short-circuits to a singleton list.
 * - Otherwise, banners are pushed in stable order:
 *   `unpaid` → `incomplete_address` → `missing_phone` → `long_pending`.
 *
 * @param order  The order object (already loaded by the page).
 * @param locale The active UI locale.
 * @param now    Wall-clock timestamp for "long-pending" check (defaults to `Date.now()`).
 */
export function deriveOrderBanners(
  order: Order,
  locale: "ar" | "en",
  now: number = Date.now(),
): OrderBanner[] {
  // Terminal short-circuit: only the terminal banner is returned.
  if (order.status === "CANCELED") {
    return [makeBanner("terminal_canceled", locale)];
  }
  if (order.status === "RETURNED") {
    return [makeBanner("terminal_returned", locale)];
  }

  const banners: OrderBanner[] = [];

  // Unpaid (warning)
  if (order.payment_status === "UNPAID") {
    banners.push(makeBanner("unpaid", locale));
  }

  // Incomplete shipping address (warning)
  if (order.shipping_address) {
    const addr = order.shipping_address;
    if (
      isBlank(addr.street_line_1) ||
      isBlank(addr.city) ||
      isBlank(addr.full_name)
    ) {
      banners.push(makeBanner("incomplete_address", locale));
    }
  }

  // Missing customer phone (warning)
  if (isBlank(order.customer_phone)) {
    banners.push(makeBanner("missing_phone", locale));
  }

  // Long-pending PENDING order (info). Guarded against Invalid Date.
  if (order.status === "PENDING") {
    const placedAt = new Date(order.created_at).getTime();
    if (Number.isFinite(placedAt) && now - placedAt > ONE_DAY_MS) {
      banners.push(makeBanner("long_pending", locale));
    }
  }

  return banners;
}
