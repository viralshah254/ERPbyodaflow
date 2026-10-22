import { describe, expect, it } from "vitest";
import { isTopFoodOrg, TOP_FOOD_ORG_ID } from "./top-food-display";

describe("isTopFoodOrg", () => {
  it("matches the Top Food organisation id", () => {
    expect(isTopFoodOrg({ orgId: TOP_FOOD_ORG_ID })).toBe(true);
  });

  it("matches a Top Food name when the id differs", () => {
    expect(isTopFoodOrg({ orgId: "org-other", name: "Top Food Ea Ltd" })).toBe(true);
    expect(isTopFoodOrg({ name: "TopFood" })).toBe(true);
  });

  it("leaves Joy and other companies in their own case", () => {
    expect(isTopFoodOrg({ orgId: "org-sfa-6a890b7765042fb41c9d89a6", name: "Joy Superbakers ltd" })).toBe(false);
    expect(isTopFoodOrg({ orgId: "org-other", name: "Cool Catch" })).toBe(false);
    expect(isTopFoodOrg(null)).toBe(false);
  });
});
