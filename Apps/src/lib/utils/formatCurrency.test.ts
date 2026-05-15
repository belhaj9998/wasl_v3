import { describe, it, expect } from "vitest";
import { formatCurrency } from "./formatCurrency";

describe("formatCurrency", () => {
  it("formats a number as Libyan Dinar", () => {
    expect(formatCurrency(25)).toBe("25.00 د.ل");
  });

  it("formats a string amount", () => {
    expect(formatCurrency("99.5")).toBe("99.50 د.ل");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("0.00 د.ل");
  });

  it("handles large numbers", () => {
    expect(formatCurrency(1234567.89)).toBe("1234567.89 د.ل");
  });

  it("returns 0.00 for NaN input", () => {
    expect(formatCurrency("invalid")).toBe("0.00 د.ل");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(10.999)).toBe("11.00 د.ل");
  });
});
