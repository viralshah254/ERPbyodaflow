# OdaFlow ERP — Stubs, API Requirements & Pending Work

**Purpose:** Single source of truth for all stub behavior, API‑pending actions, mock‑only data, and pending work across the ERP frontend.

**Context:** Frontend‑only. No `fetch`/axios/API calls. Mock engine + `localStorage` overlay. Architecture is real; replace stubs with backend when ready.

---

## 1. Overview

| Category | Description |
|----------|-------------|
| **Stub** | Button/action shows `window.alert` or toast; no real side effect (e.g. "Save (stub). API pending."). |
| **API required** | Explicitly marked "API pending" or "replace with API"; needs backend to implement. |
| **Mock data** | All list/detail data from `src/lib/mock/*` or `*\.repo` with optional `localStorage` overlay. |
| **Real** | Implemented end‑to‑end in frontend (e.g. CSV download, navigation, Copilot drawer open). |

### What’s real today

- **Auth:** Mock login (demo accounts) → sets user/org/tenant/branch; redirect to dashboard.
- **Navigation:** All routes, sidebar, command palette, document create → list → detail.
- **Exports (CSV):** Pay run bank file (`/payroll/pay-runs/[id]` → Generate bank file), Treasury payment run CSV.
- **Payroll repo:** `listEmployees`, `listPayRuns`, `createEmployee`, `createPayRun`, pay run lines/payslips derived from employees; persisted via `localStorage`.
- **Products repo:** Products, packaging, pricing with `localStorage` overlay.
- **Tax repo:** Kenya profile, VAT, WHT, mappings; `localStorage` persistence.
- **Saved views, doc draft, setup checklist, sidebar state, template store:** `localStorage`.
- **Copilot:** Drawer, chat UI, ExplainThis, action cards, Apply → toast (stub). No LLM/API.
- **Analytics:** `runAnalyticsQuery` mock engine; Explore, Insights, Anomalies, Settings pages.

### What’s not connected

- **No REST/GraphQL.** Zero `fetch` or axios usage in app code.
- **No real PDF generation.** All “Download PDF” are stubs.
- **No real approval/workflow backend.** Approve/Reject/Request approval → alert stubs.
- **No real file upload.** Attachments, COA import, etc. → stubs.

---

## 2. Stubs & API‑Required (by module)

### 2.1 Layout & Copilot

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| `main-layout` | Copilot “Apply” action | Toast: “Action applied (stub). API pending.” | Yes |
| `CopilotActionCards` | All 6 cards (pricing, payroll, tax) | Apply → open review → Apply → toast | Yes |
| `CopilotChat` | Send message, threads | UI only; no LLM / chat API | Yes |

### 2.2 Documents

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| `docs/[type]/[id]` | Request approval | `window.alert("Request approval (stub): API pending.")` | Yes |
| `docs/[type]/[id]` | Doc view | “Document #id — stub. Date, party, totals would render here.”; line table stub | Yes |
| `DocumentCreateWizard` | Taxes & charges step | “Taxes (stub). Configure tax codes and charges.”; Notes (stub) | Yes |
| `DocumentCreateWizard` | Review → Create draft | Redirect to `/docs/{type}/1`; no real create API | Yes |
| `DocumentCreateWizard` | Posting preview | “Stub: mock GL lines”; FX Gain/Loss (stub) | Yes |
| `DocumentLineEditor` | — | “Sales vs purchasing: optional supplier price list stub” | — |
| `PrintPreviewDrawer` | Download PDF | `window.alert("Download PDF (stub). API pending.")` | Yes |
| `PrintPreviewDrawer` | Content | “Line 1 (stub)”, “Line 2 (stub)” | — |
| `DocumentAttachments` | Upload | `window.alert("Upload (stub): API pending.")` | Yes |
| `DocumentAttachments` | Download | `window.alert("Download (stub): {name}")` | Yes |
| `DocumentComments` | Add comment | `window.alert("Add comment (stub): API pending.")` when no handler | Yes |
| `docs/[type]` list | Export, Approve, Post | `window.alert` stubs for bulk actions | Yes |

