# Pending work, stubs & incomplete UI — master list

**Purpose:** Single source of truth for all stubs, pending tasks, pending UI, and pending workflows across the OdaFlow ERP codebase. Use this for prioritisation, backend migration, and QA.

**Source:** Full codebase review (grep for stub/API pending/TODO/pending, `src/lib/qa/action-registry.ts`, `STUBS_AND_PENDING.md`).

**See also:** [BACKEND_API_SPEC_SINGLE_SOURCE.md](./BACKEND_API_SPEC_SINGLE_SOURCE.md) (single source: endpoints + §8 completion status), [STUBS_AND_PENDING.md](../STUBS_AND_PENDING.md) (detailed behavior), [BACKEND_ENDPOINT_MIGRATIONS.md](./BACKEND_ENDPOINT_MIGRATIONS.md) (stub → API), [BACKEND_SPEC.md](./BACKEND_SPEC.md) §10.13.

---

## 1. Stubs (action/button → toast or placeholder; API required)

### 1.1 Action registry (official stub list)

From `src/lib/qa/action-registry.ts` — every entry with `status: "stub"`. **Frontend:** Wired = calls API when `NEXT_PUBLIC_API_URL` is set (via `src/lib/api/stub-endpoints.ts`); otherwise toast.

| Module | Page | Action | Current behavior | Frontend |
|--------|------|--------|-------------------|----------|
| Masters | /master/products/[id] | Delete | Calls API or toast | **Wired** |
| Masters | /master/products/[id]/pricing | Apply template | Calls API or toast | **Wired** |
| Docs | /docs/[type]/[id] | Request approval | Calls API or toast | **Wired** |
| Docs | /docs/[type]/[id] | Approve | Calls API or toast | **Wired** |
| Docs | /docs/[type]/[id] | Post | Calls API or toast | **Wired** |
| Docs | /docs/[type]/[id] | Export PDF | Calls API or toast | **Wired** |
| Inventory | /inventory/costing | Run costing | Calls API or toast | **Wired** |
| Warehouse | /warehouse/transfers/[id] | Mark received | Calls API or toast | **Wired** |
| Warehouse | /warehouse/pick-pack/[id] | Complete | Calls API or toast | **Wired** |
| Warehouse | /warehouse/putaway/[id] | Confirm | Calls API or toast | **Wired** |
| Warehouse | /warehouse/cycle-counts/[id] | Submit | Calls API or toast | **Wired** |
| Purchasing | /purchasing/purchase-returns | Create Return, Export, Approve (bulk) | Calls API or toast | **Wired** (row click still stub) |
| Finance | /ap/three-way-match | Match selected | Calls API or toast | **Wired** |
| Finance | /ar/payments | Allocate | Calls API or toast | **Wired** |
| Finance | /finance/period-close | Close period | Calls API or toast | **Wired** |
| Finance | /finance/period-close | Reopen period | Calls API or toast | **Wired** |
| Treasury | /treasury/payment-runs/[id] | Approve | Calls API or toast | **Wired** |
| Assets | /assets/depreciation | Run depreciation | Calls API or toast | **Wired** |
| Payroll | /payroll/pay-runs/[id] | Approve | Calls API or toast | **Wired** |
| Analytics | /analytics/simulations | Apply suggestion | Calls API or toast | **Wired** |
| Automation | /automation/ai-insights | Apply action | Calls API or toast | **Wired** |
| Approvals | /approvals/inbox | Approve | Calls API or toast | **Wired** |
| Approvals | /approvals/inbox | Reject | Calls API or toast | **Wired** |
| Settings | /settings/org | Save | Calls API or toast | **Wired** |

### 1.2 Stubs not in action-registry (by file)

