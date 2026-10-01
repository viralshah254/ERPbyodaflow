import { describe, expect, it } from "vitest";
import { filterConflictingProductMappings, isSameOdaflowPackSize } from "./odaflow-mapping-utils";

describe("odaflow pack size matching", () => {
  it("does not warn when the same size is written differently", () => {
    const groups = [
      ["60G", "60 GM", "60GM", "60gms"],
      ["100GM", "100G", "100 GM"],
      ["50GM", "50 G"],
      ["200 GM", "200G"],
      ["1KG", "1 kg"],
      ["50ML", "50 ML"],
    ];
    for (const group of groups) {
      const conflicts = filterConflictingProductMappings(
        "incoming-line",
        group[0],
        undefined,
        group.slice(1).map((size, index) => ({
          externalId: `saved-${index}`,
          odaflowPackSize: size,
        }))
      );
      expect(conflicts, group.join(" / ")).toHaveLength(0);
      expect(isSameOdaflowPackSize(group[0], group[1])).toBe(true);
    }
  });

  it("still warns when the weights are actually different", () => {
    const conflicts = filterConflictingProductMappings("incoming-line", "60G", undefined, [
      { externalId: "saved-120", odaflowPackSize: "120GM" },
    ]);
    expect(conflicts).toHaveLength(1);
  });
});
