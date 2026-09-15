import { describe, expect, it } from "vitest";
import { navHrefMatchesPath, navTreeContainsPath } from "./nav-active-path";

describe("navHrefMatchesPath", () => {
  it("matches exact and nested paths only", () => {
    expect(navHrefMatchesPath("/warehouse/bin-locations", "/warehouse/bin-locations")).toBe(true);
    expect(navHrefMatchesPath("/warehouse/bin-locations", "/warehouse/bin-locations/new")).toBe(true);
    expect(navHrefMatchesPath("/warehouse/overview", "/warehouse/bin-locations")).toBe(false);
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