| File / location | Action or element | Current behavior |
|-----------------|-------------------|-------------------|
| **Layout & Copilot** | | |
| `main-layout.tsx` | Copilot “Apply” | Toast: “Action applied (stub). API pending.” |
| `CopilotActionCards.tsx` | Apply (all cards) | Opens review → Apply → toast; “Apply opens review (stub)” |
| `lib/mock/copilot-action-cards.ts` | Narrative text | “Apply will sync suggested tiers (stub)” etc. |
| **Documents** | | |
| `docs/[type]/[id]/page.tsx` | Request approval, Approve, Post, Export PDF | **Wired** — calls stub-endpoints; stub toast when API not configured |
| `docs/[type]/[id]/page.tsx` | Doc header content | “Document #id — stub. Date, party, totals would render here.” |
| `docs/[type]/[id]/page.tsx` | Lines table | “Line items table (stub)” |
| `docs/[type]/page.tsx` | Export, Approve, Post (bulk) | Toast stubs with count |
| `DocumentCreateWizard.tsx` | Taxes step | “Taxes (stub). Configure tax codes and charges.”; Notes (stub) |
| `DocumentCreateWizard.tsx` | Posting preview | “Stub: mock GL lines in base currency.”; “FX Gain/Loss (stub)” |
| `PrintPreviewDrawer.tsx` | Line content | “Line 1 (stub)”, “Line 2 (stub)” |
| `PrintPreviewDrawer.tsx` | Download PDF | `toast.info("Download PDF (stub). API pending.")` |
| `DocumentAttachments.tsx` | Upload | “Upload (stub). API pending.” |
| `DocumentAttachments.tsx` | Download | “Download (stub): {name}” |
| `DocumentComments.tsx` | Add comment | “Add comment (stub). API pending.” when no handler |
| **Warehouse** | | |
| `warehouse/putaway/page.tsx` | Export | Toast “Export (stub)” |
| `warehouse/putaway/[id]/page.tsx` | Save allocation | “Allocate to bins (stub). API pending.”; “Select bin and qty per line. Stub.” |
| `warehouse/pick-pack/[id]/page.tsx` | Confirm pick, Confirm pack, Mark dispatched | Toast stubs; “Enter picked qty (stub)” |
| `warehouse/transfers/[id]/page.tsx` | Approve, Mark in transit, Receive | **Receive = Wired**; Approve, Mark in transit = toast stubs |
| `warehouse/cycle-counts/page.tsx` | Export; New count sheet | “Export (stub)”; “Post adjustments (stub)”; “Saved to browser storage. API pending.” |
| `warehouse/cycle-counts/[id]/page.tsx` | Enter quantities, Post adjustments, Submit | **Submit = Wired**; others toast stubs |
| **Sales & purchasing** | | |
| `sales/orders/page.tsx` | Export, Approve, Export (row) | Toast stubs |
| `sales/invoices/page.tsx` | Export, Post, Export (row) | Toast stubs |
| `sales/deliveries/page.tsx` | Export, Post, Export (row) | Toast stubs |
| `purchasing/orders/page.tsx` | Export, Approve, Export (row) | Toast stubs |
| `purchasing/requests/page.tsx` | Export, Approve, Export (row) | Toast stubs |
| `inventory/receipts/page.tsx` | Export, Post, Export (row) | Toast stubs |
| **Finance & AP/AR** | | |
| `ap/bills/page.tsx` | Export, Post, Export (row) | Toast stubs |
| `ar/payments/page.tsx` | Submit payment, Export; Allocate flow | “Submit payment: API pending.”; “Export (stub)”; “Review & submit (stub)”; “API pending.” |
| `finance/journals/page.tsx` | Export | Toast “Export (stub)” |
| `finance/bank-recon/page.tsx` | Create adjusting entry, AI match, Create payment | Toast stubs; “Matching rules (stub)”; “Auto-match by amount/date (stub)”; “Match (stub): …” |
| `finance/period-close/page.tsx` | Close period, Reopen period | “Close period (stub). API pending.”; “Reopen period (stub). API pending.” |
| **Treasury** | | |
| `treasury/payment-runs/[id]/page.tsx` | Approve, Export CSV / Bank | “Approve (stub). Reuse approvals module.”; “Export CSV / Bank format (stub). Set NEXT_PUBLIC_API_URL…” |
| `treasury/collections/page.tsx` | Export | Toast “Export (stub)” |
| **Payroll** | | |
| `payroll/pay-runs/page.tsx` | Request approval, Export | Toast stubs |
| `payroll/pay-runs/[id]/page.tsx` | Approve, Request approval, Post payroll journal | **Approve = Wired**; others toast stubs |
| `payroll/payslips/page.tsx` | Download PDF, Export | “Download PDF (stub). API pending.”; “Export (stub)” |
| `payroll/employees/page.tsx` | Export; Create sheet | “Export (stub)”; “Bank & statutory stubs.” |
| `payroll/statutories/page.tsx` | — | “Seed list; allow edit (stub).” |
| **Assets** | | |
| `assets/depreciation/page.tsx` | Post depreciation | “Post depreciation (stub). Creates journal and redirect to review.” |
| `assets/register/[id]/page.tsx` | Linked vendor/invoice | “(stub)” labels |
| **Reports** | | |
| `reports/page.tsx` | Run report | “Run report (stub): {name}”; “Run (stub) or save as view” |
| `reports/scheduled/page.tsx` | Schedule report, Edit | “Schedule report (stub)”; “Edit (stub)” |
| `reports/saved/page.tsx` | Save view, Run, Edit | Toast stubs |
| `reports/exports/page.tsx` | Export, Download | “Export (stub)”; “Download (stub): …” |
| `reports/vat-summary/page.tsx` | Export | “Export (stub)” |
| `reports/wht-summary/page.tsx` | Export | “Export (stub)” |
| **Settings** | | |
| `settings/org/page.tsx` | Save | **Wired** — calls orgSave when API configured |
| `settings/notifications/page.tsx` | Save | “Save (stub). API pending.”; “Email, SMS, WhatsApp toggles (stubs). No real integrations.” |
| `settings/payroll/page.tsx` | Save | “Save (stub). API pending.” |
| `settings/financial/currencies/page.tsx` | Add currency | “Add currency (stub). API pending.”; “Add (stub)” |
| `settings/financial/chart-of-accounts/page.tsx` | Import COA | “Import COA (stub). Set NEXT_PUBLIC_API_URL…” |
| `settings/inventory/costing/page.tsx` | Save template | “Save (stub). API pending.” |
| `settings/products/pricing-rules/page.tsx` | Add rule | “Add rule (stub). API pending.”; “UI-only stub” |
| `settings/tax/withholding/page.tsx` | WHT certificate | “WHT certificate (stub). API pending.” |
| `settings/users-roles/page.tsx` | Add user / Add role sheets | “Saved to browser storage. API pending.” |
| **Automation & approvals** | | |
| `automation/rules/page.tsx` | “Require approval” action | “Require approval (stub): API pending.” |
| `automation/workflows/page.tsx` | Create workflow | “Create workflow (stub). API pending.” |
| `approvals/inbox/page.tsx` | Approve, Reject | **Wired** — calls stub-endpoints |
| `components/dashboard/cards/MyApprovalsCard.tsx` | Approve, Reject | “Approved. (stub). API pending.” / “Rejected. (stub). API pending.” |
| **Control tower & analytics** | | |
| `control-tower/page.tsx` | Simulate, Approve, Modify, Explain (all cards) | Toast stubs; “Opens scenario builder.”, “API pending.”, etc. |
| `analytics/simulations/page.tsx` | Apply suggestion | “Apply suggestion (stub). API pending.” |
| `analytics/mrp/page.tsx` | Apply suggestion | “Apply suggestion (stub). API pending.”; “Suggestions based on demand and current stock (stub).” |
| `analytics/explore/page.tsx` | Save view | “Shareable link (stub): …” |
| `analytics/inventory/page.tsx` | Landed cost impact | “Landed cost impact (stub)” |
| `analytics/payroll/page.tsx` | Cost per branch | “Cost per branch / department (stub)” |
| `analytics/finance/page.tsx` | FX impact, tax burden | “FX impact visualization, tax burden (stub)” |
| **Projects & intercompany** | | |
| `projects/list/page.tsx` | Create project, Export | “Create project (stub). API pending.”; “Export (stub)” |
| `projects/[id]/page.tsx` | Link transaction | “Link transaction (stub). Attach bill/journal/expense.” |
| `intercompany/transactions/page.tsx` | Generate elimination journal, Create IC invoice/bill, Consolidation report, Export | Toast stubs |
| **AR customers** | | |
| `ar/customers/page.tsx` | Export; Tax PIN; Duplicate check | “Export (stub)”; “Tax PIN (stub)”; “Possible duplicate: similar name (stub).” |
| **Manufacturing** | | |
| `manufacturing/boms/[id]/page.tsx` | Co-products / by-products edit | “Edit via stub — API pending.” |
| **Types / lib** | | |
| `lib/manufacturing/types.ts` | WorkCenter, Route | Comments: “Work center (stub).”, “Route (routing stub).” |
| `lib/data/pricing.repo.ts` | — | “Pricing repo … (stub).” |

