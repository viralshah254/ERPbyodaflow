import { test, expect, type Page } from "@playwright/test";
import { fixtureApi } from "./fixtures/erp-guide-api";
const panel = (page: Page) => page.getByRole("region", { name: "Interactive page guide", exact: true });
async function help(page: Page) {
  await page.getByRole("button", { name: "Start tour — Help with this page", exact: true }).first().click();
  await expect(panel(page)).toBeVisible();
  if (["overview", "dialog-overview"].includes(await panel(page).getAttribute("data-guide-step") || "")) await expect(panel(page).getByRole("button", { name: "Next", exact: true })).toBeEnabled();
}
async function finish(page: Page) {
  for (let i = 0; i < 35; i++) {
    if (await panel(page).getByRole("heading", { name: "Page walkthrough complete", exact: true }).count()) return;
    const target = page.locator('[data-guide-active="true"]').first();
    const stepId = await panel(page).getAttribute("data-guide-step");
    await expect(target).toHaveAttribute("data-guide-active-step", stepId!);
    await expect(target).toBeVisible();
    const next = panel(page).getByRole("button", { name: /^(Next|Finish walkthrough)$/ });
    if (await next.isDisabled()) {
      const instruction = await panel(page).innerText();
      if (/Enter a search term/.test(instruction)) await target.fill("guide");
      else if (await target.getAttribute("role") === "tab") await target.click();
      else if (await target.getAttribute("role") === "combobox" || await target.evaluate(el=>el.tagName === "SELECT")) {
        await target.click();
        await page.keyboard.press("Escape");
      } else await target.focus();
    }
    await expect(next).toBeEnabled();
    await next.click();
  }
  throw new Error("Guide did not complete within 35 steps");
}
const screens = [
  "/dashboard", "/docs", "/sales/customers", "/sales/orders", "/purchasing/requests", "/inventory/stock-levels", "/warehouse/transfers", "/manufacturing/routing", "/finance/chart-of-accounts", "/treasury/payment-runs", "/pricing/workspace/overview", "/crm/accounts", "/assets/register", "/projects/list", "/payroll/employees", "/distribution/trips", "/franchise/network/outlets", "/retail/promotions", "/reports", "/reports/manufacturing/bom-explosion", "/reports/operations/top-sales", "/onboarding", "/analytics", "/automation/rules", "/settings", "/settings/uom", "/inbox", "/tutorial",
];
for (const route of screens) test(`${route} has a working page-specific walkthrough`, async ({ page }) => {
  const writes = await fixtureApi(page);
  const errors: string[] = [];
  page.on("pageerror", error=>errors.push(error.message));
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await help(page);
  if (["/sales/customers", "/inventory/stock-levels", "/settings/uom", "/tutorial"].includes(route)) await page.screenshot({ path: `test-results/erp-guide-${route.replaceAll("/", "-").slice(1)}.png` });
  await finish(page);
  expect(writes.filter(value => !/tutorial-events/.test(value))).toEqual([]);
  expect(errors).toEqual([]);
});

test("new document guidance is specific to the document type and exits without saving", async ({ page }) => {
  const writes = await fixtureApi(page);
  await page.goto("/docs/journal/new", { waitUntil: "domcontentloaded" });
  await help(page);
  await expect(panel(page)).toContainText(/journal|debit|credit/i);
  await panel(page).getByText("Workflow checklist", { exact: true }).click();
  await expect(panel(page)).toContainText("balanced debit and credit");
  await page.keyboard.press("Escape");
  await expect(panel(page)).toHaveCount(0);
  // The existing New-document workflow clears its obsolete autosave on mount.
  // Tutorial controls must not create, update, post, approve or delete a business document.
  expect(writes.filter(value => !/tutorial-events|^DELETE \/api\/documents\/drafts\//.test(value))).toEqual([]);
});

test("mobile dark guide resumes and does not equate skipped work with completion", async ({ page }) => {
  await fixtureApi(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/inventory/stock-levels", { waitUntil: "domcontentloaded" });
  await help(page);
  await panel(page).getByRole("button", { name: "Next", exact: true }).click();
  await panel(page).getByRole("button", { name: "Save and exit guide" }).click();
  await help(page);
  await expect(panel(page)).toContainText("Step 2");
  for (let i=0; i<30 && !await panel(page).getByRole("heading", {name:"Walkthrough reviewed",exact:true}).count(); i++) await panel(page).getByRole("button", {name:"Skip task",exact:true}).click();
  await expect(panel(page).getByRole("heading", {name:"Walkthrough reviewed",exact:true})).toBeVisible();
  const box = await panel(page).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x+box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/erp-guide-mobile.png" });
});

test("settings drawer gets a contextual guide inside the modal", async ({ page }) => {
  const writes = await fixtureApi(page);
  await page.goto("/settings/uom", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /add unit|add uom/i }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Start tour — Help with this page", exact:true }).click();
  await expect(dialog.getByRole("region", {name:"Interactive page guide"})).toBeVisible();
  await expect(panel(page)).toContainText(/dialog/);
  await page.screenshot({ path: "test-results/erp-guide-settings-dialog.png" });
  await finish(page);
  expect(writes.filter(value => !/tutorial-events/.test(value))).toEqual([]);
});
