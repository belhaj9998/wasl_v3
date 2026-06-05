/**
 * Order Tag Colors
 *
 * Maps each `OrderTagColorPreset` identifier to the Tailwind classes used by
 * `TagChip` (the chip wrapper) and the color picker swatch. Every class string
 * is a complete literal (no template strings, no string interpolation) so the
 * Tailwind JIT scanner can detect every variant at build time.
 */

import type { OrderTagColorPreset } from "@/types/orderTag.types";

export interface OrderTagColorClasses {
  /** Applied to a tag chip wrapper (background + text + ring). */
  chip: string;
  /** Applied to the small color circle inside the picker / form. */
  swatch: string;
}

export const ORDER_TAG_COLORS: Record<
  OrderTagColorPreset,
  OrderTagColorClasses
> = {
  slate: {
    chip: "bg-slate-100 text-slate-700 ring-slate-200",
    swatch: "bg-slate-500",
  },
  gray: {
    chip: "bg-gray-100 text-gray-700 ring-gray-200",
    swatch: "bg-gray-500",
  },
  red: {
    chip: "bg-red-100 text-red-700 ring-red-200",
    swatch: "bg-red-500",
  },
  orange: {
    chip: "bg-orange-100 text-orange-700 ring-orange-200",
    swatch: "bg-orange-500",
  },
  amber: {
    chip: "bg-amber-100 text-amber-800 ring-amber-200",
    swatch: "bg-amber-500",
  },
  yellow: {
    chip: "bg-yellow-100 text-yellow-800 ring-yellow-200",
    swatch: "bg-yellow-500",
  },
  green: {
    chip: "bg-green-100 text-green-700 ring-green-200",
    swatch: "bg-green-500",
  },
  emerald: {
    chip: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    swatch: "bg-emerald-500",
  },
  teal: {
    chip: "bg-teal-100 text-teal-700 ring-teal-200",
    swatch: "bg-teal-500",
  },
  sky: {
    chip: "bg-sky-100 text-sky-700 ring-sky-200",
    swatch: "bg-sky-500",
  },
  blue: {
    chip: "bg-blue-100 text-blue-700 ring-blue-200",
    swatch: "bg-blue-500",
  },
  indigo: {
    chip: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    swatch: "bg-indigo-500",
  },
  purple: {
    chip: "bg-purple-100 text-purple-700 ring-purple-200",
    swatch: "bg-purple-500",
  },
  pink: {
    chip: "bg-pink-100 text-pink-700 ring-pink-200",
    swatch: "bg-pink-500",
  },
};

/**
 * Ordered list of all 14 color presets, used by the color picker UI to
 * render swatches in a consistent order across light/dark and locales.
 */
export const ORDER_TAG_COLOR_PRESETS: OrderTagColorPreset[] = [
  "slate",
  "gray",
  "red",
  "orange",
  "amber",
  "yellow",
  "green",
  "emerald",
  "teal",
  "sky",
  "blue",
  "indigo",
  "purple",
  "pink",
];
