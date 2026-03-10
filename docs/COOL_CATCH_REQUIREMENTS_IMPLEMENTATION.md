# Cool Catch — Operational & ERP Functional Requirements Implementation

**Purpose:** Map the **Operational & ERP Functional Requirements** for CoolCatch Distributors Ltd. to concrete backend APIs and models. This doc is a narrative/summary; the canonical endpoint contract remains in `BACKEND_API_SPEC_SINGLE_SOURCE.md` and `BACKEND_SPEC_COOL_CATCH.md`.

**Base path:** All routes below are under `/api`. Multi-tenancy and feature flags (`commissionEngine`, `vmiReplenishment`, `procurementAuditCashWeight`, `subcontracting`, `reverseBom`, `landedCostMultiCurrency`, `logisticsTrips`, `massBalanceYield`) are driven by the `cool-catch` template.

See also:

- `BACKEND_API_SPEC_SINGLE_SOURCE.md` — full endpoint contract and stub→endpoint mapping.
- `BACKEND_SPEC_COOL_CATCH.md` — Cool Catch entities and API sections.
- `COOL_CATCH_REQUIREMENTS_GAP.md` — requirements vs gap analysis.

---

## 1. Multi-Source Procurement & Cash Management

| Requirement | Implementation (models + APIs) |
|-------------|--------------------------------|
| **Landed Costing** (multi-currency KES/UGX, permits, inbound logistics) | `LandedCostTemplate` has `currency` (default KES). Allocation lines support KES/UGX. Types: `freight`, `duty`, `permit`, `border`, `inbound_freight`, `outbound_freight`, `storage`. Frontend calls `lib/api/landed-cost.ts` which hits `/api/inventory/landed-cost/templates`, `/api/inventory/landed-cost/sources`, `/api/inventory/landed-cost/allocations`. |
| **Cross-Border Sourcing** | Landed cost allocation supports `currency` per line. Documents (GRN, Bill) carry `currency` and FX rate; costing run uses movement and allocation data. |
| **Cash-on-Delivery (CoD) Integrity** — Three-Way Match (PO → Cash → GRN weight) | `CashDisbursement` includes `paidWeightKg`. `ProcurementAuditLine` links PO, Cash, GRN line. `POST /api/purchasing/cash-weight-audit/build` (contract) auto-creates audit lines from PO + CashDisbursement + GRN. |
| **Inventory Reconciliation** — Paid Weight vs Received Weight | `ProcurementAuditLine` tracks `paidWeightKg`, `receivedWeightKg`, `varianceKg`, `status` (MATCHED/VARIANCE/PENDING). GRN line weights are editable via `PATCH /api/purchasing/grn/:id/lines/:lineId` (`receivedWeightKg`, `paidWeightKg`). Frontend GRN detail uses `lib/api/grn.ts`. |

**Core endpoints (contract):**

- `GET /api/purchasing/cash-weight-audit` — list audit lines.
- `POST /api/purchasing/cash-weight-audit` — create/update audit lines (future).
- `POST /api/purchasing/cash-weight-audit/build` — build from PO + Cash + GRN; wired via `buildCashWeightAudit` on Cash-to-Weight Audit page.
- `GET /api/purchasing/cash-weight-audit/disbursements` — list disbursements.
- `POST /api/purchasing/cash-weight-audit/disbursements` — create disbursement (includes `paidWeightKg`); wired via `createCashDisbursement` in `lib/api/cool-catch.ts`.
- `POST /api/purchasing/cash-weight-audit/reconcile` — reconcile an audit line; wired via `reconcileCashWeightAudit`.

---

## 2. Subcontracted Value-Added Services (VAS)

| Requirement | Implementation (models + APIs) |
|-------------|--------------------------------|
| **WIP Tracking** — Factories/Women's Groups as External Work Centers | `ExternalWorkCenterModel` (`type: FACTORY \| GROUP`). `SubcontractOrderModel`, `WIPBalanceModel`. Frontend `/manufacturing/subcontracting` uses `fetchExternalWorkCenters`, `fetchSubcontractOrders`, `fetchWIPBalances` from `lib/api/cool-catch.ts`. |
| **Mass Balance & Yield** — Primary, Secondary, Process Loss | `WorkOrderYieldModel` records `inputWeightKg`, `outputPrimaryKg`, `outputSecondaryKg`, `wasteKg`, `yieldPercent`. `GET /api/manufacturing/yield/mass-balance-report` returns aggregate view. Frontend `/manufacturing/yield` uses `lib/api/yield.ts`. |
| **Service Fee Integration** | `SubcontractOrderLine` has `processingFeePerUnit`; downstream posting logic charges this to COGS/expense during receive. |
| **Reverse BOM** — One input (Round Fish) → multiple outputs (Fillet, Gutted, Byproducts, Waste) | `BOM` has `direction: "STANDARD" \| "REVERSE"`. For `REVERSE`, `productId` = input, `items` = outputs with `type: PRIMARY \| SECONDARY \| WASTE`. Yield / mass-balance endpoints report on these. |

