import { describe, expect, it } from "vitest";

import { getTourForRoute } from "./tutorial-tours";
import { ITEM_GUIDES } from "./tutorial-guides";
import { TUTORIAL_CHAPTERS } from "./tutorial";
import { SETTINGS_HUB_GROUPS } from "@/lib/settings/settings-hub-links";

describe("cross-workflow tutorial coverage", () => {
  it.each([
    ["/settings/users-roles", "settings-users-roles-tour"],
    ["/settings/approval-policy", "settings-approval-policy-tour"],
    ["/inventory/receipts/grn-1", "inventory-receipts-tour"],
    ["/manufacturing/work-orders/wo-1", "manufacturing-work-orders-tour"],
    ["/warehouse/pick-pack/task-1", "warehouse-pick-pack-tour"],
    ["/finance/bank-recon", "finance-bank-recon-tour"],
    ["/finance/period-close", "finance-period-close-tour"],
    ["/automation/rules", "automation-rules-tour"],
  ])("maps %s to %s", (route, tourId) => {
    expect(getTourForRoute(route)?.tourId).toBe(tourId);
  });

  it("keeps guide hints aligned with instrumented workflow selectors", () => {
    const selectors = [
      ...(ITEM_GUIDES["settings-users-roles"]?.elementHints ?? []),
      ...(ITEM_GUIDES["settings-approval-policy"]?.elementHints ?? []),
      ...(ITEM_GUIDES["approvals-inbox"]?.elementHints ?? []),
      ...(ITEM_GUIDES["inventory-receipts"]?.elementHints ?? []),
      ...(ITEM_GUIDES["manufacturing-work-orders"]?.elementHints ?? []),
      ...(ITEM_GUIDES["warehouse-pick-pack"]?.elementHints ?? []),
      ...(ITEM_GUIDES["finance-bank-recon"]?.elementHints ?? []),
      ...(ITEM_GUIDES["finance-period-close"]?.elementHints ?? []),
      ...(ITEM_GUIDES["automation-rules"]?.elementHints ?? []),
    ].map((hint) => hint.selector);

    expect(selectors).toContain("[data-tutorial-hint=grn-lot-qc-measurement]");
    expect(selectors).toContain("[data-tutorial-hint=work-order-measurement]");
    expect(selectors).toContain("[data-tutorial-hint=bank-close]");
    expect(selectors).toContain("[data-tutorial-hint=period-close-action]");
    expect(selectors).toContain("[data-tutorial-hint=automation-rule-builder]");
  });

  it("gives every navigation screen its own tour", () => {
    for (const chapter of TUTORIAL_CHAPTERS) {
      for (const item of chapter.items) {
        const href = item.href.replace(/\/$/, "") || "/";
        const tour = getTourForRoute(href);
        expect(tour, href).toBeTruthy();
        expect(tour?.route, href).toBe(href);
        expect(tour?.steps.length, href).toBeGreaterThan(1);
      }
    }
  });

  it("keeps a child screen off its parent tour", () => {
    expect(getTourForRoute("/finance/journals")?.route).toBe("/finance/journals");
    expect(getTourForRoute("/finance/journals")?.tourId).not.toBe("finance-overview-tour");
    expect(getTourForRoute("/docs/debit-note")?.route).toBe("/docs/debit-note");
    expect(getTourForRoute("/purchasing/orders")?.route).toBe("/purchasing/orders");
    expect(getTourForRoute("/sales/odaflow-sync-queue")?.route).toBe("/sales/odaflow-sync-queue");
    expect(getTourForRoute("/payroll/employees")?.route).toBe("/payroll/employees");
  });

  it("covers settings hub pages", () => {
    expect(getTourForRoute("/settings")?.route).toBe("/settings");
    for (const group of SETTINGS_HUB_GROUPS) {
      for (const link of group.links) {
        expect(getTourForRoute(link.href)?.route, link.href).toBe(link.href);
      }
    }
  });

  it("still gives an unlisted record page a tour", () => {
    const tour = getTourForRoute("/warehouse/dispatch/run-22");
    expect(tour).toBeTruthy();
    expect(tour!.steps.length).toBeGreaterThan(1);
  });
});