---

## 2. Pending tasks (roadmap & backend)

### 2.1 Backend / API

- **Documents:** CRUD, workflow (draft → submit → approve → post), GL posting, PDF export, attachments upload/download, comments.
- **Approvals:** Inbox/requests from API; Approve/Reject with comment; emit events; update doc status.
- **Masters:** Products, parties, warehouses, users, roles, sequences — persist via API (many use localStorage or mock only).
- **Finance:** Period close/reopen, bank recon match, AR allocate, AP three-way match, payment run approve, journal post.
- **Payroll:** Payslip PDF, employees export, pay run approve, post payroll journal, statutory edit.
- **Reports:** Run report, VAT/WHT summary, saved views, scheduled reports, export history.
- **Import:** Currencies, exchange rates, COA, bank statement — backend implemented (see REMAINING_BACKEND_IMPLEMENTED); frontend to wire.
- **Full costing:** FIFO/weighted average in worker; costing run event consumer.

### 2.2 Analytics (weeks 2–4 style)

- **Explorer:** Saved analysis views (persist to backend), shareable link (stub).
- **Intelligence modules:** Product/pricing, inventory, finance, payroll — margin waterfall, stockout root cause, cash drivers, labor cost drivers.
- **AI insight engine:** Explanation, Forecast, Recommendation, Anomaly, Simulation; Anomaly Center; Simulation Lab; every insight → action (pricing, PO, rule, approval).
- **Work queue & anomalies:** Real data; “Investigate” → workflow.

