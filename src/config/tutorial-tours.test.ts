import { describe, expect, it } from "vitest";

import { getTourForRoute } from "./tutorial-tours";
import { ITEM_GUIDES } from "./tutorial-guides";

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
});
