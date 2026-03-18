import { test, expect } from "@playwright/test";
import { bootstrapLocalSession } from "./auth";

test.describe("Tutorial", () => {
  test.beforeEach(async ({ page }) => {
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
    const hasTutorial = await page.getByRole("button", { name: /tutorial|start tour/i }).first().isVisible().catch(() => false);
    expect(hasTutorial).toBeTruthy();
  });

  test("Start tour on dashboard opens spotlight", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/dashboard/);
    // Click Start tour
    const startTourBtn = page.getByRole("button", { name: /start tour/i }).first();
    await startTourBtn.click();
    // Driver.js: body gets driver-active, popover has driver-popover
    await expect(page.locator("body.driver-active")).toBeVisible({ timeout: 5000 });
    const popover = page.locator(".driver-popover");
    await expect(popover).toBeVisible();
    // Close tour (escape)
    await page.keyboard.press("Escape");
    await expect(page.locator("body.driver-active")).not.toBeVisible({ timeout: 3000 });
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
