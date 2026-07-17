import { describe, expect, it } from "vitest";
import { normalizeKenyaPhone, normalizeKenyaPhoneOptional } from "./phone";

describe("normalizeKenyaPhone", () => {
  it("converts 07… to 2547…", () => {
    expect(normalizeKenyaPhone("0712345678")).toBe("254712345678");
    expect(normalizeKenyaPhone("07 1234 5678")).toBe("254712345678");
  });

  it("converts 01… / 011… to 2541…", () => {
    expect(normalizeKenyaPhone("0112345678")).toBe("254112345678");
    expect(normalizeKenyaPhone("0202329801")).toBe("254202329801");
  });

  it("prefixes bare 7… / 1… with 254", () => {
    expect(normalizeKenyaPhone("712345678")).toBe("254712345678");
    expect(normalizeKenyaPhone("112345678")).toBe("254112345678");
  });

  it("keeps / strips + from existing 254", () => {
    expect(normalizeKenyaPhone("+254712345678")).toBe("254712345678");
    expect(normalizeKenyaPhone("254712345678")).toBe("254712345678");
  });

  it("fixes 2540… double-zero forms", () => {
    expect(normalizeKenyaPhone("+2540712345678")).toBe("254712345678");
  });

  it("returns empty for blank input", () => {
    expect(normalizeKenyaPhone("")).toBe("");
    expect(normalizeKenyaPhoneOptional("  ")).toBeUndefined();
    expect(normalizeKenyaPhoneOptional("0712345678")).toBe("254712345678");
  });
});
