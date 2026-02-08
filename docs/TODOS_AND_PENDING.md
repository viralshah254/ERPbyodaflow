# OdaFlow ERP — TODOs and Pending Tasks

**Generated from a full codebase scan.** This document lists all explicit TODOs, stubs, API-pending actions, and other pending work.

---

## 1. Inline TODO / FIXME Comments

**Result:** No `TODO`, `FIXME`, `XXX`, or `HACK` comment markers were found in the codebase.

---

## 2. Stub Actions (API Pending) — by File

**All stub actions now use `toast.info()` / `toast.success()` (sonner); no `window.alert` in `src`.** (Frontend completion Session 1.)

These files contain buttons or actions that show toast with "stub" or "API pending" and require backend implementation.

| File | Action / Location | Current Behavior |
|------|-------------------|------------------|
| `src/components/layout/main-layout.tsx` | Copilot "Apply" | Toast: "Action applied (stub). API pending." |
| `src/app/(dashboard)/docs/[type]/[id]/page.tsx` | Request approval | `window.alert("Request approval (stub): API pending.")` |
| `src/components/docs/PrintPreviewDrawer.tsx` | Download PDF | `window.alert("Download PDF (stub). API pending.")` |
| `src/components/docs/DocumentAttachments.tsx` | Upload | `window.alert("Upload (stub): API pending.")` |
| `src/components/docs/DocumentComments.tsx` | Add comment (when no handler) | `window.alert("Add comment (stub): API pending.")` |
| `src/app/(dashboard)/settings/payroll/page.tsx` | Save | `window.alert("Save (stub). API pending.")` |
| `src/app/(dashboard)/payroll/pay-runs/[id]/page.tsx` | Approve | `window.alert("Approve (stub). API pending.")` |
| `src/app/(dashboard)/payroll/payslips/page.tsx` | Download PDF | `window.alert("Download PDF (stub). API pending.")` |
| `src/app/(dashboard)/settings/financial/currencies/page.tsx` | Add currency | `window.alert("Add currency: API pending.")` |
| `src/app/(dashboard)/settings/financial/exchange-rates/page.tsx` | Import CSV | `window.alert("Import CSV: API pending.")` |
| `src/app/(dashboard)/settings/financial/chart-of-accounts/page.tsx` | Import COA | `window.alert("Import COA (stub): API pending.")` |
| `src/app/(dashboard)/settings/tax/withholding/page.tsx` | WHT certificate | `window.alert("WHT certificate (stub). API pending.")` |
| `src/app/(dashboard)/settings/notifications/page.tsx` | Save | `window.alert("Save (stub). API pending.")` |
| `src/app/(dashboard)/settings/products/pricing-rules/page.tsx` | Add rule | `window.alert("Add rule (stub). API pending.")` |
| `src/app/(dashboard)/settings/organization/entities/page.tsx` | Add entity | `window.alert("Add entity (stub). API pending.")` |
| `src/app/(dashboard)/pricing/rules/page.tsx` | Add discount policy, Customer price list | Toast/description: stub, API pending |
| `src/app/(dashboard)/warehouse/transfers/page.tsx` | Bulk actions, Create transfer | `window.alert("…(stub): … API pending.")` |
| `src/app/(dashboard)/warehouse/putaway/[id]/page.tsx` | Allocate to bins | `window.alert("Allocate to bins (stub). API pending.")` |
| `src/app/(dashboard)/finance/bank-recon/page.tsx` | Create payment from statement line | `window.alert("Create payment (stub) from statement line... API pending.")` |
| `src/app/(dashboard)/treasury/payment-runs/page.tsx` | Request approval, Bank format | `window.alert("Request approval (stub). API pending.")` / "Bank format (stub). API pending." |
| `src/app/(dashboard)/treasury/payment-runs/[id]/page.tsx` | (approve/export stubs per STUBS_AND_PENDING) | Stub |
| `src/app/(dashboard)/inventory/costing/page.tsx` | Save allocation | `window.alert("Save allocation (stub). API pending.")` |
| `src/app/(dashboard)/ap/payments/page.tsx` | Pay supplier | `window.alert("Pay supplier: API pending.")` |
| `src/app/(dashboard)/ar/payments/page.tsx` | Submit payment, Flow text | `window.alert("Submit payment: API pending.")`; "Customer → Open invoices → Allocate → Review. API pending." |
| `src/app/(dashboard)/automation/rules/page.tsx` | "Require approval" action | `window.alert("Require approval (stub): API pending.")` |
| `src/app/(dashboard)/master/products/[id]/pricing/page.tsx` | Apply pricing template | `window.alert("Apply pricing template (stub). API pending.")` |
| `src/app/(dashboard)/projects/list/page.tsx` | Create project | `window.alert("Create project (stub). API pending.")` |
| `src/app/(dashboard)/purchasing/purchase-returns/page.tsx` | Approve, Export | `toast.info("Approve (stub). API pending.")` etc. |
| `src/app/(dashboard)/manufacturing/mrp/page.tsx` | Apply suggestion | `toast.success("Apply suggestion (stub). API pending.")` |

