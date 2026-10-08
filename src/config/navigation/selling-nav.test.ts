import { describe, expect, it } from "vitest";
import type { ModuleKey } from "@/config/industryTemplates/types";
import { buildVisibleNav } from "./index";

const enabledModules: ModuleKey[] = [
  "dashboard",
  "masters",
  "inventory",
  "sales",
  "purchasing",
  "pricing",
  "manufacturing",
  "distribution",
];

function hrefs(templateId: string): string[] {
  const sections = buildVisibleNav({
    orgType: "MANUFACTURER",
    enabledModules,
    featureFlags: {},
    defaultNav: ["masters", "inventory", "warehouse", "pricing"],
    terminology: {},
    user: null,
    permissions: ["*"],
    templateId,
  });
  return sections.flatMap((section) =>
    section.items.flatMap((item) => [item.href, ...(item.children?.map((child) => child.href) ?? [])])
  ).filter((href): href is string => Boolean(href));
}

const SELLING = ["/master/departments", "/master/products", "/warehouse/dispatch", "/pricing/workspace/tax-tags"];

describe("FMCG selling nav", () => {
  it("gives a bakery the same selling links as an FMCG manufacturer", () => {
    const manufacturer = hrefs("fmcg-manufacturer");
    const bakery = hrefs("fmcg-bakery");
    const legacyBakex = hrefs("bakex");
    for (const href of SELLING) {
      expect(manufacturer).toContain(href);
      expect(bakery).toContain(href);
      expect(legacyBakex).toContain(href);
    }
    expect(bakery).not.toContain("/inventory/products");
    expect(manufacturer).not.toContain("/inventory/products");
    expect(manufacturer).toContain("/sales/customer-approvals");
    expect(bakery).toContain("/sales/customer-approvals");
    expect(legacyBakex).toContain("/sales/customer-approvals");
    expect(manufacturer).toContain("/sales/odaflow-customer-matching");
    expect(bakery).toContain("/sales/odaflow-customer-matching");
    expect(legacyBakex).toContain("/sales/odaflow-customer-matching");
    expect(manufacturer).toContain("/sales/odaflow-product-matching");
    expect(bakery).toContain("/sales/odaflow-product-matching");
    expect(legacyBakex).toContain("/sales/odaflow-product-matching");
  });
});
