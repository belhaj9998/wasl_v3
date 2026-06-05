import { Prisma } from "../../generated/prisma";

// ─── Currency Scale Configuration ───────────────────────────────────────────────

/**
 * Map of currency codes to their decimal scale (number of fractional digits).
 * LYD (Libyan Dinar) uses 3 decimal places.
 */
export const CURRENCY_SCALE: Record<string, number> = {
  LYD: 3,
};

/**
 * Returns the decimal scale for a given currency code.
 * Falls back to 2 if the currency is not in the CURRENCY_SCALE map.
 */
export function getScale(currencyCode: string): number {
  return CURRENCY_SCALE[currencyCode] ?? 2;
}

// ─── Money Utility ──────────────────────────────────────────────────────────────

/**
 * Unified monetary arithmetic module.
 * All operations use Prisma.Decimal (arbitrary precision) with HALF_UP rounding.
 * No Number(...) coercion on monetary values — eliminates IEEE-754 errors.
 */
export const Money = {
  /**
   * Rounds a Decimal value to the given scale using HALF_UP rounding.
   */
  round(value: Prisma.Decimal, scale: number): Prisma.Decimal {
    return value.toDecimalPlaces(scale, Prisma.Decimal.ROUND_HALF_UP);
  },

  /**
   * Multiplies a price by a quantity and rounds to the given scale.
   * Returns round(price * quantity, scale).
   */
  multiply(
    price: Prisma.Decimal,
    quantity: number,
    scale: number,
  ): Prisma.Decimal {
    return Money.round(price.mul(quantity), scale);
  },

  /**
   * Sums an array of Decimal values.
   * Returns the total without additional rounding (sum of rounded values stays at scale).
   */
  sum(values: Prisma.Decimal[]): Prisma.Decimal {
    return values.reduce((acc, val) => acc.add(val), new Prisma.Decimal(0));
  },

  /**
   * Subtracts b from a. Returns a - b.
   */
  subtract(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
    return a.sub(b);
  },

  /**
   * Returns the larger of two Decimal values.
   */
  max(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
    return Prisma.Decimal.max(a, b);
  },

  /**
   * Returns a Decimal representing zero.
   */
  zero(): Prisma.Decimal {
    return new Prisma.Decimal(0);
  },

  /**
   * Calculates the discount amount based on coupon type.
   *
   * - PERCENTAGE: round(subtotal * value / 100, scale), then apply cap, then ensure ≤ subtotal
   * - FIXED: min(value, subtotal) — already at scale for integer values
   *
   * Returns the discount amount as a rounded Decimal.
   */
  calculateDiscount(
    subtotal: Prisma.Decimal,
    coupon: {
      type: string;
      value: Prisma.Decimal;
      cap: Prisma.Decimal | null;
    },
    scale: number,
  ): Prisma.Decimal {
    let discount: Prisma.Decimal;

    if (coupon.type === "PERCENTAGE") {
      // Calculate percentage discount: subtotal * value / 100, rounded once
      discount = Money.round(subtotal.mul(coupon.value).div(100), scale);

      // Apply cap if present
      if (coupon.cap !== null && discount.gt(coupon.cap)) {
        discount = Money.round(coupon.cap, scale);
      }
    } else {
      // FIXED discount: use the coupon value directly
      discount = Money.round(coupon.value, scale);
    }

    // Ensure discount does not exceed subtotal
    if (discount.gt(subtotal)) {
      discount = subtotal;
    }

    return discount;
  },

  /**
   * Computes all order totals from line items, coupon, and shipping.
   *
   * Operation order: lineTotal → subtotal → discount → shipping → grandTotal
   *
   * Returns all values as rounded Prisma.Decimal at the given scale.
   */
  computeOrderTotals(
    items: { unit_price: Prisma.Decimal; quantity: number }[],
    coupon: {
      type: string;
      value: Prisma.Decimal;
      cap: Prisma.Decimal | null;
    } | null,
    shippingTotal: Prisma.Decimal,
    scale: number,
  ): {
    lineTotals: Prisma.Decimal[];
    subtotal: Prisma.Decimal;
    discountTotal: Prisma.Decimal;
    grandTotal: Prisma.Decimal;
  } {
    // 1. Calculate line totals (each rounded individually)
    const lineTotals = items.map((item) =>
      Money.multiply(item.unit_price, item.quantity, scale),
    );

    // 2. Sum line totals to get subtotal
    const subtotal = Money.sum(lineTotals);

    // 3. Calculate discount
    const discountTotal = coupon
      ? Money.calculateDiscount(subtotal, coupon, scale)
      : Money.zero();

    // 4. Calculate grand total: max(subtotal - discountTotal + shippingTotal, 0)
    //    with a single final round
    const grandTotal = Money.max(
      Money.round(subtotal.sub(discountTotal).add(shippingTotal), scale),
      Money.zero(),
    );

    return { lineTotals, subtotal, discountTotal, grandTotal };
  },
};
