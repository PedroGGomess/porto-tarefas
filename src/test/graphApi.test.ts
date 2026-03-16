import { describe, it, expect } from "vitest";
import { parseUTC } from "@/lib/graphApi";

describe("parseUTC", () => {
  it("parses a datetime string without Z suffix as UTC", () => {
    const result = parseUTC("2024-03-15T10:00:00");
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe("2024-03-15T10:00:00.000Z");
  });

  it("parses a datetime string with Z suffix as UTC", () => {
    const result = parseUTC("2024-03-15T10:00:00Z");
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe("2024-03-15T10:00:00.000Z");
  });

  it("parses a datetime string with a timezone offset as-is", () => {
    const result = parseUTC("2024-03-15T10:00:00+01:00");
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe("2024-03-15T09:00:00.000Z");
  });

  it("returns a valid Date object", () => {
    const result = parseUTC("2024-06-01T08:30:00");
    expect(isNaN(result.getTime())).toBe(false);
  });
});
