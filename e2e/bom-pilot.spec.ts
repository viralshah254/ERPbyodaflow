import { test, expect, type Page } from "@playwright/test";

// Run against the local dev server with NEXT_PUBLIC_RUNTIME_MODE=dev,
// NEXT_PUBLIC_ENABLE_DEV_AUTH=1 and NEXT_PUBLIC_API_URL=http://localhost:3000.
// Disable Firebase for that test-server process with NEXT_PUBLIC_FIREBASE_API_KEY="".
// Every API request is intercepted: this suite never changes live ERP data.
const bom = { id: "pilot-bom", code: "BOM-001", name: "Bread recipe", finishedProductId: "bread", finishedProductName: "Bread", finishedProductSku: "FG-001", quantity: 10, uom: "KG", version: "1", type: "bom", isActive: true, lifecycle: "DRAFT", items: [] };
async function mockApi(page: Page, readOnly = false, template = "fmcg-bakery", lifecycle = "DRAFT") {
  const writes: string[] = [];
  await page.route("**/api/**", async route => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (!["GET", "HEAD"].includes(req.method())) writes.push(`${req.method()} ${path}`);
    let data: unknown = { items: [] };
    if (path === "/api/me") data = {
      user: { id: "pilot-user", orgId: "pilot-org", email: "pilot@example.test", firstName: "Pilot", branchIds: [], roleIds: [], status: "ACTIVE", lockPasswordSet: true },
      org: { id: "pilot-org", tenantId: "pilot-tenant", name: "BOM pilot review", orgType: "MANUFACTURER", templateId: template },
      tenant: { id: "pilot-tenant", name: "Pilot", status: "ACTIVE" }, branches: [], currentBranchId: null,
      permissions: readOnly ? ["manufacturing.read"] : ["*"],
      orgContext: { templateId: template, industryCategory: "FMCG", edition: "ENTERPRISE", enabledModules: ["manufacturing", "inventory"], featureFlags: {}, terminology: {}, defaultNav: [], orgRole: "STANDARD" },
    };
    else if (path === "/api/manufacturing/boms/next-code") data = { code: "BOM-002" };
    else if (path === "/api/manufacturing/boms/pilot-bom") data = { ...bom, lifecycle };
    else if (path === "/api/manufacturing/boms") data = req.method() === "POST" ? { id: bom.id, code: bom.code } : { items: [bom], hasMore: false, offset: 0, limit: 25 };
    else if (path === "/api/settings/uom") data = { items: [{ id: "kg", code: "KG", name: "Kilogram", isActive: true }, { id: "ea", code: "EA", name: "Each", isActive: true }] };
    else if (path === "/api/products") data = { items: [{ id: "bread", sku: "FG-001", name: "Bread", uom: "KG", status: "ACTIVE" }], hasMore: false };
    else if (path === "/api/master/warehouses") data = { items: [{ id: "wh", code: "FG", name: "Finished goods", status: "ACTIVE" }] };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });
  return writes;
}
async function openGuide(page: Page) { await page.getByRole("button", { name: /help with this BOM/i }).click(); }
const guide = (page: Page) => page.getByRole("region", { name: "Interactive BOM guide" });

test("list walkthrough waits for search and filters and finishes without business writes", async ({ page }) => {
  const writes = await mockApi(page);
  await page.goto("/manufacturing/boms", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "BOM-001" })).toBeVisible();
  await openGuide(page);
  await expect(guide(page).getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("searchbox", { name: "Search BOM recipes" }).fill("Bread");
  await guide(page).getByRole("button", { name: "Next", exact: true }).click();
  await page.locator("[data-bom-filters]").getByRole("combobox").first().click();
  await page.getByRole("option", { name: "BOM", exact: true }).click();
  await guide(page).getByRole("button", { name: "Next", exact: true }).click();
  await guide(page).getByRole("button", { name: "Next", exact: true }).click();
  await guide(page).getByRole("button", { name: "Finish walkthrough" }).click();
  await expect(guide(page).getByText("Page walkthrough complete")).toBeVisible();
  expect(writes.filter(w => /manufacturing/.test(w))).toEqual([]);
  await page.screenshot({ path: "test-results/bom-list-review.png", fullPage: false });
});

