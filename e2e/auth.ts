import { expect, type Page } from "@playwright/test";

export async function bootstrapLocalSession(page: Page): Promise<void> {
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  await expect(page.locator("body")).toBeVisible();
}
