import { describe, expect, it } from "vitest";
import { navHrefIsCurrent, navHrefMatchesPath, navTreeContainsPath } from "./nav-active-path";

describe("navHrefMatchesPath", () => {
  it("matches exact and nested paths only", () => {
    expect(navHrefMatchesPath("/warehouse/bin-locations", "/warehouse/bin-locations")).toBe(true);
    expect(navHrefMatchesPath("/warehouse/bin-locations", "/warehouse/bin-locations/new")).toBe(true);
    expect(navHrefMatchesPath("/warehouse/overview", "/warehouse/bin-locations")).toBe(false);
  });
});

describe("navHrefIsCurrent", () => {
  const hubChildren = ["/documents/hub", "/documents/hub/groups", "/documents/hub/rules"];

  it("highlights only the open child when a sibling owns a longer path", () => {
    expect(navHrefIsCurrent("/documents/hub", "/documents/hub/rules", hubChildren)).toBe(false);
    expect(navHrefIsCurrent("/documents/hub/groups", "/documents/hub/rules", hubChildren)).toBe(false);
    expect(navHrefIsCurrent("/documents/hub/rules", "/documents/hub/rules", hubChildren)).toBe(true);
  });

  it("highlights the child that shares the parent path when that page is open", () => {
    expect(navHrefIsCurrent("/documents/hub", "/documents/hub", hubChildren)).toBe(true);
    expect(navHrefIsCurrent("/documents/hub/rules", "/documents/hub", hubChildren)).toBe(false);
  });

  it("keeps a list item current on its detail route", () => {
    expect(navHrefIsCurrent("/sales/orders", "/sales/orders/so-1", ["/sales/orders", "/sales/quotes"])).toBe(true);
  });
});

describe("navTreeContainsPath", () => {
  const warehouse = [
    { href: "/warehouse/overview" },
    { href: "/warehouse/bin-locations" },
    { href: "/warehouse/pick-pack" },
  ];

  it("finds the current page in a section", () => {
    expect(navTreeContainsPath(warehouse, "/warehouse/bin-locations")).toBe(true);
    expect(navTreeContainsPath(warehouse, "/sales/orders")).toBe(false);
  });
});
