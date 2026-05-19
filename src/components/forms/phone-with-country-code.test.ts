import { describe, expect, it } from "vitest";
import {
  DEFAULT_PHONE_DIAL,
  formatPhoneNumber,
  parsePhoneNumber,
} from "./phone-with-country-code";

describe("parsePhoneNumber", () => {
  it("defaults empty to +254", () => {
    const p = parsePhoneNumber("");
    expect(p.dial).toBe(DEFAULT_PHONE_DIAL);
    expect(p.local).toBe("");
  });

  it("parses Kenya E.164", () => {
    const p = parsePhoneNumber("+254712345678");
    expect(p.dial).toBe("+254");
    expect(p.local).toBe("712345678");
  });

  it("formats dial + local", () => {
    expect(formatPhoneNumber("+254", "712 345 678")).toBe("+254712345678");
  });
});