### 2.3 AI & Copilot

- **Copilot chat:** No LLM/chat API; UI only.
- **Action cards:** Apply = stub; backend could implement “fix pricing tiers”, “suggest conversions”, “open report”, etc.

### 2.4 Settings extended

- Replace stubs with real persistence: org, notifications, compliance, currencies, COA, fiscal years, costing templates, pricing rules, sequences, users/roles, tax (VAT, WHT, Kenya). See BACKEND_ENDPOINT_MIGRATIONS.md §6.

---

## 3. Pending UI (incomplete screens & placeholders)

### 3.1 Document experience

| Location | Pending UI |
|----------|------------|
| `/docs/[type]/[id]` | Document header: “Document #id — stub. Date, party, totals would render here.” |
| `/docs/[type]/[id]` | Lines: “Line items table (stub)” |
| Document tabs (doc detail) | Taxes/Charges: “Taxes & charges (stub)” |
| Document tabs | Attachments: “Attachments (stub)” |
| Document tabs | Comments: “Comments (stub)” |
| Document tabs | Approval: “Approval history (stub)” |
| Document tabs | Audit: “Audit log (stub)” |
| PrintPreviewDrawer | Content: “Line 1 (stub)”, “Line 2 (stub)” |
| DocumentCreateWizard | Taxes step: “Taxes (stub). Configure tax codes and charges.”; Notes (stub) |
| DocumentCreateWizard | Posting: “Stub: mock GL lines”; “FX Gain/Loss (stub)” |

### 3.2 List/detail placeholders

| Location | Pending UI |
|----------|------------|
| Bank recon | “Rules sidebar (stub)”; “Matching rules (stub)” |
| Putaway [id] | “Select bin and qty per line. Stub.” |
| Pick-pack [id] | “Item, qty, suggested bin. Enter picked qty (stub).” |
| Cycle count create | “Saved to browser storage. API pending.” |
| Users-roles | “Saved to browser storage. API pending.” (add user, add role) |
| Reports | “Browse report templates. Run (stub) or save as view.” |
| Intercompany | “Consolidation report (stub)” |
| Pricing rules | “Optional. Configure rules … (UI-only stub).”; “No rules. Add rules (stub) above.” |
| Currencies | “Add a new currency. API pending — stub only.” |

