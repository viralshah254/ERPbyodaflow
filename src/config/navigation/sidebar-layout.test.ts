import { describe, expect, it } from "vitest";
import type { ResolvedNavItem, ResolvedNavSection } from "./index";
import { applySidebarLayout } from "./sidebar-layout";

const item = (key: string): ResolvedNavItem => ({ id: key, key, label: key, icon: "Receipt", href: `/${key}` });

const finance = (keys: string[]): ResolvedNavSection => ({
  id: "finance",
  key: "finance",
  label: "Finance",
  tier: "primary",
  items: keys.map(item),
});

const pins = { dashboardEnabled: false, manufacturingEnabled: false };
const keysOf = (sections: ResolvedNavSection[]) => sections[0]!.items.map((entry) => entry.key);

describe("finance payment links", () => {
  it("sit together even when a saved layout predates General Payments", () => {
    const sections = [finance(["gl", "ar-statements", "ap-bills", "ap-payments", "ap-general-payments", "three-way", "ar-payments"])];
    const saved = { topLevelItemOrder: { finance: ["gl", "ar-payments", "ar-statements", "ap-bills", "ap-payments", "three-way"] } };
    expect(keysOf(applySidebarLayout(sections, saved, pins))).toEqual([
      "gl",
      "ar-statements",
      "ap-bills",
      "ar-payments",
      "ap-payments",
      "ap-general-payments",
      "three-way",
    ]);
  });

  it("keeps the default order when there is no saved layout", () => {
    const sections = [finance(["ap-bills", "ar-payments", "ap-payments", "ap-general-payments", "three-way"])];
    expect(keysOf(applySidebarLayout(sections, null, pins))).toEqual(["ap-bills", "ar-payments", "ap-payments", "ap-general-payments", "three-way"]);
  });

  it("falls back to where the group already was when AP Bills is hidden", () => {
    const sections = [finance(["gl", "ap-general-payments", "x", "ar-payments", "ap-payments"])];
    expect(keysOf(applySidebarLayout(sections, null, pins))).toEqual(["gl", "ar-payments", "ap-payments", "ap-general-payments", "x"]);
  });
});
