# Backend API — single source of truth

**Purpose:** One document for backend and frontend: what exists, what each stub needs (method, path, body, response), and what is not yet specified. No dependency on other spec files; everything needed to implement or call APIs is below.

**Base path:** All routes use prefix `/api`. Auth and tenant/org isolation required on every request (e.g. Firebase token or dev headers; see your auth middleware).

---

## 1. Summary

| Category | Description |
|----------|-------------|
| **Implemented** | Document PDF, Payslip PDF, Treasury export CSV, Import (currencies, exchange-rates, COA, bank-statement), Costing run (partial). |
| **Stub → implement** | 24 action-registry actions + document CRUD/attachments/comments/bulk + settings + payroll/reports. Each has recommended method, path, body, response below. |
| **Backlog** | VAT summary, multipart file upload for import, full costing worker. |

---

## 2. Implemented APIs (contract for frontend)

### 2.1 Document PDF

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/documents/:docType/:id/pdf` | **200** — `Content-Type: application/pdf`, body = PDF buffer |

- **Params:** `docType` = `quote` \| `sales-order` \| `delivery-note` \| `invoice` \| `purchase-request` \| `purchase-order` \| `grn` \| `bill` \| `journal`. `id` = document ID.
- **Response headers:** `Content-Disposition: attachment; filename="<type>-<number>.pdf"`.
- **Frontend:** GET this URL; 200 → trigger blob download. 404/403 → show error.

### 2.2 Payslip PDF

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/payroll/payslips/:id/pdf` | **200** — `Content-Type: application/pdf`, body = PDF buffer |

- **Params:** `id` = payslip id (e.g. `payslip-<payRunId>-<lineIndex>` from GET `/api/payroll/payslips`).
- **Response headers:** `Content-Disposition: attachment; filename="payslip-<id>.pdf"`.

### 2.3 Treasury payment run export

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/treasury/payment-runs/:id/export?format=csv` | **200** — `Content-Type: text/csv`, CSV body |

- **Query:** `format=csv` (default). Other formats → 400.
- **Response headers:** `Content-Disposition: attachment; filename="payment-run-<number>.csv"`.
- **CSV columns:** `beneficiary_id,amount,currency,reference` (one row per payment line).

### 2.4 File import (JSON body: `csv` string or `rows` array)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/import/currencies` | `{ csv: "<string>" }` or `{ rows: [{ code, name?, symbol? }] }` | **201** — `{ imported, ids }` |
| POST | `/api/import/exchange-rates` | `{ csv: "<string>" }` or `{ rows: [{ fromCurrency, toCurrency, rate, date? }] }` | **200** — `{ imported }` |
| POST | `/api/import/coa` | `{ csv: "<string>" }` or `{ rows: [{ code, name, type?, parentCode? }] }` | **200** — `{ imported }` |
| POST | `/api/import/bank-statement` | `{ bankAccountId, csv: "<string>" }` or `{ bankAccountId, rows: [{ date, description?, amount, balance?, reference? }] }` | **201** — `{ imported, ids }` |

- **COA:** Types = ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE. Backend upserts by (orgId, code) and sets `parentId` from `parentCode`.
- **Bank statement:** Inserts lines with status PENDING.

### 2.5 Costing run (partial)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/inventory/costing/run` | `{}` | **200** — `{ runs: 1, updated: 0, message }` |

- **Behaviour:** Emit `costing.run` event for downstream worker; no FIFO/weighted-average in BFF. Full costing can be a worker that consumes the event.

---

## 3. Stub → endpoint (implement these)

Every row: frontend currently shows a toast or placeholder; backend should implement the endpoint so the frontend can call it.

### 3.1 Action-registry stubs (24)

