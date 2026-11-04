import { test, expect } from "@playwright/test";
import { fixtureApi } from "./fixtures/erp-guide-api";
import { bootstrapLocalSession } from "./auth";

test.describe("Tutorial", () => {
  test.beforeEach(async ({ page }) => {
    await fixtureApi(page);
    await bootstrapLocalSession(page);
  });

  test("tutorial hub renders and shows chapters", async ({ page }) => {
    await page.goto("/tutorial");
    await page.waitForURL(/\/tutorial/);
    await expect(page.locator("body")).toBeVisible();
    // Tutorial hub has title or chapter links
    const hasTitle = await page.locator("h1, h2").filter({ hasText: /tutorial|learn|guide/i }).first().isVisible().catch(() => false);
    const hasChapters = await page.locator("a[href*='/tutorial/']").first().isVisible().catch(() => false);
    expect(hasTitle || hasChapters).toBeTruthy();
  });

  test("dashboard shows tutorial controls", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/);
    // PageHelp: Tutorial button or Start tour
    await expect(page.getByRole("button", { name: /tutorial|start tour/i }).first()).toBeVisible();
  });

  test("Start tour on dashboard opens interactive guide", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/);
    // Click Start tour
    const startTourBtn = page.getByRole("button", { name: /start tour/i }).first();
    await startTourBtn.click();
    const popover = page.getByRole("region", { name: "Interactive page guide", exact: true });
    await expect(popover).toBeVisible();
    // Close tour (escape)
    await page.keyboard.press("Escape");
    await expect(popover).not.toBeVisible({ timeout: 3000 });
  });

  test("guide sheet opens from Tutorial button", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/);
    const tutorialBtn = page.getByRole("button", { name: /tutorial/i }).first();
    await tutorialBtn.click();
    // PageGuideSheet: About: Dashboard or similar
    const sheet = page.locator("[role='dialog'], .sheet, [class*='Sheet']").filter({ hasText: /about|dashboard|guide/i }).first();
    await expect(sheet).toBeVisible({ timeout: 5000 });
  });
});

test("written guide can launch the walkthrough after its sheet closes", async ({ page }) => {
  await fixtureApi(page);
  await page.goto("/inventory/stock-levels", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Tutorial — read this screen's guide", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "Start tour", exact: true }).click();
  await expect(sheet).not.toBeVisible();
  await expect(page.getByRole("region", { name: "Interactive page guide", exact: true })).toBeVisible();
});
