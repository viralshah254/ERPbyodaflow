import { describe, expect, it } from "vitest";

import type { TourDef } from "@/config/tutorial-tours";
import { expandLiveTourSteps } from "./live-tour";

const listTour: TourDef = {
  tourId: "sales-customers-tour",
  route: "/sales/customers",
  title: "Customers tour",
  steps: [
    {
      element: "h1",
      title: "Customers",
      description: "Customer master data: balances, terms, and links to orders and invoices.",
    },
    {
      element: "h1",
      title: "How to use this page",
      description: "Generic filler that should be replaced.",
    },
    {
      element: "[data-tutorial-hint=command-search]",
      title: "Jump or replay",
      description: "Search filler.",
    },
  ],
};

describe("expandLiveTourSteps", () => {
  it("walks the customer record tabs, actions, balances, and profile", () => {
    Element.prototype.getBoundingClientRect = () =>
      ({
        width: 120,
        height: 36,
        top: 0,
        left: 0,
        bottom: 36,
        right: 120,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      }) as DOMRect;

    document.body.innerHTML = `
      <div data-tutorial-hint="page-main">
        <h1>Joy Superbakers</h1>
        <div data-tutorial-hint="page-title"></div>
        <div data-tutorial-hint="page-actions">
          <div data-tutorial-hint="record-actions">
            <a href="/sales/customers">Back to list</a>
            <button type="button">Edit customer</button>
            <a href="/docs/sales-order/new">New order</a>
          </div>
        </div>
        <div role="tablist">
          <button role="tab" type="button">Overview</button>
          <button role="tab" type="button">Orders</button>
          <button role="tab" type="button">Invoices</button>
          <button role="tab" type="button">Payments</button>
          <button role="tab" type="button">Credit</button>
          <button role="tab" type="button">Ledger</button>
        </div>
        <div data-tutorial-hint="customer-kpis"><span>Outstanding</span></div>
        <div data-tutorial-hint="customer-profile"><h3>Profile</h3></div>
        <div data-state="inactive" role="tabpanel"><h2>Credit limit</h2></div>
      </div>
    `;

    const steps = expandLiveTourSteps(listTour, "/sales/customers/cust-1");
    const titles = steps.map((item) => item.title);

    expect(titles[0]).toBe("Joy Superbakers");
    expect(titles).toContain("Edit customer");
    expect(titles).toContain("New order");
    expect(titles).toEqual(expect.arrayContaining(["Overview", "Orders", "Invoices", "Payments", "Credit", "Ledger"]));
    expect(titles).toContain("Balances");
    expect(titles).toContain("Profile");
    expect(titles).not.toContain("How to use this page");
    expect(titles).not.toContain("Credit limit");
    expect(steps.length).toBeGreaterThan(6);
    expect(steps.find((item) => item.title === "Edit customer")?.description).toMatch(/tax PIN/);
    expect(steps.find((item) => item.title === "New order")?.description).toMatch(/sales order/);
  });
});
