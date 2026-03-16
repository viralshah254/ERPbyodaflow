# ERP Codebase — Pending Review

Review date: generated from codebase scan. This file summarizes what is **done** vs **pending** after the Full No-Mock hardening and E2E work.

---

## 1. Done (already implemented)

- **13 pages with real logic**: automation/schedules, customizer workflows/dashboards, inventory/warehouses, settings/branches, crm/tickets, crm/activities, crm/deals, tasks, purchasing/supplier-invoices, purchasing/goods-receipt, finance/fixed-assets, finance/budgets — all wired to backend APIs.
- **Analytics**: Backend-only execution; frontend explore page uses API, no mock fallback.
- **Product subdomains**: Packaging, pricing, variants, attributes — backend routes + frontend `product-master` API; document wizard step 2 and pricing overview/price-lists use API data.
- **UOM conversions**: Backend + `uom-conversions` API; settings/uom page uses API.
- **Compliance & product VAT**: Backend settings + frontend compliance page and product detail VAT from API.
- **Document drafts**: Backend draft endpoints; DocumentCreateWizard uses `document-drafts` API.
- **Products repo**: Reduced to cache-only (listProducts, setProductsCache, hydrateProductsFromApi, getProductById); no localStorage for packaging/pricing/variants/attributes.
- **TerminologyKey**: Aligned documents + industryTemplates; analytics save-view still localStorage (see below).
- **E2E**: `e2e/live-api-smoke.spec.ts` — document wizard step 2, pricing overview, price lists, data health.

---

## 2. UI copy / “not yet wired” (low risk)

| Location | Current behavior | Suggested follow-up |
|----------|------------------|----------------------|
| `pricing/price-lists/page.tsx` (line 181) | “Delete price list is not yet wired to the backend.” toast on Remove | Wire DELETE price list to backend or hide/disable button until supported. |
| `ap/bills/page.tsx` (line 208) | “Posting from this list is not yet wired. Open each bill to post.” | Wire bulk/post-from-list to backend or keep as-is and rely on per-bill post. |
| `finance/tax/page.tsx` (line 235) | “Editing tax codes is not yet supported by the backend contract.” | Add backend PATCH for tax codes and wire edit. |
| `settings/financial/taxes/page.tsx` (line 230) | Same as above | Same backend contract + wire edit. |

---

## 3. Stale copy

| File | Line | Current text | Fix |
|------|------|--------------|-----|
| `dev/data-health/page.tsx` | 147 | CardDescription: “Run in browser (uses repo + mocks).” | Data health now uses API (products, packaging, pricing). Update to e.g. “Uses live product, packaging, and pricing APIs.” |
| `action-registry.ts` | 32 | docs Save draft: “Toast + localStorage” | Drafts are now backend; update to “Toast + backend draft API”. |
| `action-registry.ts` | 104 | analytics Save view: “Alert + localStorage” | Still true; optional: add backend save-view later. |

---

## 4. localStorage / persisted-store still in use (by design or to migrate)

**Intentional (UI/preferences):**

- `SetupChecklistCard.tsx` — which setup items user marked incomplete.
- `ui-store.ts` — compact mode, right panel open state.
- `template-store.ts` — selected ERP template.
- `sidebar-state.ts` — sidebar expand/collapse.
- `async-searchable-select.tsx` — recent selections (test clears localStorage).
- `persisted-store.ts` — generic helper used by several repos below.

**Data that could move to backend later:**

- `uom.repo.ts` — UOM definitions (list/save); conversions already on API. Settings/uom page uses both API (conversions) and repo (definitions).
- `payroll.repo.ts` — local CRUD; pages prefer fetchEmployeesApi, fetchPayRunsApi, etc. Repo still used as fallback/cache in some flows.
- `users-roles.repo.ts` — same pattern; prefer fetchUsersApi/fetchRolesApi.
- `depreciation.repo.ts` — `loadStoredValue`/`saveStoredValue` for depreciation runs.
- `inventory-costing.repo.ts` — landed cost allocations and costing runs.
- `yield.repo.ts` — yield records (seeded from mock).
- `bins.repo.ts`, `routing.repo.ts`, `bom.repo.ts` — localStorage CRUD; used by warehouse, manufacturing, BOM pages.
- `analytics/simulations/page.tsx` — “last applied suggestion” via persisted-store.
- `saved-views.ts` (docs) — saved views per scope.
- `lib/analytics/saved-views.ts` — analytics saved views; shareable link still stub.