**Core endpoints (contract):**

- `GET/POST /api/manufacturing/work-centers/external` — external processors (list/create).
- `GET/POST /api/manufacturing/subcontract-orders` — subcontract orders (list/create).
- `GET /api/manufacturing/subcontract-orders/:id` — order detail.
- `POST /api/manufacturing/subcontract-orders/:id/receive` — mark received; wired via `receiveSubcontractOrder`.
- `GET/POST /api/manufacturing/yield` — yield records.
- `GET /api/manufacturing/yield/:id` — yield detail.
- `GET /api/manufacturing/yield/mass-balance-report` — mass balance report.

---

## 3. Outsourced Cold Chain & Logistic Hubs

| Requirement | Implementation (models + APIs) |
|-------------|--------------------------------|
| **Asset Attribution** — Monthly Leased vs Spot-Hire | `Trip` has `vehicleMode: "LEASED" \| "SPOT_HIRE"`. `Vehicle` has `type: "LEASED" \| "SPOT"`, `monthlyCost`. Frontend `/distribution/trips` + `/distribution/trips/[id]` use `lib/api/trips.ts`. |
| **Nairobi Holding Area** | Cold Hub is modeled as a warehouse. VMI replenishment orders carry `sourceWarehouseId` referencing the Cold Hub. |
| **Logistics Costing** — Inbound/Outbound | `Trip` has `type: "INBOUND" \| "OUTBOUND"`, with `costLines` (FUEL, DRIVER, HIRE_FEE, TOLL, OTHER). |

**Core endpoints (contract):**

- `GET/POST /api/distribution/trips` — create and list trips.
- `GET /api/distribution/trips/:id` — trip detail.
- `POST /api/distribution/trips/:id/costs` — add cost lines.
- `GET /api/distribution/vehicles` — list vehicles.

All of these are already represented in `lib/api/trips.ts` and `BACKEND_SPEC_COOL_CATCH.md` §3.8.

---

## 4. Franchise Network & Automated Replenishment

| Requirement | Implementation (models + APIs) |
|-------------|--------------------------------|
| **Segmented SKU Mix** | `Franchisee` has `segment: "HIGH_VALUE" \| "STANDARD" \| "VALUE"`. Used for analytics and VMI policies. |
| **Revenue Collection** | Standard invoices with `partyId` = franchisee `customerId`. Commission runs aggregate posted invoices by period and franchisee. |
| **Automated Commission Engine** | `CommissionRule` (PERCENT_SALES, FIXED_PER_UNIT). `POST /api/franchise/commission/runs/calculate` (contract) auto-calculates from posted invoices within a period. Manual create/post flows use `/api/franchise/commission/runs` and `/api/franchise/commission/runs/:id/post`. Frontend uses `fetchCommissionRuns`, `fetchCommissionRunById`, `fetchCommissionRules`, `postCommissionRun` from `lib/api/cool-catch.ts`. |
| **Margin Guarantee & Top-Ups** | `Franchisee` has `minCommissionFloor`, `launchPhaseEndDate`. During launch phase, top-up = max(0, minFloor - commission). Top-ups are exposed via `/api/franchise/commission/top-ups`. |
| **VMI Integration** | `POST /api/franchise/vmi/ingest` is the webhook-style endpoint for ingesting sales/stock from the franchisee system (contract for integration; not called from frontend). Snapshots are exposed via `/api/franchise/vmi/snapshots`. |
| **Auto-Replenishment** | `POST /api/franchise/vmi/auto-replenish` (contract) scans VMI snapshots against min/max/reorder policy and creates replenishment orders using the Cold Hub as `sourceWarehouseId`. Frontend uses `/api/franchise/vmi/replenishment-orders` and `/api/franchise/vmi/suggestions` for visibility. |

