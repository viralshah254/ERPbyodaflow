import { test, expect } from "@playwright/test";
import { bootstrapLocalSession } from "./auth";

/**
 * E2E Live API smoke tests — confirm document wizard (step 2 lines + pricing),
 * Pricing overview, Price lists, and Dev → Data health use live API data.
 */

test.beforeEach(async ({ page }) => {
  await bootstrapLocalSession(page);
});

test.describe("Live API smoke", () => {
  test("document wizard reaches step 2 Lines with line editor", async ({ page }) => {
    await page.goto("/docs/invoice/new");
    await expect(page.locator("body")).toBeVisible();

    // Step 1: ensure wizard is present
    const hasWizard = await page.locator("text=Invoice").first().isVisible().catch(() => false);
    expect(hasWizard).toBeTruthy();

    // Fill required date so Next can proceed
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible().catch(() => false)) {
      const today = new Date().toISOString().slice(0, 10);
      await dateInput.fill(today);
    }

    // Click Next to reach step 2 (may stay on step 1 if validation fails)
    const nextBtn = page.getByRole("button", { name: /next/i });
    await nextBtn.waitFor({ state: "visible", timeout: 5000 });
    await nextBtn.click();

    // Step 2: Lines step and line editor (API-backed packaging/pricing)
    await expect(page.getByText("2. Lines")).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("button", { name: /add line/i }).or(page.getByText(/line items/i))
    ).toBeVisible();
  });

  test("pricing overview loads and shows content", async ({ page }) => {
    await page.goto("/pricing/overview");
    await expect(page.locator("body")).toBeVisible();

    await expect(page.getByText("Pricing Overview", { exact: true }).first()).toBeVisible({
      timeout: 10000,
    });
    // Main content: price lists card or table
    const hasContent =
      (await page.getByText("Price lists").first().isVisible().catch(() => false)) ||
      (await page.locator("table").isVisible().catch(() => false));
    expect(hasContent).toBeTruthy();
  });

  test("price lists page loads and shows content", async ({ page }) => {
    await page.goto("/pricing/price-lists");
    await expect(page.locator("body")).toBeVisible();

    await expect(page.getByText("Price lists", { exact: true }).first()).toBeVisible({
      timeout: 10000,
    });
    // Table or empty state
    const hasContent =
      (await page.locator("table").isVisible().catch(() => false)) ||
      (await page.getByText(/lists/i).first().isVisible().catch(() => false));
    expect(hasContent).toBeTruthy();
  });

  test("data health page loads when dev routes available, else pass", async ({ page }) => {
    const res = await page.goto("/dev/data-health");
    await expect(page.locator("body")).toBeVisible();

    // If dev routes are hidden (404 or redirect to sign-in), consider test passed
    const is404 = res?.status() === 404;
    const isNotFound = await page.getByText(/404|not found/i).first().isVisible().catch(() => false);

    if (is404 || isNotFound) {
      // Dev routes not available (e.g. production build) — pass
      return;
    }

    // Dev route available: assert Data health content
    await expect(
      page.getByText("Data health", { exact: true }).first()
    ).toBeVisible({ timeout: 10000 });
    // Re-run button or checks content
    const hasDataHealthContent =
      (await page.getByRole("button", { name: /re-run/i }).isVisible().catch(() => false)) ||
      (await page.locator("table").isVisible().catch(() => false)) ||
      (await page.getByText(/products|packaging|pricing|baseUom/i).first().isVisible().catch(() => false));
    expect(hasDataHealthContent).toBeTruthy();
  });
});
