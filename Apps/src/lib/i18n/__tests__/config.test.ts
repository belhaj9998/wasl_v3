import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getDirectionForLocale,
  getPersistedLocale,
  persistLocale,
  updateDocumentDirection,
} from "../config";

describe("i18n config", () => {
  describe("constants", () => {
    it("should have ar as default locale", () => {
      expect(DEFAULT_LOCALE).toBe("ar");
    });

    it("should support ar and en locales", () => {
      expect(SUPPORTED_LOCALES).toContain("ar");
      expect(SUPPORTED_LOCALES).toContain("en");
      expect(SUPPORTED_LOCALES).toHaveLength(2);
    });
  });

  describe("getDirectionForLocale", () => {
    it("should return rtl for ar", () => {
      expect(getDirectionForLocale("ar")).toBe("rtl");
    });

    it("should return ltr for en", () => {
      expect(getDirectionForLocale("en")).toBe("ltr");
    });
  });

  describe("getPersistedLocale", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should return default locale when nothing is stored", () => {
      expect(getPersistedLocale()).toBe("ar");
    });

    it("should return stored locale when valid", () => {
      localStorage.setItem("wasl-language", "en");
      expect(getPersistedLocale()).toBe("en");
    });

    it("should return default locale when stored value is invalid", () => {
      localStorage.setItem("wasl-language", "fr");
      expect(getPersistedLocale()).toBe("ar");
    });
  });

  describe("persistLocale", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("should store locale in localStorage", () => {
      persistLocale("en");
      expect(localStorage.getItem("wasl-language")).toBe("en");
    });

    it("should overwrite previous locale", () => {
      persistLocale("en");
      persistLocale("ar");
      expect(localStorage.getItem("wasl-language")).toBe("ar");
    });
  });

  describe("updateDocumentDirection", () => {
    it("should set dir to rtl for ar", () => {
      updateDocumentDirection("ar");
      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      expect(document.documentElement.getAttribute("lang")).toBe("ar");
    });

    it("should set dir to ltr for en", () => {
      updateDocumentDirection("en");
      expect(document.documentElement.getAttribute("dir")).toBe("ltr");
      expect(document.documentElement.getAttribute("lang")).toBe("en");
    });
  });
});
