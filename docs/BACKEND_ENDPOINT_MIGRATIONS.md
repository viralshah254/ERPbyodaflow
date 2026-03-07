# Backend endpoint migrations — stubs list and required APIs

**Superseded by:** [BACKEND_API_SPEC_SINGLE_SOURCE.md](./BACKEND_API_SPEC_SINGLE_SOURCE.md) — use it as the single source of truth.

**Purpose (legacy):** Single checklist for backend: every frontend stub that needs a real API, with recommended method, path, body, and response. Use this to create or migrate endpoints so the frontend can replace toasts with real calls.

**References:**
- **[BACKEND_API_SPEC_SINGLE_SOURCE.md](./BACKEND_API_SPEC_SINGLE_SOURCE.md)** — single source of truth (implemented + stubs + migrations; no external spec deps).
- [PENDING_AND_STUBS_MASTER.md](./PENDING_AND_STUBS_MASTER.md) — Full inventory of stubs, pending UI, pending workflows, and pending tasks (canonical checklist).
- [REMAINING_BACKEND_IMPLEMENTED.md](./REMAINING_BACKEND_IMPLEMENTED.md) — What is already implemented (PDF, import, treasury export, costing run partial).
- [BACKEND_SPEC.md](./BACKEND_SPEC.md) — Full API contract (§10, §13); permissions §10.11.
- [BACKEND_SPEC_COOL_CATCH.md](./BACKEND_SPEC_COOL_CATCH.md) — Cool Catch / franchise endpoints.
- [STUBS_AND_PENDING.md](../STUBS_AND_PENDING.md) — Frontend stub behavior by module; what’s real vs mock.
- `src/lib/qa/action-registry.ts` — Source of “stub” actions (status `"stub"`).

Base path for all routes below: **`/api`**. Auth and tenant/org isolation required on every request.

---

## 1. Summary: implemented vs stub

| Category | Count | Notes |
|----------|--------|------|
| **Already implemented** | PDF (doc + payslip), treasury export, import (currencies, exchange-rates, COA, bank-statement), costing run (partial) | See REMAINING_BACKEND_IMPLEMENTED.md |
| **Stub → endpoint needed** | 28 (action-registry) + doc/settings/other stubs below | Replace toast with real API call; **15 wired** in frontend (see BACKEND_API_SPEC_SINGLE_SOURCE §8) |
| **Not yet specified** | VAT summary, multipart file upload for import, full costing worker | Backend can add when ready |

---

## 2. Stub → endpoint migration (from action-registry)

Each row: **Page** | **Action** | **Recommended endpoint** | **Permission** (from BACKEND_SPEC §10.11 or doc type).

| # | Page | Action | Method | Path | Body / response | Permission |
|---|------|--------|--------|------|-----------------|------------|
| 1 | /master/products/[id] | Delete | DELETE | /products/:id | 204 or 404 | masters/sales write |
| 2 | /master/products/[id]/pricing | Apply template | POST or PUT | /products/:id/pricing/apply-template | `{ templateId }` → 200 | (same) |
| 3 | /docs/[type]/[id] | Request approval | POST | /documents/:docType/:id/request-approval | `{ comment? }` → 200; emit approval.requested | per doc type |
| 4 | /docs/[type]/[id] | Approve | POST | /documents/:docType/:id/action | `{ action: "approve", comment? }` → 200 | (same) |
| 5 | /docs/[type]/[id] | Post | POST | /documents/:docType/:id/action | `{ action: "post" }` → 200 | (same) |
| 6 | /docs/[type]/[id] | Export PDF | GET | /documents/:docType/:id/pdf | 200 + PDF buffer (see REMAINING_BACKEND_IMPLEMENTED §1.1) | (same) |
| 7 | /inventory/costing | Run costing | POST | /inventory/costing/run | `{}` → `{ runs, updated, message }` (see §4 REMAINING) | inventory.read |
| 8 | /warehouse/transfers/[id] | Mark received | POST | /warehouse/transfers/:id/receive | `{}` or `{ lines? }` → 200 | inventory.write |
| 9 | /warehouse/pick-pack/[id] | Complete | POST | /warehouse/pick-pack/:id/complete | `{}` → 200 | (same) |
| 10 | /warehouse/putaway/[id] | Confirm | POST | /warehouse/putaway/:id/confirm | `{}` → 200 | (same) |
| 11 | /warehouse/cycle-counts/[id] | Submit | POST | /warehouse/cycle-counts/:id/submit | `{}` → 200 | (same) |
| 12 | /purchasing/purchase-returns | Create Return, Row click, Export, Approve (bulk) | POST, GET, GET, POST | /purchasing/returns, /purchasing/returns/:id, /purchasing/returns/export?, /purchasing/returns/:id/action | Create: body lines; List/detail; Export CSV; Action: approve | purchasing.returns.read/write |
| 13 | /ap/three-way-match | Match selected | POST | /ap/three-way-match/match or /documents/bill/:id/match | `{ grnLineIds, billLineIds }` → 200 | purchasing.bills.read |
| 14 | /ar/payments | Allocate | POST | /ar/payments/:id/allocate or /ar/allocations | `{ invoiceIds, amounts }` → 200 | finance.ar.read |
| 15 | /finance/period-close | Close period | POST | /finance/period/close | `{ periodId or date }` → 200 | finance.write |
| 16 | /finance/period-close | Reopen period | POST | /finance/period/reopen | `{ periodId }` → 200 | (same) |
| 17 | /treasury/payment-runs/[id] | Approve | POST | /treasury/payment-runs/:id/action | `{ action: "approve" }` → 200 | finance.ap.read |
| 18 | /assets/depreciation | Run depreciation | POST | /assets/depreciation/run | `{ period? }` → `{ runId, updated }` | finance.read |
| 19 | /payroll/pay-runs/[id] | Approve | POST | /payroll/pay-runs/:id/action | `{ action: "approve" }` → 200 | finance.read |
| 20 | /analytics/simulations | Apply suggestion | POST | /analytics/simulations/apply or /mrp/apply-suggestion | `{ suggestionId, override? }` → 200 | manufacturing.production.read or analytics |
| 21 | /automation/ai-insights | Apply action | POST | /automation/insights/:id/apply | `{ actionId }` → 200 | automation.read |
| 22 | /approvals/inbox | Approve | POST | /approvals/:id/approve | `{ comment? }` → 200 | approvals.read |
| 23 | /approvals/inbox | Reject | POST | /approvals/:id/reject | `{ comment? }` → 200 | (same) |
| 24 | /settings/org | Save | PATCH | /org | Org profile fields → 200 | settings.org.read |

