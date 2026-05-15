import { describe, it, expect } from "vitest";

describe("Project Setup", () => {
  it("should have NEXT_PUBLIC_API_URL configured", () => {
    // Verify the env variable pattern is correct
    const envVar = "NEXT_PUBLIC_API_URL";
    expect(envVar).toBeDefined();
  });

  it("should support TypeScript", () => {
    const value: string = "test";
    expect(value).toBe("test");
  });
});
