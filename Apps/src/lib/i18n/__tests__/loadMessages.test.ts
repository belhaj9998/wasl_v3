import { describe, it, expect } from "vitest";
import { loadMessages } from "../config";

describe("loadMessages", () => {
  it("should load Arabic messages with English fallback", async () => {
    const messages = await loadMessages("ar");

    // Should have Arabic content
    expect(messages.errors).toBeDefined();
    expect(messages.success).toBeDefined();
    expect(messages.common).toBeDefined();
    expect(messages.nav).toBeDefined();

    // Verify Arabic content is primary
    const errors = messages.errors as Record<string, unknown>;
    expect(errors.network).toBe(
      "خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.",
    );
  });

  it("should load English messages with Arabic fallback", async () => {
    const messages = await loadMessages("en");

    // Should have English content
    expect(messages.errors).toBeDefined();
    expect(messages.success).toBeDefined();
    expect(messages.common).toBeDefined();
    expect(messages.nav).toBeDefined();

    // Verify English content is primary
    const errors = messages.errors as Record<string, unknown>;
    expect(errors.network).toBe(
      "Network error. Please check your internet connection.",
    );
  });

  it("should include all top-level sections", async () => {
    const arMessages = await loadMessages("ar");
    const enMessages = await loadMessages("en");

    const expectedSections = [
      "errors",
      "success",
      "common",
      "nav",
      "auth",
      "table",
      "store",
      "theme",
      "language",
    ];

    for (const section of expectedSections) {
      expect(arMessages[section]).toBeDefined();
      expect(enMessages[section]).toBeDefined();
    }
  });
});