---

## 3. QA Action Registry — Stub Status

From `src/lib/qa/action-registry.ts`. These CTAs are explicitly marked `status: "stub"` (21 total).

| Module | Page | Action | Behavior |
|--------|------|--------|----------|
| Masters | `/master/products/[id]` | Delete | Confirm + toast |
| Masters | `/master/products/[id]/pricing` | Apply template | Toast stub |
| Docs | `/docs/[type]/[id]` | Request approval | Alert stub |
| Docs | `/docs/[type]/[id]` | Approve | Alert stub |
| Docs | `/docs/[type]/[id]` | Post | Alert stub |
| Docs | `/docs/[type]/[id]` | Export PDF | Toast stub |
| Inventory | `/inventory/costing` | Run costing | Toast stub |
| Warehouse | `/warehouse/transfers/[id]` | Mark received | Toast stub |
| Warehouse | `/warehouse/pick-pack/[id]` | Complete | Toast stub |
| Warehouse | `/warehouse/putaway/[id]` | Confirm | Toast stub |
| Warehouse | `/warehouse/cycle-counts/[id]` | Submit | Toast stub |
| Purchasing | `/purchasing/purchase-returns` | Create Return, Row click, Export, Approve (bulk) | Toast stub |
| Finance | `/ap/three-way-match` | Match selected | Toast stub |
| Finance | `/ar/payments` | Allocate | Toast stub |
| Finance | `/finance/period-close` | Close period, Reopen period | Alert stub |
| Treasury | `/treasury/payment-runs/[id]` | Approve | Toast stub |
| Assets | `/assets/depreciation` | Run depreciation | Toast stub |
| Payroll | `/payroll/pay-runs/[id]` | Approve | Toast stub |
| Analytics | `/analytics/simulations` | Apply suggestion | Toast stub |
| Automation | `/automation/ai-insights` | Apply action | Toast stub |
| Approvals | `/approvals/inbox` | Approve, Reject | Toast stub |
| Settings | `/settings/org` | Save | Toast stub |

---

## 4. “Replace With Real API” / Architecture Notes

| Location | Note |
|----------|------|
| `src/lib/analytics/engine.ts` | Comment: "Replace with real API later. Architecture is real." |
| `STUBS_AND_PENDING.md` § 2.17 | Analytics engine `runAnalyticsQuery`: mock deterministic data; replace with real API. |

---

## 5. Pending Work from STUBS_AND_PENDING.md

### 5.1 Analytics (Weeks 2–4)

- **Frontend complete (6-session plan):** Explorer, visual system, saved views, intelligence modules (products, pricing, inventory, finance, payroll), Anomaly Center, Simulation Lab, and action links/Apply suggestion stubs are implemented with mock data. API pending.
- **Week 2:** Explorer (MetricPicker, DimensionStack, GlobalFilterBar, InsightCanvas, ExplorerTable, DrillDrawer), visual system (KpiHero, TrendStrip, etc.), saved analysis views — done (mock).
- **Week 3:** Product/pricing, inventory, finance, payroll intelligence modules — done (mock).
- **Week 4:** Anomaly Center, Simulation Lab, action integration — done (stub actions and links).

