# Backend remaining — what was implemented

**Superseded by:** [BACKEND_API_SPEC_SINGLE_SOURCE.md](./BACKEND_API_SPEC_SINGLE_SOURCE.md)

The single-source document contains the full contract for implemented APIs (§2), plus all stubs and migrations. This file is kept for backward reference only.

---

## 1. PDF export (§1 — done)

### 1.1 Document PDF

| Method | Path | Status | Response |
|--------|------|--------|----------|
| GET | `/docs/:type/:id/pdf` or `/documents/:docType/:id/pdf` | **200** | `Content-Type: application/pdf`, body = PDF buffer |

- **Auth:** Same as document read; RBAC by doc type (sales, purchasing, finance).
- **Params:** `:type` / `:docType` = `quote`, `sales-order`, `delivery-note`, `invoice`, `purchase-request`, `purchase-order`, `grn`, `bill`, `journal`. `:id` = document ID.
- **Headers (response):** `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<type>-<number>.pdf"`.
- **Implementation:** Loads document and optional party name; builds PDF via PDFKit (header, number, date, party, line items table, totals).

**Frontend:** Call this URL; on 200 trigger download of the blob. On 404/403 show error.

### 1.2 Payslip PDF

| Method | Path | Status | Response |
|--------|------|--------|----------|
| GET | `/payroll/payslips/:id/pdf` | **200** | `Content-Type: application/pdf`, body = PDF buffer |

- **Auth:** `finance.read`.
- **Params:** `:id` = payslip id in form `payslip-<payRunId>-<lineIndex>` (e.g. from GET `/payroll/payslips` items).
- **Headers (response):** `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="payslip-<id>.pdf"`.
- **Implementation:** Resolves pay run and line, loads employee for name; builds PDF with employee, period, gross, deductions, net.

**Frontend:** “Download PDF” on payslip row → GET this URL; 200 → download.

---

## 2. Treasury payment run export (§2 — done)

| Method | Path | Status | Response |
|--------|------|--------|----------|
| GET | `/treasury/payment-runs/:id/export` | **200** | CSV file (or 400 if format not supported) |

- **Query:** `?format=csv` (default). Other formats return 400.
- **Response:** `Content-Type: text/csv`, `Content-Disposition: attachment; filename="payment-run-<number>.csv"`.
- **CSV columns:** `beneficiary_id,amount,currency,reference` (one row per payment line; beneficiary_id = supplierId, reference = billId).

**Frontend:** “Export” / “Generate bank file” → GET with `?format=csv`; 200 → trigger download.

---

## 3. File import (§3 — done)

All four endpoints **parse CSV and persist** to DB. They accept either **JSON body** with `csv` (string) or `rows` (array), or **`multipart/form-data`** with file field `file`.

### 3.1 POST `/import/currencies`

- **Body:** `{ csv: "<string>" }` or `{ rows: [{ code, name?, symbol? }] }`.
- **CSV format:** Header with `code`, `name`, `symbol`. Example: `code,name,symbol` then `USD,US Dollar,$`.
- **Behaviour:** Upserts by (orgId, code). Returns `201` with `{ imported, ids }`.

### 3.2 POST `/import/exchange-rates`

- **Body:** `{ csv: "<string>" }` or `{ rows: [{ fromCurrency, toCurrency, rate, date? }] }`.
- **CSV format:** e.g. `date,from,to,rate` — column names can be from/currency, to, rate, date.
- **Behaviour:** Upserts by (orgId, fromCurrency, toCurrency, date). Returns `200` with `{ imported }`.

### 3.3 POST `/import/coa`

- **Body:** `{ csv: "<string>" }` or `{ rows: [{ code, name, type?, parentCode? }] }`.
- **CSV format:** `code,name,type,normalBalance,parentCode,isControlAccount,isActive` (or parent/parentId). Types: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE.
- **Behaviour:** Upserts accounts by (orgId, code); then sets `parentId` from `parentCode` (lookup by code). Returns `200` with `{ imported }`.

### 3.4 POST `/import/bank-statement`

- **Body:** `{ bankAccountId, csv: "<string>" }` or `{ bankAccountId, rows: [{ date, description?, amount, balance?, reference? }] }`.
- **Behaviour:** Inserts bank statement lines (status PENDING). Returns `201` with `{ imported, ids }`.

**Frontend:** File picker can upload the file directly as multipart. For bank statements, include `bankAccountId` alongside the file upload.

---

## 4. Costing run (§6.1 — implemented)

| Method | Path | Status |
|--------|------|--------|
| POST | `/inventory/costing/run` | **200** — computes weighted-average costing snapshot and emits `costing.run` |

- **Behaviour:** Computes weighted-average receipt cost from posted GRNs, joins current stock levels, stores the latest costing snapshot in org settings, and emits `costing.run` with summary totals.

---

## 5. List/read and settings (spec §4, §5)

- **Automation, pricing, manufacturing, distribution, retail, intercompany, projects, CRM:** Routes exist and return data from existing models (e.g. AutomationRuleModel, AlertModel, ScheduleModel, WorkflowModel, PayRunModel, DocumentModel). Empty lists when no data.
- **Settings extended:** Many routes in `settings-extended.ts` still return stubs or passthrough. Real persistence requires wiring each route to the correct model (Currency, ExchangeRate, LedgerAccount, Tax, FiscalYear, UOM, etc.) — see BACKEND_ENDPOINT_MIGRATIONS.md and BACKEND_SPEC §13 for the full list.

---

## 6. Not yet implemented

- **VAT summary report (§6.2):** Aggregate from posted invoices/bills and tax lines by period — not implemented; report can return empty or stub.
- **Settings extended (30+ routes):** Replace stubs with real DB read/write per BACKEND_SPEC §13 Stage 3 and BACKEND_ENDPOINT_MIGRATIONS.md.
- **Full costing logic:** FIFO/weighted average from movements and update of stock/cost store in a worker or service.

---

## 7. Summary table

| Item | Spec | Status |
|------|------|--------|
| Document PDF | §1.1 | Done — 200 + PDF buffer |
| Payslip PDF | §1.2 | Done — 200 + PDF buffer |
| Treasury export | §2 | Done — 200 + CSV |
| Import currencies | §3.1 | Done — parse + upsert |
| Import exchange-rates | §3.2 | Done — parse + upsert |
| Import COA | §3.3 | Done — parse + upsert + parentCode |
| Import bank-statement | §3.4 | Done — parse + insert lines |
| Costing run | §6.1 | Done — weighted-average snapshot + event |
| VAT summary | §6.2 | Not done |
| List/read stubs (§4) | §4 | Most use real models; empty when no data |
| Settings extended (§5) | §5 | Stubs; need per-route persistence |

---

**Reference:** [BACKEND_API_SPEC_SINGLE_SOURCE.md](./BACKEND_API_SPEC_SINGLE_SOURCE.md) (single source of truth).