---

## 5. Mock / stub usage (out of scope of product migration or test-only)

**Test files (fine to keep):**

- `*.test.tsx` under platform/billing, settings/billing — vi.mock for API and toast.
- `async-searchable-select.test.tsx` — localStorage clear.
- Backend `platform-provisioning-checkout.test.ts` — vi.fn mocks.

**Runtime mock modules (`src/lib/mock/`):**

- Used by: franchise (VMI, commission), purchasing/cash-weight-audit, manufacturing (subcontracting, yield, routing, boms), distribution/trips, inventory/landed-cost, treasury (cashflow, collections), warehouse/bins, payroll (employees, payruns), products (pricing, variants, packaging — **replaced by API** but files still exist), coa, mrp-planning.
- `lib/api/cool-catch.ts` — imports from mock franchise, VMI, cash-weight-audit, subcontracting.
- `lib/analytics/engine.ts` — frontend mock analytics engine (explore uses backend; this may be dead or used elsewhere).
- `lib/org/financial-settings.ts` — comment says “Reads from mock” (verify if still true).

**Other:**

- `manufacturing/subcontracting/page.tsx` — toast “Configure API to create work centers” / “subcontract orders” when msg === "STUB".
- `inventory/costing/page.tsx` — copy “Per-unit cost impact (mock)”.
- `distribution/transfer-planning/page.tsx` — “Phase 1 transfer planner scaffold using mocked lanes and quantities.”
- `analytics/simulations/page.tsx` — “Sliders + instant mock recalculation”; “Apply suggestion” stored in localStorage.
- Backend: `documents.ts` (PDF export stub), `reports.ts` (WHT summary stub).

---

## 6. isApiConfigured() usage (by design)

Used to gate API-dependent UI (upload, download, live data) when `NEXT_PUBLIC_API_URL` is not set. No change needed unless you want different behavior when API is not configured.

**Files:** `layout.tsx`, `login/page.tsx`, `auth-restore.tsx`, `settings/org/page.tsx`, `docs/[type]/page.tsx`, `settings/financial/currencies/page.tsx`, `finance/bank-recon/page.tsx`, `settings/financial/exchange-rates/page.tsx`, `payroll/payslips/page.tsx`, `PrintPreviewDrawer.tsx`, `automation/integrations/page.tsx`, `api/client.ts`, `api/treasury-ops.ts`, `api/reports.ts`, `api/documents.ts`, `fx/live-rates.ts`.

---

## 7. Suggested next steps (priority order)

1. **Quick copy fixes**
   - Update Data health card description and action-registry “Save draft” to reflect backend.
2. **Wire remaining CTAs (if desired)**
   - Price list delete (backend DELETE + frontend).
   - Tax code edit (backend PATCH + finance/tax and settings/financial/taxes).
   - Bills list posting (optional; or leave as “open each bill to post”).
3. **Optional migrations**
   - UOM definitions: move from uom.repo to backend (like conversions).
   - Analytics “Save view” and simulations “last applied”: backend endpoints + replace localStorage.
   - Depreciation, inventory-costing, yield, bins, routing, BOM: decide which to move to API and add routes + frontend clients.
4. **Dead mock cleanup**
   - Remove or refactor `lib/mock/products/*` (packaging, pricing, variants) if no imports remain.
   - Audit `lib/analytics/engine.ts` and `lib/org/financial-settings.ts` for remaining mock reads.
5. **Verification**
   - Run `npm run typecheck` and `npm run lint` (frontend + backend).
   - Run `npm run test:e2e -- --grep "Live API smoke"` with app and backend up.

---

## 8. Files to edit for “quick wins”

- `erp-odaflow/src/app/(dashboard)/dev/data-health/page.tsx` — line 147: CardDescription.
- `erp-odaflow/src/lib/qa/action-registry.ts` — line 32: docs Save draft behavior text.
- (Optional) `erp-odaflow/src/app/(dashboard)/pricing/price-lists/page.tsx` — Replace “not yet wired” toast with DELETE API call or disable Remove.

No changes to the plan file; this document is for reference only.
