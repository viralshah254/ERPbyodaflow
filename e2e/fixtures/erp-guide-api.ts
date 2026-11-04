/**
 * Local browser fixture: every API request is intercepted, including business writes.
 * Run the ERP dev server on port 3000 with NEXT_PUBLIC_RUNTIME_MODE=dev,
 * NEXT_PUBLIC_ENABLE_DEV_AUTH=1, NEXT_PUBLIC_API_URL=http://localhost:3000,
 * NEXT_PUBLIC_FIREBASE_API_KEY="" and NEXT_PUBLIC_FIREBASE_PROJECT_ID="".
 * Keep OdaWeb running on its standard port 5173. Then run npm run tutorials:e2e.
 * PLAYWRIGHT_CHANNEL=chrome uses installed Chrome instead of downloaded Chromium.
 */
import type { Page } from "@playwright/test";

const allModules = ["manufacturing", "inventory", "warehouse", "sales", "purchase", "purchasing", "finance", "treasury", "crm", "assets", "projects", "payroll", "reports", "analytics", "automation", "distribution", "franchise", "retail", "pricing", "master"];
export async function fixtureApi(page: Page, readOnly = false) {
  const writes: string[] = [];
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (!["GET", "HEAD"].includes(request.method())) writes.push(`${request.method()} ${path}`);
    let data: unknown = { items: [], rows: [], total: 0, hasMore: false, offset: 0, limit: 25 };
    if (path === "/api/me") data = {
      user: { id: "guide-user", orgId: "guide-org", email: "guide@example.test", firstName: "Guide", status: "ACTIVE", branchIds: [], roleIds: [], lockPasswordSet: true },
      org: { id: "guide-org", tenantId: "guide-tenant", orgType: "MANUFACTURER", name: "ERP guide review", templateId: "fmcg-bakery", enabledModules: allModules },
      tenant: { id: "guide-tenant", name: "Guide review", status: "ACTIVE" }, branches: [], currentBranchId: null,
      permissions: readOnly ? ["sales.read", "manufacturing.read", "inventory.read", "finance.read"] : ["*"],
      orgContext: { templateId: "fmcg-bakery", industryCategory: "FMCG", edition: "ENTERPRISE", enabledModules: allModules, featureFlags: {}, terminology: {}, defaultNav: [], orgRole: "STANDARD" },
    };
    else if (path === "/api/settings/financial") data = { baseCurrency: "KES", enabledCurrencies: ["KES"], providerConfigured: false, roundingMode: "HALF_UP", rateSource: "MANUAL", allowForeignCurrencyDocs: true, pricesAreTaxInclusive: false };
    else if (path === "/api/me/setup-status") data = { companySetupDone: true, currenciesDone: true, coaDone: true, taxesDone: true, bankAccountsDone: true, usersDone: true };
    else if (path === "/api/settings/uom") data = { items: [{ id: "ea", code: "EA", name: "Each", isBase: true, decimals: 0 }] };
    else if (path === "/api/treasury/cashflow") data = { periods: [], rows: [], summary: {} };
    else if (/dashboard/.test(path)) data = { widgets: [], items: [], kpis: [], recentDocuments: [], alerts: [] };
    else if (/\/api\/reports\/(manufacturing|operations)\//.test(path)) data = { id: path.split("/").at(-1), title: "Production report", basis: "Posted production records in the selected period.", columns: ["product", "quantity", "uom"], rows: [], warnings: [], generatedAt: "2026-11-04T10:00:00Z" };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
  });
  return writes;
}
