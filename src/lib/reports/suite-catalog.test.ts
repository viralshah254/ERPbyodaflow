import { describe, it, expect } from "vitest";
import { SUITE_CARDS, REPORT_SUITE_CATALOG } from "./suite-catalog";
import { OPERATIONAL_REPORT_IDS } from "@/lib/api/operational-reports";
describe("shared reporting suite catalogue", () => {
  it("links every dedicated addition to an implemented API contract", () => {
    for (const card of SUITE_CARDS) expect(OPERATIONAL_REPORT_IDS).toContain(card.id);
    expect(new Set(REPORT_SUITE_CATALOG.map((e) => e.id)).size).toBe(REPORT_SUITE_CATALOG.length);
    expect(REPORT_SUITE_CATALOG.find((entry) => entry.href === "/ap/statements")).toMatchObject({ permission: "finance.ap.read" });
  });
  it("requires finance for cost reports and keeps unapproved commissions unavailable", () => {
    expect(SUITE_CARDS.find((card) => card.id === "production-output")?.permissions).toContain("finance.read");
    expect(SUITE_CARDS.find((card) => card.id === "stock-valuation")?.permissions).toContain("finance.read");
    expect(REPORT_SUITE_CATALOG.find((entry) => entry.name === "Rep Commissions")?.href).toBeUndefined();
  });
});