| # | Frontend page | Action | Method | Path | Body / response | Permission |
|---|----------------|--------|--------|------|-----------------|------------|
| 1 | /master/products/[id] | Delete | DELETE | /api/products/:id | 204 or 404 | product write |
| 2 | /master/products/[id]/pricing | Apply template | POST | /api/products/:id/pricing/apply-template | `{ templateId }` → 200 | (same) |
| 3 | /docs/[type]/[id] | Request approval | POST | /api/documents/:docType/:id/request-approval | `{ comment? }` → 200; emit approval.requested | per doc type |
| 4 | /docs/[type]/[id] | Approve | POST | /api/documents/:docType/:id/action | `{ action: "approve", comment? }` → 200 | (same) |
| 5 | /docs/[type]/[id] | Post | POST | /api/documents/:docType/:id/action | `{ action: "post" }` → 200 | (same) |
| 6 | /docs/[type]/[id] | Export PDF | GET | /api/documents/:docType/:id/pdf | 200 + PDF (see §2.1) | (same) |
| 7 | /inventory/costing | Run costing | POST | /api/inventory/costing/run | `{}` → `{ runs, updated, message }` (see §2.5) | inventory.read |
| 8 | /warehouse/transfers/[id] | Mark received | POST | /api/warehouse/transfers/:id/receive | `{}` or `{ lines? }` → 200 | inventory.write |
| 9 | /warehouse/pick-pack/[id] | Complete | POST | /api/warehouse/pick-pack/:id/complete | `{}` → 200 | (same) |
| 10 | /warehouse/putaway/[id] | Confirm | POST | /api/warehouse/putaway/:id/confirm | `{}` → 200 | (same) |
| 11 | /warehouse/cycle-counts/[id] | Submit | POST | /api/warehouse/cycle-counts/:id/submit | `{}` → 200 | (same) |
| 12 | /purchasing/purchase-returns | Create / Get / Export / Approve | POST, GET, GET, POST | /api/purchasing/returns, /api/purchasing/returns/:id, /api/purchasing/returns/export?, /api/purchasing/returns/:id/action | Create: body lines; list/detail; export CSV; action: approve | purchasing.returns |
| 13 | /ap/three-way-match | Match selected | POST | /api/ap/three-way-match/match or /api/documents/bill/:id/match | `{ grnLineIds, billLineIds }` → 200 | purchasing.bills.read |
| 14 | /ar/payments | Allocate | POST | /api/ar/payments/:id/allocate or /api/ar/allocations | `{ invoiceIds, amounts }` → 200 | finance.ar.read |
| 15 | /finance/period-close | Close period | POST | /api/finance/period/close | `{ periodId }` or `{ date }` → 200 | finance.write |
| 16 | /finance/period-close | Reopen period | POST | /api/finance/period/reopen | `{ periodId }` → 200 | (same) |
| 17 | /treasury/payment-runs/[id] | Approve | POST | /api/treasury/payment-runs/:id/action | `{ action: "approve" }` → 200 | finance.ap.read |
| 18 | /assets/depreciation | Run depreciation | POST | /api/assets/depreciation/run | `{ period? }` → `{ runId, updated }` | finance.read |
| 19 | /payroll/pay-runs/[id] | Approve | POST | /api/payroll/pay-runs/:id/action | `{ action: "approve" }` → 200 | finance.read |
| 20 | /analytics/simulations | Apply suggestion | POST | /api/analytics/simulations/apply or /api/mrp/apply-suggestion | `{ suggestionId, override? }` → 200 | analytics / manufacturing |
| 21 | /automation/ai-insights | Apply action | POST | /api/automation/insights/:id/apply | `{ actionId }` → 200 | automation.read |
| 22 | /approvals/inbox | Approve | POST | /api/approvals/:id/approve | `{ comment? }` → 200 | approvals.read |
| 23 | /approvals/inbox | Reject | POST | /api/approvals/:id/reject | `{ comment? }` → 200 | (same) |
| 24 | /settings/org | Save | PATCH | /api/org | Org profile fields → 200 | settings.org.read |

### 3.2 Document CRUD and doc-adjacent

| Frontend | Action | Method | Path | Body / response | Permission |
|----------|--------|--------|------|-----------------|------------|
| Document view | Load doc + lines | GET | /api/documents/:docType/:id | 200 + doc + lines | per doc type |
| Document create | Create draft | POST | /api/documents/:docType | Doc body → 201 + id | (same) |
| Document create | Update draft | PATCH | /api/documents/:docType/:id | Partial doc → 200 | (same) |
| Print / Download PDF | PDF | GET | /api/documents/:docType/:id/pdf | 200 + PDF (§2.1) | (same) |
| DocumentAttachments | Upload | POST | /api/documents/:docType/:id/attachments | multipart file → 201 | (same) |
| DocumentAttachments | Download | GET | /api/documents/:docType/:id/attachments/:fileId | 200 + file stream | (same) |
| DocumentComments | Add comment | POST | /api/documents/:docType/:id/comments | `{ text }` → 201 | (same) |
| Docs list | Bulk Approve / Post | POST | /api/documents/:docType/bulk-action | `{ action, ids }` → 200 | (same) |
| Docs list | Export | GET | /api/documents/:docType/export | 200 + CSV | (same) |

