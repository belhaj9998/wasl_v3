import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime } from "./formatDate";

describe("formatDate", () => {
  it("formats an ISO date string with default format", () => {
    expect(formatDate("2024-03-15T10:30:00Z")).toBe("2024-03-15");
  });

  it("formats with a custom format string", () => {
    expect(formatDate("2024-03-15T10:30:00Z", "dd/MM/yyyy")).toBe("15/03/2024");
  });

  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(formatDate(undefined)).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("");
  });

  it("formats a Date object", () => {
    const date = new Date(2024, 0, 1); // Jan 1, 2024
    expect(formatDate(date)).toBe("2024-01-01");
  });
});

describe("formatDateTime", () => {
  it("formats date with time", () => {
    expect(formatDateTime("2024-03-15T14:30:00Z")).toMatch(
      /2024-03-15 \d{2}:\d{2}/,
    );
  });

  it("returns empty string for null", () => {
    expect(formatDateTime(null)).toBe("");
  });
});