---

## 3. Document and doc-adjacent stubs (from STUBS_AND_PENDING)

| Location | Action | Method | Path | Body / response | Permission |
|----------|--------|--------|------|-----------------|------------|
| Document view | Load doc + lines | GET | /documents/:docType/:id | 200 + doc + lines | per doc type |
| Document create | Save draft / Create | POST | /documents/:docType | Doc body → 201 + id | (same) |
| Document create | Update draft | PATCH | /documents/:docType/:id | Partial doc → 200 | (same) |
| PrintPreviewDrawer | Download PDF | GET | /documents/:docType/:id/pdf | 200 + PDF (see §1.1 REMAINING) | (same) |
| DocumentAttachments | Upload | POST | /documents/:docType/:id/attachments | multipart file → 201 | (same) |
| DocumentAttachments | Download | GET | /documents/:docType/:id/attachments/:fileId | 200 + file stream | (same) |
| DocumentComments | Add comment | POST | /documents/:docType/:id/comments | `{ text }` → 201 | (same) |
| Docs list | Bulk Approve / Post / Export | POST, POST, GET | /documents/:docType/bulk-action, /documents/:docType/export | body: `{ action, ids }`; export: CSV | (same) |

---

## 4. Settings and import stubs

| Location | Action | Method | Path | Body / response | Permission |
|----------|--------|--------|------|-----------------|------------|
| Settings → Notifications | Save | PATCH | /settings/notifications | Email/SMS/WhatsApp toggles → 200 | settings.read |
| Settings → Compliance | Save | PATCH | /settings/compliance | Org tax ids, e-invoicing, etc. → 200 | (same) |
| Settings → Financial → Currencies | Add / list | POST, GET | /settings/currencies or /currencies | CRUD | settings.org.read |
| Settings → Financial → Exchange rates | Import CSV | POST | /import/exchange-rates | `{ csv }` or `{ rows }` → 200 (see REMAINING §3.2) | (same) |
| Settings → Financial → COA | Import COA | POST | /import/coa | `{ csv }` or `{ rows }` → 200 (see REMAINING §3.3) | (same) |
| Settings → Financial → Fiscal years | Close / Reopen | POST | /finance/period/close, /finance/period/reopen | (see §2 table above) | finance.write |
| Settings → Inventory → Costing | Save template | POST/PATCH | /settings/inventory/costing-templates or /inventory/landed-cost/templates | Template CRUD | inventory.read |
| Settings → Products → Pricing rules | Add rule | POST | /settings/pricing-rules or /pricing/rules | Rule body → 201 | pricing.read |
| Settings → Sequences | Add sequence | POST | /sequences | Sequence body → 201 | settings.sequences.read |
| Settings → Users & roles | Add user / Add role | POST | /users, /roles | User/role body → 201 | settings.users.read |

