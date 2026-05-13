import { describe, it, expect } from "vitest";
import { slugify } from "../../../utils/slugify";

describe("slugify", () => {
  describe("basic slug generation", () => {
    it("converts uppercase to lowercase", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("replaces spaces with hyphens", () => {
      expect(slugify("foo bar baz")).toBe("foo-bar-baz");
    });

    it("handles already valid slugs", () => {
      expect(slugify("valid-slug")).toBe("valid-slug");
    });

    it("preserves numbers in the output", () => {
      expect(slugify("product 123")).toBe("product-123");
    });
  });

  describe("special character removal", () => {
    it("removes special characters", () => {
      expect(slugify("hello@world!")).toBe("helloworld");
    });

    it("removes unicode and non-ASCII characters", () => {
      expect(slugify("café résumé")).toBe("caf-rsum");
    });

    it("removes punctuation marks", () => {
      expect(slugify("hello, world. how's it?")).toBe("hello-world-hows-it");
    });

    it("removes brackets and parentheses", () => {
      expect(slugify("item (new) [sale]")).toBe("item-new-sale");
    });
  });

  describe("multiple spaces/hyphens collapse", () => {
    it("collapses multiple spaces into a single hyphen", () => {
      expect(slugify("hello   world")).toBe("hello-world");
    });

    it("collapses multiple hyphens into a single hyphen", () => {
      expect(slugify("hello---world")).toBe("hello-world");
    });

    it("collapses mixed spaces and hyphens", () => {
      expect(slugify("hello - - world")).toBe("hello-world");
    });
  });

  describe("leading/trailing whitespace trimming", () => {
    it("trims leading whitespace", () => {
      expect(slugify("  hello")).toBe("hello");
    });

    it("trims trailing whitespace", () => {
      expect(slugify("hello  ")).toBe("hello");
    });

    it("trims both leading and trailing whitespace", () => {
      expect(slugify("  hello world  ")).toBe("hello-world");
    });

    it("does not produce leading or trailing hyphens", () => {
      const result = slugify("  --hello--  ");
      expect(result).not.toMatch(/^-/);
      expect(result).not.toMatch(/-$/);
      expect(result).toBe("hello");
    });
  });

  describe("empty string input", () => {
    it("returns empty string for empty input", () => {
      expect(slugify("")).toBe("");
    });

    it("returns empty string for whitespace-only input", () => {
      expect(slugify("   ")).toBe("");
    });

    it("returns empty string for special-characters-only input", () => {
      expect(slugify("@#$%^&*")).toBe("");
    });
  });
});
