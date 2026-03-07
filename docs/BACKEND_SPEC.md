# OdaFlow ERP — Backend Technical North Star

**Purpose:** Single source of truth for engineers and Cursor when building backend infra, agents, APIs, and data pipelines. This document was derived from a full review of the frontend codebase and defines everything the backend must provide.

**See also:** [BACKEND_API_SPEC_SINGLE_SOURCE.md](./BACKEND_API_SPEC_SINGLE_SOURCE.md) — **single source of truth** for implemented APIs, stub→endpoint migrations, and quick reference (no dependency on external spec files). [BACKEND_SPEC_COOL_CATCH.md](./BACKEND_SPEC_COOL_CATCH.md) — Cool Catch / franchise features (commission engine, VMI, cash-to-weight audit, subcontracting). [BACKEND_ENDPOINT_MIGRATIONS.md](./BACKEND_ENDPOINT_MIGRATIONS.md) and [REMAINING_BACKEND_IMPLEMENTED.md](./REMAINING_BACKEND_IMPLEMENTED.md) point to BACKEND_API_SPEC_SINGLE_SOURCE for implementation details.

---

## STACK & CONTEXT (from your history)

- **Runtime:** Node.js + TypeScript
- **Cloud:** AWS (EC2, S3, DocumentDB / Mongo-compatible)
- **Auth & realtime:** Firebase (Auth + Realtime)
- **Architecture:** Event-driven; multi-agent; AI-first ERP
- **Channels:** Web frontend, mobile apps, WhatsApp interfaces
- **North star:** Supply chain autopilot with human supervision — not forms software or static dashboards.

---

# 1. API & BFF LAYER

## RESPONSIBILITIES

- **Auth via Firebase:** Validate tokens; map Firebase UID to `User` (org, branch, roleIds); tenant isolation.
- **RBAC enforcement:** Every mutation and sensitive read must enforce permissions from `src/lib/permissions.ts` (e.g. `inventory.read`, `orders.approve`, `finance.post_journal`). Frontend uses `can()`, `hasAnyPermission`, `hasAllPermissions`; backend must be the source of truth.
- **Policy checks:** Approval thresholds, spend caps, supplier rules (see §3 Policy Engine).
- **Command bar requests:** Natural-language intent from the universal command bar (⌘K) → interpret, plan, confirm, execute. See §6.
- **Streaming updates to frontend:** Partial results and real-time state (e.g. Firebase Realtime or SSE) for approvals, work queue, dashboard KPIs.
- **Agent execution triggers:** BFF receives “Apply” / “Approve” from frontend; triggers orchestrator; returns job id or stream.
- **Audit logging:** Immutable log for every document transition, approval, AI recommendation applied, and override. Frontend expects audit trail in doc view and Settings → Audit log.

## FRONTEND EXPECTATIONS (from codebase)

- **Auth store** (`src/stores/auth-store.ts`): `User`, `Org`, `Tenant`, `Branch`; `setUser`, `setOrg`, `setCurrentBranch`, `logout`. Backend must provide: login (Firebase), me (user + org + branches + roles), switch branch.
- **Doc actions:** Request approval, Approve, Reject, Post, Cancel, Reverse — per `DocActionKey` in `src/config/documents/types.ts`. Status workflows per doc type in `src/config/documents/registry.ts`.
- **Approvals:** Inbox and Requests lists; Approve/Reject with optional comment; “View document” → `/docs/[type]/[id]`. Backend must: list pending by user, submit approval/rejection, emit events, update doc status.
- **Export/Import:** PDF export for docs; CSV export for lists; CSV import for currencies, exchange rates, COA. Backend: generate PDFs; accept CSV uploads; return job id or link.

## CURSOR PROMPT

> Build a Node.js + TypeScript BFF service that:
> - Accepts natural-language commands from the command bar
> - Validates Firebase ID tokens and enforces RBAC using the permission set in the frontend
> - Emits domain events for every document and approval state change
> - Calls the AI orchestration layer for recommendations and simulations
> - Streams partial results (SSE or Firebase) to the frontend
> - Applies role-based approvals and policy checks before write actions
> - Writes immutable audit logs (who, what, when, entity id, before/after or event payload)

---

# 2. EVENT BUS & WORKFLOWS

## STACK

- **Initial:** AWS SNS / SQS; BullMQ / Redis for job queues
- **Later:** MSK (Kafka) for high throughput and replay

## EVENTS (aligned with frontend domains)

- **Documents:** `quote.created`, `sales-order.created`, `sales-order.submitted`, `sales-order.approved`, `purchase-order.created`, `purchase-order.approved`, `grn.created`, `invoice.created`, `invoice.posted`, `bill.created`, `journal.created`, `journal.posted`
- **Approvals:** `approval.requested`, `approval.approved`, `approval.rejected`
- **Inventory:** `stock.movement`, `stock.low`, `stock.receipt`, `costing.run`
- **Warehouse:** `transfer.created`, `transfer.received`, `pick-pack.completed`, `putaway.confirmed`, `cycle-count.submitted`
- **Planning:** `forecast.updated`, `mrp.suggestion.applied`
- **Procurement:** `po.proposed`, `po.approved`, `purchase-return.created`
- **Finance:** `invoice.received`, `payment.submitted`, `bank-recon.matched`, `period.closed`, `period.reopened`
- **Anomalies & AI:** `anomaly.detected`, `recommendation.produced`, `simulation.completed`
- **Payroll:** `pay-run.submitted`, `pay-run.approved`, `pay-run.journal.posted`
- **Assets:** `asset.created`, `depreciation.run`, `disposal.recorded`

## CURSOR PROMPT

> Implement a domain-event dispatcher that:
> - Publishes events to SQS (and optionally SNS for fan-out)
> - Triggers AI agents and workflow steps based on event type
> - Supports replay for feature build and training
> - Persists event payloads to S3 for audit and training (e.g. raw-events/)

---

# 3. AI ORCHESTRATION LAYER

## RESPONSIBILITIES

- **Forecasting models:** Demand by SKU/location; supply risk; seasonality (frontend: Analytics Explore, Simulations, MRP).
- **Optimization solvers:** Production schedules, reorder points, allocation (frontend: MRP, work orders, inventory costing).
- **LLM reasoning:** Natural-language → intent; explanation for recommendations; Copilot actions (frontend: `src/types/copilotActions.ts` — create-entity, update-entity, create-document, create-workflow, custom-recommendation).
- **Policy evaluation:** Approval thresholds, spend caps, supplier rules, risk limits before any auto-execute.
- **Simulation engines:** What-if for demand, price, reorder, payroll, FX (frontend: `/analytics/simulations`).
- **Agent autonomy:** Per-config levels 0–3 (suggest only → full autonomous). See §8.

## AGENT REGISTRY (map to frontend Control Tower layers)

- **PlannerAgent:** Forecasting, MRP, scenario simulation; feeds “Apply Plan”, “Simulate” on Control Tower and MRP.
- **ProductionAgent:** Schedule optimization, work order suggestions; feeds manufacturing and work queue.
- **BuyerAgent:** Auto-PO proposals, supplier switch recommendations; feeds purchasing and approvals.
- **FinanceAgent:** Margin, cash, anomaly, fraud signals; feeds analytics/finance and work queue.
- **QueryAgent:** Natural-language command bar; intent detection, execution plan, confirmation.

## POLICY ENGINE

- Approval thresholds (e.g. amount > X → multi-step approval)
- Spend caps per branch/category
- Supplier rules (preferred, blocked, lead-time)
- Risk limits for autonomous actions

## FRONTEND HOOKS

- **RecommendationCard** (`src/components/ai/RecommendationCard.tsx`): Backend must return title, drivers[], expectedUpside, risk, confidence%, and optional alternativeSummary; actions: Simulate, Approve, Modify, Explain.
- **CopilotActionCards / Apply:** Frontend sends “Apply” with action payload; backend must execute or route to approval and emit events.
- **MRP “Apply suggestion”:** Backend applies suggested PO/work order and returns result or approval request.
- **Simulations “Apply suggestion”:** Backend persists scenario or applies pricing/reorder change per policy.

## CURSOR PROMPT

> Build an AI Orchestrator service that:
> - Routes tasks to specialized agents (Planner, Production, Buyer, Finance, Query)
> - Executes policy checks before any write
> - Runs simulations on request and returns structured results
> - Produces recommendations with confidence, risk, drivers, and alternatives
> - Requires approval for write actions when above policy threshold
> - Logs all reasoning steps and model versions for explainability and audit

---

# 4. FEATURE STORE + MODEL LAYER

## DATA SOURCES (from frontend mocks and repos)

- **Orders:** Sales orders, quotes, delivery notes, invoices (docs); purchase orders, purchase requests, GRN, bills
- **Inventory:** Stock levels, movements, receipts; SKU, warehouse, bin (from `src/lib/mock/stock.ts`, movements, bins, etc.)
- **Production:** BOMs, routing, work orders, MRP (from `src/lib/mock/manufacturing/`, `mrp-planning.ts`)
- **Masters:** Products, parties (customers/suppliers), warehouses (from `src/lib/mock/masters.ts`)
- **Finance:** COA, journals, bank statements, AR/AP aging (from coa, bank-recon, ar, ap mocks)
- **Payroll:** Employees, pay runs, statutories (from `src/lib/mock/payroll/`)
- **Costing:** Landed cost, valuation (from `src/lib/mock/inventory/costing.ts`, `landed-cost.ts`)
- **IoT/telemetry:** (Future) factory PLCs, machine data
- **External:** Supplier lead times, cost curves, promotions; (future) weather APIs

