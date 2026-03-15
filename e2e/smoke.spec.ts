import { test, expect } from "@playwright/test";
import { bootstrapLocalSession } from "./auth";

async function expectHiddenRoute(page: import("@playwright/test").Page, route: string) {
  await page.goto(route);
  await expect(page.locator("body")).toContainText(/404|not found|sign in to your account/i);
}

/**
 * E2E Smoke Tests — visit all major routes, check PageHeader renders.
 */

const MAJOR_ROUTES = [
  // Core
  "/dashboard",
  "/approvals",
  "/approvals/inbox",
  "/tasks",

  // Docs
  "/docs",
  "/docs/invoice",

  // Masters
  "/master",
  "/master/products",
  "/master/parties",
  "/master/warehouses",

  // Inventory
  "/inventory/stock-levels",
  "/inventory/movements",
  "/inventory/costing",

  // Warehouse
  "/warehouse/overview",
  "/warehouse/transfers",
  "/warehouse/pick-pack",
  "/warehouse/cycle-counts",

  // Sales
  "/sales/overview",
  "/sales/orders",
  "/sales/invoices",
  "/sales/customers",

  // Purchasing
  "/purchasing/orders",
  "/purchasing/requests",

  // AP/AR
  "/ap/bills",
  "/ap/suppliers",
  "/ar/customers",
  "/ar/payments",

  // Finance
  "/finance",
  "/finance/gl",
  "/finance/journals",
  "/finance/bank-recon",
  "/finance/statements",
  "/finance/period-close",

  // Treasury
  "/treasury/overview",
  "/treasury/payment-runs",
  "/treasury/bank-accounts",

  // Assets
  "/assets/overview",
  "/assets/register",
  "/assets/depreciation",

  // Payroll
  "/payroll/overview",
  "/payroll/employees",
  "/payroll/pay-runs",
  "/payroll/payslips",

  // Analytics
  "/analytics",
  "/analytics/explore",
  "/analytics/insights",
  "/analytics/anomalies",

  // Automation
  "/automation",
  "/automation/rules",
  "/automation/workflows",

  // Work queue
  "/work/queue",

  // Reports
  "/reports",
  "/reports/saved",

  // Settings
  "/settings/org",
  "/settings/users-roles",
  "/settings/sequences",
  "/settings/financial/currencies",
  "/settings/tax/kenya",
];

test.describe("Smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapLocalSession(page);
  });

  for (const route of MAJOR_ROUTES) {
    test(`renders ${route}`, async ({ page }) => {
      await page.goto(route);
      // Check that page loads without error
      await expect(page.locator("body")).toBeVisible();
      // Check that PageHeader or main content exists (no crash)
      const hasContent = await page.locator("main").isVisible().catch(() => false);
      const hasHeader = await page.locator("h1, h2, [data-testid='page-header']").first().isVisible().catch(() => false);
      expect(hasContent || hasHeader).toBeTruthy();
    });
  }
});

test.describe("QA toolkit routes are hidden by default", () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapLocalSession(page);
  });

  test("dev hub is not routable", async ({ page }) => {
    await expectHiddenRoute(page, "/dev");
  });

  test("route-check is not routable", async ({ page }) => {
    await expectHiddenRoute(page, "/dev/route-check");
  });

  test("action-audit is not routable", async ({ page }) => {
    await expectHiddenRoute(page, "/dev/action-audit");
  });

  test("data-health is not routable", async ({ page }) => {
    await expectHiddenRoute(page, "/dev/data-health");
  });

  test("link-check is not routable", async ({ page }) => {
    await expectHiddenRoute(page, "/dev/link-check");
  });
});
