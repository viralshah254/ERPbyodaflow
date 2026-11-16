import { describe, expect, it } from "vitest";
import { displayMrpReason, productionTerms, productionVoice, setupTaskPresentation } from "./production-language";

describe("production language", () => {
  it("keeps a spice plant on blend formulas and a bakery on recipes", () => {
    expect(productionVoice("fmcg-manufacturer")).toBe("plant");
    expect(productionVoice("bakex")).toBe("bakery");
    expect(productionTerms("fmcg-manufacturer").formulasTitle).toBe("Blend formulas");
    expect(productionTerms("fmcg-bakery").formulasTitle).toBe("Recipes");
    expect(productionTerms("fmcg-manufacturer").flow).toBe("Blend formula to finished goods");
    expect(productionTerms("seafood-distributor").formula).toBe("recipe");
  });

  it("explains a purchase suggestion when the item has no formula", () => {
    const legacy = "Direct and dependent demand exceeds usable stock; purchase this component.";
    expect(displayMrpReason(legacy, "fmcg-manufacturer")).toContain("blend formula");
    expect(displayMrpReason(legacy, "fmcg-bakery")).toContain("recipe");
    expect(displayMrpReason("Prepare stores before release.", "fmcg-manufacturer")).toBe("Prepare stores before release.");
  });

  it("names the setup check for blend formulas on a plant", () => {
    const plant = setupTaskPresentation("recipes", "Reviewed production recipes", "2 effective reviewed recipes; 1 active recipes need independent release.", "Review recipes", "fmcg-manufacturer");
    expect(plant.title).toBe("Reviewed blend formulas");
    expect(plant.detail).toContain("1 active blend formula needs");
    expect(plant.detail).not.toMatch(/\brecipes\b/i);
    expect(plant.action).toBe("Review blend formulas");
    const bakery = setupTaskPresentation("recipes", "Reviewed production recipes", "1 effective reviewed recipes.", "Review recipes", "fmcg-bakery");
    expect(bakery.title).toBe("Reviewed production recipes");
  });
});
