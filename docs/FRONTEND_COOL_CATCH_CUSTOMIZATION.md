 # OdaFlow ERP — CoolCatch Frontend Customization

 ## 1. Purpose

 This document defines the **CoolCatch Distributors Ltd. frontend customization layer** for OdaFlow ERP.

 Scope:

 - Reuse and extend the existing OdaFlow ERP frontend (Next.js App Router, shared components, navigation), **not** a new app.
 - Make the product feel like **“Oda ERP Enterprise: CoolCatch Edition”** while remaining compatible with the shared platform and backend specs.
 - Focus on **fish value-chain operations** (procurement, processing/yield, cold chain, B2B distribution, franchise network, finance/controls) as described in `coolcatch_frontend_cursor_prompt.md`.

 This file is the **frontend north star** for all CoolCatch-specific work. Backend specs live in:

 - `docs/BACKEND_SPEC.md`
 - `docs/BACKEND_API_SPEC_SINGLE_SOURCE.md`
 - `docs/BACKEND_SPEC_COOL_CATCH.md` (for franchise, reverse BOM, procurement audit, etc.)

 ---

 ## 2. High-level principles

 - **Extend, don’t fork:** Build CoolCatch UX on top of existing navigation, document types, and UI primitives. No separate mini-app.
 - **Domain-first IA:** Organize the experience around the real CoolCatch operating flow rather than generic ERP modules:
   1. Source fish
   2. Receive and verify weight
   3. Send to processor / work center
   4. Track yields and byproducts (reverse BOM)
   5. Move into hub / cold chain
   6. Sell / transfer to B2B customers and franchisees
   7. Track revenue, commissions, top-ups, replenishment, and finance impact
 - **Role- and franchise-aware:** Surfaces should adapt to parent vs franchise roles with correct permissions.
 - **Insight → action:** Every key screen should answer:
   - What is happening now?
   - What is delayed / blocked / short?
   - What stock do we own and where is it physically?
   - What yield did we get and what did we pay vs receive?
   - What are franchises selling and what needs replenishment?
 - **Shared design system:** All new UI must align with existing typography, spacing, and interaction patterns (tables, filters, drawers, AI Tower).

 ---

 ## 3. Current frontend architecture (summary)

 Reference: `docs/PRODUCT_OVERVIEW.md`, `src/config/navigation/sections.ts`, `src/app/(dashboard)/layout.tsx`.

 - **Framework:** Next.js (App Router) + TypeScript.
 - **Layouts:**
   - `app/layout.tsx` — root layout, fonts, global providers.
   - `app/(dashboard)/layout.tsx` — wraps ERP in `MainLayout`, initializes mock auth and org template.
   - `app/(public)/layout.tsx` — marketing shell (out of scope for CoolCatch).
 - **Navigation:** `NAV_SECTIONS_CONFIG` in `src/config/navigation/sections.ts`
   - Core: `/control-tower`, `/dashboard`, approvals, work queue.
   - Inventory / Warehouse: `/inventory/*`, `/warehouse/*`.
   - Sales: `/sales/*`.
   - Purchasing: `/purchasing/*` (includes `/purchasing/cash-weight-audit`).
   - Manufacturing: `/manufacturing/*` (BOMs, routing, work orders, MRP, subcontracting, yield/mass balance).
   - Distribution: `/distribution/*` (routes, deliveries, trips, collections).
   - Franchise: `/franchise/commission`, `/franchise/vmi`.
   - Finance / Treasury / Assets / Payroll, Analytics, Automation, Settings.
 - **State:**
   - Global `zustand` stores: `auth-store`, `orgContextStore`, `copilot-store` (AI Tower).
   - Local per-page React state for filters/forms.
 - **Data layer:**
   - `src/lib/data/*.repo.ts` and `src/lib/mock/**` — mocked repositories.
   - `src/lib/api/client.ts` — API client (prepared for real backend).
 - **Permissions:**
   - `src/lib/permissions.ts` — `can`, `hasAnyPermission`, `hasAllPermissions`, `canDeleteEntity`; currently mock, backend is source of truth.
   - Navigation items use `requiresPermissions`, `requiresFlags`, `requiresOrgTypes`.

 CoolCatch customization **must plug into these patterns**.

 ---

 ## 4. CoolCatch domain requirements (frontend view)

 Based on `coolcatch_frontend_cursor_prompt.md` and backend CoolCatch spec:

 - **Procurement and cash control**
   - Multi-source, multi-currency (KES / UGX), landed cost, farm-gate vs received weight, three-way match: PO vs cash vs weight.
   - Dedicated **cash-to-weight control** and **procurement audit** views.
 - **Subcontracted processing / value-added services**
   - External work centers (processors, women’s groups), WIP tracking while inventory stays on CoolCatch’s books.
   - Reverse BOM / disassembly: one input → many outputs/byproducts (fillet, gutted, ungutted, skin, bones, waste/feed).
   - Mass balance and yield analytics; processing fee integrated into valuation.
 - **Cold chain & hub logistics**
   - Central cold hub (Nairobi) view, aged stock, inbound/outbound trips with truck type (leased vs spot), cost allocation.
 - **Franchise model**
   - Parent command layer: franchise health, replenishment, commission and top-ups, margin and support obligations.
   - Franchise portal: simplified home, stock, sales, insights for franchise roles.
 - **Inventory & traceability**
   - Ownership vs physical location vs batch lineage (from procurement batch through processing, transfers, sales).
 - **Finance & controls**
   - Commission and top-up center; conditional journal previews; procurement audit trail; landed cost, subcontracting visibility.

 The rest of this document describes how to realize these requirements using the existing frontend.

 ---

 ## 5. Information architecture & navigation mapping

 We **do not** create a separate CoolCatch navigation tree. Instead we:

 - Extend existing sections with domain-specific routes.
 - Add new routes where necessary but group them under existing modules (Control Tower, Manufacturing, Distribution, Franchise, Finance, Analytics).
 - Use **org templates + feature flags** (see §8) to make the CoolCatch IA the default for the CoolCatch tenant.

 ### 5.1 Top-level sections (conceptual)

 Mapping from the CoolCatch IA to current modules:

 1. **Command Center**
    - Primary routes: `/control-tower`, possibly `/analytics/finance` + `/analytics/inventory` variants.
    - CoolCatch: a “seafood control tower” overview with sourcing, processing, logistics, franchise, and finance KPIs.
 2. **Sourcing & Procurement**
    - Existing: `/purchasing/requests`, `/purchasing/orders`, `/inventory/receipts`, `/purchasing/cash-weight-audit`.
    - CoolCatch: enhanced procurement workspace + cash-to-weight and landed cost UIs.
 3. **Receiving & Quality**
    - Existing: `/inventory/receipts` (GRN list/detail).
    - CoolCatch: receiving queue, goods receipt page with variance side-panel, variance resolution flow.
 4. **Processing & Yield**
    - Existing: `/manufacturing/subcontracting`, `/manufacturing/yield`, `/manufacturing/work-orders`.
    - CoolCatch: work center directory, dispatch to processor, batch processing detail, mass balance analytics, byproduct inventory.
 5. **Cold Chain & Logistics**
    - Existing: `/warehouse/overview`, `/distribution/trips`, `/distribution/deliveries`, `/warehouse/transfers`.
    - CoolCatch: hub inventory overview, trip management, transfer planning, logistics costing.
 6. **Sales & Customers**
    - Existing: `/sales/*`, `/master/products`, `/master/parties`.
    - CoolCatch: fish form- and weight-aware sales order and fulfillment flows.
 7. **Franchise Network**
    - Existing: `/franchise/commission`, `/franchise/vmi`, plus Parties/Routes.
    - CoolCatch: franchise overview, franchise detail, replenishment planner, commission engine UI, franchise comparison analytics, franchise portal views.
 8. **Inventory & Traceability**
    - Existing: `/inventory/stock-levels`, `/inventory/movements`, `/inventory/warehouses`, `/manufacturing/yield`.
    - CoolCatch: global stock explorer, batch lineage, ownership & valuation views.
 9. **Finance & Controls**
    - Existing: `/finance/*`, `/treasury/*`, `/finance/audit`, `/reports/*`, `/analytics/finance`.
    - CoolCatch: procurement finance review, commission & top-up center, conditional journal event preview, enhanced audit explorer.
 10. **Admin & Configuration**
     - Existing: `/settings/*`.
     - CoolCatch: product form/yield rules, processor fees, franchise commission/top-up rules, truck/cost rules, reorder points.

 ### 5.2 Proposed new / specialized routes

 These are **frontend routes** that we will implement on top of existing APIs/mocks. Exact route keys in `NAV_SECTIONS_CONFIG` can be refined as we implement.

 - **Command Center**
   - `/control-tower` — CoolCatch-flavored control tower (existing route, custom layout/widgets based on template/flags).
 - **Sourcing & Procurement**
   - `/purchasing/cash-weight-audit` — already present; enhance as exception-focused cash-to-weight view.
   - `/purchasing/landed-cost` — optional dedicated landed cost builder (or embedded in doc detail; TBD).
 - **Receiving & Quality**
   - `/inventory/receiving` — receiving queue (alias/overlay on `/inventory/receipts`).
   - `/inventory/receipts/[id]` — enhanced goods receipt with variance & QA side panel.
 - **Processing & Yield**
   - `/manufacturing/subcontracting` — work center directory + dispatch flows.
   - `/manufacturing/yield` — mass balance analytics and yield dashboards.
   - `/manufacturing/byproducts` — byproduct inventory screen (might be a filtered view of global stock).
 - **Cold Chain & Logistics**
   - `/warehouse/overview` — hub inventory overview with filters tailored for CoolCatch.
   - `/distribution/trips` — extended trip management & costing workspace.
   - `/distribution/transfer-planning` — transfer planner (hub → franchise/customers/processors).
 - **Franchise Network**
   - `/franchise/overview` — parent-level franchise dashboard (new).
   - `/franchise/[id]` — franchise detail page (new).
   - `/franchise/replenishment` — replenishment planner (could be alias of `/franchise/vmi` with richer UI).
   - `/franchise/commission` — commission engine UI with top-up logic (existing, extended).
   - `/franchise/comparison` — franchise comparison analytics (new, backed by Analytics).
   - Franchise-portal views will reuse existing routes but with tailored nav and layout based on role (see §8).
 - **Inventory & Traceability**
   - `/inventory/stock-explorer` — global stock explorer with sticky columns and advanced filters.
   - `/inventory/batch-lineage/[batchId]` — batch lineage view (or nested under `/inventory/stock-levels`).
   - `/inventory/valuation` — inventory valuation (cost layers, landed and processing cost effects).
 - **Finance & Controls**
   - `/finance/procurement-review` — procurement finance review.
   - `/finance/commission-topup` — commission & top-up center (may share backend with `/franchise/commission`).
   - `/finance/journal-events` — conditional journal event preview.

 These routes will be wired into `NAV_SECTIONS_CONFIG` as we implement, behind appropriate `requiresFlags` and `requiresPermissions`.

 ---

 ## 6. Shared components to build or extend

 We prefer reusable components over one-off screen code. All should follow the existing design system (Tailwind, cards, tables, shadcn primitives).

 ### 6.1 Operational cards & banners

 - `OperationalKpiCard`
   - Props: `title`, `value`, `unit?`, `trend?`, `tooltip?`, `severity?`, `href?`.
   - Used in Command Center, Procurement, Processing, Franchise overview, Finance.
 - `ExceptionBanner`
   - Props: `type` (`warning|error|info`), `title`, `description`, `actions[]`.
   - Used for variance alerts, poor yields, low stock, top-up exposure, finance exceptions.
 - `TopUpExposureBanner`
   - Specialized banner variant for franchise top-up risk.

 ### 6.2 Batch, yield, and traceability components

 - `BatchStatusTimeline`
   - Visual timeline for a batch: procurement → receiving → processing → hub → franchise/customer.
 - `YieldBreakdownCard`
   - Props: input weight, outputs (primary/secondary/byproducts), yield %, loss %, service fee impact.
   - Used in processing batch detail and analytics.
 - `MassBalanceChart`
   - Visual representation of mass balance per batch or processor over time.
 - `BatchLineageViewer`
   - Tree/graph or table-based view showing original batch, derived batches, transfers, and remaining stock.
 - `OwnershipLocationBadge`
   - Compact chips showing ownership (CoolCatch vs franchise) and physical location (processor, hub, branch).
 - `StockAgeIndicator`
   - Visual indicator of stock aging (e.g. color-coded days in storage).

 ### 6.3 Logistics and cold chain components

 - `ColdHubStockTable`
   - Specialization of DataTable with columns for hub location, temperature zone, batch, age, ownership.
 - `TruckTypeBadge`
   - Badge for `leased` vs `spot-hire`, with tooltips on cost behavior.
 - `TransferPlanningTable`
   - Planning workspace for hub → franchise/customer/proc flows with quantities, ETA, and truck assignment.

 ### 6.4 Franchise & finance components

 - `FranchiseHealthCard`
   - KPIs per franchise: sales, margin, stock days cover, commission, top-up support.
 - `SegmentMixCard`
   - SKU mix card for franchises or customers (fillet vs other forms).
 - `ReplenishmentSuggestionCard`
   - Suggests stock moves/orders with reasons and action buttons.
 - `CommissionSummaryCard`
   - Commission basis, rate, guaranteed minimum, shortfall, top-up recommendation.

 ### 6.5 Audit, variance, and cost panels

 - `ProcurementVariancePanel`
   - Three-way comparison: PO weight, paid weight, received weight; variance %, approvals, resolution status.
 - `CostImpactPanel`
   - Shows cost per kg / per SKU after landed and processing cost allocation.
 - `AuditTrailDrawer`
   - Generic drawer that surfaces backend audit log for a given entity.

 These components are building blocks for Phase 1 screens and should be designed to be usable across CoolCatch and future industry variants.

 ---

 ## 7. Data contracts (frontend-side)

 Implementation will follow the backend contracts in `BACKEND_SPEC.md` and `BACKEND_SPEC_COOL_CATCH.md`. Where the backend is not yet implemented, we will:

 - Define TypeScript interfaces under `src/types/coolcatch/*.ts` or `src/types/erp.ts` extensions.
 - Provide mock data and/or adapter functions under `src/lib/mock/coolcatch/*.ts`.

 **Key frontend-facing entities:**

 - `ProcurementBatch` — ties together PO, supplier/region, currency, cash disbursements, permits, inbound logistics, expected vs received weights.
 - `CashDisbursementRecord` — cash-on-delivery payments, approver, FX rate, linked procurement batch.
 - `ReceivingEvent` — GRN plus actual weights, grades, variances, QA notes.
 - `VarianceRecord` — for procurement/receiving; includes cause, approvals, resolution status.
 - `ProcessingBatch` — dispatch to work center, input batch, expected vs actual yields, outputs, service fee.
 - `YieldOutputLine` — each output/byproduct line from a processing batch.
 - `ByproductLine` — byproduct inventory tracking.
 - `LogisticsTrip` — truck, flow (inbound/outbound), cost lines, associated transfers/orders.
 - `StockSnapshot` — extended with ownership, physical location, age, quality.
 - `TransferOrder` — transfers between hub, processors, franchises.
 - `FranchiseProfile` — franchise metadata, territory, SKU mix, support parameters.
 - `FranchiseSalesSummary` — summarized sales, margin, commission base, top-up needs.
 - `ReplenishmentRecommendation` — suggestion for replenishment quantity and timing.
 - `CommissionCalculation` — per-period commission run details.
 - `TopUpRecord` — parent-funded support records.
 - `AuditEvent` — immutable events for procurement, processing, logistics, franchise, finance actions.

 All new frontend code should use these normalized shapes, not bind directly to ad-hoc mock structures.

 ---

 ## 8. Org templates, feature flags, and roles

 We will represent “CoolCatch Edition” primarily via **org templates and feature flags**:

 - Extend the `DEFAULT_TEMPLATE_BY_ORG_TYPE` mapping in `app/(dashboard)/layout.tsx` (or via `useOrgContextStore`) to include a CoolCatch template id, e.g.:
   - `SEAFOOD_DISTRIBUTOR_COOLCATCH` → backed by a template file describing:
     - Enabled modules: manufacturing (subcontracting, yield), distribution (routes, trips), franchise, procurement audit, commission engine, VMI replenishment.
     - Default navigation ordering and possibly custom dashboards.
 - Use feature flags defined in backend spec:
   - `reverseBom`, `massBalanceYield`, `subcontracting`, `procurementAuditCashWeight`, `commissionEngine`, `vmiReplenishment`, `logisticsTrips`, etc.
 - **Roles & permissions:**
   - Parent roles (Director, Operations Manager, Procurement, QA, Processing, Warehouse, Logistics, Sales, Finance, Franchise Manager, Internal Auditor) will map to combinations of:
     - Inventory, Purchasing, Manufacturing, Distribution, Franchise, Finance, Automation, Settings permissions.
   - Franchise-side roles (Owner, Branch Manager, Sales/Cashier, Inventory Clerk) will:
     - See only franchise-related nav items (Franchise home, stock, sales, insights).
     - Have restricted write powers (e.g. local stock adjustments, sales capture but not GL-level finance actions).

 The frontend will:

 - Rely on backend to compute **effective permissions** and **feature flags**.
 - Use `requiresPermissions` and `requiresFlags` on nav sections to control visibility.
 - Adjust dashboards (e.g. which widgets render) based on role, org template, and flags.

 ---

 ## 9. Phase 1 – Screen inventory & implementation notes

 Phase 1 focuses on **high-value parent operations UI**. It should be end-to-end navigable using existing mocks and TypeScript interfaces, even before full backend implementation.

 ### 9.1 Command Center

 - **Route:** `/control-tower` (existing).
 - **Goal:** Single-glance operational overview for CoolCatch leadership.
 - **Main widgets:**
   - Sourcing summary (today/week): weight purchased vs received, variance.
   - Batches in processing; yield performance today/week.
   - Stock at processors, cold hub, franchises.
   - Inbound/outbound trips (count, exceptions).
   - B2B orders awaiting fulfillment.
   - Franchise sales today and low stock alerts.
   - Replenishment alerts for franchises and key customers.
   - Commission & top-up exposure, financial control alerts.
 - **Components:**
   - `OperationalKpiCard`, `ExceptionBanner`, `FranchiseHealthCard`, `ColdHubStockTable` (compact variant), `ReplenishmentSuggestionCard`, `MassBalanceChart` (mini).

 ### 9.2 Sourcing & Procurement workspace

 - **Routes:**
   - `/purchasing/orders` — procurement list view with CoolCatch-aware filters (supplier, region, currency, cash vs credit, weight metrics).
   - `/purchasing/orders/[id]` — procurement detail page (PO and related entities).
   - `/purchasing/cash-weight-audit` — dedicated cash-to-weight control view.
   - `/purchasing/landed-cost` (optional) — landed cost builder.
 - **Key UX:**
   - List page: filter chips, status chips, cash vs credit indicators, columns for ordered/paid/received weight.
   - Detail: supplier, currency/FX, purchase lines, cash disbursements, permits, logistics, expected receiving location, received quantities, variance banner, audit timeline.
   - Cash-to-weight view: PO vs paid vs received, variance %, approver, unresolved exceptions, escalation actions.
   - Landed cost builder: cost buckets (transport, permits, clearing, cross-border) with allocation preview and cost impact summary.
 - **Components:** `ThreeWayMatchComparisonTable`, `ProcurementVariancePanel`, `CostImpactPanel`, `AuditTrailDrawer`.

 ### 9.3 Receiving & Quality module

 - **Routes:**
   - `/inventory/receiving` — receiving queue (list of incoming procurement batches).
   - `/inventory/receipts` — GRN list (existing).
   - `/inventory/receipts/[id]` — enhanced goods receipt page.
 - **Key UX:**
   - Queue: statuses (`awaiting weigh-in`, `received today`, `discrepancy`), filters by source, transporter, ETA.
   - Goods receipt: split layout with transaction form on left (weights, grades, damage) and live variance/cost effect on right.
   - Variance resolution: mini workflow (explain, assign reviewer, mark resolved/escalate).
 - **Components:** `ExceptionBanner`, `CostImpactPanel`, `ProcurementVariancePanel`.

 ### 9.4 Processing & Yield module

 - **Routes:**
   - `/manufacturing/subcontracting` — work center directory + dispatch screen.
   - `/manufacturing/yield` — yield/mass balance analytics.
   - `/manufacturing/byproducts` — byproduct inventory view.
 - **Key UX:**
   - Work center directory: filters by type (factory/women’s group), specialization, capacity, active batches.
   - Dispatch: select source batch, work center, input weight, expected yields, service type, cost data.
   - Batch detail: flagship page with input batch details, expected vs actual yields, outputs/byproducts, loss, service fee, per-output valuation, movement timeline, notes.
   - Mass balance: analytics page comparing processors, batches, time ranges.
   - Byproducts: list of byproduct SKUs with valuation, stock, reserved/available, channel.
 - **Components:** `BatchStatusTimeline`, `YieldBreakdownCard`, `MassBalanceChart`, `BatchLineageViewer`, `OwnershipLocationBadge`, `StockAgeIndicator`.

 ### 9.5 Cold hub inventory screen

 - **Route:** `/warehouse/overview`.
 - **Key UX:**
   - Focused on hub(s), with filters for temperature zone, age, ownership, reserved vs available.
   - Action rails for transfers and dispatches.
 - **Components:** `ColdHubStockTable`, `StockAgeIndicator`, `OwnershipLocationBadge`.

 ### 9.6 Franchise overview + detail

 - **Routes:**
   - `/franchise/overview` — parent-level franchise dashboard.
   - `/franchise/[id]` — franchise detail.
   - `/franchise/commission` — commission & rebates center (extended).
 - **Key UX:**
   - Overview: franchise health cards, rankings (sales, stock turns, margin support), low stock risks, replenishment suggestions, top-up exposure.
   - Detail: franchise profile, SKU mix, stock snapshot, live sales feed summary, replenishment and commission/top-up history, profitability snapshot, alerts.
   - Commission center: weekly basis, guaranteed minimum logic, shortfalls, top-up recommendations, approval and payout status.
 - **Components:** `FranchiseHealthCard`, `SegmentMixCard`, `ReplenishmentSuggestionCard`, `CommissionSummaryCard`, `TopUpExposureBanner`.

 ### 9.7 Commission / top-up center

 - **Route:** `/finance/commission-topup` (or implemented via `/franchise/commission` with finance sub-tabs).
 - **Key UX:** finance-first view of the same commission runs and top-up journal events, with drill-down into franchise and batch-level details.

 ---

 ## 10. Phase 2 – Operational expansion

 Phase 2 is about deeper analytics and automation on top of the Phase 1 flows.

 Target screens:

 1. **Replenishment planner**
    - Routes: `/franchise/replenishment`, `/retail/replenishment` (where applicable).
    - Use `ReplenishmentSuggestionCard` + Analytics-backed tables.
 2. **Batch lineage explorer**
    - Route: `/inventory/batch-lineage/[batchId]` or separate explorer.
    - Heavy use of `BatchLineageViewer`.
 3. **Logistics trips and costing**
    - Route: `/distribution/trips` (extended).
    - Add detailed cost views and per-kg costing.
 4. **Customer performance dashboards**
    - Routes: `/analytics/products`, `/analytics/pricing`, `/analytics/inventory`, `/analytics/finance` tailored for seafood distribution.
 5. **Admin rule setup pages**
    - Routes: under `/settings/*`:
      - Product form & yield rules.
      - Processor fee setup.
      - Reorder points.
      - Franchise commission and top-up rules.
      - Truck type/cost rules.
      - Landed cost categories.

 ---

 ## 11. Phase 3 – Franchise-facing portal

 Phase 3 provides **simplified franchise surfaces** using the same codebase, controlled by roles and navigation configuration.

 Target surfaces (could live under `/franchise/*` with role-based nav):

 - **Franchise home**
   - Today’s sales, stock on hand, low stock alerts, replenishment ETA, best sellers, quick links for common actions.
 - **Franchise stock**
   - Available stock, received transfers, pending replenishments, movement history.
 - **Franchise sales**
   - Simple sales capture (if applicable) or synced sales feed view.
 - **Franchise insights**
   - Daily/weekly performance, commission estimate, launch support indicator.

 These screens will:

 - Use the same shared components (OperationalKpiCard, ReplenishmentSuggestionCard, etc.) with a simplified layout.
 - Hide complex finance and configuration features for franchise roles.

 ---

 ## 12. Engineering checklist (frontend)

 This is the working checklist we will use as we implement.

 ### 12.1 Foundation

 - [ ] Add CoolCatch org template / feature bundle to `orgContextStore` (or equivalent).
 - [ ] Ensure feature flags (`reverseBom`, `massBalanceYield`, `subcontracting`, `procurementAuditCashWeight`, `commissionEngine`, `vmiReplenishment`, `logisticsTrips`, etc.) can be toggled per org.
 - [ ] Confirm `NAV_SECTIONS_CONFIG` entries for:
  - [x] Franchise: `commission`, `vmi` (and new `overview`, `detail`, `comparison` if needed).
  - [x] Manufacturing: `subcontracting`, `yield`.
  - [x] Distribution: `trips`.
  - [x] Purchasing: `cash-weight-audit`.

 ### 12.2 Shared components