### 2.3 Payroll

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Payroll settings | Save | `window.alert("Save (stub). API pending.")` | Yes |
| Employees | Export | `window.alert("Export (stub)")` | Yes |
| Employees | Create sheet | “Bank & statutory stubs.” | — |
| Pay runs | Request approval | `window.alert("Request approval (stub). Links to approvals module.")` | Yes |
| Pay runs | Export | `window.alert("Export (stub)")` | Yes |
| Pay run detail | Approve | `window.alert("Approve (stub). API pending.")` | Yes |
| Pay run detail | Request approval | `window.alert("Request approval (stub).")` | Yes |
| Pay run detail | **Generate bank file** | **Real CSV download** | No |
| Pay run detail | Post payroll journal | Navigate to `/docs/journal/new` | No |
| Payslips | Download PDF | `window.alert("Download PDF (stub). API pending.")` | Yes |
| Payslips | Export | `window.alert("Export (stub)")` | Yes |
| Statutories | Edit | “Seed list; allow edit (stub).” | Yes |

### 2.4 Settings

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Compliance | Save | `window.alert("Save (stub). API pending.")` | Yes |
| Compliance | Org tax identifiers, print templates, e‑invoicing, WHT toggle | Stub descriptions | Yes |
| Notifications | Save | `window.alert("Save (stub). API pending.")` | Yes |
| Notifications | Email/SMS/WhatsApp | “Stubs. No real integrations.” | Yes |
| Organization entities | Add entity | `window.alert("Add entity (stub). API pending.")` | Yes |
| Organization entities | Export | `window.alert("Export (stub)")` | Yes |
| Products → Pricing rules | Add rule | `window.alert("Add rule (stub). API pending.")` | Yes |
| Tax → Withholding | WHT certificate | `window.alert("WHT certificate (stub). API pending.")` | Yes |
| Tax → Kenya | Save | `window.alert("Saved.")` (localStorage only) | — |
| Financial → Currencies | Add currency | `window.alert("Add currency: API pending.")` | Yes |
| Financial → Exchange rates | Import CSV | `window.alert("Import CSV: API pending.")`; “API not connected.” | Yes |
| Financial → Chart of accounts | Import COA | `window.alert("Import COA (stub): API pending.")` | Yes |
| Financial → Fiscal years | Close / Reopen period | `window.alert` stubs for close and reopen | Yes |
| Inventory → Costing | Landed cost template | “Stub. Freight, insurance, duty, etc.”; Save → `window.alert("Save (stub). API pending.")` | Yes |
| Sequences | Add sequence | “Stub — no persist.” | Yes |
| Users & roles | Add user / Add role | “Stub — no persist.” | Yes |

### 2.5 Reports

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Report library | Run report | `window.alert("Run report (stub): {name}")` | Yes |
| VAT summary | Export | `window.alert("Export (stub)")` | Yes |
| WHT summary | Export | `window.alert("Export (stub)")` | Yes |
| Saved views | Save view, Run, Edit | `window.alert` stubs | Yes |
| Scheduled | Schedule report, Edit | `window.alert` stubs | Yes |
| Exports | Export, Download | `window.alert` stubs | Yes |

### 2.6 Master data

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Products | Bulk import | `window.alert("Bulk import (stub): CSV preview would open here.")` | Yes |
| Products | Export | `window.alert("Export (stub)")` | Yes |
| Products | Duplicate check | “Possible duplicate: similar SKU exists (stub).” | Yes |
| Product → Pricing | Apply pricing template | `window.alert("Apply pricing template (stub). API pending.")` | Yes |
| Product → Pricing | Matrix | “Effective per {baseUom} by list (stub matrix).” | — |