### 3.3 Empty states

- Many list pages use `emptyMessage="No X yet."` with no specific “pending” — data from mock; real empty state when API returns [] is same.

---

## 4. Pending workflows

### 4.1 Document lifecycle

- **Current:** Create draft (wizard) → redirect to `/docs/{type}/1`; no real create API. Detail view shows stub header/lines.
- **Pending:** Draft → Submit → Request approval → Approve/Reject → Post → (optional) Reverse/Cancel. Backend: document state machine, approval inbox, GL posting.

### 4.2 Approval flow

- **Current:** Approvals inbox/requests use mock data; Approve/Reject toast only.
- **Pending:** List from API; submit approval/rejection with comment; backend updates doc status and emits events; optional workflow (e.g. multi-step, escalation).

### 4.3 Payment & allocation

- **AR:** Customer → open invoices → Allocate → Review & submit. Currently “API pending” / stub.
- **AP:** Three-way match (PO ↔ GRN ↔ Bill); Match selected = stub. Payment run Approve = stub.
- **Bank recon:** Match statement line ↔ system transaction; create adjusting entry; create payment from line. All stubs.

### 4.4 Warehouse

- **Transfer:** Approve → Mark in transit → Receive. All stubs.
- **Putaway:** Allocate to bins → Confirm. Stub.
- **Pick-pack:** Confirm pick → Confirm pack → Mark dispatched. Stubs.
- **Cycle count:** Enter quantities → Post adjustments. Stubs.

### 4.5 Payroll & period close

- **Pay run:** Request approval → Approve → Post payroll journal. Stubs (except CSV export when API configured).
- **Period close:** Close period / Reopen period. Stubs.

### 4.6 Automation workflows

- **Workflows page:** “Create workflow (stub). API pending.” No workflow builder or engine.
- **Rules:** “Require approval” action = stub. No real rule execution.

---

## 5. Summary counts

| Category | Count |
|----------|--------|
| Action-registry stubs | 28 |
| **Action-registry stubs with frontend wired** | **24** (all action-registry stubs: docs 4, costing 1, warehouse 4, period-close 2, payment-run 1, pay-run 1, approvals 2, org 1, product 2, purchase-returns 3, three-way match 1, AR allocate 1, depreciation 1, analytics 1, automation 1) |
| Additional stub locations (this doc) | 80+ |
| Pending UI (placeholder / stub label) | 20+ |
| Pending workflows (high level) | 6 (doc, approval, payment, warehouse, payroll, automation) |
| Pending task areas | 4 (backend/API, analytics, AI/Copilot, settings extended) |

---

## 6. References

| Doc | Purpose |
|-----|---------|
| [BACKEND_API_SPEC_SINGLE_SOURCE.md](./BACKEND_API_SPEC_SINGLE_SOURCE.md) | Single source: implemented APIs, stub→endpoint, §8 frontend completion |
| [STUBS_AND_PENDING.md](../STUBS_AND_PENDING.md) | Detailed stub behavior by module; mock vs real; exports |
| [BACKEND_ENDPOINT_MIGRATIONS.md](./BACKEND_ENDPOINT_MIGRATIONS.md) | Stub → endpoint mapping; backend implement list |
| [REMAINING_BACKEND_IMPLEMENTED.md](./REMAINING_BACKEND_IMPLEMENTED.md) | What backend already implemented (PDF, import, treasury export) |
| [BACKEND_SPEC.md](./BACKEND_SPEC.md) | §10.13 stub actions; §13 endpoints |
| `src/lib/qa/action-registry.ts` | Official CTA list; `getStubActions()` |
| `src/lib/api/stub-endpoints.ts` | Wired stub API calls (when NEXT_PUBLIC_API_URL set) |
| `/dev/action-audit` | UI to filter and view stubs (status = stub) |

---

*Generated from full codebase review. Update this doc when adding or removing stubs, pending UI, or workflows.*
