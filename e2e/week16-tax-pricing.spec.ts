import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /Manufacturer Demo/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

test.describe("Week 16: Tax, pricing, payroll → journal", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("VAT breakdown visible on invoice doc", async ({ page }) => {
    await page.goto("/docs/invoice/1");
    await page.getByRole("tab", { name: /Taxes\/Charges/i }).click();
    await expect(page.getByRole("heading", { name: /VAT breakdown/i })).toBeVisible();
  });

  test("WHT stub visible on bill doc", async ({ page }) => {
    await page.goto("/docs/bill/1");
    await page.getByRole("tab", { name: /Taxes\/Charges/i }).click();
    await expect(page.getByRole("heading", { name: /Withholding tax|WHT/i })).toBeVisible();
  });

  test("payroll posting stub routes to journal", async ({ page }) => {
    await page.goto("/payroll/pay-runs");
    await page.getByRole("row").filter({ has: page.getByText(/PR-/) }).first().click();
    await page.waitForURL(/\/payroll\/pay-runs\/pr/);
    await page.getByRole("button", { name: /Post payroll journal/i }).click();
    await expect(page).toHaveURL(/\/docs\/journal\/new/);
  });

  test("pricing selection on sales invoice line", async ({ page }) => {
    await page.goto("/docs/invoice/new");
    await page.getByLabel(/^Date$/i).fill("2025-01-28");
    const party = page.getByPlaceholder(/Search or enter/i).first();
    if (await party.isVisible()) await party.fill("ABC");
    await page.getByRole("button", { name: /^Next$/i }).click();
    await expect(page.getByText(/2\. Lines|Lines/i)).toBeVisible();
    await page.getByRole("button", { name: /Add line/i }).click();
    await expect(page.getByText(/price reason|base unit|EA|CARTON|tier/i)).toBeVisible();
  });
});
