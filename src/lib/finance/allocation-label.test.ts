import { describe, expect, it } from "vitest";
import { allocationLabel, allocationSummary } from "./allocation-label";

describe("allocationLabel", () => {
  it("uses the document number", () => {
    expect(allocationLabel({ documentId: "abc", documentNumber: "INV-0042" })).toBe("INV-0042");
  });

  it("reads opening balances as words", () => {
    const id = "opening:38bb25b4-4abb-4a94-8552-e9287aee6aa0:IN104577";
    expect(allocationLabel({ documentId: id, documentNumber: id })).toBe("Opening balance IN104577");
    expect(allocationLabel({ documentId: "opening:38bb25b4-4abb-4a94-8552-e9287aee6aa0:OB-C001" })).toBe("Opening balance");
  });

  it("never shows a bare id", () => {
    const id = "38bb25b4-4abb-4a94-8552-e9287aee6aa0";
    expect(allocationLabel({ documentId: id, documentNumber: id })).toBe("Document");
  });
});

describe("allocationSummary", () => {
  it("shows two and counts the rest", () => {
    const lines = ["A", "B", "C", "D"].map((n) => ({ documentId: n.toLowerCase(), documentNumber: `INV-${n}` }));
    expect(allocationSummary(lines)).toEqual({ text: "INV-A, INV-B +2 more", full: "INV-A, INV-B, INV-C, INV-D" });
    expect(allocationSummary([]).text).toBe("—");
  });
});