## STORAGE

- **Online:** Redis or Dynamo-like cache for low-latency feature serving
- **Offline:** S3 parquet (or similar) for training and batch analytics
- **Metadata & transactional:** DocumentDB (Mongo-compatible) for docs, masters, approvals, audit

## MODEL TYPES

- **Demand forecasting:** Prophet / XGBoost / DeepAR — feed Analytics Explore and MRP
- **Optimization:** OR-Tools (or similar) for scheduling, allocation, reorder
- **Anomaly detection:** For work queue and Analytics Anomalies
- **Fraud detection:** For finance intelligence and alerts
- **Reinforcement learning:** (Phase 3) scheduling, negotiation
- **LLMs:** Intent parsing, SQL/Mongo translation, explanation, Copilot

## ANALYTICS CONTRACT (frontend contract in `src/lib/analytics/`)

- **Metrics:** revenue, quantity, cogs, gross_margin, stock_value, stockout_days, ar_overdue, ap_due, cash_balance, payroll_cost, vat, wht, etc. (`MetricKey` in `semantic.ts`)
- **Dimensions:** time, product, customer, supplier, warehouse, branch, salesperson, channel, employee, etc. (`DimensionKey`)
- **Query:** `AnalyticsQuery` (metric, dimensions, filters, limit) → `AnalyticsResult` (rows, total, priorTotal). Each row: dimensions map, value, prior?, drillIds for drill-through.
- **Saved views:** Frontend stores in localStorage; backend must persist and version for multi-device and sharing.

## CURSOR PROMPT

> Implement a feature pipeline that:
> - Listens to domain events from the event bus
> - Builds SKU/location and other features per frontend semantic metrics and dimensions
> - Stores online (Redis/cache) and offline (S3 parquet) with versioning
> - Versions datasets and supports retraining jobs
> - Exposes an analytics API that implements the frontend AnalyticsQuery → AnalyticsResult contract

---

# 5. DATA LAKE & TRAINING PIPELINE

## S3 BUCKETS

- `raw-events/` — event payloads from event bus
- `normalized/` — cleaned, typed entities (docs, movements, etc.)
- `features/` — built feature sets (versioned)
- `models/` — trained model artifacts (versioned)
- `simulations/` — scenario inputs/outputs
- `audit/` — immutable audit logs (optional copy from primary store)

## TRAINING FLOW

Event replay → feature build → train → evaluate → register → deploy. CI/CD triggers retraining on schedule or on new data.

## CURSOR PROMPT

> Create an offline training pipeline that:
> - Pulls data from S3 (raw-events, normalized)
> - Builds features per the feature store spec
> - Trains forecasting (and other) models
> - Evaluates accuracy and business metrics
> - Registers artifacts with version tags
> - Deploys behind versioned inference endpoints used by the orchestrator

---

# 6. NATURAL LANGUAGE COMMAND SERVICE

## PURPOSE

Serves the universal command bar (⌘K). Frontend sends free-text query; backend returns intent and execution plan; frontend shows “Confirm” and optional intent preview; on confirm, backend executes or opens approval.

## FLOW

User query → Intent detection (LLM + domain mapping) → Execution plan (graph of steps) → Optional approval gate → Emit events → Return result or stream.

## FRONTEND BEHAVIOR

- **Command palette** (`src/components/command/CommandPalette.tsx`): When user types, “Ask AI” row appears with intent preview (e.g. “Query inventory · Run forecast · Filter by criteria”). On select, frontend calls Copilot with the query. Backend must: accept NL, return intent summary and plan, and on confirm execute or stream.

## CURSOR PROMPT

> Build a command interpretation service that:
> - Parses ERP intents from natural language (inventory, approvals, cash, orders, production, etc.)
> - Maps to domain services and document types
> - Generates execution graphs (steps with dependencies)
> - Requires confirmation for destructive or high-risk actions
> - Emits domain events on execution
> - Returns explainable reasoning (for “Why this?” in the UI)

---

# 7. SECURITY, COMPLIANCE & GOVERNANCE

## REQUIREMENTS

- **SOC-style audit trails:** Every doc state change, approval, AI recommendation applied, override; immutable, append-only.
- **Data lineage:** Track which events/features fed which models and outputs.
- **Model versioning:** All recommendations and simulations tagged with model version; store in audit.
- **Tenant isolation:** All queries and writes scoped by tenant (and org/branch where applicable). Frontend types: `Tenant`, `Org`, `Branch`, `User` with `orgId`, `branchIds`, `roleIds`.
- **PII encryption:** At rest and in transit; mask in logs.
- **Role-based agent permissions:** Agents only act within allowed permissions (e.g. BuyerAgent can create PO if policy allows).

## FRONTEND PERMISSIONS (`src/lib/permissions.ts`)

- Inventory: read, write, adjust, transfer, delete
- Sales: read, write, approve
- Purchasing: read, write, approve
- Finance: gl.read, gl.write, post_journal, audit.read
- Projects: read, write, approve
- Settings: org.read, users.read, sequences.read, inventory.read
- Approvals: read, approve

Backend must enforce these (and any extended list) on every API call.

## CURSOR PROMPT

> Implement governance middleware that:
> - Records every AI decision (recommendation id, model version, input summary, outcome)
> - Tracks model versions in audit and in recommendation responses
> - Logs human overrides with user id and reason
> - Enforces tenant and org/branch isolation on all data access
> - Supports regulatory exports (audit log, data lineage) in standard formats

---

# 8. AUTONOMY LEVELS

Agents operate in modes (per tenant/org configuration):

- **0 — Suggest only:** Return recommendations; no writes.
- **1 — Execute with approval:** Create draft or proposal; human approves; then execute.
- **2 — Execute within budget:** Auto-execute below policy threshold; above threshold → approval.
- **3 — Fully autonomous:** Execute within guardrails; log and alert only.

Frontend already shows “Simulate” and “Approve” on recommendation cards; backend must respect configured level and route accordingly.

---

# 9. INTEGRATION ADAPTERS

## REQUIRED (from frontend)

- **WhatsApp:** Referenced in Settings → Notifications (Email, SMS, WhatsApp toggles) and Automation → Integrations (“WhatsApp (future) — Order and support via WhatsApp”). Backend must: receive inbound messages, map to intents, trigger command service or workflows; send outbound (order confirmations, alerts).
- **Mobile:** Frontend is responsive; backend must support mobile clients (same BFF + Firebase Auth; optional mobile-specific endpoints or push).
- **Banks:** Bank statement import and reconciliation (frontend: bank-recon). Adapter: fetch or receive statements, normalize, match to payments/invoices.
- **Supplier ERPs / EDI:** (Future) PO/GRN sync.
- **Factory PLCs / IoT:** (Future) Telemetry for production optimization.
- **Distributor systems:** (Future) Orders, inventory sync.
- **Mobile money:** (Future) Payments and collections.

Adapters publish domain events → core system reacts; no business logic in adapters.

---

# 10. FRONTEND-DERIVED BACKEND REQUIREMENTS (full inventory)

This section lists every backend need inferred from the frontend. Nothing should be missed when building the backend.

## 10.1 Document types and workflows (source: `src/config/documents/registry.ts`)

| DocTypeKey | List columns | Status workflow | Actions (DocActionKey) |
|------------|--------------|-----------------|------------------------|
| quote | number, date, party, total, status | DRAFT → PENDING_APPROVAL → APPROVED → CONVERTED | submit, approve, cancel |
| sales-order | number, date, party, total, status | DRAFT → PENDING_APPROVAL → APPROVED → FULFILLED | submit, approve, cancel |
| delivery-note | number, date, party, total, status | DRAFT → IN_TRANSIT → DELIVERED | submit, cancel |
| invoice | number, date, party, total, status | DRAFT → POSTED | submit, post, cancel, reverse |
| purchase-request | number, date, party, total, status | DRAFT → PENDING_APPROVAL → APPROVED | submit, approve, cancel |
| purchase-order | number, date, party, total, status | DRAFT → PENDING_APPROVAL → APPROVED → RECEIVED | submit, approve, cancel |
| grn | number, date, poRef, warehouse, status | DRAFT → POSTED | submit, post, cancel |
| bill | number, date, party, total, status | DRAFT → POSTED | submit, post, cancel, reverse |
| journal | number, date, reference, status | DRAFT → POSTED | submit, post, cancel, reverse |

Backend must: CRUD per type; number sequences per type (prefix, next number, padding); validation rules per registry (e.g. has-lines, customer-required, balanced); transitions with approval and post (GL) where applicable. Form sections and entityType (customer, supplier, product) drive BFF validation.

## 10.2 Entities requiring CRUD (from frontend repos, mocks, `src/types/erp.ts`)

