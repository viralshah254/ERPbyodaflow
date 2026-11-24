import { describe, expect, it } from "vitest";
import { formatLockDuration, parseLockIdleParts, splitLockIdle, typedLockIdlePart } from "./screen-lock";

describe("lock idle duration", () => {
  it("splits a saved total into hours and minutes", () => {
    expect(splitLockIdle(20)).toEqual({ hours: 0, minutes: 20 });
    expect(splitLockIdle(90)).toEqual({ hours: 1, minutes: 30 });
    expect(splitLockIdle(105)).toEqual({ hours: 1, minutes: 45 });
    expect(splitLockIdle(24 * 60)).toEqual({ hours: 24, minutes: 0 });
  });

  it("describes the wait in hours and minutes", () => {
    expect(formatLockDuration(45)).toBe("45 minutes");
    expect(formatLockDuration(60)).toBe("1 hour");
    expect(formatLockDuration(90)).toBe("1 hour 30 minutes");
    expect(formatLockDuration(105)).toBe("1 hour 45 minutes");
    expect(formatLockDuration(24 * 60)).toBe("24 hours");
  });

  it("accepts hours and minutes without a total-minute calculation", () => {
    expect(parseLockIdleParts("1", "30")).toEqual({ minutes: 90 });
    expect(parseLockIdleParts("1", "45")).toEqual({ minutes: 105 });
    expect(parseLockIdleParts("0", "45")).toEqual({ minutes: 45 });
    expect(parseLockIdleParts("", "45")).toEqual({ minutes: 45 });
    expect(parseLockIdleParts("1", "")).toEqual({ minutes: 60 });
    expect(parseLockIdleParts("24", "0")).toEqual({ minutes: 1440 });
    expect(parseLockIdleParts("", "")).toEqual({ error: "Use at least 1 minute." });
    const overDay = parseLockIdleParts("24", "1");
    expect("error" in overDay && overDay.error).toBe("The longest wait is 24 hours.");
  });

  it("treats a typed zero as empty so the placeholder can show", () => {
    expect(typedLockIdlePart("0")).toBe("");
    expect(typedLockIdlePart("01")).toBe("1");
    expect(typedLockIdlePart("10")).toBe("10");
  });
});