### 2.7 Intercompany

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Transactions | Generate elimination journal | `window.alert("...stub. Would create draft JE.")`; navigates to `/docs/journal/new` | Yes |
| Transactions | Create IC invoice / IC bill | `window.alert` stubs | Yes |
| Transactions | Consolidation report | `window.alert("Open consolidation report (stub).")` | Yes |
| Transactions | Export | `window.alert("Export (stub)")` | Yes |
| Overview | P&L | “P&L stub” | Yes |

### 2.8 Projects & timesheets

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Projects list | Create project | `window.alert("Create project (stub). API pending.")` | Yes |
| Projects list | Export | `window.alert("Export (stub)")` | Yes |
| Project detail | Link transaction | `window.alert("Link transaction (stub). Attach bill/journal/expense.")` | Yes |
| Timesheets | Submit for approval | `window.alert("Submit for approval (stub). Reuse approvals module.")` | Yes |
| Timesheets | Add project/task rows | “Add project/task rows (stub).” | Yes |

### 2.9 Assets

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Register | Add asset sheet | “Stub — no persist.”; Linked vendor/invoice (stub) | Yes |
| Register | Export | `window.alert("Export (stub)")` | Yes |
| Register detail | Linked vendor/invoice | “(stub)” | Yes |
| Depreciation | Post depreciation | `window.alert("Post depreciation (stub). Creates journal and redirect to review.")`; navigates to journal | Yes |
| Disposals | Export | `window.alert("Export (stub)")` | Yes |
| Disposals | Disposal wizard | “Step 1/2. Stub.”; “Review and post (stub). Would create journal entries.”; Post → `window.alert("Post disposal (stub).")` | Yes |

### 2.10 Inventory & costing

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Costing | Landed cost | “Select GRN or Bill, add landed cost lines, allocate… Stub.” | Yes |
| Costing | Save allocation | `window.alert("Save allocation (stub). API pending.")` | Yes |
| Stock, movements, receipts | Export, Post | `window.alert` stubs | Yes |

### 2.11 Finance & bank recon

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Bank recon | Create adjusting entry | `window.alert("...stub: Draft JE created. Opening review.")`; navigates to journal | Yes |
| Bank recon | AI match suggestions | `window.alert("AI match suggestions (stub): Would propose matches.")` | Yes |
| Bank recon | Create payment from statement line | `window.alert("Create payment (stub) from statement line... API pending.")` | Yes |
| Bank recon | Matching rules | “Matching rules (stub)”; Auto‑match, Match by reference → `window.alert` stubs | Yes |
| Bank recon | Match (stmt ↔ sys) | `window.alert("Match (stub): ...")` | Yes |
| Journals | Export | `window.alert("Export (stub)")` | Yes |

### 2.12 Treasury

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Cashflow | Currency select | “USD (stub)”; “Drilldown to source docs (stub)” | Yes |
| Cashflow | Drilldown | `window.alert("Drilldown (stub): {sourceDoc}. Would open doc view.")` | Yes |
| Bank accounts | Add account sheet | “Stub — no persist.” | Yes |
| Bank accounts | Export | `window.alert("Export (stub)")` | Yes |
| Collections | Export | `window.alert("Export (stub)")` | Yes |
| Payment runs | Request approval | `window.alert("Request approval (stub). API pending.")` | Yes |
| Payment runs | **Export CSV** | **Real CSV download** | No |
| Payment runs | Bank format | `window.alert("Bank format (stub). API pending.")` | Yes |
| Payment runs | Export (list) | `window.alert("Export (stub)")` | Yes |
| Payment run detail | Approve | `window.alert("Approve (stub). Reuse approvals module.")` | Yes |
| Payment run detail | Export CSV / Bank | `window.alert("Export CSV / Bank format (stub).")` | Yes |

