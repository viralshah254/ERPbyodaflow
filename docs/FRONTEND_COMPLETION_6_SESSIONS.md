# OdaFlow ERP — Frontend Completion Plan (6 Sessions)

**Purpose:** Complete all frontend tasks from `TODOS_AND_PENDING.md` and `QA_ROUTE_MAP.md` **without** backend/API connections. Each session has a clear objective, scope, and copy-paste prompt for the AI.

**Out of scope for all sessions:** Real API integration, auth, server-side persistence, LLM/Copilot backend.

---

## Session 1 — Routes, Nav & Stub Consistency

**Objective:** Resolve route/nav ambiguities and standardize stub UX (toast instead of `window.alert` where appropriate).

### 1.1 Route & Nav Clarifications

- **`/inventory/stock` vs `/inventory/stock-levels`:** Decide: either redirect `/inventory/stock` → `/inventory/stock-levels`, or make both distinct (e.g. stock = simple list, stock-levels = by warehouse). Document in `QA_ROUTE_MAP.md`.
- **`/purchasing/purchase-orders` vs `/purchasing/orders`:** Either redirect one to the other or add the missing one to nav with a clear label. Prefer single source of truth; redirect duplicate.
- **`/finance/budgets`:** Add to Finance nav (e.g. under Finance section) or leave as orphan and document. If page exists and is useful, add to nav.
- **`/finance/ledger`:** Add to Finance nav or document as stub/orphan.
- **`/finance/fixed-assets`:** Already covered by `/assets/*`; add nav link under Finance to “Fixed assets” → `/assets/overview` if not already present, or document.
- **`/reports/vat-summary` and `/reports/wht-summary`:** Ensure both are under Reports in `sections.ts` (may already be done; verify).
- **`/settings/customization`:** Redirect to `/settings/customizer/modules` (301 or client redirect). Remove or repurpose the customization page so there’s one entry point.
- **Purchasing:** Ensure `/purchasing/goods-receipt` and `/purchasing/supplier-invoices` either redirect to `/inventory/receipts` and `/ap/bills` or are linked from nav with clear labels.

### 1.2 Stub Consistency (No Backend)

- Replace **`window.alert`** with **`toast.info()` or `toast.success()`** (from `sonner`) for all stub actions listed in `TODOS_AND_PENDING.md` §2. Keep message text: e.g. `"Request approval (stub). API pending."`.
- Files to update (from §2):  
  `main-layout.tsx` (Copilot Apply), `docs/[type]/[id]/page.tsx`, `PrintPreviewDrawer.tsx`, `DocumentAttachments.tsx`, `DocumentComments.tsx`, `settings/payroll/page.tsx`, `payroll/pay-runs/[id]/page.tsx`, `payroll/payslips/page.tsx`, `settings/financial/currencies/page.tsx`, `settings/financial/exchange-rates/page.tsx`, `settings/financial/chart-of-accounts/page.tsx`, `settings/tax/withholding/page.tsx`, `settings/notifications/page.tsx`, `settings/products/pricing-rules/page.tsx`, `settings/organization/entities/page.tsx`, `warehouse/transfers/page.tsx`, `warehouse/putaway/[id]/page.tsx`, `finance/bank-recon/page.tsx`, `treasury/payment-runs/page.tsx`, `treasury/payment-runs/[id]/page.tsx`, `inventory/costing/page.tsx`, `ap/payments/page.tsx`, `ar/payments/page.tsx`, `automation/rules/page.tsx`, `master/products/[id]/pricing/page.tsx`, `projects/list/page.tsx`, `manufacturing/mrp/page.tsx`.  
  (Purchase-returns and pricing/rules already use toast; leave as-is.)
- Ensure every stub CTA in `src/lib/qa/action-registry.ts` has a corresponding implementation that at least shows a toast (no dead buttons).

### 1.3 Deliverables

- Nav and route clarifications applied in code and `docs/QA_ROUTE_MAP.md`.
- No stub actions using `window.alert`; all use toast with “(stub). API pending.” (or equivalent).
- Optional: add a short “Session 1” note in `QA_ROUTE_MAP.md` under “Recent fixes”.

---