**Core endpoints (contract):**

- `GET/POST /api/franchise/franchisees` — franchisees (list/create).
- `GET/POST /api/franchise/commission/rules` — commission rules.
- `POST /api/franchise/commission/runs/calculate` — **auto-calculate** commission run for a period; wired via `calculateCommissionRun` (New run → Calculate from invoices).
- `POST /api/franchise/commission/runs` — manual create; wired via `createCommissionRun` (New run → Create draft).
- `POST /api/franchise/commission/runs/:id/post` — post run; wired via `postCommissionRun`.
- `GET/POST /api/franchise/commission/top-ups` — top-up journals (list/create).
- `POST /api/franchise/vmi/ingest` — VMI webhook (integration; backend only).
- `GET /api/franchise/vmi/snapshots` — stock snapshots; wired via `fetchFranchiseeStock`.
- `GET /api/franchise/vmi/suggestions` — reorder suggestions; wired via `fetchVMISuggestions`.
- `POST /api/franchise/vmi/auto-replenish` — **auto-create** replenishment orders; wired via `autoReplenish` (Create from suggestions).
- `GET /api/franchise/vmi/replenishment-orders` and `GET /api/franchise/vmi/replenishment-orders/:id` — orders; wired via `fetchVMIReplenishmentOrders` / `fetchVMIReplenishmentOrderById`.

---

## 5. Feature Flags (Cool Catch)

All Cool Catch flags are enabled for a Cool Catch org via the `cool-catch` template and exposed in `/api/feature-flags`:

- `commissionEngine`
- `vmiReplenishment`
- `procurementAuditCashWeight`
- `subcontracting`
- `reverseBom`
- `landedCostMultiCurrency`
- `logisticsTrips`
- `massBalanceYield`

Frontend navigation (`config/navigation/sections.ts`) uses these flags to show Cool Catch–specific modules (Commission, Franchise/VMI, Trips / Logistics, Yield / Mass balance, Subcontracting).

---

## 6. Technical Success Factors (Summary)

| Requirement | ERP Feature | Status / Notes |
|-------------|------------|----------------|
| Gross revenue + weekly commission | Commission & Rebate Engine | **Wired:** runs, rules, top-ups, New run (Calculate / Create draft), Post. |
| Top-up when below floor | Conditional Journal Entries | Modeled in commission run lines; `top-ups` endpoint exposes journals; backend posts real GL entries. |
| Cash-to-weight audit | Procurement Audit Trail | **Wired:** audit lines, disbursements, Record disbursement, Build audit, Reconcile; GRN detail shows weight columns when flag is on. |
| Disassembly / Reverse BOM | Reverse BOM / Co-Products | Supported at model/spec level; yield/mass-balance UI implemented. |
| VMI → Auto-Replenishment | Min-Max / Auto-Replenishment | **Wired:** suggestions, orders, stock, Create from suggestions (auto-replenish), Confirm order. |
| Subcontracting + fees | Subcontracting / Job Work | Subcontract orders, WIP balances, external work centers wired to frontend. |
| Landed cost (transport + storage) | Landed Cost Allocation | Landed cost UI + API abstraction implemented; backend must store templates and allocations. |
| VMI API | API / Webhook Integration | `ingest` endpoint defined for external systems; not called from frontend. |

Implementation status for each endpoint (implemented vs contract/backlog) is tracked in `BACKEND_API_SPEC_SINGLE_SOURCE.md` §2–5 and `PENDING_AND_STUBS_MASTER.md`.

---

## 7. Frontend → Endpoint wiring (connected)

All Cool Catch endpoints are **connected** from the frontend: the UI calls the API layer (`lib/api/cool-catch.ts`, `lib/api/landed-cost.ts`, `lib/api/grn.ts`, `lib/api/trips.ts`, `lib/api/yield.ts`). When `NEXT_PUBLIC_API_URL` is set, requests go to the backend; otherwise the app uses mocks or shows a “Configure API” message for write actions.

