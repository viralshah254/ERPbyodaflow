import { describe, expect, it, vi, afterEach } from "vitest";
import { formatDocumentCreatedLabel, formatNairobiRelativeTime } from "./nairobi-datetime";

describe("formatNairobiRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns relative minutes for recent times", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T09:05:00.000Z"));
    expect(formatNairobiRelativeTime("2026-04-23T09:03:00.000Z")).toBe("2 minutes ago");
  });

  it("returns Yesterday with clock for previous calendar day in Nairobi", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T05:00:00.000Z"));
    const result = formatNairobiRelativeTime("2026-04-22T05:00:00.000Z");
    expect(result.startsWith("Yesterday,")).toBe(true);
  });

  it("returns ordinal date for older times", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T10:00:00.000Z"));
    const result = formatNairobiRelativeTime("2026-04-23T05:00:00.000Z");
    expect(result).toMatch(/23rd April/);
  });

  it("prefers createdAt over date-only fallback", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-23T09:05:00.000Z"));
    expect(formatDocumentCreatedLabel("2026-04-23T09:03:00.000Z", "2026-04-23")).toBe("2 minutes ago");
  });

  it("formats date-only fallback without time", () => {
    expect(formatDocumentCreatedLabel(undefined, "2026-07-30")).toBe("30th July");
  });
});