## Session 2 — Persist Flows (Sheets/Forms → localStorage or Mock)

**Objective:** Make “Add” flows persist so data appears in lists after save. Use existing patterns: localStorage keys + mock repos (e.g. like `products.repo`, `pricing.repo`, `bom.repo`).

### 2.1 Flows to Implement

| Flow | Location | Current | Target |
|------|----------|---------|--------|
| Add asset | Assets register | Sheet/modal, no persist | Repo (e.g. `assets.repo.ts` or extend mock) + localStorage; list refreshes after Add |
| Add bank account | Treasury → Bank accounts | Sheet, no persist | Repo + localStorage; list shows new account |
| Add bin | Warehouse → Bin locations | Sheet, no persist | Repo + localStorage; list shows new bin |
| Add sequence | Settings → Sequences | Sheet, no persist | Repo + localStorage; list shows new sequence |
| Add user | Settings → Users & roles | Sheet/form, no persist | Repo + localStorage; list shows new user |
| Add role | Settings → Users & roles | Sheet/form, no persist | Repo + localStorage; list shows new role |
| Cycle count create | Warehouse → Cycle counts | Partial | Complete create flow (e.g. new cycle count session) with persist |

### 2.2 Implementation Notes

- Reuse existing patterns from `src/lib/data/*.repo.ts` and `src/lib/mock/*`. Add types in appropriate `types` or reuse from `erp.ts`/existing.
- Each “Add” opens sheet/form; on Save: write to repo (which writes localStorage); close sheet; refresh list (e.g. `setItems(listX())` or refetch).
- No backend calls; localStorage (and mock fallback) only.

### 2.3 Deliverables

- New or extended repos + mock data for: assets (register), bank accounts, bin locations, sequences, users, roles; cycle count create.
- All listed “Add” actions persist and list updates.
- Optional: short “Session 2” note in `TODOS_AND_PENDING.md` §7 or “Recent fixes” in `QA_ROUTE_MAP.md`.

---

## Session 3 — Drill-Through & Work Queue Deep Links

**Objective:** Complete drill-through from entity references to the correct detail/list pages, and ensure work queue “View” links resolve correctly.

### 3.1 Drill-Through (use `src/lib/drill-through.ts`)

- **Product SKU** (anywhere): Link to `/master/products/[id]`. Where product ID or SKU is displayed (e.g. doc lines, BOM, analytics), use `drillToProduct(id)` or equivalent; ensure product list and product detail pages are reachable.
- **Customer name/ID:** Link to `/ar/customers` with filter or to a customer detail if it exists; otherwise `/master/parties?tab=customers&id=[id]`. Use `drillToCustomer(id)`.
- **Supplier name/ID:** Link to `/ap/suppliers` or `/master/parties?tab=suppliers&id=[id]`. Use `drillToSupplier(id)` (add if missing).
- **Warehouse:** Link to `/master/warehouses` or warehouse detail if exists. Use or add `drillToWarehouse(id)`.
- **Employee:** Link to `/payroll/employees` (or employee detail if exists). Use or add `drillToEmployee(id)`.
- **Approval item:** From work queue or approvals inbox, “View” should open the related doc (e.g. `/docs/[type]/[id]`) or an approval sheet with doc link. Use `drillToDocument(type, id)` or equivalent.

Ensure `drill-through.ts` exports all needed helpers and that every call site uses them (no hardcoded `/master/products/` unless via helper).

### 3.2 Work Queue

- Verify each work queue item has a valid `href` that points to an existing route (e.g. pay run, doc, approval, pricing, tax).
- “View” button navigates with `router.push(item.href)` or `<Link href={item.href}>`. No 404s for standard mock items.
- If any category (payroll, tax, pricing, approvals, inventory, etc.) is missing entries, add at least one mock item with a valid `href`.

### 3.3 Deliverables

- All drill-through helpers implemented and used where entity links appear.
- Work queue “View” for all items goes to a valid page.
- Update `QA_ROUTE_MAP.md` drill-through matrix: set completed rows to “Done” and note any remaining “Partial” with reason.

---

## Session 4 — Docs, Print Preview & Approvals UX

**Objective:** Polish document view and approval-related stubs so UX is consistent and no dead actions.

