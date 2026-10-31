import { describe, expect, it } from "vitest";
import { canonicalPathId, encodePathId } from "./path-id";

const RAW = "org-sfa-6a890b7765042fb41c9d89a6:prd:FG-019";
const ONCE = "org-sfa-6a890b7765042fb41c9d89a6%3Aprd%3AFG-019";
const TWICE = "org-sfa-6a890b7765042fb41c9d89a6%253Aprd%253AFG-019";

describe("canonicalPathId", () => {
  it("leaves a raw colon id unchanged", () => {
    expect(canonicalPathId(RAW)).toBe(RAW);
  });

  it("unwraps one and two encodings of the colon", () => {
    expect(canonicalPathId(ONCE)).toBe(RAW);
    expect(canonicalPathId(TWICE)).toBe(RAW);
  });
});

describe("encodePathId", () => {
  it("encodes a colon exactly once, even when the input was already encoded", () => {
    expect(encodePathId(RAW)).toBe(ONCE);
    expect(encodePathId(ONCE)).toBe(ONCE);
    expect(encodePathId(TWICE)).toBe(ONCE);
  });
});