### 2.13 Warehouse

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Transfers | Bulk actions (Approve, In transit, Receive) | `window.alert("…(stub): … API pending.")` | Yes |
| Transfers | Create transfer | `window.alert("Create transfer (stub). API pending.")` | Yes |
| Transfers | Export | `window.alert("Export (stub)")` | Yes |
| Transfer detail | Approve, Mark in transit, Receive | `window.alert` stubs | Yes |
| Putaway | Allocate to bins | `window.alert("Allocate to bins (stub). API pending.")` | Yes |
| Putaway | Export | `window.alert("Export (stub)")` | Yes |
| Pick‑pack | Confirm pick/pack, Mark dispatched | `window.alert` stubs; “suggested bin”, “Cartons, packing note”, “Courier, tracking” stubs | Yes |
| Pick‑pack | Export | `window.alert("Export (stub)")` | Yes |
| Cycle counts | Enter quantities, Post adjustments | `window.alert` stubs (“Scan/enter UI”, “API pending”) | Yes |
| Cycle counts | Create count sheet | “Stub.” | Yes |
| Cycle counts | Export | `window.alert("Export (stub)")` | Yes |
| Bin locations | Add bin sheet | “Stub — no persist.” | Yes |
| Bin locations | Export | `window.alert("Export (stub)")` | Yes |

### 2.14 AP / AR

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| AP Bills | Post, Export | `window.alert` stubs | Yes |
| AP Payments | Pay supplier | `window.alert("Pay supplier: API pending.")` | Yes |
| AP Payments | Export | `window.alert("Export (stub)")` | Yes |
| AR Payments | Submit payment | `window.alert("Submit payment: API pending.")` | Yes |
| AR Payments | Export | `window.alert("Export (stub)")` | Yes |
| AR Payments | Flow | “Customer → Open invoices → Allocate → Review. API pending.” | Yes |
| Three‑way match | Match / Create Bill | `window.alert` stubs | Yes |

### 2.15 Sales & purchasing (docs)

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Orders, quotes, deliveries, invoices | Approve, Post, Export | `window.alert` stubs | Yes |
| Purchase orders, requests, receipts | Approve, Post, Export | `window.alert` stubs | Yes |

### 2.16 Approvals & automation

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Approvals inbox | Approve / Reject | `window.alert("Approve (stub): {id}" | "Reject (stub): {id}")` | Yes |
| Automation rules | “Require approval” action | `window.alert("Require approval (stub): API pending.")` | Yes |

### 2.17 Analytics

| Location | Action | Behavior | API? |
|----------|--------|----------|------|
| Engine | `runAnalyticsQuery` | Mock deterministic data. Comment: “Replace with real API later. Architecture is real.” | Yes |
| Insights | Cards | Placeholder explanation/forecast/recommendation/anomaly/simulation; “Week 4” | — |
| Anomalies | — | Uses `AnomalyDetection` + `getMockAnomalies`; “Investigate → workflow” (Week 4) | — |

---

## 3. Mock data & localStorage

### 3.1 Repos (data layer)

| Repo | Source | Persistence | Notes |
|------|--------|-------------|-------|
| `products.repo` | `mock/products/*`, packaging, price‑lists | `localStorage` overlay | Products, packaging, pricing |
| `payroll.repo` | `mock/payroll/*` | `localStorage` for employees, pay runs | Lines/payslips computed from employees |
| `tax.repo` | `mock/tax/kenya`, coa | `localStorage` for profile, VAT, WHT, mappings | — |

### 3.2 Other mock / localStorage usage

| Area | Storage | Purpose |
|------|---------|---------|
| Document create wizard | `localStorage` draft key per doc type | Persist form draft |
| Saved views | `saved-views` | Per‑scope saved views |
| Setup checklist | `CHECKLIST_KEY` | Completed steps |
| Sidebar state | `odaflow_*` | Right panel, compact mode |
| Template store | `odaflow_erp_template` | Selected industry template |
| Financial settings | `useFinancialSettings` / mock | Currencies, etc. |
| Exchange rates | Mock + `localStorage` | Rate rows |
| Product VAT category | `odaflow_product_vat_{id}` | Per‑product VAT (product detail) |