### 4.1 Document View (`/docs/[type]/[id]`)

- **Print preview:** Ensure `PrintPreviewDrawer` or equivalent opens from doc view and shows a sensible layout (header, lines, totals). No backend PDF; just UI. “Download PDF” stays as toast stub.
- **Request approval:** Use toast (no `window.alert`): e.g. `toast.info("Request approval (stub). API pending.")`.
- **Approve / Reject / Post:** Use toast stubs with clear messages. Buttons remain visible and clickable; no backend.

### 4.2 Approvals Inbox (`/approvals/inbox`)

- Approve / Reject buttons: toast stub. Optional: open a small “Confirm approve/reject” modal, then toast. Ensure each row or card has a “View” that goes to the doc (`/docs/[type]/[id]`).

### 4.3 Approval Workflow Config

- **`/automation/workflows`:** Page exists; ensure it has at least one stub CTA (e.g. “Add workflow” or “Configure approval rules”) that shows a toast. No backend; just “API pending” messaging.

### 4.4 Payroll Journal Posting

- **`/payroll/pay-runs/[id]`:** Add or clarify a “Post to GL” (or “Journal posting”) stub: toast e.g. “Post payroll journal (stub). API pending.” So the checklist item “Payroll journal posting” is explicitly stubbed in UI.

### 4.5 Period Close

- **`/finance/period-close`:** “Close period” and “Reopen period” use toast instead of `window.alert` if they still use alert.

### 4.6 Deliverables

- Print preview visible and usable (UI only).
- All doc and approval actions use toast; no dead buttons.
- Workflow config and payroll journal posting stubs documented and wired in UI.
- `QA_ROUTE_MAP.md` “Missing Enterprise Essentials” updated where items are now stubbed/wired.

---

## Session 5 — Analytics Frontend (Explorer, Intelligence, Anomaly & Simulation)

**Objective:** Implement or complete frontend-only analytics: Explorer, visual components, saved views, intelligence modules, Anomaly Center, Simulation Lab, and action links from insights to editors. No real analytics API; use mock data and existing `runAnalyticsQuery` / mock patterns.

### 5.1 Explorer (if not already done)

- **MetricPicker, DimensionStack, GlobalFilterBar, InsightCanvas, ExplorerTable, DrillDrawer:** Implement or wire existing components so the Explore page has a working “build analysis” flow: select metric(s), dimension(s), optional filters → show table/chart (mock data). Drill-down opens DrillDrawer with list or detail link.
- **Saved analysis views:** List of saved views (mock); “Save current view” and “Open” as stubs (toast) or minimal localStorage save (name + current metric/dimension IDs). No backend.

### 5.2 Visual System

- **KpiHero, TrendStrip, etc.:** Use or add reusable KPI/trend components on analytics pages and dashboards so key metrics and trends are visible (mock data).

### 5.3 Intelligence Modules

- **Product/pricing, inventory, finance, payroll:** Ensure each intelligence page (e.g. `/analytics/products`, `/analytics/pricing`, `/analytics/inventory`, `/analytics/finance`, `/analytics/payroll`) has:
  - Clear layout (e.g. KpiHero + table or chart).
  - Mock data (e.g. margin waterfall, stockout root cause, cash drivers, labor cost drivers).
  - At least one “Action” or “View” link to the relevant editor (e.g. pricing → `/master/products/[id]/pricing`, PO → create PO stub, etc.).

### 5.4 Anomaly Center & Simulation Lab

- **Anomaly Center** (`/analytics/anomalies`): List/cards of anomalies (mock). Each item has “Investigate” → link to workflow or doc or relevant page; severity/entities shown. No real detection backend.
- **Simulation Lab** (`/analytics/simulations`): “What-if” UI (e.g. inputs for scenario); “Apply” or “Run” shows result (mock) and optional link to “Apply suggestion” → toast or navigate to pricing/PO/etc. Per TODOS_AND_PENDING.md, “Apply suggestion” = toast stub.

### 5.5 Action Integration

- Every insight type (explanation, forecast, recommendation, anomaly, simulation) that has an “action” should link to the right place: e.g. “Edit pricing” → product pricing page, “Create PO” → stub or doc create, “Open approval” → approvals inbox or doc. Use `drill-through` or direct `Link`/`router.push`.

