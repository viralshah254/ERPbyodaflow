import { test, expect } from "@playwright/test";

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

test.describe("QA toolkit routes", () => {
  test("dev hub loads", async ({ page }) => {
    await page.goto("/dev");
    await expect(page.locator("body")).toBeVisible();
  });

  test("route-check loads", async ({ page }) => {
    await page.goto("/dev/route-check");
    await expect(page.locator("text=Route check")).toBeVisible();
  });

  test("action-audit loads", async ({ page }) => {
    await page.goto("/dev/action-audit");
    await expect(page.locator("text=Action audit")).toBeVisible();
  });

  test("data-health loads", async ({ page }) => {
    await page.goto("/dev/data-health");
    await expect(page.locator("text=Data health")).toBeVisible();
  });

  test("link-check loads", async ({ page }) => {
    await page.goto("/dev/link-check");
    await expect(page.locator("text=Link check")).toBeVisible();
  });
});
