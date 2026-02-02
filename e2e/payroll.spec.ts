import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: /Manufacturer Demo/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

test.describe("Payroll", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("create employee", async ({ page }) => {
    await page.goto("/payroll/employees");
    await page.getByRole("button", { name: /Create employee/i }).click();
    await expect(page.getByRole("heading", { name: /Create employee/i })).toBeVisible();
    const nameInput = page.getByTestId("create-employee-name");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("E2E Test Employee");
    await page.getByTestId("create-employee-submit").click();
    await expect(page.getByText("E2E Test Employee")).toBeVisible();
  });

  test("create pay run", async ({ page }) => {
    await page.goto("/payroll/pay-runs");
    await page.getByRole("button", { name: /New pay run/i }).click();
    await expect(page.getByRole("heading", { name: /New pay run/i })).toBeVisible();
    const monthInput = page.getByTestId("create-payrun-month");
    await expect(monthInput).toBeVisible();
    await monthInput.fill("2025-02");
    await page.getByTestId("create-payrun-draft").click();
    await expect(page.getByText("PR-2025-02")).toBeVisible();
  });

  test("open pay run line", async ({ page }) => {
    await page.goto("/payroll/pay-runs");
    await page.getByRole("row").filter({ has: page.getByText(/PR-/) }).first().click();
    await page.waitForURL(/\/payroll\/pay-runs\/pr/);
    await page.getByRole("row").filter({ has: page.getByText(/Jane|John|Wanjiku|Kamau/) }).first().click();
    await expect(page.getByRole("heading", { name: /Pay run line/i })).toBeVisible();
  });

  test("export bank file CSV", async ({ page }) => {
    await page.goto("/payroll/pay-runs");
    await page.getByRole("row").filter({ has: page.getByText(/PR-/) }).first().click();
    await page.waitForURL(/\/payroll\/pay-runs\/pr/);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Generate bank file/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("request approval (stub)", async ({ page }) => {
    await page.goto("/payroll/pay-runs");
    await page.getByRole("button", { name: /New pay run/i }).click();
    const monthInput = page.getByTestId("create-payrun-month");
    await expect(monthInput).toBeVisible();
    await monthInput.fill("2025-03");
    page.once("dialog", (d) => d.accept());
    await page.getByTestId("create-payrun-request-approval").click();
    await expect(page.getByRole("heading", { name: /New pay run/i })).not.toBeVisible();
  });

  test("open payslip preview", async ({ page }) => {
    await page.goto("/payroll/payslips");
    await page.locator("table tbody tr").filter({ hasText: /Jane|John|Wanjiku|Kamau/ }).first().click();
    await expect(page.getByRole("heading", { name: /Payslip preview/i })).toBeVisible();
    await expect(page.getByTestId("payslip-preview-download-pdf")).toBeVisible();
  });
});
