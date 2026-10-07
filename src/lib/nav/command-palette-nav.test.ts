import { describe, expect, it } from "vitest";
import { COMMAND_NAV_FALLBACK_ITEMS } from "@/config/command-palette";
import { scoreNavItem } from "@/lib/nav/command-palette-nav";

const uomCatalog = COMMAND_NAV_FALLBACK_ITEMS.find((item) => item.href === "/settings/uom");

describe("UOM catalog command search", () => {
  it("opens the catalog for uom, unit of measure, and packaging", () => {
    expect(uomCatalog).toBeDefined();
    for (const query of ["uom", "unit of measure", "units of measure", "packaging"]) {
      const tokens = query.split(/\s+/).filter(Boolean);
      expect(scoreNavItem(uomCatalog!, tokens)).toBeGreaterThan(0);
    }
  });
});