- **Tenancy:** Tenant, Org, Branch (orgType: MANUFACTURER | DISTRIBUTOR | SHOP). Entities and branches under Settings.
- **Users & roles:** User (email, firstName, lastName, roleIds, branchIds, status); Role (name, description, scope: ORG|BRANCH|DEPARTMENT, permissions); full permissions list — see §10.11. Repo: `users-roles.repo.ts`; mock: `users-roles.ts`.
- **Products & masters:** Product, SKU, Category, Brand, UOM (products.repo, masters, packaging, variants, price-lists, pricing). Repos: `products.repo.ts`, `pricing.repo.ts`, `tax.repo.ts`, `uom.repo.ts`.
- **Parties:** Customer, Supplier (masters/parties); AR/AP views (ar, ap mocks).
- **Warehouses & locations:** Warehouse, Location (type BIN|ZONE|RACK), Batch. Bins: `bins.repo.ts`, `warehouse/bins.ts`.
- **Finance masters:** LedgerAccount, CostCenter, Department; COA (coa mock, settings financial).
- **Pricing:** PriceList, PriceListItem, Tax, DiscountRule, DiscountCondition (products/price-lists, pricing, taxes).
- **Assets:** Asset register (code, name, category, acquisition, cost, salvage, useful life, depreciation method, status); disposals; depreciation runs. Repo: `assets.repo.ts`; mocks: `assets/register.ts`, `depreciation.ts`, `disposals.ts`.
- **Bank accounts:** name, account number, bank, branch, currency, GL mapping, active. Repo: `bank-accounts.repo.ts`; mock: `treasury/bank-accounts.ts`.
- **Sequences:** documentType, prefix, nextNumber, suffix, padding. Repo: `sequences.repo.ts`; mock: `sequences.ts`.
- **Cycle count sessions:** number, warehouse, scope, scopeDetail, status, lines (SKU, systemQty, countedQty, variance). Repo: `cycle-counts.repo.ts`; mock: `warehouse/cycle-counts.ts`.
- **BOMs & routing:** BOM, BOMItem; Routing operations, work centers. Repos: `bom.repo.ts`, `routing.repo.ts`; mocks: `manufacturing/boms.ts`, `manufacturing/routing.ts`.
- **Payroll:** Employees, pay runs, pay run lines, statutories. Repo: `payroll.repo.ts`; mocks: `payroll/employees.ts`, `payruns.ts`, `statutories.ts`.
- **Fiscal:** Fiscal years, periods (fiscal mock); period close/reopen.
- **Financial settings:** Currencies, exchange rates, COA, withholding, tax codes (financial-settings, coa, exchange-rates, tax mocks, tax/kenya.ts, tax/reports.ts).
- **Organization:** Org profile, Entities, Branches, Compliance, Notifications, Audit log (settings).
- **Reports:** Report library, Saved views, Scheduled reports, Export history, VAT summary, WHT summary (reports mock).
- **Work queue items:** category, title, description, href, severity; backend must populate or sync with alerts. Mock: `work-queue.ts`.
- **Approvals:** Inbox and Requests; documentType, documentId, documentNumber, amount, requester, requestedAt, status. Mock: `approvals.ts`.
- **CRM (when enabled):** Accounts/Parties, Activities/Notes, Deals/Opportunities, Support/Tickets — routes: `/crm/accounts`, `/crm/activities`, `/crm/deals`, `/crm/tickets`.
- **Distribution (orgType DISTRIBUTOR):** Routes, Deliveries (flag: deliveries), Collections (flag: collections). Mocks: distribution routes/deliveries/collections as needed.
- **Retail (orgType RETAIL):** Replenishment (flag: replenishment), Promotions (flag: promotions), Store performance (flag: storePerformance). Term keys: replenishment, promotion, store.
- **Intercompany:** IC entities, IC transactions, consolidation. Mocks: `intercompany/entities.ts`, `transactions.ts`, `consolidation.ts`.
- **Automation:** Rules engine, Alerts & notifications, Scheduled jobs, Approval workflows, Integrations, AI insights. Mocks: `automation-rules.ts`.
- **Customizer (Enterprise):** ModuleConfig, CustomFieldDefinition, WorkflowDefinition, DashboardDefinition (settings/customizer: modules, fields, workflows, dashboards).

## 10.3 Stub actions to replace with real API (from TODOS_AND_PENDING and action-registry)

- **Docs:** Request approval, Approve, Reject, Post, Export PDF. Attachments upload, comments add.
- **Settings:** Save org, payroll config, notifications; Add currency, Import CSV (exchange rates, COA); Add rule (pricing rules, entities); WHT certificate; Add VAT/WHT code.
- **Warehouse:** Create transfer, Mark received; Allocate to bins (putaway); Complete (pick-pack); Cycle count Submit.
- **Finance:** Create payment from statement line (bank-recon); Close period, Reopen period; Three-way match “Match selected”; AR payments Allocate, Submit payment; AP Pay supplier.
- **Treasury:** Request approval (payment run), Bank format; Payment run Approve.
- **Payroll:** Approve pay run, Post payroll journal, Download payslip PDF.
- **Assets:** Run depreciation.
- **Inventory:** Save allocation (costing), Run costing.
- **Purchasing:** Create return, Export, Approve (purchase returns).
- **Automation:** Create workflow; Require approval (rules); Apply action (AI insights).
- **Approvals:** Approve, Reject (inbox) with optional comment.
- **Analytics/Simulations:** Apply suggestion; Save view (persist to backend); runAnalyticsQuery replace mock with real API.
- **Master data:** Product delete; Apply pricing template.
- **Projects:** Create project.
- **Copilot:** “Apply” from action cards → execute or send to approval.

## 10.4 Auth and session

- **Login:** Firebase Auth (email/password or other providers); backend validates token and returns or creates User/Org/Branch.
- **Me:** GET /me → User, Org, Tenant, Branches, effective permissions.
- **Switch branch:** Set current branch (session or cookie); all subsequent requests scoped by branch where applicable.
- **Logout:** Invalidate session; frontend clears store.

## 10.5 Realtime and streaming

- **Approvals inbox:** New items and status changes (e.g. Firebase Realtime or SSE).
- **Work queue:** New or updated items.
- **Dashboard KPIs:** Optional live updates.
- **Command bar / Copilot:** Stream partial results (e.g. intent, then steps, then result).

## 10.6 File and export

- **PDF:** Document print/export (per doc type layout).
- **CSV:** List exports (products, movements, pay run, etc.); frontend has “Export” in many list toolbars.
- **Import:** Currencies, exchange rates, COA (CSV); bank statements (file or link).

## 10.7 Analytics and intelligence

- **Explore API:** Accept `AnalyticsQuery` (metric, dimensions, filters, limit); return `AnalyticsResult` (rows with dimensions, value, prior, drillIds).
- **Saved views:** CRUD for saved analysis views (frontend currently localStorage).
- **Intelligence modules:** Product (margin waterfall, packaging profit), pricing, inventory, finance (cash drivers, AR aging), payroll — backend to supply or compute from features.
- **Anomalies:** List with type, severity, entity; “Investigate” link; backend detection pipeline.
- **Simulations:** Run what-if (price, reorder, payroll, FX); return impact; “Apply” may persist or create draft.

## 10.8 Mobile and WhatsApp

- **Mobile:** Same BFF; Firebase Auth; responsive UI already in place; optional push for approvals/alerts.
- **WhatsApp:** Inbound webhook → intent → command service or workflow; outbound for notifications and order updates. Settings and Integrations pages expect a “WhatsApp” channel.

## 10.9 All frontend routes requiring backend (from `src/config/navigation/sections.ts`)

