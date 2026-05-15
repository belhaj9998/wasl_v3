/**
 * Property-Based Tests for Locale-Direction Consistency
 *
 * **Validates: Requirements 23.1, 23.2**
 *
 * Property 11: Locale-Direction Consistency
 * When locale === "ar" then direction === "rtl".
 * When locale === "en" then direction === "ltr".
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import uiReducer, {
  setLocale,
  type UIState,
} from "@/lib/store/slices/ui.slice";
import { getDirectionForLocale, type SupportedLocale } from "../config";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const localeArb: fc.Arbitrary<"ar" | "en"> = fc.constantFrom("ar", "en");

const uiStateArb: fc.Arbitrary<UIState> = fc.record({
  sidebarCollapsed: fc.boolean(),
  activeModal: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
    nil: null,
  }),
  toasts: fc.constant([]),
  locale: localeArb,
  direction: fc.constantFrom("rtl" as const, "ltr" as const),
});

// ---------------------------------------------------------------------------
// Property 11: Locale-Direction Consistency
// ---------------------------------------------------------------------------

describe("Property 11: Locale-Direction Consistency", () => {
  describe("ui.slice reducer — setLocale action", () => {
    it("when setLocale('ar') is dispatched, direction is always 'rtl'", () => {
      fc.assert(
        fc.property(uiStateArb, (initialState) => {
          const state = uiReducer(initialState, setLocale("ar"));

          expect(state.locale).toBe("ar");
          expect(state.direction).toBe("rtl");
        }),
      );
    });

    it("when setLocale('en') is dispatched, direction is always 'ltr'", () => {
      fc.assert(
        fc.property(uiStateArb, (initialState) => {
          const state = uiReducer(initialState, setLocale("en"));

          expect(state.locale).toBe("en");
          expect(state.direction).toBe("ltr");
        }),
      );
    });

    it("for any locale, setLocale produces consistent direction mapping", () => {
      fc.assert(
        fc.property(uiStateArb, localeArb, (initialState, locale) => {
          const state = uiReducer(initialState, setLocale(locale));

          const expectedDirection = locale === "ar" ? "rtl" : "ltr";
          expect(state.locale).toBe(locale);
          expect(state.direction).toBe(expectedDirection);
        }),
      );
    });
  });

  describe("getDirectionForLocale function", () => {
    it("returns 'rtl' for 'ar' locale", () => {
      fc.assert(
        fc.property(fc.constant("ar" as SupportedLocale), (locale) => {
          expect(getDirectionForLocale(locale)).toBe("rtl");
        }),
      );
    });

    it("returns 'ltr' for 'en' locale", () => {
      fc.assert(
        fc.property(fc.constant("en" as SupportedLocale), (locale) => {
          expect(getDirectionForLocale(locale)).toBe("ltr");
        }),
      );
    });

    it("for any supported locale, direction matches the locale-direction mapping", () => {
      fc.assert(
        fc.property(localeArb, (locale) => {
          const direction = getDirectionForLocale(locale);
          const expectedDirection = locale === "ar" ? "rtl" : "ltr";
          expect(direction).toBe(expectedDirection);
        }),
      );
    });
  });

  describe("reducer and utility function agreement", () => {
    it("setLocale reducer direction always matches getDirectionForLocale", () => {
      fc.assert(
        fc.property(uiStateArb, localeArb, (initialState, locale) => {
          const state = uiReducer(initialState, setLocale(locale));
          const utilDirection = getDirectionForLocale(locale);

          expect(state.direction).toBe(utilDirection);
        }),
      );
    });
  });
});