| Area | Endpoint | Page / component | API function |
|------|----------|-------------------|---------------|
| **Procurement / Cash** | `GET /purchasing/cash-weight-audit` | `/purchasing/cash-weight-audit` | `fetchCashWeightAuditLines` |
| | `GET /purchasing/cash-weight-audit/disbursements` | `/purchasing/cash-weight-audit` | `fetchCashDisbursements` |
| | `POST /purchasing/cash-weight-audit/disbursements` | `/purchasing/cash-weight-audit` (Record disbursement sheet) | `createCashDisbursement` |
| | `POST /purchasing/cash-weight-audit/build` | `/purchasing/cash-weight-audit` (Build audit sheet) | `buildCashWeightAudit` |
| | `POST /purchasing/cash-weight-audit/reconcile` | `/purchasing/cash-weight-audit` (Reconcile button) | `reconcileCashWeightAudit` |
| **Landed Cost** | `GET /inventory/landed-cost/templates`, `.../sources` | `/inventory/costing` | `fetchLandedCostTemplates`, `fetchLandedCostSources` |
| | `POST /inventory/landed-cost/allocation` | `/inventory/costing` | `postLandedCostAllocation` |
| **GRN** | `GET /purchasing/grn`, `GET /purchasing/grn/:id` | `/inventory/receipts`, `/inventory/receipts/[id]` | `fetchGRNs`, `fetchGRNById` (grn.ts) |
| **Subcontracting** | `GET /manufacturing/work-centers/external` | `/manufacturing/subcontracting` | `fetchExternalWorkCenters` |
| | `GET /manufacturing/subcontract-orders`, `.../:id` | `/manufacturing/subcontracting` | `fetchSubcontractOrders`, `fetchSubcontractOrderById` |
| | `GET /manufacturing/subcontract-orders/wip` | `/manufacturing/subcontracting` | `fetchWIPBalances` |
| | `POST /manufacturing/subcontract-orders/:id/receive` | `/manufacturing/subcontracting` (Receive button) | `receiveSubcontractOrder` |
| **Yield / Mass balance** | `GET /manufacturing/yield`, `GET /manufacturing/yield/:id` | `/manufacturing/yield`, `/manufacturing/yield/[id]` | `fetchYieldRecords`, `fetchYieldById` (yield.ts) |
| | `GET /manufacturing/yield/mass-balance-report` | `/manufacturing/yield` | `fetchMassBalanceReport` |
| | `POST /manufacturing/yield` | `/manufacturing/yield` (Record yield sheet) | `createYieldRecord` |
| **Logistics / Trips** | `GET /distribution/trips`, `GET /distribution/trips/:id` | `/distribution/trips`, `/distribution/trips/[id]` | `fetchTrips`, `fetchTripById` (trips.ts) |
| | `POST /distribution/trips` | `/distribution/trips` (New trip sheet) | `createTrip` |
| | `POST /distribution/trips/:id/costs` | `/distribution/trips/[id]` (Add cost sheet) | `addTripCost` |
| **Commission** | `GET /franchise/commission/runs`, `.../runs/:id` | `/franchise/commission`, run detail | `fetchCommissionRuns`, `fetchCommissionRunById` |
| | `GET /franchise/commission/rules` | `/franchise/commission` | `fetchCommissionRules` |
| | `GET /franchise/commission/top-ups` | `/franchise/commission` | `fetchTopUps` |
| | **POST /franchise/commission/runs/calculate** | `/franchise/commission` (New run → Calculate from invoices) | `calculateCommissionRun` |
| | **POST /franchise/commission/runs** | `/franchise/commission` (New run → Create draft) | `createCommissionRun` |
| | `POST /franchise/commission/runs/:id/post` | `/franchise/commission` (Post button) | `postCommissionRun` |
| **VMI** | `GET /franchise/vmi/snapshots` | `/franchise/vmi` (Stock tab) | `fetchFranchiseeStock` |
| | `GET /franchise/vmi/suggestions` | `/franchise/vmi` (Reorder suggestions tab) | `fetchVMISuggestions` |
| | **POST /franchise/vmi/auto-replenish** | `/franchise/vmi` (Create from suggestions) | `autoReplenish` |
| | `GET /franchise/vmi/replenishment-orders`, `.../:id` | `/franchise/vmi` (Orders tab) | `fetchVMIReplenishmentOrders`, `fetchVMIReplenishmentOrderById` |
| | `POST /franchise/vmi/replenishment-orders/:id/confirm` | `/franchise/vmi` (Confirm button) | `confirmReplenishmentOrder` |

**Not called from frontend (backend/integration only):** `POST /franchise/vmi/ingest` (webhook for franchisee systems), franchisee CRUD (`GET/POST/PATCH /franchise/franchisees`) — add franchisee management UI when needed.

