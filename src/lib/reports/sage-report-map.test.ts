import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SAGE_REPORT_MAP } from "./sage-report-map";
describe("Sage menu coverage", () => {
  it("records all 82 visible report entries and four unexpanded contact submenus without duplicate IDs", () => {
    expect(SAGE_REPORT_MAP.filter((entry) => entry.kind === "report")).toHaveLength(82);
    expect(SAGE_REPORT_MAP.filter((entry) => entry.kind === "submenu")).toHaveLength(4);
    expect(new Set(SAGE_REPORT_MAP.map((entry) => entry.id)).size).toBe(SAGE_REPORT_MAP.length);
  });
  it("never links a missing page or exposes a runnable action for a planned report", () => {
    for (const entry of SAGE_REPORT_MAP) {
      if (!entry.href) { expect(["planned", "definition"]).toContain(entry.status); continue; }
      const route = entry.href.startsWith("/reports/operations/") ? "reports/operations/[reportId]" : entry.status === "new-report" ? "reports/manufacturing/[reportId]" : entry.href.slice(1);
      expect(existsSync(join(process.cwd(), "src/app/(dashboard)", route, "page.tsx")), entry.href).toBe(true);
    }
  });
  it("keeps WIP values behind finance access and links implemented report contracts", () => {
    const reports = SAGE_REPORT_MAP.filter((entry) => entry.status === "new-report");
    expect(new Set(reports.map((entry) => entry.href)).size).toBe(21);
    expect(reports.find((entry) => entry.name === "Work in Progress")?.additionalPermissions).toContain("finance.read");
  });
});
