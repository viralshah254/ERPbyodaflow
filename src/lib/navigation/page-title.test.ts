import { describe, expect, it } from "vitest";
import { pageTitleFor } from "./page-title";

describe("pageTitleFor", () => {
  it("names the screen first, then its area", () => {
    expect(pageTitleFor("/manufacturing/work-orders")).toBe("Work Orders · Manufacturing · ERP by OdaFlow");
    expect(pageTitleFor("/warehouse/transfers/new")).toBe("Create transfer · Warehouse · ERP by OdaFlow");
  });

  it("puts documents under the area they belong to", () => {
    expect(pageTitleFor("/docs/sales-order/abc")).toBe("Sales order record · Sales · ERP by OdaFlow");
    expect(pageTitleFor("/docs/invoice/new")).toBe("New Invoice · Sales · ERP by OdaFlow");
  });

  it("uses the org's own word for production", () => {
    expect(pageTitleFor("/manufacturing/work-orders", "Bakery")).toBe("Work Orders · Bakery · ERP by OdaFlow");
  });

  it("does not repeat a screen that is its own area, and falls back to the app name", () => {
    expect(pageTitleFor("/dashboard")).toBe("Dashboard · ERP by OdaFlow");
    expect(pageTitleFor("/no-such-screen")).toBe("ERP by OdaFlow");
  });
});
