import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DOC_TYPES } from "@/config/documents";
import { MANUFACTURING_REPORT_IDS } from "@/lib/api/manufacturing-reports";
import { OPERATIONAL_REPORT_IDS } from "@/lib/api/operational-reports";
import { ERP_SCREEN_ROUTES, matchScreenRoute, resolveScreenGuide } from "./screen-guides";
function pages(dir: string): string[] { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? pages(path.join(dir,e.name)) : e.name === "page.tsx" ? [path.join(dir,e.name)] : []); }
const sample = (route: string) => route.replace("[type]", "sales-order").replace("[reportId]", "bom-explosion").replaceAll(/\[[^\]]+\]/g, "sample-record");
describe("ERP screen guide coverage", () => {
  it("requires explicit catalog coverage for every ERP route file", () => {
    const base = path.resolve("src/app/(dashboard)");
    const routes = pages(base).map(file => "/" + path.relative(base,path.dirname(file)).replaceAll(path.sep,"/")).filter(route => !route.startsWith("/dev"));
    expect([...ERP_SCREEN_ROUTES].sort()).toEqual(routes.sort());
  });
  it.each(ERP_SCREEN_ROUTES)("has specific content for %s", route => {
    const guide = resolveScreenGuide(sample(route));
    expect(guide, route).not.toBeNull();
    expect(guide!.route).toBe(route);
    expect(guide!.title).not.toMatch(/\[(id|type|reportId)\]|not found|loading|could not load/i);
    expect(guide!.summary.length, route).toBeGreaterThan(15);
    expect(guide!.tasks.length, route).toBeGreaterThan(1);
    expect(guide!.tasks.every(task => task.trim().length > 10)).toBe(true);
  });
  it.each(DOC_TYPES)("distinguishes %s list, creation, record and edit", type => {
    const paths = [`/docs/${type}`, `/docs/${type}/new`, `/docs/${type}/sample-record`, `/docs/${type}/sample-record/edit`];
    const guides = paths.map(resolveScreenGuide);
    expect(guides.every(Boolean)).toBe(true);
    expect(new Set(guides.map(guide => guide!.identity)).size).toBe(4);
    expect(guides.map(guide => guide!.kind)).toEqual(["workspace", "create", "record", "edit"]);
    expect(guides[1]!.tasks.join(" ")).not.toContain("Search by document number");
  });
  it.each([...MANUFACTURING_REPORT_IDS.map(id=>`/reports/manufacturing/${id}`), ...OPERATIONAL_REPORT_IDS.map(id=>`/reports/operations/${id}`)])("identifies report %s", route => {
    const guide = resolveScreenGuide(route)!;
    expect(guide.kind).toBe("report");
    expect(guide.identity).toBe(route);
    expect(guide.tasks.join(" ")).toMatch(/report|result|filter/i);
  });
  it("keeps concrete routes ahead of wildcard records", () => {
    expect(matchScreenRoute("/manufacturing/boms/new")?.route).toBe("/manufacturing/boms/new");
    expect(matchScreenRoute("/master/products/p1/pricing")?.route).toBe("/master/products/[id]/pricing");
    expect(resolveScreenGuide("/docs/not-a-document")).toBeNull();
    expect(resolveScreenGuide("/not-an-erp-route")).toBeNull();
  });
});

describe("production terminology", () => {
  it("keeps plant and bakery production wording separate", async () => {
    const { localizeScreenGuide } = await import("./screen-guides");
    const guide = resolveScreenGuide("/manufacturing/work-orders/wo-1")!;
    const plant = localizeScreenGuide(guide, { bom: "Blend formula", workOrder: "Production run" });
    const bakery = localizeScreenGuide(guide, { bom: "Recipe", workOrder: "Production batch" });
    expect(plant.summary).toContain("Blend formula");
    expect(bakery.summary).toContain("Recipe");
    expect(plant.identity).toBe(bakery.identity);
    expect(plant.summary).not.toContain("Recipe");
  });
});