- **Core:** /control-tower, /dashboard, /approvals/inbox, /approvals/requests, /tasks
- **Docs:** /docs, /docs/sales-order, /docs/purchase-order, /docs/grn, /docs/invoice, /docs/journal
- **Masters:** /master, /master/products, /master/parties, /master/warehouses
- **Inventory:** /inventory/products, /inventory/stock-levels, /inventory/movements, /inventory/receipts, /inventory/costing, /warehouse/transfers, /warehouse/cycle-counts, /inventory/warehouses
- **Warehouse:** /warehouse/overview, /warehouse/transfers, /warehouse/pick-pack, /warehouse/putaway, /warehouse/bin-locations, /warehouse/cycle-counts
- **Sales:** /sales/overview, /sales/quotes, /sales/orders, /sales/deliveries, /sales/invoices, /sales/customers, /sales/returns
- **Purchasing:** /purchasing/requests, /purchasing/orders, /inventory/receipts (GRN), /ap/suppliers, /ap/bills, /purchasing/purchase-returns, /purchasing/cash-weight-audit (flag: procurementAuditCashWeight)
- **Pricing:** /pricing/overview, /pricing/price-lists, /pricing/rules
- **Manufacturing:** /manufacturing/boms, /manufacturing/routing, /manufacturing/work-orders, /manufacturing/mrp, /manufacturing/subcontracting (flags: bomMrpWorkOrders, workOrders, subcontracting)
- **Distribution:** /distribution/routes, /distribution/deliveries, /distribution/collections (orgType DISTRIBUTOR)
- **Franchise:** /franchise/commission, /franchise/vmi (flags: commissionEngine, vmiReplenishment)
- **Retail:** /retail/replenishment, /retail/promotions, /retail/store-performance (orgType RETAIL)
- **Treasury:** /treasury/overview, /treasury/payment-runs, /treasury/collections, /treasury/bank-accounts, /treasury/cashflow, /finance/bank-recon
- **Assets:** /assets/overview, /assets/register, /assets/depreciation, /assets/disposals
- **Projects:** /projects/overview, /projects/list, /timesheets
- **Payroll:** /payroll/overview, /payroll/employees, /payroll/pay-runs, /payroll/payslips, /payroll/statutories
- **Intercompany:** /intercompany/overview, /intercompany/transactions
- **Finance:** /finance, /finance/gl, /finance/chart-of-accounts, /finance/journals, /finance/ar, /ar/customers, /ar/payments, /finance/ap, /ap/suppliers, /ap/bills, /ap/payments, /ap/three-way-match, /finance/payments, /finance/tax, /finance/statements (pnl, balance-sheet, cash-flow), /finance/period-close, /finance/budgets, /finance/ledger, /finance/audit
- **CRM:** /crm/accounts, /crm/activities, /crm/deals, /crm/tickets
- **Reports:** /reports, /reports/saved, /reports/scheduled, /reports/exports, /reports/vat-summary, /reports/wht-summary
- **Analytics:** /analytics, /analytics/explore, /analytics/insights, /analytics/anomalies, /analytics/simulations, /analytics/products, /analytics/pricing, /analytics/inventory, /analytics/finance, /analytics/payroll, /analytics/settings
- **Automation:** /automation, /automation/rules, /automation/alerts, /automation/schedules, /automation/workflows, /automation/integrations, /automation/ai-insights, /work/queue
- **Settings:** /settings/org, /settings/organization/entities, /settings/branches, /settings/users-roles, /settings/preferences, /settings/sequences, /settings/compliance, /settings/notifications, /settings/payroll, /settings/audit-log, /settings/financial/* (currencies, exchange-rates, chart-of-accounts, taxes, fiscal-years), /settings/inventory/costing, /settings/uom, /settings/products/pricing-rules, /settings/tax/kenya, /settings/tax/vat, /settings/tax/withholding, /settings/tax/tax-mappings, /settings/customizer/* (modules, fields, workflows, dashboards)

## 10.10 Feature flags and org types (backend must respect)

- **requiresFlags:** approvals, multiWarehouse, bomMrpWorkOrders, workOrders, deliveries, collections, replenishment, promotions, storePerformance, procurementAuditCashWeight, subcontracting, commissionEngine, vmiReplenishment, reverseBom (see BACKEND_SPEC_COOL_CATCH)
- **requiresOrgTypes:** MANUFACTURER (manufacturing), DISTRIBUTOR (distribution), RETAIL (retail)
- **requiresPermissions:** See §10.11. Every nav item that has requiresPermissions must be gated by backend RBAC.

## 10.11 Complete permissions list (backend must enforce)

From `src/lib/permissions.ts` and every `requiresPermissions` in `sections.ts`:

- **Approvals:** approvals.read
- **Inventory:** inventory.read, inventory.write
- **Sales:** sales.read, sales.orders.read, sales.deliveries.read, sales.invoices.read, sales.customers.read, sales.returns.read
- **Purchasing:** purchasing.orders.read, purchasing.grn.read, purchasing.suppliers.read, purchasing.bills.read, purchasing.returns.read
- **Finance:** finance.read, finance.gl.read, finance.accounts.read, finance.journals.read, finance.ar.read, finance.ap.read, finance.payments.read, finance.tax.read, finance.statements.read, finance.close.write, finance.bank.read, finance.audit.read
- **Manufacturing:** manufacturing.bom.read, manufacturing.production.read, manufacturing.workorders.read
- **Distribution:** distribution.routes.read, distribution.deliveries.read, distribution.collections.read
- **Retail:** retail.replenishment.read, retail.promotions.read, retail.performance.read
- **Franchise (Cool Catch):** franchise.commission.read, franchise.commission.write, franchise.vmi.read, franchise.vmi.write; purchasing.audit.read, purchasing.audit.write; manufacturing.subcontracting.read, manufacturing.subcontracting.write (see BACKEND_SPEC_COOL_CATCH)
- **Projects:** projects.read
- **Reports:** reports.read, reports.schedule.read, reports.export.read
- **Automation:** automation.read, automation.rules.read, automation.alerts.read, automation.schedules.read, automation.workflows.read, automation.integrations.read, automation.ai.read
- **Settings:** settings.org.read, settings.branches.read, settings.users.read, settings.preferences.read, settings.sequences.read, settings.audit.read, settings.financial.read, settings.inventory.read, settings.customizer.read
- **CRM:** crm.accounts.read, crm.activities.read, crm.deals.read, crm.tickets.read

Extended from permissions.ts constants: inventory.adjust, inventory.transfer; sales.write, sales.approve, sales.cancel; purchase.read, purchase.write, purchase.approve; finance.write, finance.post_journal, finance.approve; manufacturing.read, manufacturing.write; admin.users, admin.settings, admin.customization. Backend is source of truth; frontend `can()` must align.

## 10.12 Entity types (from `src/types/erp.ts` — backend must persist/query)

Tenancy: Tenant, Org, Branch, Address. Users: User, Role, Permission, PermissionContext. Masters: Product, SKU, UOM, Category, Brand, Customer, Supplier, PriceList, PriceListItem, Tax, DiscountRule, DiscountCondition. Warehouse: Warehouse, Location, Batch. Finance: LedgerAccount, CostCenter, Department. Transactions: SalesOrder, PurchaseOrder, OrderStatus, OrderItem, Invoice, InvoiceItem, Payment, Transfer, TransferItem, GRN, GRNItem, Delivery, DeliveryItem, Stocktake, StocktakeItem. Manufacturing: BOM, BOMItem, WorkOrder, WorkOrderItem, ProductionRun, QCCheck. Customization: ModuleConfig, CustomFieldDefinition, WorkflowDefinition, WorkflowStatus, WorkflowTransition, DashboardDefinition, DashboardWidget, DashboardLayout. AI: AIAssistantMessage, AISuggestion, AnomalyDetection. IDs: TenantId, OrgId, BranchId, UserId, RoleId. OrgType: MANUFACTURER | DISTRIBUTOR | SHOP.

## 10.13 Stub actions (from `src/lib/qa/action-registry.ts` — status "stub"; backend must implement)

- **Docs:** Request approval, Approve, Post, Export PDF
- **Masters:** Delete product, Apply pricing template
- **Inventory:** Run costing
- **Warehouse:** Mark received (transfer), Complete (pick-pack), Confirm (putaway), Submit (cycle count)
- **Purchasing:** Create return, Export, Approve (purchase returns)
- **AP:** Match selected (three-way match)
- **AR:** Allocate (payments)
- **Finance:** Close period, Reopen period
- **Treasury:** Approve (payment run)
- **Assets:** Run depreciation
- **Payroll:** Approve (pay run)
- **Analytics:** Apply suggestion (simulations)
- **Automation:** Apply action (AI insights)
- **Approvals:** Approve, Reject (inbox)
- **Settings:** Save (org)

---

# 11. BACKEND SCOPE CHECKLIST (by module)

Use this to verify “everything the ERP will have” is covered.

| Module | Routes | Entities / APIs | Events | Notes |
|--------|--------|----------------|--------|-------|
| Core | control-tower, dashboard, approvals, tasks | Approvals inbox/requests, work queue | approval.*, work-queue | |
| Docs | docs hub + 5 doc types | CRUD + sequences + actions | doc.* | quote, sales-order, delivery-note, invoice, purchase-request, purchase-order, grn, bill, journal |
| Masters | products, parties, warehouses | Product, Customer, Supplier, Warehouse, Location | master.* | |
| Inventory | stock-levels, movements, receipts, costing, warehouses | Stock, Movement, GRN, costing | stock.*, costing.run | |
| Warehouse | overview, transfers, pick-pack, putaway, bins, cycle-counts | Transfer, PickPack, Putaway, Bin, CycleCount | transfer.*, putaway.*, cycle-count.* | |
| Sales | overview, quotes, orders, deliveries, invoices, customers, returns | SalesOrder, Quote, Delivery, Invoice, Customer | sales.* | |
| Purchasing | requests, orders, GRN, suppliers, bills, returns | PurchaseRequest, PO, GRN, Supplier, Bill | po.*, purchase-return.* | |
| Pricing | overview, price-lists, rules | PriceList, DiscountRule | | |
| Manufacturing | BOMs, routing, work-orders, MRP | BOM, Routing, WorkOrder, MRP | mrp.*, work-order.* | Optional (MANUFACTURER) |
| Distribution | routes, deliveries, collections | Route, Delivery, Collection | | Optional (DISTRIBUTOR) |
| Franchise | commission, vmi | CommissionRun, Franchisee, VMIReplenishmentOrder | franchise.* | Optional (flags: commissionEngine, vmiReplenishment); see BACKEND_SPEC_COOL_CATCH |
| Procurement audit | cash-weight-audit | CashDisbursement, ProcurementAuditLine | procurement.audit.* | Optional (flag: procurementAuditCashWeight) |
| Subcontracting | subcontracting | ExternalWorkCenter, SubcontractOrder, WIPBalance | subcontract.* | Optional (flag: subcontracting) |
| Retail | replenishment, promotions, store-performance | Replenishment, Promotion, Store | | Optional (RETAIL) |
| Treasury | overview, payment-runs, collections, bank-accounts, cashflow, bank-recon | PaymentRun, BankAccount, Cashflow, BankRecon | payment.*, bank-recon.* | |
| Assets | overview, register, depreciation, disposals | Asset, DepreciationRun, Disposal | asset.*, depreciation.run | |
| Projects | overview, list, timesheets | Project, Timesheet | | |
| Payroll | overview, employees, pay-runs, payslips, statutories | Employee, PayRun, Payslip, Statutory | pay-run.* | |
| Intercompany | overview, transactions | IC entity, IC transaction, consolidation | | |
| Finance | GL, COA, journals, AR, AP, payments, tax, statements, period-close, budgets, ledger, audit | LedgerAccount, Journal, Invoice, Payment, Period, Budget | journal.*, period.* | |
| CRM | accounts, activities, deals, tickets | Account, Activity, Deal, Ticket | | |
| Reports | library, saved, scheduled, exports, VAT, WHT | SavedView, ScheduledReport, Export | | |
| Analytics | explore, insights, anomalies, simulations, products/pricing/inventory/finance/payroll, settings | AnalyticsQuery/Result, SavedView, Anomaly, Simulation | anomaly.*, simulation.* | |
| Automation | rules, alerts, schedules, workflows, integrations, ai-insights, work-queue | Rule, Alert, Schedule, Workflow, Integration | | |
| Settings | org, entities, branches, users-roles, preferences, sequences, compliance, notifications, payroll, audit-log, financial/*, inventory, products, tax/*, customizer/* | All config entities | | |

---

# 12. OUT OF SCOPE / FRONTEND-ONLY

- **UI layout and theming:** Sidebar, command palette UX, dashboard widget layout (layout config may be stored by backend; rendering is frontend).
- **Client-side validation only:** Frontend validations (e.g. has-lines) must be mirrored by backend; backend is authoritative.
- **LocalStorage-only persistence:** Saved analytics views, draft docs — backend should eventually persist these; mark as “API pending” until implemented.
- **Static content:** Help text, terminology (termKey), onboarding steps — can remain frontend or CMS; backend may serve feature flags for visibility.

---

# 13. ENDPOINT REQUIREMENTS (3 STAGES)

All API endpoints the backend must implement. Base path assumed `/api` (or equivalent). Every mutation must enforce RBAC per §10.11 and tenant/org/branch isolation. Optional: `?branchId=` for branch-scoped lists.

## Stage 1 — Foundation (auth, tenant, approvals, audit, work queue)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /me | (auth) | Current user, org, tenant, branches, effective permissions |
| POST | /me/branch | (auth) | Set current branch (session/context); body: `{ branchId }` |
| GET | /org | settings.org.read | Current org profile |
| GET | /branches | settings.branches.read | List branches for org |
| GET | /approvals/inbox | approvals.read | List pending approval items for current user |
| GET | /approvals/requests | approvals.read | List current user’s approval requests |
| POST | /approvals/:id/approve | approvals.read | Approve with optional body `{ comment }` |
| POST | /approvals/:id/reject | approvals.read | Reject with optional body `{ comment }` |
| GET | /work-queue | automation.read | List work queue items (category, title, href, severity) |
| GET | /audit | finance.audit.read or settings.audit.read | Query audit log (filters: entityType, entityId, userId, from, to) |
| GET | /audit/export | finance.audit.read | Export audit log (e.g. CSV/JSON) |
| GET | /feature-flags | (auth) | Flags and org type for current user (for nav visibility) |

**Realtime/streaming (SSE or Firebase):** approvals inbox updates, work queue updates.

**Events:** Publish to event bus for approval.approved, approval.rejected; persist to S3 raw-events.

---

## Stage 2 — Core domain (documents, masters, inventory, warehouse, sales, purchasing)

### Documents (docType = quote | sales-order | delivery-note | invoice | purchase-request | purchase-order | grn | bill | journal)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /documents/:docType | (per doc: sales.*, purchasing.*, finance.*) | List docs (filter, sort, paginate) |
| GET | /documents/:docType/:id | (same) | Get one document |
| POST | /documents/:docType | (same) | Create draft |
| PATCH | /documents/:docType/:id | (same) | Update draft |
| POST | /documents/:docType/:id/action | (same) | Execute action: body `{ action: "submit"|"approve"|"post"|"cancel"|"reverse" }`; optional comment for approve |
| POST | /documents/:docType/:id/request-approval | (same) | Request approval (emits approval.requested) |
| GET | /documents/:docType/:id/pdf | (same) | Export PDF |
| GET | /sequences | settings.sequences.read | List number sequences |
| GET | /sequences/:documentType | (same) | Get next number for type (or reserve) |
| POST | /sequences | settings.sequences.read | Create/update sequence |

### Masters

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /products | (masters/sales) | List products (filter, paginate) |
| GET | /products/:id | (same) | Get product (with SKUs, packaging, pricing, variants) |
| POST | /products | (same) | Create product |
| PATCH | /products/:id | (same) | Update product |
| DELETE | /products/:id | (same) | Delete product (stub → real) |
| GET | /products/:id/packaging | (same) | List packaging |
| PUT | /products/:id/packaging | (same) | Save packaging list |
| GET | /products/:id/pricing | (same) | List product prices (by price list) |
| PUT | /products/:id/pricing | (same) | Save product prices / apply template (stub → real) |
| GET | /products/:id/variants | (same) | List variants |
| PUT | /products/:id/variants | (same) | Save variants |
| GET | /parties | (masters/sales/purchasing) | List parties (type: customer | supplier or both) |
| GET | /parties/:id | (same) | Get party |
| POST | /parties | (same) | Create party |
| PATCH | /parties/:id | (same) | Update party |
| GET | /warehouses | inventory.read / masters | List warehouses |
| GET | /warehouses/:id | (same) | Get warehouse (with locations) |
| POST | /warehouses | (same) | Create warehouse |
| PATCH | /warehouses/:id | (same) | Update warehouse |
| GET | /warehouses/:id/locations | (same) | List locations/bins |
| POST | /warehouses/:id/locations | (same) | Create location |
| PATCH | /locations/:id | (same) | Update location |
| GET | /bins | inventory.read | List bins (filter: warehouseId, zone) |
| POST | /bins | (same) | Create bin |
| PATCH | /bins/:id | (same) | Update bin |
| GET | /users | settings.users.read | List users |
| GET | /users/:id | (same) | Get user |
| POST | /users | (same) | Create user |
| PATCH | /users/:id | (same) | Update user |
| GET | /roles | settings.users.read | List roles (with permission count) |
| GET | /roles/:id | (same) | Get role |
| POST | /roles | (same) | Create role |
| PATCH | /roles/:id | (same) | Update role |
| GET | /permissions | settings.users.read | List all permission codes (for role editor) |

### Inventory

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /inventory/stock-levels | inventory.read | List stock by SKU/warehouse (filters, export CSV) |
| GET | /inventory/movements | inventory.read | List movements (filter: warehouse, sku, from, to) |
| POST | /inventory/movements | inventory.write | Create movement |
| GET | /inventory/receipts | inventory.read / purchasing.grn.read | List GRNs |
| GET | /inventory/receipts/:id | (same) | Get GRN |
| POST | /inventory/costing/run | inventory.read | Run costing (stub → real) |
| GET | /inventory/costing | inventory.read | Costing summary / allocation (save allocation stub → real) |

### Warehouse

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /warehouse/transfers | inventory.write | List transfers |
| GET | /warehouse/transfers/:id | (same) | Get transfer |
| POST | /warehouse/transfers | (same) | Create transfer |
| POST | /warehouse/transfers/:id/receive | (same) | Mark received (stub → real) |
| GET | /warehouse/pick-pack | inventory.write | List pick-pack tasks |
| GET | /warehouse/pick-pack/:id | (same) | Get task |
| POST | /warehouse/pick-pack | (same) | Create pick |
| POST | /warehouse/pick-pack/:id/complete | (same) | Complete (stub → real) |
| GET | /warehouse/putaway/:id | (same) | Get putaway task |
| POST | /warehouse/putaway/:id/confirm | (same) | Confirm putaway (stub → real) |
| GET | /warehouse/cycle-counts | inventory.write | List cycle count sessions |
| GET | /warehouse/cycle-counts/:id | (same) | Get cycle count (with lines) |
| POST | /warehouse/cycle-counts | (same) | Create cycle count |
| PATCH | /warehouse/cycle-counts/:id | (same) | Update (e.g. lines) |
| POST | /warehouse/cycle-counts/:id/submit | (same) | Submit count (stub → real) |

### Sales & purchasing (list/detail often via documents; below are entity-specific)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /sales/quotes | sales.orders.read | List quotes |
| GET | /sales/orders | sales.orders.read | List sales orders |
| GET | /sales/deliveries | sales.deliveries.read | List deliveries |
| GET | /sales/invoices | sales.invoices.read | List invoices (sales) |
| GET | /sales/customers | sales.customers.read | List customers; export CSV |
| GET | /sales/returns | sales.returns.read | List returns/credit notes |
| GET | /purchasing/requests | purchasing.orders.read | List purchase requests |
| GET | /purchasing/orders | purchasing.orders.read | List POs |
| GET | /ap/suppliers | purchasing.suppliers.read / finance.ap.read | List suppliers |
| GET | /ap/bills | purchasing.bills.read / finance.ap.read | List bills |
| POST | /purchasing/purchase-returns | purchasing.returns.read | Create purchase return (stub → real) |
| POST | /purchasing/purchase-returns/:id/approve | (same) | Approve return (stub → real) |
| GET | /purchasing/purchase-returns/export | (same) | Export (stub → real) |

**Exports (Stage 2):** GET /documents/:docType?format=csv, GET /products?format=csv, GET /sales/customers?format=csv, etc. Return CSV stream or download link.

---

## Stage 3 — Finance, treasury, assets, payroll, analytics, reports, automation, settings, remaining modules

### Finance & accounting

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /finance/gl | finance.gl.read | General ledger entries (filter: account, period) |
| GET | /finance/accounts | finance.accounts.read | Chart of accounts (list) |
| GET | /finance/journals | finance.journals.read | List journal entries |
| GET | /finance/ar | finance.ar.read | AR summary / aging |
| GET | /ar/customers | finance.ar.read | AR by customer |
| GET | /ar/payments | finance.ar.read | List AR payments/receipts |
| POST | /ar/payments | finance.ar.read | Create receipt |
| POST | /ar/payments/:id/allocate | finance.ar.read | Allocate to invoices (stub → real) |
| POST | /ar/payments/:id/submit | finance.ar.read | Submit payment (stub → real) |
| GET | /finance/ap | finance.ap.read | AP summary |
| GET | /ap/bills | finance.ap.read | List bills (see Stage 2) |
| GET | /ap/payments | finance.ap.read | List AP payments |
| POST | /ap/payments | finance.ap.read | Create payment |
| POST | /ap/three-way-match | finance.ap.read | Match selected (PO, GRN, bill) (stub → real) |
| GET | /finance/payments | finance.payments.read | Payments & receipts list |
| GET | /finance/tax | finance.tax.read | Tax/VAT summary |
| GET | /finance/statements/pnl | finance.statements.read | P&L |
| GET | /finance/statements/balance-sheet | finance.statements.read | Balance sheet |
| GET | /finance/statements/cash-flow | finance.statements.read | Cash flow |
| GET | /finance/period-close | finance.close.write | Period close status / list periods |
| POST | /finance/period-close | finance.close.write | Close period (stub → real) |
| POST | /finance/period-reopen | finance.close.write | Reopen period (stub → real) |
| GET | /finance/budgets | finance.read | List budgets |
| GET | /finance/ledger | finance.gl.read | Ledger view (filter by account, period) |
| GET | /finance/bank-recon | finance.bank.read | Bank reconciliation list / statement lines |
| POST | /finance/bank-recon/import | finance.bank.read | Import bank statement (file or link) |
| POST | /finance/bank-recon/match | finance.bank.read | Match statement line to payment/invoice |

### Treasury

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /treasury/overview | finance.read | Treasury dashboard |
| GET | /treasury/payment-runs | finance.ap.read | List payment runs |
| GET | /treasury/payment-runs/:id | (same) | Get payment run |
| POST | /treasury/payment-runs | (same) | Create payment run |
| POST | /treasury/payment-runs/:id/approve | (same) | Approve (stub → real) |
| GET | /treasury/payment-runs/:id/export | (same) | Export bank file (format) |
| GET | /treasury/collections | finance.ar.read | List collections |
| GET | /treasury/bank-accounts | finance.read | List bank accounts |
| POST | /treasury/bank-accounts | (same) | Create bank account |
| PATCH | /treasury/bank-accounts/:id | (same) | Update bank account |
| GET | /treasury/cashflow | finance.read | Cashflow data |

### Assets

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /assets/register | finance.read | List assets |
| GET | /assets/register/:id | (same) | Get asset |
| POST | /assets/register | (same) | Create asset |
| PATCH | /assets/register/:id | (same) | Update asset |
| GET | /assets/depreciation | finance.read | Depreciation runs / schedule |
| POST | /assets/depreciation/run | finance.read | Run depreciation (stub → real) |
| GET | /assets/disposals | finance.read | List disposals |
| POST | /assets/disposals | (same) | Record disposal |

### Payroll

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /payroll/employees | finance.read | List employees (payroll) |
| GET | /payroll/employees/:id | (same) | Get employee |
| POST | /payroll/employees | (same) | Create employee |
| PATCH | /payroll/employees/:id | (same) | Update employee |
| GET | /payroll/pay-runs | finance.read | List pay runs |
| GET | /payroll/pay-runs/:id | (same) | Get pay run (with lines) |
| POST | /payroll/pay-runs | (same) | Create pay run |
| POST | /payroll/pay-runs/:id/approve | finance.read | Approve pay run (stub → real) |
| POST | /payroll/pay-runs/:id/post-journal | finance.read | Post payroll journal |
| GET | /payroll/payslips | finance.read | List payslips (filter: payRunId) |
| GET | /payroll/payslips/:id | (same) | Get payslip |
| GET | /payroll/payslips/:id/pdf | (same) | Download payslip PDF |
| GET | /payroll/statutories | finance.read | List statutories |

### Analytics & intelligence

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | /analytics/query | (auth) | Run AnalyticsQuery → AnalyticsResult (metric, dimensions, filters, limit) |
| GET | /analytics/saved-views | (auth) | List saved views |
| GET | /analytics/saved-views/:id | (auth) | Get saved view |
| POST | /analytics/saved-views | (auth) | Create saved view |
| PATCH | /analytics/saved-views/:id | (auth) | Update saved view |
| DELETE | /analytics/saved-views/:id | (auth) | Delete saved view |
| GET | /analytics/anomalies | (auth) | List anomalies (type, severity, entity) |
| GET | /analytics/anomalies/:id | (auth) | Get anomaly (investigate) |
| POST | /analytics/simulations/run | (auth) | Run simulation (what-if); body: scenario params |
| POST | /analytics/simulations/apply | (auth) | Apply suggestion (stub → real) |
| GET | /analytics/insights/:module | (auth) | Intelligence module data (products, pricing, inventory, finance, payroll) |
| GET | /recommendations | (auth) | List/stream recommendations (e.g. for Control Tower) |
| POST | /recommendations/:id/apply | (auth) | Apply recommendation (or route to approval) |
| POST | /recommendations/:id/simulate | (auth) | Run simulation for recommendation |

### Natural language command (command bar ⌘K)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | /command/interpret | (auth) | Body: `{ query }` → intent summary + execution plan |
| POST | /command/execute | (auth) | Body: `{ query, planId?, confirm }` → execute or stream result |

### Reports

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /reports | reports.read | Report library / list |
| GET | /reports/saved | reports.read | Saved report views |
| GET | /reports/scheduled | reports.schedule.read | Scheduled reports |
| GET | /reports/exports | reports.export.read | Export history |
| GET | /reports/vat-summary | reports.read | VAT summary |
| GET | /reports/wht-summary | reports.read | WHT summary |
| POST | /reports/run | reports.read | Run report (params) → link or stream |
| POST | /reports/schedule | reports.schedule.read | Create/update scheduled report |
| GET | /reports/export/:id | reports.export.read | Download export file |

### Automation

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /automation/rules | automation.rules.read | List rules |
| GET | /automation/rules/:id | (same) | Get rule |
| POST | /automation/rules | (same) | Create rule |
| PATCH | /automation/rules/:id | (same) | Update rule |
| DELETE | /automation/rules/:id | (same) | Delete rule |
| GET | /automation/alerts | automation.alerts.read | List alerts |
| GET | /automation/schedules | automation.schedules.read | List scheduled jobs |
| GET | /automation/workflows | automation.workflows.read | List approval workflows |
| POST | /automation/workflows | (same) | Create workflow (stub → real) |
| GET | /automation/integrations | automation.integrations.read | List integrations (e.g. WhatsApp) |
| GET | /automation/ai-insights | automation.ai.read | AI insights list |
| POST | /automation/ai-insights/:id/apply | automation.ai.read | Apply action (stub → real) |

### Settings (organization, financial, tax, customizer)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /settings/org | settings.org.read | Org profile |
| PATCH | /settings/org | (same) | Update org (Save stub → real) |
| GET | /settings/entities | settings.org.read | List org entities |
| POST | /settings/entities | (same) | Create/update entity |
| GET | /settings/branches | settings.branches.read | List branches (see Stage 1) |
| POST | /settings/branches | (same) | Create branch |
| PATCH | /settings/branches/:id | (same) | Update branch |
| GET | /settings/preferences | settings.preferences.read | User/org preferences |
| PATCH | /settings/preferences | (same) | Update preferences |
| GET | /settings/compliance | settings.org.read | Compliance settings |
| GET | /settings/notifications | settings.org.read | Notification settings (email, SMS, WhatsApp toggles) |
| PATCH | /settings/notifications | (same) | Update |
| GET | /settings/payroll | settings.org.read | Payroll config |
| PATCH | /settings/payroll | (same) | Update |
| GET | /settings/financial/currencies | settings.financial.read | List currencies |
| POST | /settings/financial/currencies | (same) | Add currency |
| GET | /settings/financial/exchange-rates | settings.financial.read | List exchange rates |
| POST | /settings/financial/exchange-rates/import | (same) | Import CSV (stub → real) |
| GET | /settings/financial/chart-of-accounts | settings.financial.read | COA (list) |
| POST | /settings/financial/chart-of-accounts/import | (same) | Import COA CSV |
| GET | /settings/financial/taxes | settings.financial.read | List taxes |
| POST | /settings/financial/taxes | (same) | Create/update tax |
| GET | /settings/financial/fiscal-years | settings.financial.read | List fiscal years |
| POST | /settings/financial/fiscal-years | (same) | Create/update |
| GET | /settings/inventory/costing | settings.inventory.read | Costing config |
| PATCH | /settings/inventory/costing | (same) | Update |
| GET | /settings/uom | settings.inventory.read | UOM catalog (list) |
| POST | /settings/uom | (same) | Create UOM |
| PATCH | /settings/uom/:id | (same) | Update UOM |
| GET | /settings/products/pricing-rules | settings.inventory.read | Pricing rules list |
| POST | /settings/products/pricing-rules | (same) | Add rule (stub → real) |
| GET | /settings/tax/kenya | settings.financial.read | Kenya tax profile |
| PATCH | /settings/tax/kenya | (same) | Update |
| GET | /settings/tax/vat | settings.financial.read | VAT codes (e.g. Kenya) |
| POST | /settings/tax/vat | (same) | Add VAT code |
| GET | /settings/tax/withholding | settings.financial.read | WHT codes |
| POST | /settings/tax/withholding | (same) | Add WHT code |
| GET | /settings/tax/tax-mappings | settings.financial.read | Tax mappings |
| PATCH | /settings/tax/tax-mappings | (same) | Save mappings |
| GET | /settings/customizer/modules | settings.customizer.read | List module configs |
| PATCH | /settings/customizer/modules/:id | (same) | Enable/disable module |
| GET | /settings/customizer/fields | settings.customizer.read | List custom field definitions |
| POST | /settings/customizer/fields | (same) | Create custom field |
| PATCH | /settings/customizer/fields/:id | (same) | Update |
| GET | /settings/customizer/workflows | settings.customizer.read | List workflow definitions |
| POST | /settings/customizer/workflows | (same) | Create workflow |
| GET | /settings/customizer/dashboards | settings.customizer.read | List dashboard definitions |
| POST | /settings/customizer/dashboards | (same) | Create/update dashboard |

### Pricing (module)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /pricing/price-lists | (auth) | List price lists |
| GET | /pricing/price-lists/:id | (auth) | Get price list (with items) |
| POST | /pricing/price-lists | (auth) | Create price list |
| PATCH | /pricing/price-lists/:id | (auth) | Update |
| GET | /pricing/rules | (auth) | List pricing/discount rules |
| POST | /pricing/rules | (auth) | Create rule |
| PATCH | /pricing/rules/:id | (auth) | Update rule |

### Manufacturing (optional — MANUFACTURER)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /manufacturing/boms | manufacturing.bom.read | List BOMs |
| GET | /manufacturing/boms/:id | (same) | Get BOM |
| POST | /manufacturing/boms | (same) | Create BOM |
| PATCH | /manufacturing/boms/:id | (same) | Update BOM |
| GET | /manufacturing/routing | manufacturing.production.read | List routing / work centers |
| POST | /manufacturing/routing | (same) | Create work center / operation |
| GET | /manufacturing/work-orders | manufacturing.workorders.read | List work orders |
| GET | /manufacturing/work-orders/:id | (same) | Get work order |
| POST | /manufacturing/work-orders | (same) | Create work order |
| PATCH | /manufacturing/work-orders/:id | (same) | Update |
| GET | /manufacturing/mrp | manufacturing.production.read | MRP plan / suggestions |
| POST | /manufacturing/mrp/apply | (same) | Apply MRP suggestion |

### Distribution (optional — DISTRIBUTOR)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /distribution/routes | distribution.routes.read | List routes |
| GET | /distribution/routes/:id | (same) | Get route |
| POST | /distribution/routes | (same) | Create/update route |
| GET | /distribution/deliveries | distribution.deliveries.read | List deliveries |
| GET | /distribution/collections | distribution.collections.read | List collections |

### Retail (optional — RETAIL)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /retail/replenishment | retail.replenishment.read | Replenishment list/suggestions |
| GET | /retail/promotions | retail.promotions.read | List promotions |
| POST | /retail/promotions | (same) | Create/update promotion |
| GET | /retail/store-performance | retail.performance.read | Store performance data |

### Intercompany

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /intercompany/overview | finance.read | IC overview |
| GET | /intercompany/entities | finance.read | List IC entities |
| GET | /intercompany/transactions | finance.read | List IC transactions |
| POST | /intercompany/transactions | finance.read | Create IC transaction |
| GET | /intercompany/consolidation | finance.read | Consolidation data |

### Projects

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /projects | projects.read | List projects |
| GET | /projects/:id | (same) | Get project |
| POST | /projects | (same) | Create project (stub → real) |
| PATCH | /projects/:id | (same) | Update project |
| GET | /timesheets | projects.read | List timesheets (filter: project, user, from, to) |
| POST | /timesheets | (same) | Create/update timesheet entry |

### CRM

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | /crm/accounts | crm.accounts.read | List accounts/parties |
| GET | /crm/accounts/:id | (same) | Get account |
| POST | /crm/accounts | (same) | Create account |
| PATCH | /crm/accounts/:id | (same) | Update |
| GET | /crm/activities | crm.activities.read | List activities/notes |
| POST | /crm/activities | (same) | Create activity |
| GET | /crm/deals | crm.deals.read | List deals/opportunities |
| GET | /crm/deals/:id | (same) | Get deal |
| POST | /crm/deals | (same) | Create/update deal |
| GET | /crm/tickets | crm.tickets.read | List support tickets |
| GET | /crm/tickets/:id | (same) | Get ticket |
| POST | /crm/tickets | (same) | Create/update ticket |

### File import (shared)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | /import/currencies | settings.financial.read | Upload CSV → create/update currencies |
| POST | /import/exchange-rates | settings.financial.read | Upload CSV → exchange rates |
| POST | /import/coa | settings.financial.read | Upload CSV → chart of accounts |
| POST | /import/bank-statement | finance.bank.read | Upload bank statement file |

### WhatsApp / webhooks (integrations)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | /webhooks/whatsapp | (public, verify signature) | Inbound WhatsApp messages → intent → command/workflow |
| GET | /webhooks/whatsapp | (same) | Verification (e.g. for Meta) |

---

**Summary:** Stage 1 = ~12 endpoints + streaming. Stage 2 = documents (9 types × list/get/create/update/action/pdf + sequences) + masters (~40) + inventory (~8) + warehouse (~14) + sales/purchasing (~15). Stage 3 = finance (~30), treasury (~10), assets (~8), payroll (~12), analytics (~12), command (2), reports (~9), automation (~12), settings (~45), pricing (~6), manufacturing (~10), distribution (~5), retail (~4), intercompany (~5), projects (~6), CRM (~12), import (4), webhooks (2). Total scope: 250+ endpoints across 3 stages.

---

# PHASED BUILD PLAN

## Phase 1

- Event bus (SQS + producers/consumers)
- BFF: Auth (Firebase), RBAC, doc CRUD for quote, sales-order, purchase-order, invoice, journal, grn, bill; approval request/approve/reject
- Orchestrator skeleton + QueryAgent (command bar)
- Forecast model (one SKU/location); feature pipeline for demand
- Command interpretation service (intent + confirm)
- Feature pipeline: events → normalized → features (S3 + cache)
- Audit log write path

## Phase 2

- Optimization solvers (reorder, allocation)
- Auto-PO agent and BuyerAgent
- Fraud/anomaly models
- Simulation engine (what-if) and “Apply suggestion” path
- WhatsApp adapter (inbound + outbound)
- Full document workflows (post to GL, period close)
- Bank recon and three-way match

## Phase 3

- Reinforcement learning schedulers
- Negotiation agents
- Self-healing supply chain views
- Advanced explainability and model governance

---

# NORTH STAR

This backend should behave like:

**A multi-agent operating system for manufacturing.**

- Humans define goals and policies.
- Agents run the factory, procurement, and finance within guardrails.
- Policies and approvals keep it safe.
- Every decision is logged and explainable.
- The frontend is a control tower over this system — insights first, actions with Simulate and Approve, and natural language at the center (⌘K).

---

# CURSOR PROMPTS (use in order — 4 prompts)

Each prompt is self-contained for one build phase. Reference: `docs/BACKEND_SPEC.md` (this file), `src/config/documents/registry.ts`, `src/config/navigation/sections.ts`, `src/types/erp.ts`, `src/lib/permissions.ts`, `src/lib/qa/action-registry.ts`, `src/lib/analytics/`.

---

## PROMPT 1 — Foundation (auth, tenant, BFF, event bus, audit, RBAC)

You are building the **foundation** of the OdaFlow ERP backend. Stack: Node.js + TypeScript, AWS (SQS for events, S3 for audit/raw events), DocumentDB (Mongo-compatible), Firebase (Auth + optional Realtime).

**Do the following:**

1. **BFF service**  
   - Validate Firebase ID tokens on every request; map Firebase UID to internal User (orgId, branchIds, roleIds).  
   - Implement GET /me returning User, Org, Tenant, Branches, and effective permissions (see BACKEND_SPEC §10.11).  
   - Support switch-branch (session or header); enforce tenant and org/branch isolation on all data access.

2. **RBAC**  
   - Enforce the full permission set from BACKEND_SPEC §10.11 on every mutation and sensitive read.  
   - Reject with 403 when permission is missing; log attempts.

3. **Event bus**  
   - Implement a domain-event dispatcher: publish to SQS (and optionally SNS for fan-out).  
   - Emit events for: document lifecycle (e.g. sales-order.created, sales-order.approved, invoice.posted), approval.requested / approval.approved / approval.rejected, and any other events listed in BACKEND_SPEC §2.  
   - Persist event payloads to S3 (e.g. raw-events/) for audit and training.

4. **Audit log**  
   - Append-only, immutable log for: every document status change, every approval action, and (later) every AI recommendation applied or overridden.  
   - Fields: who, what, when, entityType, entityId, before/after or event payload.  
   - Support query by entity and by user for Settings → Audit log and doc audit trail.

5. **Approvals API**  
   - List pending approvals for current user (inbox); list current user’s requests (requests).  
   - Submit approve/reject with optional comment; update document status and emit approval events.

Reference BACKEND_SPEC sections 1 (API & BFF), 2 (Event Bus), 7 (Security), 10.4 (Auth), 10.11 (Permissions). **Endpoint list:** §13 Stage 1. Do not yet implement full document CRUD or AI — only the foundation above.

---

## PROMPT 2 — Core domain (documents CRUD + workflows, approvals, masters, inventory, warehouse)

You are extending the OdaFlow ERP backend with **core domain** APIs. The BFF, auth, RBAC, event bus, and audit log from Prompt 1 are in place.

**Do the following:**

1. **Document CRUD and workflows**  
   - Implement CRUD for all document types in BACKEND_SPEC §10.1: quote, sales-order, delivery-note, invoice, purchase-request, purchase-order, grn, bill, journal.  
   - For each type: respect status workflow and actions (submit, approve, post, cancel, reverse) from `src/config/documents/registry.ts`.  
   - Number sequences per doc type (prefix, next number, padding); validate rules (e.g. has-lines, balanced for journal).  
   - On every status change and approval, emit domain events and write audit log.  
   - Replace frontend stubs: Request approval, Approve, Reject, Post (see BACKEND_SPEC §10.13).

2. **Masters**  
   - CRUD for: Product, SKU, Category, Brand, Customer, Supplier, Warehouse, Location (and UOM, Tax, PriceList, DiscountRule as in §10.2).  
   - Support sequences (document numbering), users & roles (User, Role, permissions list), branches and org entities.  
   - Repos/mocks reference: BACKEND_SPEC §10.2 and `src/lib/data/*.repo.ts`.

3. **Inventory and warehouse**  
   - Stock levels, movements, receipts (GRN); costing run (stub → real).  
   - Transfers (create, mark received), pick-pack (complete), putaway (confirm), bin locations, cycle counts (create, submit).  
   - Emit events: stock.movement, stock.receipt, transfer.*, putaway.*, cycle-count.submitted.  
   - Replace stubs in BACKEND_SPEC §10.13 for warehouse and inventory.

4. **Sales and purchasing**  
   - Sales: quotes, orders, deliveries, invoices, customers, returns.  
   - Purchasing: purchase requests, POs, GRN (shared with inventory), suppliers, bills (AP), purchase returns.  
   - Ensure document workflows and approvals integrate with §10.1.

Reference BACKEND_SPEC §10.1 (document types), §10.2 (entities), §10.9 (routes), §10.13 (stub actions). **Endpoint list:** §13 Stage 2. Implement only core domain; no AI orchestration or analytics API yet.

---

## PROMPT 3 — AI & analytics (orchestrator, agents, feature store, analytics API, NL command, simulations)

You are adding **AI orchestration and analytics** to the OdaFlow ERP backend. Foundation (Prompt 1) and core domain (Prompt 2) are in place.

**Do the following:**

1. **Feature store and pipeline**  
   - Ingest domain events from the event bus; build features (SKU/location, orders, inventory, finance, payroll) per BACKEND_SPEC §4.  
   - Store online (e.g. Redis/cache) for low-latency and offline (S3 parquet) for training.  
   - Expose an **analytics query API** that accepts `AnalyticsQuery` (metric, dimensions, filters, limit) and returns `AnalyticsResult` (rows with dimensions, value, prior, drillIds) — match the frontend contract in `src/lib/analytics/` (MetricKey, DimensionKey, semantic.ts).

2. **AI orchestrator**  
   - Route tasks to agents: PlannerAgent (forecast, MRP, simulations), ProductionAgent, BuyerAgent, FinanceAgent, QueryAgent (BACKEND_SPEC §3).  
   - Policy engine: approval thresholds, spend caps, supplier rules; run policy checks before any write.  
   - Return recommendations with: title, drivers[], expectedUpside, risk, confidence%, alternativeSummary; actions: Simulate, Approve, Modify, Explain (RecommendationCard contract).  
   - Log all reasoning steps and model versions for explainability and audit.

3. **Natural language command service**  
   - Accept free-text from the command bar (⌘K); return intent and execution plan; on confirm, execute or send to approval.  
   - Emit domain events on execution; return explainable reasoning.

4. **Simulations and anomalies**  
   - Simulation engine: what-if for demand, price, reorder, payroll, FX; return impact; “Apply suggestion” may persist or create draft per policy.  
   - Anomaly detection pipeline: feed work queue and Analytics → Anomalies; list with type, severity, entity; “Investigate” link.  
   - Persist saved analytics views (replace localStorage); optional scheduled reports and export history.

5. **Autonomy levels**  
   - Support levels 0–3 (suggest only → execute with approval → execute within budget → full autonomous); respect config and route writes to approval when above threshold (BACKEND_SPEC §8).

Reference BACKEND_SPEC §3 (AI Orchestration), §4 (Feature Store), §5 (Data Lake), §6 (NL Command), §8 (Autonomy), §10.7 (Analytics). **Endpoint list:** §13 Stage 3 (analytics, command, recommendations). Replace analytics/simulation stubs in §10.13.

---

## PROMPT 4 — Finance, payroll, integrations, security, and remaining modules

You are completing the OdaFlow ERP backend: **finance & accounting**, **payroll**, **integrations**, **governance**, and **remaining modules**.

**Do the following:**

1. **Finance and treasury**  
   - General ledger, chart of accounts, journal entries (post to GL); AR (customers, payments, allocate); AP (suppliers, bills, payments); three-way match; bank reconciliation (import statement, match); period close/reopen; financial statements (P&L, balance sheet, cash flow); budgets; ledger view.  
   - Treasury: payment runs (create, approve, export bank file), collections, bank accounts, cashflow.  
   - Replace stubs: Close/Reopen period, Match selected (AP/ bank-recon), Allocate (AR), Approve (payment run) (BACKEND_SPEC §10.13).

2. **Assets and payroll**  
   - Fixed assets: register, depreciation (run), disposals; emit asset.*, depreciation.run events.  
   - Payroll: employees, pay runs (approve, post journal), payslips, statutories.  
   - Replace stubs: Run depreciation, Approve pay run (§10.13).

3. **Integrations**  
   - WhatsApp: inbound webhook → intent → command service or workflow; outbound for notifications and order updates (Settings and Automation expect this channel).  
   - Mobile: same BFF and Firebase Auth; optional push for approvals/alerts.  
   - Banks: statement import and reconciliation adapter.  
   - Adapters publish domain events; no business logic in adapters (BACKEND_SPEC §9).

4. **Security and governance**  
   - Record every AI decision (recommendation id, model version, input summary, outcome); log human overrides with user and reason.  
   - Tenant/org/branch isolation on all reads and writes.  
   - Regulatory exports: audit log and data lineage in standard formats.

5. **Remaining modules (APIs and events)**  
   - Pricing: price lists, rules.  
   - Manufacturing (if MANUFACTURER): BOMs, routing, work orders, MRP; apply suggestion.  
   - Distribution (if DISTRIBUTOR): routes, deliveries, collections.  
   - Retail (if RETAIL): replenishment, promotions, store performance.  
   - Intercompany: entities, transactions, consolidation.  
   - Projects: projects list, timesheets.  
   - CRM: accounts, activities, deals, tickets.  
   - Reports: saved views, scheduled reports, exports, VAT/WHT summaries.  
   - Automation: rules, alerts, schedules, workflows, integrations, AI insights, work queue.  
   - Settings: org, entities, branches, users-roles, preferences, sequences, compliance, notifications, payroll, audit-log, financial (currencies, exchange-rates, COA, taxes, fiscal), inventory, products/pricing-rules, tax (Kenya, VAT, withholding, mappings), customizer (modules, fields, workflows, dashboards).  
   - Respect feature flags and org types (§10.10); enforce permissions (§10.11) for each route.

Reference BACKEND_SPEC §7 (Security), §9 (Integrations), §10.9 (routes), §11 (scope checklist). **Endpoint list:** §13 Stage 3 (finance, treasury, assets, payroll, reports, automation, settings, pricing, manufacturing, distribution, retail, intercompany, projects, CRM, import, webhooks). Ensure every item in the scope checklist has a corresponding API or “no backend” note.

---

*Reference: `docs/TODOS_AND_PENDING.md`, `docs/QA_ROUTE_MAP.md`, `docs/AI_NATIVE_ERP_FIVE_LAYERS.md`, `src/config/documents/`, `src/lib/analytics/`, `src/lib/qa/action-registry.ts`, `src/types/erp.ts`, `src/types/copilotActions.ts`, `src/stores/auth-store.ts`, `src/lib/permissions.ts`.*
