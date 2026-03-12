# ERP OdaFlow Integration Matrix

This document is the current page-to-endpoint wiring map for the OdaFlow ERP frontend and backend.

## Status Legend

- `live`: primary reads and writes use backend APIs
- `hybrid`: some reads or actions still rely on local/mock behavior
- `mock`: UI is still local/mock-first

## Core App Flows

| Area | Frontend pages | Frontend API/module | Backend endpoints | Status | Notes |
|------|----------------|---------------------|-------------------|--------|-------|
| Auth bootstrap | `/me` consumers and app-wide API client | `src/lib/api/client.ts` | `GET /api/me`, `POST /api/me/branch`, `POST /api/me/switch-branch` | `live` | Backend mount-path drift was fixed so `/api/me` now resolves correctly. |
| Approvals inbox | `src/app/(dashboard)/approvals/inbox/page.tsx` | `src/lib/api/approvals.ts`, `src/lib/api/stub-endpoints.ts` | `GET /api/approvals/inbox`, `POST /api/approvals/:id/approve`, `POST /api/approvals/:id/reject` | `live` | Inbox reads are now backend-first. |
| Document detail | `src/app/(dashboard)/docs/[type]/[id]/page.tsx` | `src/lib/api/documents.ts`, `src/lib/api/stub-endpoints.ts` | `GET /api/documents/:docType/:id`, `POST /api/documents/:docType/:id/request-approval`, `POST /api/documents/:docType/:id/action`, `GET /api/documents/:docType/:id/pdf`, `GET/POST /api/documents/:docType/:id/comments`, `GET/POST /api/documents/:docType/:id/attachments` | `live` | Backend document detail now includes attachments, comments, approval history, and audit history. |
| Organization profile | `src/app/(dashboard)/settings/org/page.tsx` | `src/lib/api/org.ts`, `src/lib/api/stub-endpoints.ts` | `GET /api/org`, `PATCH /api/org` | `live` | Backend org schema now includes `taxId` and `registrationNumber`. |
| Bank reconciliation | `src/app/(dashboard)/finance/bank-recon/page.tsx` | `src/lib/api/bank-recon.ts`, `src/lib/api/client.ts` | `GET /api/treasury/bank-accounts`, `GET /api/finance/bank-recon`, `POST /api/finance/bank-recon/match`, `GET /api/finance/payments`, `POST /api/ar/payments`, `POST /api/ap/payments`, `POST /api/import/bank-statement` | `live` | File upload now sends `bankAccountId` with the import request. |
| Payroll overview | `src/app/(dashboard)/payroll/overview/page.tsx` | `src/lib/api/payroll.ts` | `GET /api/payroll/employees`, `GET /api/payroll/pay-runs` | `live` | Dashboard counts now come from backend-backed data. |
| Payroll employees | `src/app/(dashboard)/payroll/employees/page.tsx` | `src/lib/api/payroll.ts` | `GET /api/payroll/employees`, `POST /api/payroll/employees` | `live` | Employee creation now persists to backend. |
| Payroll pay runs | `src/app/(dashboard)/payroll/pay-runs/page.tsx`, `src/app/(dashboard)/payroll/pay-runs/[id]/page.tsx` | `src/lib/api/payroll.ts`, `src/lib/api/stub-endpoints.ts` | `GET /api/payroll/pay-runs`, `GET /api/payroll/pay-runs/:id`, `POST /api/payroll/pay-runs`, `POST /api/payroll/pay-runs/:id/action`, `POST /api/payroll/pay-runs/:id/post-journal` | `live` | Backend now supports request-approval plus real posted journal creation. |
| Payslips | `src/app/(dashboard)/payroll/payslips/page.tsx` | `src/lib/api/payroll.ts`, `src/lib/api/client.ts` | `GET /api/payroll/payslips`, `GET /api/payroll/payslips/:id/pdf` | `live` | Backend list now returns all payslips when no `payRunId` is supplied. |

## Strongly Wired Operational Modules

| Area | Frontend API/module | Backend route group | Status | Notes |
|------|---------------------|---------------------|--------|-------|
| Distribution trips | `src/lib/api/trips.ts` | `src/routes/distribution-trips.ts` | `live` | List, detail, create, and trip-cost flows are wired. |
| Manufacturing yield | `src/lib/api/yield.ts` | `src/routes/manufacturing-yield.ts` | `live` | Yield and mass-balance endpoints are backed by persistence. |
| Franchise / Cool Catch | `src/lib/api/cool-catch.ts` | `src/routes/franchise.ts`, `src/routes/cash-weight-audit.ts`, `src/routes/purchasing-grn.ts`, `src/routes/landed-cost.ts` | `live` | Commission, VMI, cash-weight audit, GRN, trips, and landed cost are implemented. |
| Warehouse transfers | `src/lib/api/warehouse-transfers.ts` | `src/routes/warehouse.ts` | `hybrid` | Primary transfer flows are live; surrounding warehouse execution surfaces still have mixed maturity. |
| Pricing rules | `src/lib/api/pricing.ts` | `src/routes/pricing.ts` | `hybrid` | Discount policy endpoints are live; broader price-list and template-management UX remains mixed. |

## Backend Logic Completed In This Pass

| Backend capability | Files | Result |
|--------------------|-------|--------|
| Route contract fixes | `erp_odaflow_backend/src/app.ts` | Corrected `/api/me`, `/api/approvals/*`, and `/api/audit/*` paths. |
| Inventory costing | `erp_odaflow_backend/src/routes/inventory.ts`, `erp_odaflow_backend/src/services/inventory.ts` | Costing run now computes weighted-average receipt cost from posted GRNs and persists a latest-run snapshot. |
| Product pricing template application | `erp_odaflow_backend/src/routes/masters.ts`, `erp_odaflow_backend/src/routes/pricing.ts`, `erp_odaflow_backend/src/services/pricing.ts` | Template application now uses real price list rows and optional pricing rule adjustments. |
| Analytics insights | `erp_odaflow_backend/src/routes/analytics.ts` | Inventory, finance, and payroll insights now return real data instead of mostly empty payloads. |
| Payroll journal posting | `erp_odaflow_backend/src/services/payroll.ts`, `erp_odaflow_backend/src/services/journals.ts` | Posting creates a real posted `journal` document instead of only a synthetic ID. |
| Commission posting | `erp_odaflow_backend/src/services/commission.ts`, `erp_odaflow_backend/src/services/journals.ts` | Commission posting now creates a real posted `journal` document and links top-up journals to it. |

## Remaining Important Hybrid Or Mock Areas

| Area | Current state |
|------|---------------|
| Stock valuation UI | The inventory costing screen still renders mock valuation summary data even though backend costing is now real. |
| Product masters, stock levels, parties, reports | Several screens still read local repo or mock data. |
| AI anomaly, copilot, and some analytics cards | UX exists, but several cards are still mock-first or partially backed. |
| Budgets, cashflow, statutory payroll, returns/collections, retail/intercompany edges | Backend surface exists in places, but workflow depth remains incomplete. |

## Canonical ML Service

Use the embedded backend service:

- `erp_odaflow_backend/ml_service`

Do not treat this as the source of truth:

- `erppythonmicroservice`