---

## 5. Payroll and reports stubs

| Location | Action | Method | Path | Body / response | Permission |
|----------|--------|--------|------|-----------------|------------|
| Payroll → Payslips | Download PDF | GET | /payroll/payslips/:id/pdf | 200 + PDF (see REMAINING §1.2) | finance.read |
| Payroll → Employees | Export | GET | /payroll/employees/export | 200 + CSV | (same) |
| Payroll → Pay runs | Request approval | POST | /payroll/pay-runs/:id/request-approval | `{}` → 200 | (same) |
| Reports → VAT summary | Run / Export | GET | /reports/vat-summary?period= | 200 + JSON or CSV | finance.read |
| Reports → WHT summary | Run / Export | GET | /reports/wht-summary?period= | 200 + JSON or CSV | (same) |
| Reports → Report library | Run report | GET | /reports/:reportId/run?params | 200 + data or file | (same) |

---

## 6. Settings extended — routes to implement (persistence)

Replace stubs with real DB read/write. Reference BACKEND_SPEC §13 Stage 3 and main spec “settings-extended” section. Example routes (base `/api`):

| Area | Example routes | Notes |
|------|-----------------|------|
| Org & branches | GET/PATCH /org, GET/POST/PATCH /branches | Org profile, branches list/CRUD |
| Users & roles | GET/POST/PATCH /users, GET/POST/PATCH /roles, GET /permissions | Already in §13 Stage 2 |
| Sequences | GET/POST/PATCH /sequences, GET /sequences/:documentType (next number) | Document number sequences |
| Financial | GET/POST/PATCH /currencies, GET/POST/PATCH /exchange-rates, GET/POST/PATCH /ledger-accounts (COA), GET/POST/PATCH /taxes, GET/POST/PATCH /fiscal-years | Currencies, rates, COA, tax, fiscal year |
| Inventory | GET/POST/PATCH /settings/inventory/costing, /uom | Costing config, UOM |
| Products | GET/POST/PATCH /pricing-rules | Pricing rules |
| Tax | GET/POST/PATCH /settings/tax/vat, /settings/tax/withholding, /settings/tax/kenya | VAT, WHT, Kenya profile |
| Notifications | GET/PATCH /settings/notifications | Email/SMS/WhatsApp toggles |
| Compliance | GET/PATCH /settings/compliance | E-invoicing, WHT cert, print templates |
| Audit log | GET /audit, GET /audit/export | Query and export audit |

---

## 7. Not yet implemented (backend backlog)

| Item | Spec / doc | Recommended |
|------|------------|-------------|
| VAT summary report | REMAINING §6.2 | GET /reports/vat-summary?period=&branchId= → aggregate from posted invoices/bills and tax lines |
| Multipart file upload for import | REMAINING §3 | Accept multipart/form-data with field `file`; parse CSV from `req.file.buffer.toString()`; same JSON response as current import |
| Full costing logic | REMAINING §4, §6.1 | Worker or service that consumes `costing.run` event; FIFO/weighted average from movements; update stock/cost store |

---

## 8. Quick reference: frontend → backend path mapping

| Frontend call / button | Backend path (base /api) |
|------------------------|---------------------------|
| Download document PDF | GET /documents/:docType/:id/pdf |
| Download payslip PDF | GET /payroll/payslips/:id/pdf |
| Export payment run CSV | GET /treasury/payment-runs/:id/export?format=csv |
| Import currencies CSV | POST /import/currencies |
| Import exchange rates CSV | POST /import/exchange-rates |
| Import COA CSV | POST /import/coa |
| Import bank statement CSV | POST /import/bank-statement |
| Run costing | POST /inventory/costing/run |
| Request approval (doc) | POST /documents/:docType/:id/request-approval |
| Approve / Post (doc) | POST /documents/:docType/:id/action |
| Mark transfer received | POST /warehouse/transfers/:id/receive |
| Submit cycle count | POST /warehouse/cycle-counts/:id/submit |
| Approve payment run | POST /treasury/payment-runs/:id/action |
| Approve pay run | POST /payroll/pay-runs/:id/action |
| Close / Reopen period | POST /finance/period/close, /finance/period/reopen |
| Save org settings | PATCH /org |
| Approve / Reject (inbox) | POST /approvals/:id/approve, POST /approvals/:id/reject |

---

**Reference:** BACKEND_SPEC.md §10.13, §13; REMAINING_BACKEND_IMPLEMENTED.md; STUBS_AND_PENDING.md; `src/lib/qa/action-registry.ts`.
