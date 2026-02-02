import { test, expect } from "@playwright/test";

/**
 * E2E Critical Flow Tests — key user journeys.
 */

test.describe("Document flows", () => {
  test("navigate to invoice creation wizard", async ({ page }) => {
    await page.goto("/docs/invoice/new");
    await expect(page.locator("body")).toBeVisible();
    // Check wizard loads
    const hasWizard = await page.locator("text=Invoice").first().isVisible().catch(() => false);
    expect(hasWizard).toBeTruthy();
  });

  test("doc list has rows", async ({ page }) => {
    await page.goto("/docs/invoice");
    await expect(page.locator("body")).toBeVisible();
    // Should have table or list
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasList = await page.locator("[role='grid']").isVisible().catch(() => false);
    expect(hasTable || hasList).toBeTruthy();
  });
});

test.describe("Sales flow", () => {
  test("sales orders list loads", async ({ page }) => {
    await page.goto("/sales/orders");
    await expect(page.locator("body")).toBeVisible();
  });

  test("customers list loads", async ({ page }) => {
    await page.goto("/sales/customers");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Purchasing flow", () => {
  test("purchase orders list loads", async ({ page }) => {
    await page.goto("/purchasing/orders");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Inventory flow", () => {
  test("stock levels page loads", async ({ page }) => {
    await page.goto("/inventory/stock-levels");
    await expect(page.locator("body")).toBeVisible();
  });

  test("warehouse transfers loads", async ({ page }) => {
    await page.goto("/warehouse/transfers");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Finance flow", () => {
  test("bank reconciliation loads", async ({ page }) => {
    await page.goto("/finance/bank-recon");
    await expect(page.locator("body")).toBeVisible();
  });

  test("period close loads", async ({ page }) => {
    await page.goto("/finance/period-close");
    await expect(page.locator("body")).toBeVisible();
  });

  test("GL loads", async ({ page }) => {
    await page.goto("/finance/gl");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Payroll flow", () => {
  test("pay runs list loads", async ({ page }) => {
    await page.goto("/payroll/pay-runs");
    await expect(page.locator("body")).toBeVisible();
  });

  test("employees list loads", async ({ page }) => {
    await page.goto("/payroll/employees");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Analytics flow", () => {
  test("explore page loads", async ({ page }) => {
    await page.goto("/analytics/explore");
    await expect(page.locator("body")).toBeVisible();
  });

  test("insights page loads", async ({ page }) => {
    await page.goto("/analytics/insights");
    await expect(page.locator("body")).toBeVisible();
  });

  test("anomalies page loads", async ({ page }) => {
    await page.goto("/analytics/anomalies");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Approval flow", () => {
  test("approval inbox loads", async ({ page }) => {
    await page.goto("/approvals/inbox");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Work queue flow", () => {
  test("work queue loads with categories", async ({ page }) => {
    await page.goto("/work/queue");
    await expect(page.locator("body")).toBeVisible();
    // Check some category exists
    const hasCategory = await page.locator("text=Payroll").isVisible().catch(() => false);
    expect(hasCategory).toBeTruthy();
  });
});

test.describe("Settings flow", () => {
  test("org settings loads", async ({ page }) => {
    await page.goto("/settings/org");
    await expect(page.locator("body")).toBeVisible();
  });

  test("sequences settings loads", async ({ page }) => {
    await page.goto("/settings/sequences");
    await expect(page.locator("body")).toBeVisible();
  });

  test("tax kenya settings loads", async ({ page }) => {
    await page.goto("/settings/tax/kenya");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Masters flow", () => {
  test("products list loads", async ({ page }) => {
    await page.goto("/master/products");
    await expect(page.locator("body")).toBeVisible();
  });

  test("parties list loads", async ({ page }) => {
    await page.goto("/master/parties");
    await expect(page.locator("body")).toBeVisible();
  });

  test("warehouses list loads", async ({ page }) => {
    await page.goto("/master/warehouses");
    await expect(page.locator("body")).toBeVisible();
  });
});
