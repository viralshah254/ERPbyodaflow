import { test, expect } from "@playwright/test";
import { bootstrapLocalSession } from "./auth";

test.describe("Week 16: Tax, pricing, payroll → journal", () => {
  test.beforeEach(async ({ page }) => {
    await bootstrapLocalSession(page);
  });

  test("invoice wizard exposes taxes and charges step", async ({ page }) => {
    await page.goto("/docs/invoice/new");
    await expect(page.getByRole("heading", { name: /New invoice/i })).toBeVisible();
    await expect(page.getByText(/Taxes & charges/i)).toBeVisible();
  });

  test("bill wizard exposes taxes and charges step", async ({ page }) => {
    await page.goto("/docs/bill/new");
    await expect(page.getByRole("heading", { name: /New bill/i })).toBeVisible();
    await expect(page.getByText(/Taxes & charges/i)).toBeVisible();
  });

  test("payroll page exposes live create flow", async ({ page }) => {
    await page.goto("/payroll/pay-runs");
    await expect(page.getByRole("button", { name: /New pay run/i })).toBeVisible();
  });

  test("pricing hints appear on invoice line editor", async ({ page }) => {
    await page.goto("/docs/invoice/new");
    await page.getByRole("button", { name: /^Next$/i }).click();
    await expect(page.getByText(/Lines/i)).toBeVisible();
    await page.getByRole("button", { name: /Add line/i }).click();
    await expect(page.getByText(/price reason|base unit|EA|CARTON|tier/i)).toBeVisible();
  });
});