test("new BOM guide responds to fields and only Create BOM submits", async ({ page }) => {
  const writes = await mockApi(page, false, "cool-catch");
  await page.goto("/manufacturing/boms/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Recipe name")).toBeVisible();
  await openGuide(page);
  await page.getByLabel("Recipe name").fill("Pilot recipe");
  await guide(page).getByRole("button", { name: "Next", exact: true }).click();
  await page.locator("[data-bom-product]").getByRole("button").first().click();
  await page.getByRole("button").filter({ hasText: "Bread" }).last().click();
  await guide(page).getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Batch output").fill("0");
  await expect(guide(page).getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByLabel("Batch output").fill("10");
  for (let i = 0; i < 3; i++) await guide(page).getByRole("button", { name: "Next", exact: true }).click();
  await page.screenshot({ path: "test-results/bom-new-guide-review.png", fullPage: false });
  await guide(page).getByRole("button", { name: "Finish walkthrough" }).click();
  expect(writes.filter(w => /manufacturing/.test(w))).toEqual([]);
  await guide(page).getByRole("button", { name: "Close BOM guide" }).click();
  await page.screenshot({ path: "test-results/bom-new-review.png", fullPage: false });
  await page.getByRole("button", { name: "Create BOM", exact: true }).click();
  await expect(page).toHaveURL(/boms\/pilot-bom$/);
  expect(writes.filter(w => w === "POST /api/manufacturing/boms")).toHaveLength(1);
});

test("detail guide follows tabs; read-only effective recipe stays read-only", async ({ page }) => {
  const writes = await mockApi(page, true, "fmcg-bakery", "EFFECTIVE");
  await page.goto("/manufacturing/boms/pilot-bom", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "BOM-001 — Bread recipe" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
  await openGuide(page);
  await guide(page).getByRole("button", { name: "Next", exact: true }).click();
  await guide(page).getByRole("button", { name: "Next", exact: true }).click();
  await expect(guide(page).getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("tab", { name: "Routing", exact: true }).click();
  await expect(page.getByLabel("Production routing")).toBeDisabled();
  await guide(page).getByRole("button", { name: "Next", exact: true }).click();
  await guide(page).getByRole("button", { name: "Finish walkthrough" }).click();
  expect(writes.filter(w => /manufacturing/.test(w))).toEqual([]);
  await page.screenshot({ path: "test-results/bom-detail-review.png", fullPage: false });
});

test("mobile dark guide can move, exit and resume", async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("/manufacturing/boms/pilot-bom", { waitUntil: "domcontentloaded" });
  await openGuide(page);
  await guide(page).getByRole("button", { name: "Next", exact: true }).click();
  await guide(page).getByRole("button", { name: "Move guide panel" }).click();
  await page.keyboard.press("Escape");
  await expect(guide(page)).toHaveCount(0);
  await openGuide(page);
  await expect(guide(page).getByRole("heading", { name: "Inspect the component list" })).toBeVisible();
  const box = await guide(page).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/bom-mobile-review.png", fullPage: false });
});

test("list failure shows retry instead of treating an error as an empty library", async ({ page }) => {
  await mockApi(page);
  let fail = true;
  await page.route("**/api/manufacturing/boms?**", async route => {
    if (fail) await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "BOM service unavailable" }) });
    else await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [bom], hasMore: false, offset: 0 }) });
  });
  await page.goto("/manufacturing/boms", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("alert").filter({ hasText: "BOM service unavailable" })).toBeVisible();
  await expect(page.getByText("No recipes yet.", { exact: false })).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Retry loading BOMs" }).click();
  await expect(page.getByRole("link", { name: "BOM-001", exact: true })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "BOM service unavailable" })).toHaveCount(0);
});