### 3.3 Settings and import (frontend stubs)

| Frontend | Action | Method | Path | Body / response | Permission |
|----------|--------|--------|------|-----------------|------------|
| Settings → Notifications | Save | PATCH | /api/settings/notifications | Email/SMS/WhatsApp toggles → 200 | settings.read |
| Settings → Compliance | Save | PATCH | /api/settings/compliance | Org tax ids, e-invoicing, etc. → 200 | (same) |
| Settings → Financial → Currencies | Add / list | POST, GET | /api/currencies or /api/settings/currencies | CRUD | settings.org.read |
| Settings → Financial → Exchange rates | Import CSV | POST | /api/import/exchange-rates | §2.4 | (same) |
| Settings → Financial → COA | Import COA | POST | /api/import/coa | §2.4 | (same) |
| Settings → Financial → Fiscal years | Close / Reopen | POST | /api/finance/period/close, /api/finance/period/reopen | §3.1 rows 15–16 | finance.write |
| Settings → Inventory → Costing | Save template | POST/PATCH | /api/settings/inventory/costing-templates or /api/inventory/landed-cost/templates | Template CRUD | inventory.read |
| Settings → Products → Pricing rules | Add rule | POST | /api/settings/pricing-rules or /api/pricing/rules | Rule body → 201 | pricing.read |
| Settings → Sequences | Add sequence | POST | /api/sequences | Sequence body → 201 | settings.sequences.read |
| Settings → Users & roles | Add user / Add role | POST | /api/users, /api/roles | User/role body → 201 | settings.users.read |

### 3.4 Payroll and reports

| Frontend | Action | Method | Path | Body / response | Permission |
|----------|--------|--------|------|-----------------|------------|
| Payroll → Payslips | Download PDF | GET | /api/payroll/payslips/:id/pdf | 200 + PDF (§2.2) | finance.read |
| Payroll → Employees | Export | GET | /api/payroll/employees/export | 200 + CSV | (same) |
| Payroll → Pay runs | Request approval | POST | /api/payroll/pay-runs/:id/request-approval | `{}` → 200 | (same) |
| Reports → VAT summary | Run / Export | GET | /api/reports/vat-summary?period=&branchId= | 200 + JSON or CSV | finance.read |
| Reports → WHT summary | Run / Export | GET | /api/reports/wht-summary?period= | 200 + JSON or CSV | (same) |
| Reports → Report library | Run report | GET | /api/reports/:reportId/run?params | 200 + data or file | (same) |

---

## 4. Settings extended (persistence checklist)

Replace stub responses with real DB read/write. Example routes (base `/api`):

| Area | Routes | Notes |
|------|--------|------|
| Org & branches | GET/PATCH /org, GET/POST/PATCH /branches | Org profile, branches CRUD |
| Users & roles | GET/POST/PATCH /users, GET/POST/PATCH /roles, GET /permissions | Users, roles, permission list |
| Sequences | GET/POST/PATCH /sequences, GET /sequences/:documentType (next number) | Document number sequences |
| Financial | GET/POST/PATCH /currencies, /exchange-rates, /ledger-accounts (COA), /taxes, /fiscal-years | Currencies, rates, COA, tax, fiscal year |
| Inventory | GET/POST/PATCH /settings/inventory/costing, /uom | Costing config, UOM |
| Products | GET/POST/PATCH /pricing-rules | Pricing rules |
| Tax | GET/POST/PATCH /settings/tax/vat, /settings/tax/withholding, /settings/tax/kenya | VAT, WHT, Kenya profile |
| Notifications | GET/PATCH /settings/notifications | Email/SMS/WhatsApp toggles |
| Compliance | GET/PATCH /settings/compliance | E-invoicing, WHT cert, print templates |
| Audit log | GET /audit, GET /audit/export | Query and export audit |