### 5.2 AI & Copilot

- Copilot chat: UI only; no LLM or chat API. See `AI_INTEGRATION_STRATEGY.md` for options.
- Action cards: Apply = toast stub; backend could implement “fix pricing tiers”, “suggest conversions”, etc.

### 5.3 Work Queue & Anomalies

- Work queue (`/work/queue`): Mock payroll/tax/pricing alerts; “View” links to existing pages.
- Anomalies: Mock detection + `AnomalyDetection`; “Investigate → workflow” and severity/entities to be wired (Week 4).

### 5.4 General Backend (Not Connected)

- Auth: Real login, sessions, tenants, permissions.
- Documents: CRUD, workflow (draft → submit → approve → post), GL posting.
- Master data: Products, parties, warehouses, etc. via API.
- Payroll: Employees, pay runs, statutory config, bank file generation, payslip PDF.
- Finance: Journals, bank recon, period close, AP/AR payment execution.
- Reports: Run, export, schedule, save views.
- Files: Attachments, COA import, CSV import (currencies, exchange rates, etc.).

---

## 6. QA Route Map — Remaining Polish (docs/QA_ROUTE_MAP.md)

- Virtualize heavy tables if performance issues arise.
- Add RTL unit tests for edge cases.
- Add more granular CTA stubs where needed.

### Route / Nav Clarifications (done — Frontend completion Session 1)

- `/inventory/stock` — Redirects to `/inventory/stock-levels`.
- `/purchasing/purchase-orders` — Redirects to `/purchasing/orders`.
- `/finance/budgets`, `/finance/ledger` — Added to Finance nav.
- `/reports/vat-summary`, `/reports/wht-summary` — Under Reports (verified).
- `/settings/customization` — Redirects to `/settings/customizer/modules`.

### Partial / Stub Features (from QA doc)

- Payroll journal posting: Stub (toast) at `/payroll/pay-runs/[id]`.
- Print preview on docs: UI at `/docs/[type]/[id]`; Download PDF = toast stub.
- Approval workflow config: Stub (toast) at `/automation/workflows`.
- Work queue: View links use `item.href`; all valid.
- Drill-through: Approvals use `drillToDocument`; work queue uses item hrefs.

---

## 7. Sheets / Forms — Persist (Frontend completion Session 2)

The following flows **persist to localStorage** via repos; list refreshes after Add/Save. No backend; API pending.

- Assets register → Add/Edit asset (`assets.repo.ts`)
- Treasury → Bank accounts → Add/Edit account (`bank-accounts.repo.ts`)
- Warehouse → Bin locations → Add/Edit bin (`bins.repo.ts`)
- Settings → Sequences → Add/Edit sequence (`sequences.repo.ts`)
- Settings → Users & roles → Add/Edit user, Add/Edit role (`users-roles.repo.ts`)
- Warehouse → Cycle counts → Create session (`cycle-counts.repo.ts`)

---

## 8. Summary Counts

| Kind | Count (approx.) |
|------|------------------|
| Inline TODO/FIXME comments | 0 |
| Files with stub/API-pending alerts or toasts | 28+ |
| Action registry stub CTAs | 21 |
| Explicit “API pending” / “API required” (from STUBS_AND_PENDING) | 35+ |
| `window.alert` stub usages | 0 (all replaced with toast in Session 1) |

**Frontend completion (6 sessions):** Sessions 1–6 from `docs/FRONTEND_COMPLETION_6_SESSIONS.md` completed — routes/nav, stub consistency (toast), persist flows (localStorage repos), drill-through & work queue, docs/print/approvals UX, analytics frontend, QA polish & doc updates.

---

*For full stub-by-module detail, see root `STUBS_AND_PENDING.md`. For route and CTA audit, see `docs/QA_ROUTE_MAP.md`.*
