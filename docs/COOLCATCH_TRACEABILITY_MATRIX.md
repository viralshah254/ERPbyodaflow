# CoolCatch ERP Traceability Matrix

This matrix maps the CoolCatch operational requirements to backend implementation, frontend workflows, and current verification status.

## Coverage legend

- `Implemented`: Built and wired end-to-end.
- `Partial`: Exists but requires control hardening or deeper workflow completion.
- `Missing`: Not implemented sufficiently for production use.

## Requirement mapping

| Requirement | Backend implementation | Frontend workflow | Tests status | Coverage |
|---|---|---|---|---|
| Landed costing with KES/UGX, permits, border and logistics | `/api/inventory/landed-cost/*` in `src/routes/landed-cost.ts`; templates/allocations models | `src/app/(dashboard)/inventory/costing/page.tsx`, `src/lib/api/landed-cost.ts` | No dedicated integration tests | Partial |
| Cross-border sourcing, multi-currency postings | Document currency + rates in `src/routes/documents.ts`; landed cost currency lines | Document and costing screens | No FX contract tests | Partial |
| CoD integrity (PO -> cash disbursement -> GRN) | `src/routes/cash-weight-audit.ts`; `CashDisbursementModel`, `ProcurementAuditLineModel` | `src/app/(dashboard)/purchasing/cash-weight-audit/page.tsx` | No end-to-end reconciliation tests | Partial |
| Paid vs received weight reconciliation | Reconcile endpoint in `src/routes/cash-weight-audit.ts`; GRN line weights | Cash-to-weight page + GRN detail | No variance workflow tests | Partial |
| Subcontracting WIP at external processors | `src/routes/manufacturing.ts` subcontract routes; `WIPBalanceModel` | `src/app/(dashboard)/manufacturing/subcontracting/*` | No integration tests | Partial |
| Mass balance and yield (primary/secondary/waste) | `src/routes/manufacturing-yield.ts`; `WorkOrderYieldModel` | `src/app/(dashboard)/manufacturing/yield/*`, `src/lib/api/yield.ts` | No mass-balance assertion tests | Partial |
| Service fee integration into valuation/COGS | Processing fee fields on subcontract lines in `src/routes/manufacturing.ts` | Subcontract order UI | No downstream valuation tests | Missing |
| Reverse BOM / disassembly outputs | BOM `direction: REVERSE` in `src/routes/manufacturing.ts` + BOM model | Manufacturing BOM screens | No accounting impact tests | Partial |
| Trip attribution (leased vs spot-hire) | `src/routes/distribution-trips.ts`; vehicle/trip models | `src/app/(dashboard)/distribution/trips/*`, `src/lib/api/trips.ts` | No lifecycle tests | Partial |
| Nairobi cold hub ownership and transfer behavior | Warehouse + franchise replenish order source warehouse | VMI + warehouse transfer pages | No transfer lifecycle assertions for VMI orders | Partial |
| Inbound/outbound logistics costing | Trip costs in `src/routes/distribution-trips.ts`; landed cost routes | Trips detail + costing page | No linked-costing tests | Partial |
| Segmented SKU mix by franchise type | Franchisee segment in `src/routes/franchise.ts` + model | `src/app/(dashboard)/franchise/*` | No segmentation policy tests | Partial |
| Revenue-first collection model | Invoices + AP/AR and treasury routes | AR/AP/treasury pages | Limited tests | Partial |
| Weekly commission engine | `POST /api/franchise/commission/runs/calculate` in `src/routes/franchise.ts` | `src/app/(dashboard)/franchise/commission/page.tsx` | No weekly calc test with fixtures | Partial |
| Margin guarantee and launch-phase top-ups | Top-up logic in `src/routes/franchise.ts`; posting in `src/services/commission.ts` | Commission run UI | No top-up boundary tests | Partial |
| Parent top-up journal behavior | `src/services/commission.ts`, `TopUpJournalModel` | Commission detail UI | No idempotent-posting tests | Partial |
| VMI sales data ingestion | `/api/franchise/vmi/ingest` in `src/routes/franchise.ts` | Backend integration endpoint (not user UI) | No dedupe/idempotency tests | Partial |
| Live stock velocity visibility | `/api/franchise/vmi/snapshots` and suggestions | `src/app/(dashboard)/franchise/vmi/page.tsx` | No feed freshness tests | Partial |
| Auto-replenishment on reorder points | `/api/franchise/vmi/auto-replenish` + replenishment orders | VMI page actions + warehouse transfers | No duplicate-order suppression tests | Partial |
| Commission + rebate accounting engine | Commission service posting via `createPostedJournalDocument` in `src/services/commission.ts` | Commission pages | No posting integrity tests | Partial |
| Conditional journal entries for top-up | Top-up entries upserted in `TopUpJournalModel` in `src/services/commission.ts` | Commission pages | No period/close checks on commission posting | Partial |
| Cash-to-weight audit trail | Audit + event paths in cash-weight routes | Cash-to-weight page | No audit export assertions | Partial |
| API/webhook integration reliability | Franchise VMI ingest endpoint + logs in `VMIWebhookLogModel` | N/A for webhook producer | Missing signature/idempotency-key checks | Partial |

## Cross-cutting controls

| Control area | Current state | Gap |
|---|---|---|
| Authorization for mutating routes | Many endpoints still guarded by `*.read` perms | Must enforce `*.write`/admin for all POST/PATCH/DELETE |
| Approval segregation-of-duties | Approvals can be actioned with `approvals.read` and no self-approval guard | Enforce maker-checker and approver eligibility |
| Frontend auth fallback | Dashboard layout can initialize mock admin on bootstrap failure | Remove in production, fail closed |
| Fiscal period enforcement | Exists for finance core; not consistently enforced in all posting flows | Standardize period checks across payroll/assets/commission |
| Transaction boundaries | Multi-write loops in some flows | Add transaction wrappers or compensating controls |

## Test matrix baseline

| Workflow | Backend tests | Frontend tests | Needed |
|---|---|---|---|
| AuthZ matrix for mutating routes | Missing | N/A | Add integration suite |
| Approval SoD | Missing | Missing | Add API + e2e tests |
| Cash-weight reconciliation | Missing | Missing | Add integration + e2e happy/failure paths |
| Commission run calculate/post + top-up | Missing | Missing | Add calculation and idempotent posting tests |
| VMI ingest + auto-replenish | Missing | Missing | Add ingest dedupe and order creation tests |
| Subcontracting + yield + valuation effect | Missing | Missing | Add integration tests for fee-to-valuation |
| Warehouse pick/pack/putaway | Partial | Partial | Add route + UI lifecycle tests |
| Period-close posting blocks | Missing | Missing | Add integration tests by module |

## Sign-off checklist

- Every row above must move to `Implemented` or have explicit, accepted deferment.
- No open P0 control gaps (authz, auth fallback, SoD).
- End-to-end tests for all critical CoolCatch workflows must pass in CI.
