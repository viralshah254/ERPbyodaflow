import { describe, expect, it } from "vitest";
import { storeDisplayName } from "./store-label";

describe("store display name", () => {
  it("uses a known store name ahead of an internal id", () => {
    expect(storeDisplayName("org-top-food-ea-ltd:wh:PKG", undefined, { "org-top-food-ea-ltd:wh:PKG": "PKG — Packaging Materials Store" })).toBe("PKG — Packaging Materials Store");
  });

  it("shows the store code when only an internal id is available", () => {
    expect(storeDisplayName("org-top-food-ea-ltd:wh:PKG")).toBe("PKG");
  });
});