---

## 5. Not yet specified (backend backlog)

| Item | Recommended |
|------|-------------|
| **VAT summary report** | GET /api/reports/vat-summary?period=&branchId= — aggregate from posted invoices/bills and tax lines by period. |
| **Multipart file upload for import** | Accept multipart/form-data with field `file`; parse CSV from `req.file.buffer.toString()`; return same JSON as current import (`{ imported, ids }` or `{ imported }`). |
| **Full costing logic** | Worker or service that consumes `costing.run` event; compute FIFO/weighted average from movements; update stock/cost store. |

---

## 6. Quick reference: frontend button → backend path

| Frontend action | Backend path (base /api) |
|-----------------|---------------------------|
| Download document PDF | GET /documents/:docType/:id/pdf |
| Download payslip PDF | GET /payroll/payslips/:id/pdf |
| Export payment run CSV | GET /treasury/payment-runs/:id/export?format=csv |
| Import currencies | POST /import/currencies |
| Import exchange rates | POST /import/exchange-rates |
| Import COA | POST /import/coa |
| Import bank statement | POST /import/bank-statement |
| Run costing | POST /inventory/costing/run |
| Request approval (doc) | POST /documents/:docType/:id/request-approval |
| Approve / Post (doc) | POST /documents/:docType/:id/action |
| Mark transfer received | POST /warehouse/transfers/:id/receive |
| Submit cycle count | POST /warehouse/cycle-counts/:id/submit |
| Approve payment run | POST /treasury/payment-runs/:id/action |
| Approve pay run | POST /payroll/pay-runs/:id/action |
| Close / Reopen period | POST /finance/period/close, POST /finance/period/reopen |
| Save org settings | PATCH /org |
| Approve / Reject (inbox) | POST /approvals/:id/approve, POST /approvals/:id/reject |

---

## 7. Response and error conventions

- **List endpoints:** `{ items: Array<T> }`; each `T` has `id`.
- **Single resource:** One object with `id` and fields.
- **Create:** 201 with `{ id: string }` (and optional `number`, `status`).
- **Errors:** 401 (no/invalid auth), 403 (missing permission), 404 (not found), 500 with `{ error: string }`.

---

## 8. Frontend completion status (wired stubs)

When **NEXT_PUBLIC_API_URL** is set, the frontend calls the backend for these actions. When not set, the UI shows a stub toast. Implemented via `src/lib/api/stub-endpoints.ts` and page handlers.

| # | Page | Action | Frontend |
|---|------|--------|----------|
| 3–6 | /docs/[type]/[id] | Request approval, Approve, Post, Export PDF | Wired |
| 7 | /inventory/costing | Run costing | Wired |
| 8 | /warehouse/transfers/[id] | Mark received | Wired |
| 9 | /warehouse/pick-pack/[id] | Complete | Wired |
| 10 | /warehouse/putaway/[id] | Confirm putaway | Wired |
| 11 | /warehouse/cycle-counts/[id] | Submit | Wired |
| 15–16 | /finance/period-close | Close period, Reopen period | Wired |
| 17 | /treasury/payment-runs/[id] | Approve | Wired |
| 19 | /payroll/pay-runs/[id] | Approve | Wired |
| 22–23 | /approvals/inbox | Approve, Reject | Wired |
| 24 | /settings/org | Save | Wired |
| 1 | /master/products/[id] | Delete | Wired |
| 2 | /master/products/[id]/pricing | Apply template | Wired |
| 12 | /purchasing/purchase-returns | Create, Export, Approve (bulk) | Wired |
| 13 | /ap/three-way-match | Match selected | Wired |
| 14 | /ar/payments | Allocate | Wired (Allocate sheet + submit) |
| 18 | /assets/depreciation | Run depreciation | Wired |
| 20 | /analytics/simulations | Apply suggestion | Wired |
| 21 | /automation/ai-insights | Apply action | Wired (CopilotActionCards) |

---

*This document is the single source of truth for backend API implementation and frontend integration. It does not reference REMAINING_SPEC, REMAINING, or other external spec files.*