- [ ] Implement core shared components:
  - [x] `OperationalKpiCard`
  - [x] `ExceptionBanner`
   - [x] `BatchStatusTimeline`
  - [x] `YieldBreakdownCard`
   - [x] `MassBalanceChart`
   - [x] `CostImpactPanel`
   - [x] `OwnershipLocationBadge`
   - [x] `StockAgeIndicator`
  - [x] `ReplenishmentSuggestionCard`
  - [x] `CommissionSummaryCard`
   - [ ] `TopUpExposureBanner`
   - [ ] `AuditTrailDrawer`
  - [x] `ProcurementVariancePanel`
   - [ ] `TruckTypeBadge`
   - [ ] `BatchLineageViewer`
   - [ ] `ColdHubStockTable`
   - [x] `FranchiseHealthCard`
   - [x] `SegmentMixCard`
   - [x] `ThreeWayMatchComparisonTable`

 ### 12.3 Phase 1 pages

- [x] Command Center (`/control-tower`) CoolCatch layout.
 - [x] Procurement workspace (list + detail + cash-to-weight + landed cost).
- [x] Receiving & quality (queue + enhanced GRN + variance resolution).
- [x] Processing & yield (subcontracting, batch detail, mass balance, byproducts).
 - [ ] Cold hub inventory (warehouse overview tailored to hub).
- [x] Franchise overview + detail.
- [x] Commission / top-up center.

 ### 12.4 Phase 2 & 3 (later)

 - [ ] Replenishment planner.
 - [ ] Batch lineage explorer.
- [x] Logistics trips costing view.
 - [ ] Customer performance dashboards.
 - [ ] Admin rule setup pages.
 - [ ] Franchise portal (home/stock/sales/insights).

 ---

 ## 13. How to use this document

 - Treat this file as the **single source of truth for CoolCatch frontend scope**.
 - Before implementing a screen:
   - Verify the route and module mapping here.
   - Reuse or extend shared components listed in §6.
   - Align data shapes with §7 and backend specs.
 - Keep this document updated as:
   - Routes are finalized.
   - Components are implemented.
   - Backend capabilities evolve.

 This ensures that OdaFlow ERP remains a single, coherent platform while delivering a premium **CoolCatch Edition** tailored to seafood processing, distribution, and franchising.