### 3.3 Mock-only (no overlay)

All list/detail data for docs, reports, assets, projects, timesheets, AR/AP, treasury, inventory, warehouse, etc. comes from `src/lib/mock/*`. No `localStorage` persistence for those unless explicitly listed above.

---

## 4. Exports & downloads

| Feature | Type | Implementation |
|---------|------|----------------|
| Pay run bank file CSV | **Real** | `exportPayRunBankCSV` in pay run detail; blob download |
| Treasury payment run CSV | **Real** | Blob download in payment runs list |
| All other “Export” buttons | Stub | `window.alert("Export (stub)")` or similar |
| All “Download PDF” | Stub | `window.alert("Download PDF (stub). API pending.")` |

---

## 5. Sheets / forms “no persist”

These add/create flows use sheets or modals but do **not** persist to any backend or meaningful store:

- Assets register → Add asset
- Treasury → Bank accounts → Add account
- Warehouse → Bin locations → Add bin
- Sequences → Add sequence
- Users & roles → Add user, Add role
- Cycle count create (partial)

---

## 6. Pending & roadmap

### 6.1 Analytics (weeks 2–4)

- **Week 2:** Explorer (MetricPicker, DimensionStack, GlobalFilterBar, InsightCanvas, ExplorerTable, DrillDrawer), visual system (KpiHero, TrendStrip, etc.), saved analysis views.
- **Week 3:** Product/pricing, inventory, finance, payroll intelligence modules; margin waterfall, stockout root cause, cash drivers, labor cost drivers, etc.
- **Week 4:** AI insight engine (Explanation, Forecast, Recommendation, Anomaly, Simulation), Anomaly Center, Simulation Lab, action integration (every insight → pricing editor, PO, rule, approval, etc.).

### 6.2 AI & Copilot

- **Copilot chat:** UI only; no LLM or chat API. See `AI_INTEGRATION_STRATEGY.md` for affordable AI options (e.g. NL queries, forecasting, smart defaults).
- **Action cards:** Apply = toast stub; backend could implement “fix pricing tiers”, “suggest conversions”, etc.

### 6.3 Work queue & anomalies

- Work queue (`/work/queue`): Mock payroll/tax/pricing alerts; “View” links to existing pages.
- Anomalies: Mock detection + `AnomalyDetection`; “Investigate → workflow” and severity/entities to be wired (Week 4).

### 6.4 General backend

- Auth: Real login, sessions, tenants, permissions.
- Documents: CRUD, workflow (draft → submit → approve → post), GL posting.
- Master data: Products, parties, warehouses, etc. via API.
- Payroll: Employees, pay runs, statutory config, bank file generation, payslip PDF.
- Finance: Journals, bank recon, period close, AP/AR payment execution.
- Reports: Run, export, schedule, save views.
- Files: Attachments, COA import, CSV import (currencies, exchange rates, etc.).

---

## 7. Dev & QA

- **`/dev/action-audit`:** Documents “no dead buttons”; sample locations (e.g. Master Products, Doc wizard, Payroll export, Compliance save, Payment run CSV).
- **`/dev/route-check`:** Lists nav + extra routes for reachability checks.
- **`/dev/data-health`:** Data health checks (when implemented).

---

## 8. Summary counts

| Kind | Count (approx.) |
|------|------------------|
| `window.alert` stub usages | 90+ |
| Explicit “API pending” / “API required” | 35+ |
| Real CSV exports | 2 (pay run bank, payment run) |
| Mock data modules | 60+ under `src/lib/mock` |
| `localStorage`‑backed repos / features | 10+ |

---

*Generated from codebase scan. Update this doc when adding or removing stubs, APIs, or mocks.*