### 5.6 Deliverables

- Explorer (or equivalent) usable with mock data and drill.
- Intelligence modules with mock data and action links.
- Anomaly Center and Simulation Lab with stub actions and links.
- `TODOS_AND_PENDING.md` §5.1 updated (e.g. “Analytics Weeks 2–4: frontend complete, API pending”).

---

## Session 6 — QA Polish & Final Pass

**Objective:** Performance, tests, consistency, and documentation so the frontend is “definition of done” for the current scope.

### 6.1 Table Performance

- Identify 1–2 heaviest list pages (e.g. docs list, products, journal entries). If tables have 100+ rows and feel slow, add virtualization (e.g. `@tanstack/react-virtual` or existing pattern). If no performance issue, skip or add a single virtualized list as a reference.

### 6.2 RTL Unit Tests

- Add React Testing Library tests for critical components, e.g.:
  - `PageShell` / `PageHeader` render with title and actions.
  - `DataTable` renders rows and fires `onRowClick`.
  - `EmptyState` / `ErrorState` render with message and optional action.
  - One or two form/sheet components (e.g. product packaging sheet, BOM item sheet) that submit and call `onSave`.
- Run `npm run test` (or equivalent); ensure they pass.

### 6.3 PageShell / EmptyState / ErrorState Consistency

- Scan dashboard routes: every list or detail page uses `PageShell` + `PageHeader` (or approved alternative) and uses `EmptyState` when list is empty and `ErrorState` when error. Fix any page that still uses old `PageLayout` or raw div without shell.

### 6.4 Granular CTA Stubs

- From `action-registry.ts`, ensure any action marked “stub” has a real button/link in the UI that triggers the stub (toast). Add missing buttons or links so the audit stays accurate.

### 6.5 Documentation Updates

- **`TODOS_AND_PENDING.md`:**  
  - §2: Note “All stub actions now use toast (no window.alert).”  
  - §6: Mark route/nav clarifications as done; list any deferred (e.g. “finance/ledger: left as stub”).  
  - §7: Mark “Sheets/forms with no persist” as done for the flows implemented in Session 2.  
  - Add “Frontend completion (6 sessions)” and date; list Sessions 1–6 as completed.
- **`QA_ROUTE_MAP.md`:**  
  - Update “Remaining Polish” and “Definition of Done” to reflect current state.  
  - Add “Frontend completion” to “Completed Action Items” with a short list (routes/nav, stubs, persist flows, drill-through, work queue, docs/approvals, analytics UI, QA polish).

### 6.6 Final Checks

- `npm run build` succeeds.
- `npm run typecheck` succeeds.
- `npm run test` (unit) passes.
- `npm run test:e2e` (Playwright) passes or is documented as expected (e.g. env or flags).
- No new `window.alert` for stubs; all use toast.

### 6.7 Deliverables

- Optional virtualization on one key list; RTL tests for critical components; full PageShell/Empty/Error consistency; docs updated; build/test green.

---

## How to Use This Document

1. **Run sessions in order** (1 → 6). Session 1 unblocks nav and stub consistency; Session 2 unblocks persist; Session 3 unblocks drill-through and work queue; etc.
2. **Copy the session block** (Objective + scope + deliverables) into the AI prompt, e.g.:  
   *“Follow Session 1 of docs/FRONTEND_COMPLETION_6_SESSIONS.md. Do 1.1 Route & Nav Clarifications, 1.2 Stub Consistency, 1.3 Deliverables. Do not add backend or API calls.”*
3. **After each session:** Commit, then run build + typecheck. Update the doc’s “Deliverables” or “Recent fixes” in QA_ROUTE_MAP / TODOS_AND_PENDING as you go.
4. **Session 6** is the final pass and doc update; use it to close out TODOS_AND_PENDING and QA_ROUTE_MAP for the frontend scope.

---

*Reference: `docs/TODOS_AND_PENDING.md`, `docs/QA_ROUTE_MAP.md`, `src/lib/drill-through.ts`, `src/lib/qa/action-registry.ts`, `src/lib/qa/route-registry.ts`.*
