/**
 * Per-page guide content: summary and optional steps for each tutorial item.
 * Keys match nav item keys. Missing keys fall back to chapter description in getTutorialForRoute.
 */

export interface ElementHint {
  selector: string;
  hint: string;
}

export const ITEM_GUIDES: Partial<
  Record<
    string,
    {
      guideSummary: string;
      guideSteps?: string[];
      guideTips?: string[];
      elementHints?: ElementHint[];
      recommendedNextStep?: { label: string; href: string };
    }
  >
> = {
  // Core
  "control-tower": {
    guideSummary:
      "The Control Tower is the executive and operations cockpit: KPIs, exceptions, procurement variance, yield, franchise or cold-chain signals, and anything your org surfaces as “need attention now.” Use it at the start of the day to see what changed and what is blocked—not to do every task, but to prioritize.",
    guideSteps: [
      "Scan the top KPI row: revenue, margin, stock risk, overdue receivables, or other tiles configured for your industry template.",
      "Read the exception or alert sections first; they usually represent documents, approvals, or stock situations that will get worse if ignored.",
      "Apply date range or filters so you compare “this week vs last” or focus on a branch or warehouse if your role is regional.",
      "Drill from a tile or row into the underlying list or document; the Control Tower is a map, not the place to post every transaction.",
      "If a metric is unclear, use Tutorial → Ask Copilot on this page to get a plain-language definition and suggested follow-up screens.",
      "Pair with Dashboard for a more personal or role-based view; Control Tower tends to be org-wide or leadership-focused.",
    ],
    guideTips: [
      "Bookmark a morning routine: Control Tower → Approvals Inbox → key exception list.",
      "If something looks wrong, check whether the period close or stock valuation run is up to date—stale data can skew KPIs.",
    ],
    recommendedNextStep: { label: "Dashboard", href: "/dashboard" },
  },
  dashboard: {
    guideSummary:
      "The Dashboard is your personal or role-based home: KPIs, widgets, recent activity, and shortcuts into documents and modules. Unlike the Control Tower (often org-wide), this screen is where most users land daily to pick up work and jump to Sales, Inventory, or Finance lists.",
    guideSteps: [
      "Identify which widgets matter for your role (e.g. open orders, stock alerts, approvals) and read them top to bottom.",
      "Use any quick links or recent-activity rows to reopen documents you were working on without searching.",
      "Press ⌘K (Mac) or Ctrl+K (Windows) to open the command palette: jump to any page or trigger Copilot with context.",
      "Click a KPI or chart segment when the UI allows drill-through; you should land on a filtered list or detail, not a dead end.",
      "If you use multiple branches or warehouses, set the org/branch context in the header (if available) before trusting location-specific numbers.",
      "When onboarding, complete Setup (onboarding checklist) so dashboard tiles start showing real data instead of empty states.",
    ],
    guideTips: [
      "The command palette hint in the header is the fastest way to move when you know the destination name.",
      "If numbers look flat, confirm your user has permissions for the underlying modules (sales, inventory, finance).",
    ],
    recommendedNextStep: { label: "Documents", href: "/docs" },
  },
  approvals: {
    guideSummary:
      "The Approvals hub is the front door to your approval workflow. It does not list every pending document by itself—it routes you to Inbox (work assigned to you) and My requests (what you submitted). Policies, amounts, and document types determine what appears here.",
    guideSteps: [
      "Decide whether you are acting as approver (Inbox) or tracking your own submissions (My requests).",
      "Open Inbox when you have pending items; each row should tie to a document or workflow step you can open in full context.",
      "Use My requests to see pending vs approved vs rejected and to read comments when something was sent back.",
      "If you expect an item and do not see it, check you are in the right org/branch and that the document actually entered an approval state.",
      "Large organisations often batch approvals by document type—use filters on the Inbox list when available.",
      "After approving, follow through: many documents still need posting, payment, or fulfilment in their home module.",
    ],
    guideTips: [
      "Reject with a clear comment so the submitter can fix without guessing.",
      "Mobile users: approvals may be available from notifications or the Inbox only—use the same security as desktop.",
    ],
    recommendedNextStep: { label: "Approvals Inbox", href: "/approvals/inbox" },
  },
  "approvals-inbox": {
    guideSummary:
      "The Approvals Inbox is your actionable queue: every item here is waiting on you (or your role). Each row links to a business object—purchase order, expense, journal, etc.—so you can verify facts before Approve or Reject.",
    guideSteps: [
      "Sort or filter by age, amount, or document type so the riskiest or oldest items get attention first.",
      "Open the row to read full line detail, attachments, and audit trail; do not approve from the grid alone if amounts are material.",
      "Check currency, tax, and branch/warehouse context if the document crosses entities.",
      "Approve only when policy is satisfied; reject with a comment that names what is missing (e.g. “attach supplier quote”).",
      "If you are a delegate, confirm you are approving within your mandate; escalation rules may still apply.",
      "After action, the item should leave the inbox; if it sticks, refresh or check for a second approval step in automation workflows.",
    ],
    guideTips: [
      "Use keyboard-friendly flows if your org trains speed: open → review → approve → next.",
      "If the same submitter repeats errors, consider a training snippet in the rejection comment or a Copilot prompt to explain the policy.",
    ],
    recommendedNextStep: { label: "Tasks", href: "/tasks" },
  },
  "approvals-requests": {
    guideSummary:
      "My requests is the mirror of the Inbox: everything you submitted for approval, with status and history. Use it to chase stalled items, see who approved, and capture audit comments without emailing finance ops.",
    guideSteps: [
      "Filter by Pending first to see what still needs someone else’s action.",
      "Open a request to read the timeline: submitted → viewed → approved/rejected, with comments at each step.",
      "If something sits in Pending too long, use your organisation’s escalation path (manager, shared inbox) rather than duplicating the document.",
      "For rejected items, read the comment, fix the source document, and resubmit if the process allows.",
      "Export or screenshot history only when audit or compliance asks—most of the trail stays in-system.",
    ],
    guideTips: [
      "Pair with the Inbox on the other side: you learn what approvers see and write clearer submissions.",
    ],
    recommendedNextStep: { label: "Documents", href: "/docs" },
  },
  tasks: {
    guideSummary:
      "Tasks / Work Queue is the operational to-do list: assignments that may come from workflows, managers, or system events. It complements Approvals (which is about sign-off) by focusing on “do the work” items—callbacks, follow-ups, data fixes.",
    guideSteps: [
      "Review due dates and priority; tackle time-sensitive tasks before deep work.",
      "Open a task to see description, linked record, and any comments from whoever created it.",
      "Mark complete only when the underlying business action is done (e.g. customer called, stock adjusted—not just when you opened the task).",
      "Reassign when the task belongs to another role or queue; leave a note so the next owner has context.",
      "Use search when the list grows; task volume is a signal to fix upstream process or automation.",
      "If tasks duplicate approvals, ask your admin whether workflow rules should merge them.",
    ],
    guideTips: [
      "Clearing tasks weekly prevents a backlog that hides real risk.",
      "Link tasks to CRM or document IDs in comments when your org tracks work across systems.",
    ],
    recommendedNextStep: { label: "Inbox", href: "/inbox" },
  },
  // Document Center
  "docs-hub": {
    guideSummary:
      "The Document Center is the front door to every transactional document in the ERP: sales and purchase cycles, stock movements, invoicing, and manual journals. Think of it as the “paper trail” browser—nothing posts to the ledger or inventory until you create or open a document here (or via shortcuts elsewhere that land in the same flows).",
    guideSteps: [
      "Scan the grid of document types: each tile opens a list view for that type (e.g. Sales orders, Purchase orders, Invoices).",
      "Pick the type that matches your intent: order-to-cash usually flows Sales order → Delivery → Sales invoice; procure-to-pay flows Purchase order → GRN → Purchase invoice.",
      "Use Create / New on a list page to start a draft; mandatory fields (customer/supplier, dates, lines) must be complete before submit or approval.",
      "Search and filters on each list help you find drafts, posted, or period-specific documents—use status filters during month-end.",
      "Understand linkage: many documents reference a predecessor (invoice from order, GRN from PO). Maintaining those links improves traceability and three-way match.",
      "Use Copilot from Page Help to get a narrative of “what happens when I post this document” for your org’s configuration.",
      "After posting, follow through in Finance (AR/AP, GL) or Inventory (movements) if reconciliation is part of your role.",
    ],
    guideTips: [
      "⌘K / Ctrl+K: type “sales order” or “GRN” to jump straight to the list.",
      "If a document type is missing, your admin may have disabled the module or your role may lack permission.",
    ],
    recommendedNextStep: { label: "Sales orders list", href: "/docs/sales-order" },
  },
  "docs-so": {
    guideSummary:
      "Sales Orders (SO) are the commercial commitment to the customer: header (customer, dates, terms), lines (product, qty, price, tax), and workflow status from draft through fulfilled and invoiced. The SO drives availability checks, reservations, delivery documents, and ultimately revenue recognition when you invoice.",
    guideSteps: [
      "Start from Create: choose customer, ship-from/ship-to if relevant, requested date, and currency.",
      "Add lines with correct UOM and price source (price list, manual, or contract). Fix tax codes before approval if your org is strict on VAT.",
      "Save as draft while negotiating; submit or confirm when the customer has agreed—some orgs then lock lines or require approval.",
      "Watch status: open / partially delivered / closed tells you whether delivery or invoicing is still expected.",
      "From the list, search by order number, customer, or date range; export if you reconcile with CRM or spreadsheets.",
      "Linkage: creating a delivery or invoice from the SO preserves traceability; avoid standalone invoices when an SO exists.",
      "Exceptions: credit limits, blocked customers, or negative stock may block submit—resolve in master data or inventory first.",
    ],
    guideTips: [
      "Line-level notes help warehouse and finance when something non-standard was agreed with the customer.",
      "If prices look wrong, check Price Lists / Pricing Rules before overriding manually.",
    ],
    recommendedNextStep: { label: "Deliveries", href: "/sales/deliveries" },
  },
  "docs-po": {
    guideSummary:
      "Purchase Orders (PO) commit the organisation to the supplier: quantity, price, delivery date, and terms. The PO is the anchor for goods receipt (inventory in), three-way match to the supplier invoice, and spend reporting.",
    guideSteps: [
      "Create with supplier, bill-to/ship-to, and incoterms or delivery window as your process requires.",
      "Add lines with SKU, quantity, UOM, and expected price; attach reference to requisition or contract when applicable.",
      "Route through approval when policy requires (category, amount, or new supplier).",
      "Track open quantity: receiving partial deliveries is normal—close or update lines when the supplier cannot fulfil remainder.",
      "Do not post supplier invoices without aligning to PO and GRN when your controls require three-way match.",
      "From the list, filter open POs to plan receiving and cash forecasting.",
    ],
    guideTips: [
      "Split POs by delivery date if the supplier ships in multiple waves—it simplifies GRN and variance tracking.",
    ],
    recommendedNextStep: { label: "Goods receipt", href: "/docs/grn" },
  },
  "docs-grn": {
    guideSummary:
      "Goods Receipt (GRN) is the inventory-in event against a purchase order. It records what physically arrived, when, and at which warehouse. Posting the GRN increases on-hand stock and is the operational counterpart to the supplier invoice (finance).",
    guideSteps: [
      "Select an open PO (or create GRN from PO) so lines and quantities default correctly.",
      "Enter received quantities per line; capture batch/lot/serial if your traceability rules require it.",
      "Record variance (short/over) with a reason code when your workflow supports it—finance may need to reconcile with supplier credits.",
      "Post when goods are verified; unposted GRNs do not move stock.",
      "After posting, inventory movements should reflect “in” at the chosen warehouse; follow up with putaway if you use bins.",
      "Link forward to the supplier invoice for three-way match: PO qty / GRN qty / invoice qty should reconcile.",
    ],
    guideTips: [
      "Receiving at the wrong warehouse is painful to unwind—double-check the site before post.",
    ],
    recommendedNextStep: { label: "Stock movements", href: "/inventory/movements" },
  },
  "docs-invoice": {
    guideSummary:
      "The Invoices list covers both sales invoices (AR) and purchase invoices (AP), depending on filters and permissions. Posting an invoice creates the receivable or payable, updates tax, and hits the GL—so this is a finance-critical screen, not just printing PDFs.",
    guideSteps: [
      "Choose or filter document type (sales vs purchase) so you do not confuse customer billing with supplier bills.",
      "Draft: build from an order/GRN when possible so lines and quantities flow through; manual invoices need extra care on tax accounts.",
      "Verify payment terms, due date, and currency; FX invoices may need rate from treasury settings.",
      "Post when accounting ownership is clear; some orgs batch post daily for control.",
      "After posting, AR/AP balances and GL should move; mismatches often mean tax mapping or rounding rules.",
      "For corrections, use credit/debit notes rather than editing posted invoices when audit trail matters.",
    ],
    guideTips: [
      "Month-end: run open invoice reports by aging bucket before close.",
    ],
    recommendedNextStep: { label: "AR payments", href: "/ar/payments" },
  },
  "docs-journal": {
    guideSummary:
      "Journal Entries are controlled manual postings to the general ledger: accruals, depreciation, reclasses, and corrections that are not created by operational documents. Every line must balance (debits = credits) for the entry to post.",
    guideSteps: [
      "Choose posting date in the correct open period; period lock will block you if Finance has closed the month.",
      "Add lines with GL account, cost center/project if used, debit or credit amount, and memo.",
      "Attach narrative in the header for auditors: “Accrue supplier invoice not yet received” reads better than “adjustment”.",
      "Balance in one currency; FX journals may need separate logic per your policy.",
      "Review trial balance impact before post—especially for suspense or clearing accounts.",
      "Restrict who can post journals; often only accountants, with approvals above a threshold.",
    ],
    guideTips: [
      "Recurring journals (rent, payroll accrual) are candidates for automation rules if you repeat them monthly.",
    ],
    recommendedNextStep: { label: "General Ledger", href: "/finance/gl" },
  },
  "docs-credit-note": {
    guideSummary:
      "Sales Credit Notes reduce what the customer owes and, when linked to returns, put stock back. They are not “negative invoices” in a casual sense—they must tie to policy (returns, pricing error, goodwill) and often to the original invoice for audit.",
    guideSteps: [
      "Create from the customer context and link the originating sales invoice when the UI allows—this preserves traceability.",
      "Enter lines with correct sign convention (credit to revenue / AR per your chart).",
      "Handle stock: returned goods should increase inventory when physically received and processed.",
      "Post when approved; AR aging and revenue reports should reflect the credit.",
      "Coordinate with warehouse on return RMA if the process spans teams.",
    ],
    guideTips: [
      "High volumes of credit notes may indicate pricing or quality issues worth a separate review.",
    ],
    recommendedNextStep: { label: "Sales returns", href: "/sales/returns" },
  },
  "docs-debit-note": {
    guideSummary:
      "Sales Debit Notes increase what the customer owes: freight surcharges, late fees, re-bills, or agreed debit adjustments. Use them when the correction is not a new invoice line on an open order but a standalone charge.",
    guideSteps: [
      "Select customer and reference contract or order if applicable.",
      "Add lines with GL revenue or receivable impact per your configuration.",
      "Ensure tax treatment matches local rules (e.g. VAT on fees).",
      "Post and communicate to the customer if your policy requires prior notice.",
    ],
    guideTips: [
      "Do not mix debit notes with informal “balance adjustments” in spreadsheets—keep everything in the ERP.",
    ],
    recommendedNextStep: { label: "AR customers", href: "/ar/customers" },
  },
  "docs-purchase-credit-note": {
    guideSummary:
      "Purchase Credit Notes reduce payables to a supplier: returns to vendor, price corrections, or rebates. They should reference the original purchase invoice or GRN when possible so AP and inventory stay aligned.",
    guideSteps: [
      "Link to supplier and original bill; enter credited lines and quantities.",
      "If stock returns to the supplier, ensure inventory and GRN history reflect the outbound movement.",
      "Post to reduce AP; Treasury will pay net of credits on the next payment run.",
      "Retain documentation (supplier CN PDF) for audit.",
    ],
    guideTips: [
      "Three-way match: PO + GRN + Invoice should still tie after credits—watch partial quantities.",
    ],
    recommendedNextStep: { label: "AP bills", href: "/ap/bills" },
  },
  "docs-purchase-debit-note": {
    guideSummary:
      "Purchase Debit Notes increase payables: freight, handling, or invoice corrections from the supplier side. They are the mirror of sales debit notes but on the AP ledger.",
    guideSteps: [
      "Select supplier and link to the purchase context (PO/invoice) when required.",
      "Enter lines with correct expense or inventory accounts.",
      "Post and include in the next payment batch or dispute with supplier if incorrect.",
    ],
    guideTips: [
      "Coordinate with receiving: some charges belong in landed cost rather than a standalone debit note—ask finance which treatment applies.",
    ],
    recommendedNextStep: { label: "Supplier invoices", href: "/purchasing/supplier-invoices" },
  },
  // Masters
  "masters-hub": {
    guideSummary:
      "Masters is the foundation layer: products (what you sell or buy), parties (who you sell to or buy from), and warehouses (where stock lives). Poor master data causes wrong prices, failed deliveries, and reconciliation pain—so invest time here before scaling transaction volume.",
    guideSteps: [
      "Start with Parties if you need customers/suppliers on documents; then Products so lines have something to reference; then Warehouses if you track multi-site stock.",
      "Agree on naming and coding standards (SKU format, customer codes) before bulk import.",
      "Use search constantly—duplicate masters are worse than missing ones.",
      "Link finance defaults (tax, payment terms, GL where relevant) at party level to reduce errors on every invoice.",
      "After changes, spot-check a few documents (SO, PO) to ensure defaults propagate.",
      "Larger implementations: use migration tools or bulk CSV for initial load, then freeze codes except for controlled change requests.",
    ],
    guideTips: [
      "Treat “inactive” flags seriously—don’t delete history; deactivate obsolete masters.",
    ],
    recommendedNextStep: { label: "Products", href: "/master/products" },
  },
  "masters-products": {
    guideSummary:
      "Products are the SKU catalog: identifiers, units of measure, categories, and often pricing or variant relationships. Every order line, stock record, and cost roll-up references a product—accuracy here prevents wrong shipments and margin leakage.",
    guideSteps: [
      "Create with a unique code/SKU and human-readable name; avoid reusing codes for different items.",
      "Set base UOM and, if applicable, purchase vs sales UOM with conversion factors.",
      "Assign category, brand, or attributes for reporting and analytics.",
      "Open tabs for variants, packaging, or pricing when your org uses them—do not duplicate products for every size if variants are available.",
      "Validate tax or product classification when your integration (e.g. e-invoicing) requires it.",
      "Before go-live, load a sample PO and SO to verify the product resolves correctly on documents.",
    ],
    guideTips: [
      "Keep “sellable” vs “non-stock” (services, deposits) clearly flagged in category or type.",
    ],
    recommendedNextStep: { label: "Stock levels", href: "/inventory/stock-levels" },
  },
  "masters-parties": {
    guideSummary:
      "Parties unify customers and suppliers in one record model: legal name, contacts, addresses, payment terms, credit limits, default currency, and tax IDs. The same party can sometimes act as both customer and supplier—use roles carefully to avoid duplicate balances.",
    guideSteps: [
      "Create with legal billing name and tax registration where required.",
      "Set credit limit and payment terms for sales; set payment terms and bank details for purchasing.",
      "Maintain ship-to addresses for multi-site customers.",
      "Use hold/blocked flags when credit or compliance requires stopping sales.",
      "Review open AR/AP balance before changing terms—history may still reference old defaults.",
      "For integrations (bank, e-invoicing), store identifiers exactly as the gateway expects.",
    ],
    guideTips: [
      "Duplicate party records split history—merge with finance before closing periods.",
    ],
    recommendedNextStep: { label: "Sales orders", href: "/sales/orders" },
  },
  "masters-warehouses": {
    guideSummary:
      "Warehouses (and branches) define where inventory is stored and often which legal entity owns stock. Movements, transfers, and costing are scoped by warehouse. Locations and bins may sit below the warehouse for pick-and-pack operations.",
    guideSteps: [
      "Create a warehouse per physical site or logical depot that should hold stock separately.",
      "Configure address, calendar, and default receiving/shipping if your flows differ by site.",
      "Add locations or bins when you use directed putaway or pick paths.",
      "Align warehouse to GL cost centers or branches if your finance model requires it.",
      "Deactivate warehouses you no longer use; do not delete if history exists.",
    ],
    guideTips: [
      "Transfers between warehouses can trigger intercompany rules—confirm with finance before multi-entity stock moves.",
    ],
    recommendedNextStep: { label: "Warehouse overview", href: "/warehouse/overview" },
  },
  // Inventory
  "inventory-products": {
    guideSummary:
      "Inventory Products is the stock-and-value view by SKU: on-hand, reserved, available, and often inventory value. It answers “what do we have and where” faster than drilling document by document. Use it for planners, buyers, and sales reps checking availability.",
    guideSteps: [
      "Search by SKU or name; filter by warehouse to see split stock by location.",
      "Interpret reserved vs available: reserved is usually tied to unfulfilled sales or allocations.",
      "Compare to reorder points or min/max if your org maintains them.",
      "Drill to movements or documents when a number looks wrong—never adjust without tracing the source.",
      "Export when you need offline analysis or to share with operations in a spreadsheet.",
      "For valuation, cross-check with Inventory Valuation or costing runs when finance closes the period.",
    ],
    guideTips: [
      "If available is negative, something is wrong with reservations or document posting—escalate before promising customers.",
    ],
    recommendedNextStep: { label: "Stock movements", href: "/inventory/movements" },
  },
  "inventory-stock-levels": {
    guideSummary:
      "Stock Levels is the operational truth table: quantity per product and warehouse (and sometimes location). It is the first screen to open when someone says “we’re out of stock” or “we have too much.” Pair it with movements when you need to explain why the number changed.",
    guideSteps: [
      "Filter warehouse first when your user role spans multiple sites.",
      "Use search for SKU fragments; watch for typos vs duplicate codes.",
      "Read columns: on-hand, reserved, available, and in-transit if shown—each answers a different question.",
      "Export for cycle count preparation or weekly ops review.",
      "When levels disagree with the warehouse floor, start from movements for the SKU, not from a manual adjustment.",
      "Coordinate with purchasing if reorder points are consistently wrong.",
    ],
    guideTips: [
      "Bookmark a filtered view for your branch warehouse to save time.",
    ],
    elementHints: [
      { selector: "[data-tutorial-hint=search]", hint: "Search products by SKU or name." },
    ],
    recommendedNextStep: { label: "Receipts (GRN)", href: "/inventory/receipts" },
  },
  "inventory-movements": {
    guideSummary:
      "Stock Movements is the audit trail of every stock movement: receipts, shipments, transfers, adjustments, and production. Each row ties to a reference type (document number, transfer ID). Nothing here should be edited manually—if you see wrong movements, fix the source document or post a controlled adjustment.",
    guideSteps: [
      "Search by SKU or product name to isolate one item’s history.",
      "Filter by warehouse and movement type (in/out/transfer) to narrow the window.",
      "Read the reference column: click through to the source document when the UI links it.",
      "Export to CSV for reconciliation or forensic analysis during period-end.",
      "Use date range to match physical counts or supplier deliveries.",
      "If investigating a discrepancy, export before and after the suspected event date.",
    ],
    guideTips: [
      "Click a reference to open the source document.",
      "Export to CSV for offline analysis.",
    ],
    elementHints: [
      { selector: "[data-tutorial-hint=search]", hint: "Search by SKU or product name." },
      { selector: "[data-tutorial-hint=export]", hint: "Export the table to CSV." },
    ],
    recommendedNextStep: { label: "Stock explorer", href: "/inventory/stock-explorer" },
  },
  "inventory-receipts": {
    guideSummary:
      "Receipts (GRN) is the operational list of goods receipt documents—the same business process as Document Center → GRN, optimised for warehouse and receiving teams. Each receipt should trace to a PO and, when posted, increases on-hand stock.",
    guideSteps: [
      "Filter by status: drafts waiting for verification vs posted receipts.",
      "Open a draft to check lines, batch/lot, and warehouse before post.",
      "Use Create to start a GRN; pick the PO so lines pre-fill and quantities stay comparable to what was ordered.",
      "Capture variance with notes when supplier short-ships or over-ships—finance may need that for debit/credit notes.",
      "After post, verify movements and stock levels for the SKUs you received.",
      "If your process includes QC holds, do not move goods to available bins until released.",
    ],
    guideTips: [
      "The Create button often deep-links to the document composer—same rules as /docs/grn.",
    ],
    recommendedNextStep: { label: "Putaway", href: "/warehouse/putaway" },
  },
  "inventory-receiving": {
    guideSummary:
      "Receiving Queue is a focused inbox for expected inbound stock: lines waiting to be received against POs or ASNs. It reduces hunting through the full PO list when the dock is busy.",
    guideSteps: [
      "Work top-down by arrival time or priority flag if your org uses it.",
      "Open a line, confirm quantity received, and capture lot/expiry if regulated.",
      "Post or hand off to GRN draft depending on your workflow—some teams draft GRN here, others only record receipt events.",
      "Resolve exceptions immediately: reject damaged goods with photos or notes when supported.",
      "Clear the queue daily so purchasing sees an accurate “still expected” picture.",
    ],
    guideTips: [
      "Pair with Cash-to-Weight Audit when procurement is by weight, not by unit count.",
    ],
    recommendedNextStep: { label: "Receipts list", href: "/inventory/receipts" },
  },
  "inventory-costing": {
    guideSummary:
      "Costing translates physical stock into financial value: moving average, FIFO, standard, or configured layers. This screen is where finance and operations align on “what does this inventory cost us” before margin and COGS reports are trusted.",
    guideSteps: [
      "Confirm which valuation method applies to your org and whether items are standard-cost or actual.",
      "Run costing or revaluation when prompted after large receipts, price changes, or period close prep.",
      "Review exceptions: negative inventory, missing cost, or zero-cost receipts break margin.",
      "Tie results to Inventory Valuation and GL inventory accounts—large variances need journal or landed-cost adjustments.",
      "Document assumptions when finance overrides cost (e.g. provisional invoice).",
      "Schedule recurring runs if your deployment supports automated periodic costing.",
    ],
    guideTips: [
      "Landed cost (freight, duty) may post separately—see procurement and finance playbooks for your tenant.",
    ],
    recommendedNextStep: { label: "Valuation", href: "/inventory/valuation" },
  },
  "inventory-stock-explorer": {
    guideSummary:
      "Stock Explorer is the analyst view: slice stock by product, warehouse, time, and movement type. Use it when Stock Levels is too shallow and Movements is too raw—you need trends, not just a snapshot.",
    guideSteps: [
      "Pick a product or small set first; widen filters once you trust the data.",
      "Use date range to explain “what changed this week” for a problematic SKU.",
      "Pivot between quantity and value if both are available.",
      "Drill to linked documents from explorer rows when the UI exposes links.",
      "Export charts or tables for category review meetings.",
      "Combine with anomalies or analytics modules if your org tracks stock risk signals.",
    ],
    guideTips: [
      "Start from a single warehouse when performance is slow on huge catalogs.",
    ],
    recommendedNextStep: { label: "Stock movements", href: "/inventory/movements" },
  },
  "inventory-valuation": {
    guideSummary:
      "This screen shows the latest persisted inventory valuation from the costing run (weighted-average snapshot per stock level). Use it with costing runs and Finance journals—period-end reconciliation to GL still happens outside this page.",
    guideSteps: [
      "Review per-SKU unit cost, quantity, and extended value from the last costing snapshot.",
      "See warehouse subtotals when stock spans multiple sites (table rows include warehouse).",
      "If the table is empty, run Inventory costing first so a snapshot can be saved.",
      "For period close: coordinate as-of dates and tie-outs with finance—historical \"as of\" snapshots and CSV export are not on this page yet.",
    ],
    guideTips: [
      "Month-end practice: scope by warehouse using the summary rows, export manually if needed (e.g. copy or print), and match subtotals to trial balance inventory lines after postings.",
      "Investigate outliers (one SKU dominating value, negative quantities) before large revaluation journals.",
      "FX multi-currency stock may need translation rules—confirm with finance.",
    ],
    recommendedNextStep: { label: "Costing run", href: "/inventory/costing" },
  },
  "inventory-transfers": {
    guideSummary:
      "Inventory Transfers (from the inventory menu) moves stock between warehouses using the same transfer document as Warehouse → Transfers. Use this entry when your mental model is “inventory planner” rather than “warehouse floor.”",
    guideSteps: [
      "Create with from-warehouse, to-warehouse, and reason (replenishment, balance correction).",
      "Add lines with SKU and quantity; respect batch/lot rules if enforced.",
      "Submit for approval when policy requires large or cross-border moves.",
      "Post when goods physically move; timing mismatch between systems and trucks causes perpetual pain.",
      "Monitor in-transit if your deployment tracks it between issue and receipt.",
    ],
    guideTips: [
      "If this route duplicates Warehouse → Transfers, use whichever your SOP names—same underlying process.",
    ],
    recommendedNextStep: { label: "Warehouse transfers", href: "/warehouse/transfers" },
  },
  "inventory-stocktake": {
    guideSummary:
      "Stocktake / Cycle Count from Inventory links to the same cycle-count process as Warehouse → Cycle counts. Physical counts are the only honest check on system stock—use a disciplined ABC cycle or full wall-to-wall annually.",
    guideSteps: [
      "Schedule counts by velocity: A items often, C items less frequently.",
      "Freeze or limit movements during count windows when accuracy is critical.",
      "Enter counts by bin/SKU; blind counts reduce bias.",
      "Post adjustments only after supervisor review; large write-offs need finance approval.",
      "Root-cause recurring variances: picking errors, GRN mistakes, theft, or master data.",
    ],
    guideTips: [
      "Never “fix” stock with silent adjustments without a movement trail—use proper adjustment documents.",
    ],
    recommendedNextStep: { label: "Cycle counts", href: "/warehouse/cycle-counts" },
  },
  "inventory-warehouses": {
    guideSummary:
      "Warehouses & Locations under Inventory emphasises structure: which sites exist, how locations/bins nest, and how stock rolls up. It complements Masters → Warehouses with an operations lens (capacity, pick paths).",
    guideSteps: [
      "Validate every active warehouse has the right address and calendar for cut-offs.",
      "Maintain locations/bins consistently—mixed naming confuses scanners and new hires.",
      "Deactivate bins you no longer use.",
      "Align with transfers: you cannot move stock to a warehouse that is not set up.",
      "Review capacity or volume fields if your deployment uses them for planning.",
    ],
    guideTips: [
      "Keep the number of warehouses minimal—every extra site multiplies reconciliation work.",
    ],
    recommendedNextStep: { label: "Bin locations", href: "/warehouse/bin-locations" },
  },
  // Warehouse
  "warehouse-overview": {
    guideSummary:
      "Warehouse Overview is the shift-start screen: what must be picked, put away, counted, or investigated today. It connects operational work (floor) to system state (ERP) without opening ten menus.",
    guideSteps: [
      "Read summary tiles or lists for open picks, putaway backlog, and urgent transfers.",
      "Click through to Pick & Pack, Putaway, or Transfers depending on priority.",
      "Watch for SLA or ship-today flags if your deployment surfaces them.",
      "Coordinate with sales if outbound is blocked by inventory accuracy issues.",
      "End of shift: ensure near-zero “stuck” tasks or hand over in the log.",
    ],
    guideTips: [
      "Pair with Control Tower if leadership tracks warehouse KPIs at group level.",
    ],
    recommendedNextStep: { label: "Pick & Pack", href: "/warehouse/pick-pack" },
  },
  "warehouse-transfers": {
    guideSummary:
      "Warehouse Transfers executes inter-site or inter-warehouse stock moves with document control. Posting creates paired movements (out from source, in to destination) or in-transit states depending on configuration.",
    guideSteps: [
      "Verify source stock is available and not reserved for higher-priority orders.",
      "Pick and ship physically before or in lockstep with system post—choose the SOP your org uses.",
      "Receive at destination with matching quantities; investigate losses in transit immediately.",
      "Use comments for truck numbers, seal IDs, or cross-dock references.",
      "Close open transfers at period end—finance may require no stranded in-transit.",
    ],
    guideTips: [
      "High-value transfers may need dual approval—check automation rules.",
    ],
    recommendedNextStep: { label: "Stock movements", href: "/inventory/movements" },
  },
  "warehouse-pick-pack": {
    guideSummary:
      "Pick & Pack is the fulfilment execution screen: tasks derived from sales orders or waves. Accuracy here drives customer satisfaction and reduces returns; speed matters but not at the cost of wrong SKU or quantity.",
    guideSteps: [
      "Open the next pick task in priority order (route, cut-off, customer tier).",
      "Scan or confirm SKU, location, and quantity; record shorts with reason.",
      "Stage packed cartons with labels matching carrier requirements.",
      "Hand off to shipping or loading with documentation for cold chain if applicable.",
      "Complete the task in-system only when the physical pick matches.",
      "Escalate inventory mismatches to cycle count rather than overriding silently.",
    ],
    guideTips: [
      "Batch picking and wave picking may change UI—follow training for your deployment.",
    ],
    recommendedNextStep: { label: "Deliveries", href: "/sales/deliveries" },
  },
  "warehouse-putaway": {
    guideSummary:
      "Putaway turns received goods into addressable stock: moving pallets from receiving dock to bin locations so picks can find them. Poor putaway causes “phantom stock” where the system says yes but the floor says no.",
    guideSteps: [
      "Take tasks from GRN completion or putaway queue.",
      "Confirm destination bin matches capacity and product constraints (e.g. cold room).",
      "Split lines when partial quantities go to different bins.",
      "Complete tasks in-system when physically done.",
      "Flag damaged goods for quarantine locations if your site uses them.",
    ],
    guideTips: [
      "Putaway delays inflate “available” at receiving but not pickable—watch ageing of unput receipts.",
    ],
    recommendedNextStep: { label: "Bin locations", href: "/warehouse/bin-locations" },
  },
  "warehouse-bin-locations": {
    guideSummary:
      "Bin locations master data defines pick faces, bulk zones, and staging. Accurate bins make scanning reliable; inaccurate bins make even a good WMS feel broken.",
    guideSteps: [
      "Filter by warehouse before editing bins—avoid cross-site mistakes.",
      "Use consistent naming (aisle-rack-level) so labels print predictably.",
      "Set max weight/volume when the system enforces capacity.",
      "Deactivate bins that are blocked or unsafe.",
      "Review slow-moving bins periodically for consolidation.",
    ],
    guideTips: [
      "Align bin master changes with label reprints—old labels cause mispicks.",
    ],
    recommendedNextStep: { label: "Pick & Pack", href: "/warehouse/pick-pack" },
  },
  "warehouse-cycle-counts": {
    guideSummary:
      "Cycle counts from Warehouse are execution-focused: create or open a count, count stock, review variance, post adjustments. Finance usually cares about the net adjustment and the reason code.",
    guideSteps: [
      "Choose scope: SKU list, bin range, or ABC class.",
      "Assign counters and, if possible, use blind count entry.",
      "Review variance before post—large deltas need a second count.",
      "Post adjustments through controlled documents, not ad-hoc edits.",
      "Feed root causes back to operations (supplier, picking, theft, master data).",
    ],
    guideTips: [
      "Coordinate with open transfers—counting during heavy movement increases noise.",
    ],
    recommendedNextStep: { label: "Stock levels", href: "/inventory/stock-levels" },
  },
  // Sales
  "sales-overview": {
    guideSummary:
      "Sales Overview is the revenue cockpit: trended revenue, margin, order backlog, and shortcuts into transactional lists. Use it in stand-ups and reviews before diving into individual customers.",
    guideSteps: [
      "Set the period (week/month/quarter) consistent with how leadership reports.",
      "Read revenue vs target if shown; drill to orders if behind plan.",
      "Watch margin compression—often price, mix, or COGS movement.",
      "Jump to Quotes when pipeline conversion is the issue; to Deliveries when fulfilment is the bottleneck.",
      "Export or screenshot for meetings when the board asks for a single view.",
      "Pair with CRM pipeline if your org links opportunities to quotes.",
    ],
    guideTips: [
      "If KPIs look flat, check date filters and branch context.",
    ],
    recommendedNextStep: { label: "Sales orders", href: "/sales/orders" },
  },
  "sales-quotes": {
    guideSummary:
      "Quotes are non-binding (until accepted) commercial offers. They feed pipeline metrics and convert to sales orders without re-keying lines when the process is clean.",
    guideSteps: [
      "Create with customer, validity date, and incoterms if international.",
      "Pull prices from lists; note manual overrides for audit.",
      "Send PDF or portal link to customer depending on integration.",
      "Track status: draft, sent, accepted, lost—lost reasons help product and pricing teams.",
      "Convert to order in one click when won; lines should flow with quantities and prices.",
      "Clean up expired quotes periodically so reports stay meaningful.",
    ],
    guideTips: [
      "Discount authority: know your floor price before promising large deals.",
    ],
    recommendedNextStep: { label: "Orders", href: "/sales/orders" },
  },
  "sales-orders": {
    guideSummary:
      "Sales Orders (list view under Sales) is the operational backbone of order-to-cash. Every row should have a clear owner, status, and next action—approve, pick, deliver, or invoice.",
    guideSteps: [
      "Filter by status: draft / confirmed / partially delivered / closed.",
      "Search by customer, PO reference, or internal order number.",
      "Open an order to edit lines until policy locks it; then use returns/credit notes for changes.",
      "Drive fulfilment: create delivery when stock is ready; invoice when revenue should be recognised per policy.",
      "Watch credit blocks—shipments may be unauthorised for overdue accounts.",
      "Export for S&OP or production planning when feeds are manual.",
    ],
    guideTips: [
      "Align with finance on revenue recognition: invoice timing may differ from shipment in some industries.",
    ],
    recommendedNextStep: { label: "Deliveries", href: "/sales/deliveries" },
  },
  "sales-deliveries": {
    guideSummary:
      "Deliveries record shipment of goods to the customer (or hand-off to carrier). Posting reduces inventory and advances the sales order status; it is often the operational trigger for invoicing in stock-and-ship businesses.",
    guideSteps: [
      "Create from order when possible so quantities and lines stay aligned.",
      "Capture tracking, vehicle, or POD reference when required.",
      "Post when goods leave your control; partial deliveries are normal—track backorders.",
      "Handle returns or damaged goods via return documents, not negative deliveries unless supported.",
      "Reconcile with warehouse picks—every line should trace to stock movements.",
    ],
    guideTips: [
      "Cold chain: capture temperature compliance fields if your org audits them.",
    ],
    recommendedNextStep: { label: "Sales invoices", href: "/sales/invoices" },
  },
  "sales-invoices": {
    guideSummary:
      "Sales Invoices (this list) focuses on billing customers: draft vs posted, print/email, and integration to AR. It complements Document Center → Invoice with a sales-role filter.",
    guideSteps: [
      "Work draft invoices first—backlog here hits cash collection.",
      "Create from order/delivery to inherit lines; manual invoices need extra scrutiny.",
      "Verify tax, withholding, and payment terms before post.",
      "Post when accounting recognises revenue; some orgs batch nightly.",
      "After post, AR aging and customer statements should update.",
      "Use Copilot to clarify “what still blocks posting” on a complex invoice.",
    ],
    guideTips: [
      "E-invoicing or fiscal printers may add a final submission step after ERP post.",
    ],
    recommendedNextStep: { label: "Collections", href: "/treasury/collections" },
  },
  "sales-customers": {
    guideSummary:
      "Customers is the commercial face of party master data: credit, pricing, contacts, and open orders. Sales uses this daily; finance relies on it for AR truth.",
    guideSteps: [
      "Search by name, code, or tax ID.",
      "Review credit limit utilisation before promising large orders.",
      "Keep contacts and delivery addresses current—wrong ship-to causes costly returns.",
      "Drill to orders and invoices from the customer record when investigating disputes.",
      "Flag strategic customers for pricing review when margin erodes.",
      "Coordinate with CRM if your org maintains parallel account records.",
    ],
    guideTips: [
      "Never create duplicate customers to “fix” a pricing issue—use price lists or contracts.",
    ],
    recommendedNextStep: { label: "Quotes", href: "/sales/quotes" },
  },
  "sales-returns": {
    guideSummary:
      "Returns / Credit Notes covers the commercial reversal of sales: physical returns, allowances, and financial credits. Inventory, AR, and sometimes tax must move together—partial processes create reconciliation nightmares.",
    guideSteps: [
      "Start from the originating invoice or order when possible.",
      "Inspect returned goods and route to restock or scrap.",
      "Issue credit note with correct VAT handling; some jurisdictions require reference to original invoice numbers.",
      "Update customer claims history for repeated issues.",
      "Coordinate with warehouse RMA and finance approval thresholds.",
    ],
    guideTips: [
      "High return rate may be a quality or packaging issue—flag to operations.",
    ],
    recommendedNextStep: { label: "Credit notes (docs)", href: "/docs/credit-note" },
  },
  // Purchasing
  "purchasing-requests": {
    guideSummary:
      "Purchase Requests (requisitions) capture internal demand before money is committed to a supplier. They enforce budget, category approval, and audit trail—especially in multi-site organisations.",
    guideSteps: [
      "Enter need-by date, department/project, and lines with suggested suppliers if allowed.",
      "Attach specs or quotes when technical sourcing is required.",
      "Submit for approval per policy matrix.",
      "Track status; nudge approvers when production is blocked.",
      "Upon approval, convert to PO with minimal retyping.",
      "Reject or close requests that are duplicated or obsolete.",
    ],
    guideTips: [
      "Clear naming in the title field helps approvers triage faster.",
    ],
    recommendedNextStep: { label: "Purchase orders", href: "/purchasing/orders" },
  },
  "purchasing-orders": {
    guideSummary:
      "Purchase Orders under Purchasing is the buyer’s primary list: open POs, lead times, and receipt status. It ties to MRP, warehouse receiving, and AP—treat it as a contract with the supplier, not just paperwork.",
    guideSteps: [
      "Filter open POs to plan cash and receiving docks.",
      "Edit lines only while supplier has not confirmed; use change orders if your process supports them.",
      "Send PO to supplier via email/portal integration when available.",
      "Close PO lines when fully received or formally cancelled.",
      "Escalate price or date breaches early—waiting until invoice time is expensive.",
      "Link contracts or RFQs when enterprise procurement requires it.",
    ],
    guideTips: [
      "Partial receipts are normal—track remaining qty for cash forecasting.",
    ],
    recommendedNextStep: { label: "Goods receipt", href: "/inventory/receipts" },
  },
  "purchasing-guided-sourcing-flow": {
    guideSummary:
      "Guided Sourcing Flow is a wizard-style path from “we need to buy X” to a drafted PO, with fewer dead ends than jumping between requisitions, supplier master, and PO screens. Ideal for new buyers, regulated categories, or when leadership wants a standard script.",
    guideSteps: [
      "Step 1: Define what, how much, and when—attach specifications if the SKU is new.",
      "Step 2: Supplier selection—use approved vendor lists; record why an alternate was chosen if policy asks.",
      "Step 3: Commercial terms—price, incoterms, payment, and delivery window.",
      "Step 4: Generate PO draft; review taxes and ship-to warehouse.",
      "Step 5: Route for approval or send to supplier per delegation of authority.",
      "After completion, monitor GRN and invoice match just like any other PO.",
    ],
    guideTips: [
      "Use this when onboarding buyers or standardising how teams raise procurement.",
      "If the flow feels rigid, your admin can tune steps—ask before bypassing with informal POs.",
    ],
    recommendedNextStep: { label: "Goods receipt (GRN)", href: "/inventory/receipts" },
  },
  "purchasing-grn": {
    guideSummary:
      "This nav entry opens the same goods receipt world as Inventory Receipts—emphasising the purchasing story (PO compliance, supplier performance). Use whichever entry matches your role; the documents are shared.",
    guideSteps: [
      "Always start from an open PO when possible so ordered vs received stays comparable.",
      "Record partial receipts honestly—supplier scorecards depend on it.",
      "Match unit of measure (weight vs piece) to PO lines to avoid silent conversion errors.",
      "Post in receiving hours so planners see accurate available stock.",
      "Feed issues back to buyers when lead times or quality slip.",
    ],
    guideTips: [
      "Three-way match lives or dies on clean GRN timestamps and quantities.",
    ],
    recommendedNextStep: { label: "Supplier invoices", href: "/ap/bills" },
  },
  "purchasing-suppliers": {
    guideSummary:
      "Suppliers under Purchasing is the procurement-centric view of vendor master: payment terms, lead times, categories, and performance. Finance may overlap with AP supplier records—keep identifiers aligned.",
    guideSteps: [
      "Onboard new suppliers with bank, tax, and compliance checks per policy.",
      "Maintain lead time and MOQ so MRP and buyers plan realistically.",
      "Track open PO and GRN performance (on-time, quality) if your deployment surfaces scorecards.",
      "Deactivate suppliers you no longer use; retain history for audit.",
      "Coordinate dual sourcing when risk management requires alternate vendors.",
    ],
    guideTips: [
      "Supplier portals can reduce email PO chaos—ask if your integration is active.",
    ],
    recommendedNextStep: { label: "Purchase orders", href: "/purchasing/orders" },
  },
  "purchasing-supplier-invoices": {
    guideSummary:
      "Supplier Invoices routes you to AP bills: recording what suppliers charge you. Procurement cares about three-way match; finance cares about correct period, tax, and cash timing.",
    guideSteps: [
      "Match invoice lines to PO and GRN before post when controls require it.",
      "Capture invoice date vs goods received date—accruals may differ.",
      "Handle currency and FX per treasury policy.",
      "Route exceptions (price mismatch, missing GRN) to buyers before payment.",
      "Post to create payable; Treasury pays on payment run.",
    ],
    guideTips: [
      "Duplicate supplier invoice entry is a common fraud vector—enforce reference numbers.",
    ],
    recommendedNextStep: { label: "AP payments", href: "/ap/payments" },
  },
  "purchasing-returns": {
    guideSummary:
      "Purchase Returns covers sending goods back to suppliers and the related debit notes. Inventory must decrease, payables may reduce, and logistics must pick up or destroy stock per supplier instructions.",
    guideSteps: [
      "Create from PO or GRN context when possible.",
      "Coordinate pickup or RMA number with the supplier.",
      "Post only when goods have left your control or scrap is authorised.",
      "Expect a supplier credit note to mirror your debit note in their system.",
      "Analyse return reasons for quality programmes.",
    ],
    guideTips: [
      "Do not mix purchase returns with informal supplier credits recorded only in email.",
    ],
    recommendedNextStep: { label: "Purchase orders", href: "/purchasing/orders" },
  },
  "purchasing-cash-weight-audit": {
    guideSummary:
      "Cash-to-Weight Audit is specialised for commodities bought by weight (food, metals): compare cash paid or committed to weight received, flag shrinkage, moisture loss, or fraud. Operations and finance should review variances together.",
    guideSteps: [
      "Select POs or date windows with high materiality.",
      "Compare ordered weight, GRN weight, and invoice weight.",
      "Investigate tolerance bands—some variance is contractual.",
      "Document adjustments with approvals; post through proper inventory or P&L accounts.",
      "Feed systemic issues back to suppliers or receiving SOPs.",
      "Run before month-end when these categories move the P&L.",
    ],
    guideTips: [
      "Pair with landed cost if freight and duty are significant on the same lots.",
    ],
    recommendedNextStep: { label: "Procurement review", href: "/finance/procurement-review" },
  },
  // Pricing
  "pricing-overview": {
    guideSummary:
      "Pricing Overview is the commercial control tower for list prices, discounts, and conditional rules. It connects product master to what customers actually pay—errors here flow straight into margin, disputes, and audit. Use it with Sales (quotes/orders) and Analytics (pricing intelligence) when tuning strategy.",
    guideSteps: [
      "Understand your pricing stack: base list → customer/channel assignment → rules (promos, tiers, bundles) → manual overrides on documents.",
      "From the overview, jump to Price Lists for “what is the list price” and Pricing Rules for “when does it change”.",
      "Align effective dates with campaigns and contracts; overlapping windows need explicit priority rules.",
      "Assign price lists to customers, segments, or regions—avoid one-off list duplication when a rule would scale.",
      "Review margin after tax and freight when prices change; list price alone does not equal pocket price.",
      "Coordinate with finance on VAT/WHT treatment when list prices are tax-inclusive vs exclusive.",
      "After major changes, smoke-test a quote and a sales order for a sample customer in each segment.",
    ],
    guideTips: [
      "Document who may override price on orders—segregation of duties matters for discount fraud.",
    ],
    recommendedNextStep: { label: "Price lists", href: "/pricing/price-lists" },
  },
  "pricing-price-lists": {
    guideSummary:
      "Price Lists are structured tables of product prices (often by customer group, channel, or region) with effective dates and currencies. They are the first line of defence against ad-hoc discounting: sales pulls from lists, exceptions get flagged.",
    guideSteps: [
      "Create a list with a clear name (e.g. “Modern trade KES 2025 Q2”) and owning team.",
      "Add lines: SKU, UOM, unit price, currency, valid-from/valid-to; import CSV for large catalogs.",
      "Attach the list to customers or segments; set a default list per channel if your model uses channels.",
      "Handle supersession: new list rows should replace old ones cleanly without orphan effective dates.",
      "Version control: export before bulk change; keep approval evidence for large price moves.",
      "Validate against cost: negative margin may be intentional (loss leader) but should be visible before publish.",
    ],
    guideTips: [
      "Keep list rows sparse—use rules for promos instead of cloning lists per campaign.",
    ],
    recommendedNextStep: { label: "Pricing rules", href: "/pricing/rules" },
  },
  "pricing-rules": {
    guideSummary:
      "Pricing Rules encode logic: quantity breaks, customer groups, product categories, bundles, and promotional windows. They layer on top of price lists; priority and exclusivity matter when multiple rules could apply to one line.",
    guideSteps: [
      "Define the trigger (who/what/when): customer, product, category, min qty, date range.",
      "Define the effect: percentage off, fixed price, fixed discount, or override list.",
      "Set priority and stacking policy: which rule wins when two match; can they combine or not.",
      "Test with sample carts: edge cases include min qty+1, mixed categories in one order, and tax rounding.",
      "Govern who creates rules; marketing may own promos, finance may own floor price enforcement.",
      "Retire expired rules so reporting does not attribute margin to dead campaigns.",
    ],
    guideTips: [
      "Complexity is debt—fewer, well-documented rules beat dozens of overlapping micro-discounts.",
    ],
    recommendedNextStep: { label: "Sales quotes", href: "/sales/quotes" },
  },
  // Treasury
  "treasury-overview": {
    guideSummary:
      "Treasury Overview shows cash position, pending payments, and collections. Use it to see liquidity and open payment runs or bank accounts.",
    guideSteps: [
      "Review balances and pending items.",
      "Open Payment runs or Bank accounts as needed.",
    ],
  },
  "treasury-payment-runs": {
    guideSummary:
      "Payment runs let you batch payables and generate bank files or cheques. Create a run, select bills, and export or post payments.",
    guideSteps: [
      "Create a new payment run and select bank account and date.",
      "Add bills to pay and generate the bank file or payment list.",
      "Post the run to update AP and bank balance.",
    ],
  },
  "treasury-collections": {
    guideSummary:
      "Collections lists receivables and helps you track and record customer payments. Prioritize by overdue or amount and post receipts.",
    guideSteps: [
      "Filter by customer or overdue status.",
      "Open an invoice to apply payment or create a receipt.",
    ],
  },
  "treasury-bank-accounts": {
    guideSummary:
      "Bank accounts lists your company bank accounts and their GL mapping. Set up accounts here so payments and receipts post to the right ledger account.",
    guideSteps: [
      "Create a bank account and link to a GL account.",
      "Use the account in payment runs and when posting receipts.",
    ],
  },
  "treasury-cashflow": {
    guideSummary:
      "Cashflow shows forecasted and actual cash flow. Use it to see expected inflows and outflows and drill to source documents.",
    guideSteps: [
      "Select date range and view forecast vs actual.",
      "Drill into a line to see linked invoices or payments.",
    ],
  },
  "finance-bank-recon": {
    guideSummary:
      "Bank Reconciliation matches bank statement lines to system payments and receipts. Reconcile to keep your cash ledger in sync with the bank.",
    guideSteps: [
      "Import or enter statement lines.",
      "Match lines to payments/receipts; post reconciliation.",
    ],
  },
  // Assets
  "assets-overview": {
    guideSummary:
      "Assets Overview shows fixed assets summary and links to the register, depreciation, and disposals. Use it to see total cost and book value.",
    guideSteps: [
      "Open Asset register to add or edit assets.",
      "Open Depreciation to run periodic depreciation.",
    ],
  },
  "assets-register": {
    guideSummary:
      "Asset register lists all fixed assets with cost, depreciation method, and book value. Add new assets and link to vendor or invoice if applicable.",
    guideSteps: [
      "Create an asset and set cost, method, and useful life.",
      "Run depreciation from the Depreciation page periodically.",
    ],
  },
  "assets-depreciation": {
    guideSummary:
      "Depreciation runs periodic depreciation for fixed assets. Run for a period to post depreciation expense and update accumulated depreciation.",
    guideSteps: [
      "Select period and run depreciation.",
      "Review the journal and post to the ledger.",
    ],
  },
  "assets-disposals": {
    guideSummary:
      "Disposals records the sale or disposal of fixed assets. Post a disposal to remove the asset and record gain or loss.",
    guideSteps: [
      "Create a disposal and select the asset and disposal value.",
      "Post to update the register and post gain/loss to the ledger.",
    ],
  },
  // Manufacturing
  "manufacturing-boms": {
    guideSummary:
      "Bills of Material (BOMs) define the recipe for a finished good: components, quantities, scrap/yield assumptions, and sometimes alternate materials. BOM accuracy drives MRP, costing, and work order material issues—treat changes as engineering change control when regulated or customer-specific.",
    guideSteps: [
      "Create or revise a BOM for the finished SKU; version or effective dates if your process tracks revisions.",
      "Add component lines with quantities per base unit of output; include scrap factors if yield is not 100%.",
      "Link phantom vs stocked subassemblies per your modelling approach (flatten vs multi-level BOM).",
      "Validate UOM conversions—errors multiply across MRP and shop floor.",
      "Align with routing: some orgs attach components per operation; ensure consistency.",
      "Freeze BOMs during active production runs when change control requires it.",
      "Feed changes to costing and open work orders per policy (cut-over date vs immediate).",
    ],
    guideTips: [
      "Where mass balance matters (food, chemicals), pair BOM review with Yield / Mass balance analytics.",
    ],
    recommendedNextStep: { label: "Routing", href: "/manufacturing/routing" },
  },
  "manufacturing-routing": {
    guideSummary:
      "Routing defines operations, work centers, sequence, and standard times for making a product. It feeds capacity planning, labour or machine rates, and lead-time offsets. Without routing, MRP may suggest correct materials but impossible schedules.",
    guideSteps: [
      "Define work centers (machines, lines, cells) and calendars.",
      "Build operation sequence: setup, run, queue, move; attach standard minutes or rates.",
      "Link routing to BOM or item; maintain alternate routings if you can produce the same SKU on different lines.",
      "Update when process improvements change cycle times—stale routings distort capacity promises.",
      "Coordinate subcontract steps: some routings hand off to external operations explicitly.",
      "Use routings in costing when burden is absorbed by operation.",
    ],
    guideTips: [
      "Keep operation codes consistent with shop-floor reporting for variance analysis.",
    ],
    recommendedNextStep: { label: "Work orders", href: "/manufacturing/work-orders" },
  },
  "manufacturing-work-orders": {
    guideSummary:
      "Work Orders (WO) release planned production: what to make, how much, when, and from which BOM/routing. Issuing components reduces raw stock; receiving finished goods increases FG stock; variances surface scrap, usage, or labour differences.",
    guideSteps: [
      "Create WO from demand (sales, forecast) or manually; confirm quantity and date.",
      "Release to floor: pick/issue materials per BOM; handle substitutions only through controlled alternates.",
      "Record completions (good qty, scrap, rework) per operation if tracked.",
      "Post receipt of finished goods into inventory; backflush components if your model uses it.",
      "Close WO when fully reported; investigate open WOs at period end—they hide WIP and cost.",
      "Tie to quality holds: do not receive into sellable stock until QC passes if applicable.",
    ],
    guideTips: [
      "Partial completions are normal—track remaining qty and reason codes for scrap.",
    ],
    recommendedNextStep: { label: "MRP", href: "/manufacturing/mrp" },
  },
  "manufacturing-mrp": {
    guideSummary:
      "MRP explodes demand (orders, forecasts, safety stock) through BOMs, nets against on-hand and on-order, and suggests purchase orders and work orders. It is not magic—it reflects master data quality: lead times, MOQs, scrap, and calendar capacity.",
    guideSteps: [
      "Confirm inputs: demand horizon, forecast vs actual orders, and planning parameters per SKU.",
      "Run MRP for a bucket (e.g. weekly); review exceptions (shortages, past-due, excess).",
      "Convert suggestions to firm POs/WOs with human judgement—MRP is a planner’s assistant.",
      "Resolve data issues first: missing BOM lines, zero lead times, or wrong suppliers waste planner time.",
      "Align with purchasing on supplier calendars and with production on capacity.",
      "Archive run results for S&OP reviews when leadership asks “why did we buy this”.",
    ],
    guideTips: [
      "Frozen schedules: lock periods where shop floor cannot absorb last-minute MRP churn.",
    ],
    recommendedNextStep: { label: "Purchase orders", href: "/purchasing/orders" },
  },
  "manufacturing-subcontracting": {
    guideSummary:
      "Subcontracting (job work) sends materials to an external processor and receives semi-finished or finished goods back. Inventory, cost, and lead time must reflect the hand-off—treat the subcontractor like a special warehouse or vendor site depending on your model.",
    guideSteps: [
      "Create subcontract orders with scope: operation, expected yield, return date, and pricing.",
      "Issue materials to the subcontractor; track in-transit or dedicated location if used.",
      "Receive finished/semi-finished output; post GRN-like receipt with quantity and quality status.",
      "Invoice or accrue subcontract charges per contract; align with GRN for three-way style control where used.",
      "Handle rejections and rework loops explicitly—do not silently adjust stock.",
    ],
    guideTips: [
      "Landed cost may include subcontract fees—coordinate with finance on allocation to FG.",
    ],
    recommendedNextStep: { label: "Work orders", href: "/manufacturing/work-orders" },
  },
  "manufacturing-yield": {
    guideSummary:
      "Yield / Mass balance measures input vs output in production or conversion processes—critical for food, chemicals, and any SKU where weight drives procurement and margin. It supports regulatory traceability and fraud detection when paired with procurement audit.",
    guideSteps: [
      "Define standard yield per BOM or process step.",
      "Capture actual input weight/output weight from production or lab data.",
      "Compare actual vs standard; investigate systematic drift (moisture, spillage, theft).",
      "Post adjustments through controlled documents; tie to period close when material.",
      "Feed insights back to BOM scrap factors and supplier specs.",
      "Use with Cash-to-Weight Audit when procurement is weight-based.",
    ],
    guideTips: [
      "Treat unexplained shrink as operations + finance joint review, not only warehouse.",
    ],
    recommendedNextStep: { label: "Byproducts", href: "/manufacturing/byproducts" },
  },
  "manufacturing-byproducts": {
    guideSummary:
      "Byproducts are valuable secondary outputs from a process (e.g. trim, co-products). They need receipt into stock and often their own valuation method. Mis-handling byproducts distorts FG cost and inventory.",
    guideSteps: [
      "Define byproduct lines on BOM or completion screen with expected split ratios.",
      "Receive byproduct quantities at work order completion alongside main output.",
      "Decide value treatment: net realisable value, standard cost, or allocation from main run—finance should document.",
      "Stock and sell byproducts explicitly; do not leave them as unposted floor stock.",
      "Review periodically for obsolete byproduct SKUs.",
    ],
    guideTips: [
      "Reverse BOM / process industries: ensure byproduct definitions match physical reality.",
    ],
    recommendedNextStep: { label: "Stock movements", href: "/inventory/movements" },
  },
  // Distribution
  "distribution-routes": {
    guideSummary:
      "Routes structure field sales and delivery: territories, stop sequences, and vehicle constraints. Good route master data improves trip planning, fuel cost, and on-time delivery; bad routes confuse drivers and inflate kilometres.",
    guideSteps: [
      "Define routes by geography, channel, or outlet cluster—match how your fleet actually runs.",
      "Assign customers or outlets to routes; handle splits when large accounts need multiple visit types.",
      "Maintain sequence order for optimisation or driver habit; re-sequence when road networks change.",
      "Align calendars (delivery days) with customer receiving windows.",
      "Deactivate routes you no longer serve; retain history for analytics.",
      "Feed routes into Trips and Collections for execution and cash tracking.",
    ],
    guideTips: [
      "Rebalance routes seasonally when demand shifts (e.g. holidays).",
    ],
    recommendedNextStep: { label: "Trips", href: "/distribution/trips" },
  },
  "distribution-deliveries": {
    guideSummary:
      "Distribution Deliveries focuses on outbound fulfilment in a route-centric model: loading, POD, and stock impact at the right warehouse. It may parallel Sales → Deliveries but emphasises van stock, multi-stop drops, and proof of delivery.",
    guideSteps: [
      "Plan loads against route and vehicle capacity (weight, volume, cold chain).",
      "Pick and stage against delivery documents; resolve shorts before departure.",
      "Capture POD (signature, photo, geo) when required for disputes or DSD audits.",
      "Post deliveries to reduce inventory and update order status; partial drops are common.",
      "Handle returns on the same vehicle when your process allows RMA pickup.",
      "Reconcile van stock nightly—variances often indicate mis-picks or unrecorded sales.",
    ],
    guideTips: [
      "Cold chain: temperature logs may be mandatory—align fields with compliance.",
    ],
    recommendedNextStep: { label: "Trips", href: "/distribution/trips" },
  },
  "distribution-trips": {
    guideSummary:
      "Trips / Logistics is the execution layer: a vehicle run on a day with ordered stops, status (planned, in progress, completed), and links to deliveries and collections. It is where planning meets reality—delays and exceptions should be visible.",
    guideSteps: [
      "Create a trip: date, driver, vehicle, route, and estimated start time.",
      "Add stops from open orders or scheduled visits; optimise sequence if tooling supports it.",
      "Update status as the trip progresses; capture delays and reasons for service improvement.",
      "Complete the trip: all deliveries posted, collections recorded, vehicle checked in.",
      "Investigate incomplete stops before closing—cash and stock risk hide here.",
      "Export trip KPIs (OTIF, km/stop) for fleet review.",
    ],
    guideTips: [
      "Integrations with GPS/telematics may auto-update status—validate mapping.",
    ],
    recommendedNextStep: { label: "Collections", href: "/distribution/collections" },
  },
  "distribution-transfer-planning": {
    guideSummary:
      "Transfer Planning bridges distribution and inventory: moving stock between branches or depots to position product before demand, not just reacting to stockouts. It supports network balancing and promotion pre-positioning.",
    guideSteps: [
      "Review source availability and destination need (forecast, min/max, promotion).",
      "Create transfer proposals or orders; respect lead time between sites.",
      "Coordinate with warehouse transfers for execution and in-transit tracking.",
      "Post when goods move; reconcile in-transit at period end.",
      "Measure transfer effectiveness: did the stock arrive before the stockout, or after?",
    ],
    guideTips: [
      "Avoid transfer spam—batch moves to reduce handling cost.",
    ],
    recommendedNextStep: { label: "Warehouse transfers", href: "/warehouse/transfers" },
  },
  "distribution-collections": {
    guideSummary:
      "Distribution Collections records cash or mobile money taken on route against invoices or customer accounts. It is high-risk for fraud and reconciliation—treat it with the same discipline as Treasury collections, plus route-level cash controls.",
    guideSteps: [
      "Select route, driver, or trip; work open AR for customers on the run.",
      "Record each collection with amount, method, and reference; link to invoice lines.",
      "Handle short pays and disputes with notes; escalate credit blocks.",
      "Deposit or hand in cash per policy; reconcile driver wallet daily.",
      "Post to AR so aging updates; mismatches surface in bank or mobile money reconciliation.",
      "Audit sampling: compare route sheets to system postings.",
    ],
    guideTips: [
      "Never let collections sit “off-system” overnight without documented custody.",
    ],
    recommendedNextStep: { label: "Treasury collections", href: "/treasury/collections" },
  },
  // Franchise
  "franchise-outlet-workspace": {
    guideSummary:
      "Outlet Workspace is the lightweight view for franchisees. See orders, stock, and key tasks for your outlet.",
    guideSteps: ["View outlet-specific data.", "Create orders or requests as allowed.", "Use Copilot for help."],
  },
  "franchise-manage-outlets": {
    guideSummary:
      "Manage franchisees lets franchisors add and manage outlet accounts. Create a new franchisee with login and link them to the network.",
    guideSteps: ["Click Add franchisee and enter name, code, and admin email.", "Set a temporary password and share with the franchisee.", "They sign in and access their outlet workspace."],
  },
  "franchise-overview": {
    guideSummary:
      "Franchise Overview shows network-level KPIs and activity across outlets. Use it to monitor performance and exceptions.",
    guideSteps: ["Review KPIs and outlet list.", "Drill into an outlet or metric as needed."],
  },
  "franchise-commission": {
    guideSummary:
      "Commission & Rebates defines and calculates commission or rebate rules for franchisees. Run commission runs and settle.",
    guideSteps: ["Set up commission rules.", "Run commission for a period.", "Review and post settlement."],
  },
  "franchise-vmi": {
    guideSummary:
      "VMI & Replenishment manages vendor-managed or automatic replenishment for outlets. Create replenishment orders from stock levels or min/max.",
    guideSteps: ["Review replenishment suggestions.", "Create orders for outlets.", "Track fulfillment."],
  },
  "franchise-comparison": {
    guideSummary:
      "Franchise Comparison compares outlets by sales, margin, or other metrics. Use it for performance review and benchmarking.",
    guideSteps: ["Select metrics and date range.", "Compare outlets in table or chart.", "Export if needed."],
  },
  // Retail
  "retail-replenishment": {
    guideSummary:
      "Replenishment suggests or creates replenishment orders for stores. Use min/max or demand to calculate what to send.",
    guideSteps: ["Review suggested replenishment.", "Create orders and send to stores."],
  },
  "retail-promotions": {
    guideSummary:
      "Promotions defines and tracks promotions (discounts, bundles). Apply to products or customers and track uplift.",
    guideSteps: ["Create a promotion and set rules.", "Apply to products or channels.", "Track redemptions and margin."],
  },
  "retail-store-performance": {
    guideSummary:
      "Store Performance shows metrics per store: sales, margin, traffic. Use it to compare stores and identify top or underperforming locations.",
    guideSteps: ["Select period and metrics.", "View by store; drill into details.", "Export for reporting."],
  },
  // Projects
  "projects-overview": {
    guideSummary:
      "Projects Overview shows all projects and their status, budget, and burn. Use it to see portfolio and drill into a project.",
    guideSteps: ["Open a project to see details and costing.", "Track timesheets and documents linked to the project."],
  },
  "projects-list": {
    guideSummary:
      "Projects lists all projects with budget, burn, and status. Create projects, assign cost centers, and link timesheets and documents.",
    guideSteps: ["Create a project and set budget.", "Link timesheets and documents to the project.", "Review burn vs budget."],
  },
  timesheets: {
    guideSummary:
      "Timesheets record time spent on projects or tasks. Enter hours and post to update project cost and payroll.",
    guideSteps: ["Enter time per project or task.", "Submit for approval if required.", "Post to update project and payroll."],
  },
  // Payroll
  "payroll-overview": {
    guideSummary:
      "Payroll Overview shows payroll summary and links to employees, pay runs, and statutories. Use it to start a pay run or check status.",
    guideSteps: ["Open Employees or Pay runs from the overview.", "Run pay for a period and post.", "Review statutories (NSSF, NHIF, PAYE)."],
  },
  "payroll-employees": {
    guideSummary:
      "Employees lists all employees with department, salary, and tax info. Add or edit employees and set up statutory deductions.",
    guideSteps: ["Create an employee and set salary and tax details.", "Assign to a branch or department.", "Use in pay runs."],
  },
  "payroll-payruns": {
    guideSummary:
      "Pay runs process payroll for a period. Create a run, calculate gross and deductions, then post to create payslips and ledger entries.",
    guideSteps: ["Create a pay run for a month and branch.", "Review payslips and statutory totals.", "Post to generate payslips and GL."],
  },
  "payroll-payslips": {
    guideSummary:
      "Payslips lists generated payslips. View or print payslips for employees after a pay run is posted.",
    guideSteps: ["Filter by pay run or employee.", "Open a payslip to view or print."],
  },
  "payroll-statutories": {
    guideSummary:
      "Statutories shows NSSF, NHIF, PAYE and other statutory settings and amounts. Configure rates and view liability per period.",
    guideSteps: ["Review statutory config and rates.", "See liability per pay run or period.", "Export for filing if needed."],
  },
  // Intercompany
  "intercompany-overview": {
    guideSummary:
      "Intercompany Overview explains how group entities trade and how consolidation and elimination work. Use it to understand IC balances and rules.",
    guideSteps: ["Review entity mapping and rules.", "Open IC Transactions to see or post entries."],
  },
  "intercompany-transactions": {
    guideSummary:
      "IC Transactions lists intercompany invoices and journal entries. Post and reconcile IC balances between entities.",
    guideSteps: ["Create IC invoice or journal.", "Match and reconcile with the other entity.", "Post elimination entries for consolidation."],
  },
  // Finance (main items)
  "finance-dashboard": {
    guideSummary:
      "Finance Dashboard shows key financial KPIs and links to GL, AR, AP, and reports. Use it as the starting point for finance tasks.",
    guideSteps: ["Review KPIs and open GL, AR, or AP as needed.", "Run reports or period close from the links."],
  },
  "finance-gl": {
    guideSummary:
      "General Ledger is the central ledger. View balances and transactions by account; drill to source documents.",
    guideSteps: ["Filter by account, period, or branch.", "Drill into a line to see the source document."],
  },
  "finance-chart-of-accounts": {
    guideSummary:
      "Chart of Accounts lists GL accounts. Use it to view the account structure; create or edit accounts in Settings if allowed.",
    guideSteps: ["Browse the tree or list.", "Open an account to see balance and transactions."],
  },
  "finance-journals": {
    guideSummary:
      "Journal Entries lists manual journal entries. Create and post journals for adjustments or allocations.",
    guideSteps: ["Create a journal and add lines.", "Post to update the ledger."],
  },
  "finance-ar": {
    guideSummary:
      "Accounts Receivable shows customer balances and open invoices. Post receipts and track ageing.",
    guideSteps: ["Filter by customer or ageing.", "Open an invoice to apply payment or create a receipt."],
  },
  "ar-customers": {
    guideSummary:
      "AR Customers lists customers with receivable balances. Open a customer to see invoices and payment history.",
    guideSteps: ["Search or filter to find a customer.", "Open to view balance and documents."],
  },
  "ar-payments": {
    guideSummary:
      "AR Payments lists receipts and payments applied to receivables. Create a receipt to record customer payment.",
    guideSteps: ["Create a receipt and select customer and invoices.", "Post to update AR and bank."],
  },
  "finance-ap": {
    guideSummary:
      "Accounts Payable shows supplier balances and open bills. Pay bills via payment runs and track ageing.",
    guideSteps: ["Filter by supplier or ageing.", "Open a bill to pay or match to PO/GRN."],
  },
  "ap-suppliers": {
    guideSummary:
      "AP Suppliers lists suppliers with payable balances. Open a supplier to see bills and payment history.",
    guideSteps: ["Search or filter to find a supplier.", "Open to view balance and documents."],
  },
  "ap-bills": {
    guideSummary:
      "AP Bills lists supplier bills. Match to PO and GRN, then post and pay via payment run.",
    guideSteps: ["Create or import a bill; link to PO/GRN.", "Post the bill.", "Add to a payment run when paying."],
  },
  "ap-payments": {
    guideSummary:
      "AP Payments lists payments to suppliers. Payments are created from payment runs; view history and status here.",
    guideSteps: ["Filter by supplier or date.", "Open a payment to see details or linked bills."],
  },
  "ap-three-way-match": {
    guideSummary:
      "3-way match reconciles PO, GRN, and supplier invoice. Resolve variances and post the invoice when quantities and prices match.",
    guideSteps: ["Select a bill and view PO/GRN match.", "Resolve quantity or price variances.", "Post when match is accepted."],
  },
  "finance-payments": {
    guideSummary:
      "Payments & Receipts lists all payments and receipts. Use it to see cash movements and link to bank or ledger.",
    guideSteps: ["Filter by type (payment/receipt), account, or date.", "Open a line to see details."],
  },
  "finance-tax": {
    guideSummary:
      "Tax / VAT shows tax configuration and summary. View input vs output VAT and run tax reports.",
    guideSteps: ["Review tax setup and rates.", "Run VAT or WHT reports as needed."],
  },
  "finance-statements": {
    guideSummary:
      "Financial Statements includes P&L, Balance Sheet, and Cash Flow. Run statements for a period and compare to budget if configured.",
    guideSteps: ["Select period and statement type.", "Run and view or export.", "Drill into a line for detail."],
  },
  "finance-statements-pnl": {
    guideSummary:
      "Profit & Loss (P&L) shows revenue, cost, and profit for a period. Run for management reporting and variance analysis.",
    guideSteps: ["Select period and run P&L.", "Drill into a line for transaction detail.", "Compare to budget if configured."],
  },
  "finance-statements-balance-sheet": {
    guideSummary:
      "Balance Sheet shows assets, liabilities, and equity at a point in time. Run for period-end reporting.",
    guideSteps: ["Select period end date and run.", "Drill into account lines for detail.", "Export for auditors or filing."],
  },
  "finance-statements-cash-flow": {
    guideSummary:
      "Cash Flow Statement shows cash movements from operating, investing, and financing activities. Run for liquidity analysis.",
    guideSteps: ["Select period and run cash flow.", "Review operating vs investing vs financing.", "Drill into lines for source transactions."],
  },
  "finance-budgets": {
    guideSummary:
      "Budgets define planned revenue and expenses by account or dimension. Use for variance analysis and forecasting.",
    guideSteps: ["Create a budget and set period and accounts.", "Enter or import budget amounts.", "Compare actual vs budget in reports."],
  },
  "finance-period-close": {
    guideSummary:
      "Period Close locks a period so no more postings can be made. Run close after all entries are posted and reconciled.",
    guideSteps: ["Review open items and reconciliations.", "Run period close for the month.", "Reopen only if you need to correct."],
  },
  "finance-ledger": {
    guideSummary:
      "Ledger shows the full transaction list for the general ledger. Filter by account, period, or document type.",
    guideSteps: ["Set filters and view transactions.", "Drill into a line to see the source document."],
  },
  "finance-audit": {
    guideSummary:
      "Audit Log shows a trail of changes or postings. Use it for compliance and to trace who did what and when.",
    guideSteps: ["Filter by date, user, or entity.", "Export for auditors if needed."],
  },
  // CRM
  "crm-accounts": {
    guideSummary:
      "CRM Accounts are your customer and partner records in one place. Use this page to view and manage relationships, contact details, and link to activities and deals. Accounts here align with Masters > Parties and Finance > AR Customers; add or edit customers from those pages and they appear here.",
    guideSteps: [
      "Add customers or partners from Masters > Parties or Finance > AR Customers (for credit and payment terms).",
      "Use this list to search and open an account to see contact info, activities, and linked deals.",
      "Open an account to add activities (calls, notes) or link deals and opportunities.",
    ],
  },
  "crm-activities": {
    guideSummary:
      "Activities are calls, meetings, emails, and notes logged against accounts or deals. Use this to keep a history of customer interactions and follow-ups.",
    guideSteps: ["Create an activity and link it to an account or deal.", "Filter by type (call, meeting, note) or date.", "Open an account in CRM to see its activity timeline."],
  },
  "crm-deals": {
    guideSummary:
      "Deals (opportunities) track potential sales from lead to close. Set value and stage; move to Won or Lost when the opportunity is resolved.",
    guideSteps: ["Create a deal and set value and stage.", "Update stage as the opportunity progresses.", "Close as Won or Lost to reflect the outcome."],
  },
  "crm-tickets": {
    guideSummary:
      "Support tickets let you track customer issues and requests. Create tickets, assign to users, and update status until resolved.",
    guideSteps: ["Create a ticket and assign to a user or team.", "Update status and add notes as you work on it.", "Close when the issue is resolved."],
  },
  // Reports
  "reports-library": {
    guideSummary:
      "Report Library lists available reports. Run a report for a period or filter and view or export the result.",
    guideSteps: ["Select a report and set parameters.", "Run and view or export (PDF/Excel)."],
  },
  "reports-saved": {
    guideSummary:
      "Saved Views stores your saved report configurations. Open a saved view to run the report with stored filters.",
    guideSteps: ["Save a view from a report after setting filters.", "Open a saved view to run it again."],
  },
  "reports-scheduled": {
    guideSummary:
      "Scheduled Reports run automatically and can be emailed. Set a schedule and recipients for key reports.",
    guideSteps: ["Create a schedule and select report and parameters.", "Set frequency and email recipients.", "Review run history."],
  },
  "reports-exports": {
    guideSummary:
      "Exports lists export jobs or files. Download past exports or create a new export.",
    guideSteps: ["Filter by report or date.", "Download an export file."],
  },
  "reports-vat": {
    guideSummary:
      "VAT Summary shows input and output VAT for a period. Use it for VAT returns and reconciliation.",
    guideSteps: ["Select period and run.", "Review by account or category.", "Export for filing."],
  },
  "reports-wht": {
    guideSummary:
      "WHT Summary shows withholding tax for a period. Use it for WHT returns and reconciliation.",
    guideSteps: ["Select period and run.", "Review by supplier or type.", "Export for filing."],
  },
  // Analytics
  "analytics-hub": {
    guideSummary:
      "Analytics Studio is the main analytics entry. Explore data, view insights, or open product, finance, or other analytics.",
    guideSteps: ["Open Explore or a specific analytics module.", "Apply filters and view charts or tables.", "Ask Copilot to explain a metric."],
  },
  "analytics-explore": {
    guideSummary:
      "Explore lets you query and visualize data. Select dimensions and metrics and build ad-hoc views.",
    guideSteps: ["Select data source and fields.", "Add filters and run.", "Save or export the view."],
  },
  "analytics-insights": {
    guideSummary:
      "Insights shows AI or rule-based insights: anomalies, suggestions, or trends. Use it to spot issues or opportunities.",
    guideSteps: ["Review insight cards and severity.", "Drill into an insight for detail.", "Act on suggestions if relevant."],
  },
  "analytics-anomalies": {
    guideSummary:
      "Anomalies highlights unusual patterns in data (e.g. margin drop, volume spike). Review and investigate or dismiss.",
    guideSteps: ["Review the anomaly list and severity.", "Open one to see detail and cause.", "Dismiss or create a follow-up."],
  },
  "analytics-simulations": {
    guideSummary:
      "Simulations let you model what-if scenarios (e.g. price change, volume). Run a simulation and compare to baseline.",
    guideSteps: ["Set parameters (e.g. new price).", "Run simulation and view impact.", "Apply or discard."],
  },
  "analytics-products": {
    guideSummary:
      "Products analytics shows product performance: margin, volume, growth. Use it for assortment and pricing decisions.",
    guideSteps: ["Select period and metrics.", "Filter by category or channel.", "Export or drill into a product."],
  },
  "analytics-pricing": {
    guideSummary:
      "Pricing analytics shows price and discount impact. Compare list vs actual and margin by segment.",
    guideSteps: ["Select segment and period.", "View price and margin charts.", "Use for pricing decisions."],
  },
  "analytics-inventory": {
    guideSummary:
      "Inventory analytics shows stock levels, turnover, and slow-moving or excess stock. Use it for replenishment and write-offs.",
    guideSteps: ["Select warehouse or category.", "View turnover and ageing.", "Act on recommendations."],
  },
  "analytics-finance": {
    guideSummary:
      "Finance analytics shows revenue, cost, and margin trends. Use it for management reporting and variance analysis.",
    guideSteps: ["Select period and breakdown (e.g. by branch).", "View trends and compare to budget."],
  },
  "analytics-payroll": {
    guideSummary:
      "Payroll analytics shows payroll cost and headcount trends. Use it for labour cost analysis.",
    guideSteps: ["Select period and dimension.", "View cost and headcount charts."],
  },
  "analytics-settings": {
    guideSummary:
      "Analytics settings configures data sources, metrics, or thresholds for insights and anomalies.",
    guideSteps: ["Configure data sources or metrics.", "Set thresholds for alerts or anomalies."],
  },
  // Automation
  "automation-dashboard": {
    guideSummary:
      "Automation Dashboard shows automation status and recent runs. Open rules, workflows, or the work queue from here.",
    guideSteps: ["Review status and open Rules or Workflows.", "Check work queue for pending tasks."],
  },
  "automation-rules": {
    guideSummary:
      "Rules Engine lets you define triggers, conditions, and actions. When a trigger fires and conditions match, the action runs (e.g. create task, send alert).",
    guideSteps: ["Create a rule and set trigger (e.g. document posted).", "Add conditions and action.", "Enable and test."],
  },
  "automation-alerts": {
    guideSummary:
      "Alerts & Notifications lists configured alerts and notification history. Set up alerts for thresholds or events.",
    guideSteps: ["Create an alert and set condition.", "Choose recipients and channel.", "Review history."],
  },
  "automation-schedules": {
    guideSummary:
      "Scheduled Jobs lists jobs that run on a schedule (e.g. nightly report, MRP). View history and enable or disable.",
    guideSteps: ["Create or edit a schedule.", "Set cron or frequency and job.", "Monitor run history."],
  },
  "automation-workflows": {
    guideSummary:
      "Approvals Workflows defines approval chains for documents. Set who approves what and in what order.",
    guideSteps: ["Create a workflow and add steps.", "Assign approvers per step.", "Link to document types."],
  },
  "automation-integrations": {
    guideSummary:
      "Integrations connects the ERP to external systems (e.g. WhatsApp, accounting). Configure and monitor connectors.",
    guideSteps: ["Select an integration and configure credentials.", "Test connection and map fields.", "Monitor sync or events."],
  },
  "automation-ai-insights": {
    guideSummary:
      "AI Insights uses AI to suggest actions or explain data. Review suggestions and apply or dismiss.",
    guideSteps: ["Review insight cards.", "Apply a suggestion or ask for more detail.", "Feedback improves future insights."],
  },
  "work-queue": {
    guideSummary:
      "Work queue lists tasks assigned to you from rules or workflows. Complete or reassign tasks to clear the queue.",
    guideSteps: ["Open a task to see details and linked record.", "Complete or reject and add a note.", "Filter by type or due date."],
  },
  // Settings (main items)
  "settings-org": {
    guideSummary:
      "Organization Profile holds company name, address, and legal details. Update when your company info changes.",
    guideSteps: ["Edit name, address, and registration details.", "Save to update across the system."],
  },
  "settings-platform": {
    guideSummary:
      "Platform Control is for platform operators. Manage tenants, billing, and support. Not visible to normal customers.",
    guideSteps: ["Use only if you are a platform admin.", "Manage customers and view usage."],
  },
  "settings-billing": {
    guideSummary:
      "Billing shows your subscription, usage, and invoices. View plan and upgrade or manage payment method.",
    guideSteps: ["Review usage and current plan.", "Upgrade or change payment method if needed."],
  },
  "settings-entities": {
    guideSummary:
      "Entities defines legal entities or companies in a group. Use for multi-entity and intercompany setup.",
    guideSteps: ["Create entities and set currency and ledger.", "Map intercompany accounts."],
  },
  "settings-branches": {
    guideSummary:
      "Branches defines branches or locations. Each branch can have its own ledger, stock, or reporting.",
    guideSteps: ["Create a branch and set defaults.", "Assign users and data to the branch."],
  },
  "settings-users-roles": {
    guideSummary:
      "Users & Roles lists users and roles. Invite users, assign roles, and enable or disable access. Enable Copilot per user here.",
    guideSteps: ["Invite a user and set role.", "Edit permissions via role or user override.", "Enable Copilot for users who need it."],
  },
  "settings-sequences": {
    guideSummary:
      "Numbering Sequences defines how document numbers are generated (e.g. SO-001, INV-2025-001). Set prefix, length, and next number.",
    guideSteps: ["Create or edit a sequence per document type.", "Set prefix and next number.", "Assign to branch or org if needed."],
  },
  "settings-financial-currencies": {
    guideSummary:
      "Currencies defines your base and foreign currencies. Set exchange rates and use for multi-currency transactions.",
    guideSteps: ["Add currencies and set as base or foreign.", "Enter exchange rates for foreign currencies."],
  },
  "settings-financial-rates": {
    guideSummary:
      "Exchange rates stores historical and current rates for foreign currencies. Update rates for accurate FX valuation.",
    guideSteps: ["Create rate entries per currency and date.", "Use for revaluation and reporting."],
  },
  "settings-financial-coa": {
    guideSummary:
      "Chart of Accounts (under Financial) defines the account structure. Create or edit accounts for posting and reporting.",
    guideSteps: ["Create accounts with type and parent.", "Set posting rules and tax mapping."],
  },
  "settings-financial-taxes": {
    guideSummary:
      "Taxes (under Financial) configures tax rates and accounts. Set VAT, WHT, or other taxes and map to GL accounts.",
    guideSteps: ["Add or edit tax codes and rates.", "Map to GL accounts for posting."],
  },
  "settings-financial-fiscal": {
    guideSummary:
      "Fiscal years defines your accounting periods. Open and close periods; set year-end dates.",
    guideSteps: ["Create a fiscal year and periods.", "Open periods for posting; close when done."],
  },
  "settings-inventory-costing": {
    guideSummary:
      "Costing (under Inventory) sets the inventory costing method (e.g. average, FIFO) and parameters.",
    guideSteps: ["Select costing method.", "Set parameters and run costing if applicable."],
  },
  "settings-uom": {
    guideSummary:
      "UOM catalog defines units of measure and conversions. Use for products and transactions.",
    guideSteps: ["Create UOMs and base unit.", "Add conversions (e.g. 1 box = 12 ea)."],
  },
  "settings-products-pricing-rules": {
    guideSummary:
      "Pricing rules (under Products) configures product-level pricing rules, discount logic, and tiered pricing.",
    guideSteps: ["Create or edit pricing rules.", "Set conditions and price effects.", "Assign to products or channels."],
  },
  "settings-tax-kenya": {
    guideSummary:
      "Kenya tax profile configures Kenya-specific tax settings: KRA PIN, VAT, WHT, and filing preferences.",
    guideSteps: ["Enter KRA PIN and tax registration.", "Configure VAT and WHT rates.", "Set filing preferences."],
  },
  "settings-tax-vat": {
    guideSummary:
      "VAT settings configures VAT rates, accounts, and exemptions for Kenya or other jurisdictions.",
    guideSteps: ["Add VAT codes and rates.", "Map to GL accounts.", "Set exempt products or categories."],
  },
  "settings-tax-withholding": {
    guideSummary:
      "Withholding tax configures WHT rates and accounts for supplier payments and compliance.",
    guideSteps: ["Add WHT codes and rates.", "Map to GL accounts.", "Set applicability by supplier type."],
  },
  "settings-tax-mappings": {
    guideSummary:
      "Tax mappings links tax codes to GL accounts and document types for correct posting.",
    guideSteps: ["Map tax codes to input/output accounts.", "Set defaults per document type."],
  },
  "settings-preferences": {
    guideSummary:
      "Preferences stores user and org-level preferences: date format, currency display, notifications, and defaults.",
    guideSteps: ["Set date format and timezone.", "Configure notification preferences.", "Save to apply."],
  },
  "settings-compliance": {
    guideSummary:
      "Compliance configures regulatory and audit settings. Set retention, audit trails, and compliance flags.",
    guideSteps: ["Review compliance requirements.", "Enable audit trails or retention.", "Configure as needed."],
  },
  "settings-notifications": {
    guideSummary:
      "Notifications configures how and when users receive alerts: email, in-app, or external channels.",
    guideSteps: ["Set notification channels.", "Configure templates and triggers.", "Test delivery."],
  },
  "settings-migrations": {
    guideSummary:
      "Migration Console helps import data from legacy systems. Stage, validate, and load master and transaction data.",
    guideSteps: ["Upload or connect to source.", "Map fields and validate.", "Run migration and reconcile."],
  },
  "settings-payroll": {
    guideSummary:
      "Payroll settings configures pay periods, statutory rates (NSSF, NHIF, PAYE), and payroll defaults.",
    guideSteps: ["Set pay period and cut-off.", "Configure statutory rates.", "Map payroll accounts."],
  },
  "settings-audit-log": {
    guideSummary:
      "Audit Log (Settings) shows system-wide audit trail. Filter by user, entity, or action for compliance.",
    guideSteps: ["Filter by date, user, or action.", "Export for auditors.", "Review retention settings."],
  },
  "settings-customizer-modules": {
    guideSummary:
      "Customizer Modules enables or configures optional modules. Turn on features like manufacturing or franchise.",
    guideSteps: ["Enable or disable modules.", "Configure module-specific settings.", "Apply to org."],
  },
  "settings-customizer-fields": {
    guideSummary:
      "Custom Fields adds user-defined fields to products, parties, or documents. Extend the data model without code.",
    guideSteps: ["Create a custom field and set type.", "Assign to entity (product, party, etc.).", "Use in forms and reports."],
  },
  "settings-customizer-workflows": {
    guideSummary:
      "Customizer Workflows defines custom approval or business process flows. Extend standard workflows.",
    guideSteps: ["Create a workflow and add steps.", "Define conditions and actions.", "Link to document types."],
  },
  "settings-customizer-dashboards": {
    guideSummary:
      "Customizer Dashboards lets you build custom dashboards with widgets and KPIs. Personalize the control tower.",
    guideSteps: ["Add widgets and arrange layout.", "Set data source and filters.", "Save and share."],
  },
  // Help
  tutorial: {
    guideSummary:
      "The Tutorial helps you learn the ERP by module. Open a chapter to see all screens in that section, with links to each page and the option to ask Copilot about any topic.",
    guideSteps: [
      "Browse chapters and click Go to page to open a screen.",
      "Click Ask Copilot on a topic for an explanation.",
      "Use the Tutorial and Ask Copilot buttons on any page for in-context help.",
    ],
  },
};

/** Routes not in nav — consumed by getTutorialForRoute in tutorial.ts */
export interface OrphanGuidePayload {
  chapterId: string;
  chapterTitle: string;
  copilotPrompt: string;
  itemLabel: string;
  guideSummary: string;
  guideSteps: string[];
  guideTips?: string[];
  elementHints?: ElementHint[];
  hrefToChapter: string;
  recommendedNextStep?: { label: string; href: string };
}

export const ORPHAN_ROUTE_GUIDES: Record<string, OrphanGuidePayload> = {
  "/onboarding": {
    chapterId: "core",
    chapterTitle: "Core",
    copilotPrompt:
      "Walk me through the full setup checklist in order: what to configure first, what depends on what, and what ‘done’ looks like before my team uses the ERP in production.",
    itemLabel: "Setup / Onboarding",
    guideSummary:
      "The Setup page is your implementation checklist—not training content alone. Each item connects to real configuration: legal entity profile, functional currency and additional currencies, chart of accounts, tax codes, bank accounts for payments and receipts, user invites with roles, and optionally a first live document to prove end-to-end posting. Completing this in the right order avoids re-work (e.g. taxes before posting invoices, COA before journals).",
    guideSteps: [
      "Start with organisation profile and base currency—downstream documents assume these are correct.",
      "Configure chart of accounts and account types to match your auditor’s mapping; import templates if your deployment offers industry COA.",
      "Set up tax / VAT and withholding profiles before creating sales or purchase documents that post tax.",
      "Add bank accounts and link to GL cash or bank clearing accounts so treasury and reconciliation work.",
      "Invite users with least-privilege roles; add approvers for purchasing and finance workflows.",
      "Run a pilot transaction: e.g. product → PO → GRN → supplier invoice → payment, or SO → delivery → AR invoice—pick the path your go-live needs first.",
      "Use the Tutorial hub and Page Help on each module for deeper flows after the checklist is green.",
    ],
    guideTips: [
      "If an item stays red, fix dependencies first—often master data or permissions.",
    ],
    hrefToChapter: "/tutorial/core",
    recommendedNextStep: { label: "Documents", href: "/docs" },
  },
  "/inbox": {
    chapterId: "core",
    chapterTitle: "Core",
    copilotPrompt:
      "Compare this Inbox to Approvals Inbox: when do items appear here, how do notifications differ from approvals, and how do I clear my queue without missing risk?",
    itemLabel: "Inbox",
    guideSummary:
      "The global Inbox aggregates actionable approvals and system notifications so you do not hunt across modules. It complements (not replaces) Approvals Inbox: use this when your habit is ‘start from notifications’; use Approvals when you only care about sign-off queues. Clearing the inbox is part of daily hygiene—stale items often mean blocked colleagues or missed compliance.",
    guideSteps: [
      "Scan notifications for severity: payment failures, integration errors, or SLA breaches first.",
      "Switch to approvals tab when you need to sign documents; open the full document before approving material amounts.",
      "Acknowledge informational alerts so your team knows you saw them; snooze only if the product supports it and policy allows.",
      "Drill through to source records (orders, invoices, stock) when the summary is ambiguous.",
      "If volume is high, align with your admin on alert rules—noise hides real incidents.",
      "End state: zero blocking items you own, or explicit handover in your shift log.",
    ],
    guideTips: [
      "Pair with Tasks when work spans multiple systems—Inbox is signal, Tasks is execution.",
    ],
    hrefToChapter: "/tutorial/core",
    recommendedNextStep: { label: "Approvals Inbox", href: "/approvals/inbox" },
  },
  /** Alternate entry URLs (not primary nav hrefs) */
  "/purchasing/goods-receipt": {
    chapterId: "purchasing",
    chapterTitle: "Purchasing",
    copilotPrompt:
      "Explain goods receipt from this entry point: PO selection, quantities, batches, posting to stock, and what to do before the supplier invoice arrives.",
    itemLabel: "Goods receipt (shortcut)",
    guideSummary:
      "This shortcut lands in the same GRN business process as Document Center → GRN and Inventory → Receipts. Buyers and receivers use it when the mental model is ‘I am closing a purchase’ rather than ‘I am browsing documents’. The operational rules are identical: tie to PO, post truthfully, then support three-way match in AP.",
    guideSteps: [
      "Pull an open PO; avoid free-text GRNs without PO linkage unless policy allows spot buys.",
      "Confirm ship-to warehouse and receiving dock context.",
      "Enter quantities, lot/batch, and expiry where regulated; photograph damage if your SOP requires.",
      "Post to move stock; follow with putaway tasks if bins are used.",
      "Notify AP if price or quantity will differ from PO—provisional invoices need discipline.",
    ],
    guideTips: [
      "If you use landed cost, GRN timing may affect cost layers—ask finance when unsure.",
    ],
    hrefToChapter: "/tutorial/purchasing",
    recommendedNextStep: { label: "Receipts list", href: "/inventory/receipts" },
  },
  "/purchasing/supplier-invoices": {
    chapterId: "purchasing",
    chapterTitle: "Purchasing",
    copilotPrompt:
      "Explain supplier invoice entry: three-way match, tax, currency, approval, and handoff to payment runs.",
    itemLabel: "Supplier invoices (shortcut)",
    guideSummary:
      "This shortcut emphasises the procurement story for AP bills: prove what you owe against what you ordered and received before paying. Finance still owns cut-off and GL mapping—procurement owns supplier relationship and dispute on price or quantity.",
    guideSteps: [
      "Import or key the supplier invoice with their reference number to avoid duplicates.",
      "Match lines to PO and GRN; investigate variance before post.",
      "Apply withholding or reverse charge VAT per jurisdiction.",
      "Route to approval when amount or category requires it.",
      "Post to create payable; Treasury schedules payment against bank cash forecast.",
    ],
    guideTips: [
      "Early payment discounts need invoice date vs due date discipline.",
    ],
    hrefToChapter: "/tutorial/purchasing",
    recommendedNextStep: { label: "AP bills", href: "/ap/bills" },
  },
  "/purchasing/purchase-orders": {
    chapterId: "purchasing",
    chapterTitle: "Purchasing",
    copilotPrompt:
      "Explain how this PO screen relates to /purchasing/orders and when teams should standardise on one URL for training.",
    itemLabel: "Purchase orders (alternate)",
    guideSummary:
      "Some deployments expose multiple routes to the same PO object for deep links from email or legacy bookmarks. Behaviour should match Purchasing → Purchase Orders: same approvals, same receiving, same audit trail. Standardise on one URL in documentation to reduce confusion.",
    guideSteps: [
      "Verify you see the same PO list filters and columns as the main Orders page.",
      "Create and edit POs identically; report bugs if behaviour diverges—that may indicate a stale route.",
      "Train buyers on a single canonical path for supportability.",
    ],
    hrefToChapter: "/tutorial/purchasing",
    recommendedNextStep: { label: "Purchase orders", href: "/purchasing/orders" },
  },
};

/**
 * Product detail and sub-routes (/master/products/:id/...) — richer copy than the product list screen.
 */
export function getMasterProductOrphanGuide(normalizedPath: string): OrphanGuidePayload | null {
  const re = /^\/master\/products\/([^/]+)(?:\/(variants|attributes|packaging|pricing))?$/;
  const m = normalizedPath.match(re);
  if (!m) return null;
  const tab = m[2];
  const base: Omit<OrphanGuidePayload, "itemLabel" | "guideSummary" | "guideSteps" | "recommendedNextStep"> = {
    chapterId: "masters",
    chapterTitle: "Masters",
    copilotPrompt:
      "Explain this product master screen: identifiers, units, variants, packaging, attributes, and pricing tabs.",
    hrefToChapter: "/tutorial/masters",
  };

  if (!tab) {
    return {
      ...base,
      itemLabel: "Product detail",
      guideSummary:
        "Product detail is the single-SKU record behind every order line and stock movement: identifiers, description, unit of measure, category, default warehouse, and control flags (sellable, purchasable, stock-tracked). Changes here ripple to documents—treat edits with the same care as finance master data.",
      guideSteps: [
        "Confirm code and barcode uniqueness before saving—duplicates break scanning and integrations.",
        "Set stock vs non-stock vs service correctly; wrong flags distort inventory and COGS.",
        "Align default UOM with how you buy and sell; conversions live in packaging or UOM catalog.",
        "Review tax or commodity codes if e-invoicing or statutory reporting applies.",
        "Save before navigating to tabs; some deployments discard unsaved header changes.",
        "After major edits, spot-check an open SO/PO line and a stock card for the SKU.",
      ],
      guideTips: [
        "Use notes or internal description for handling instructions visible to warehouse.",
      ],
      recommendedNextStep: { label: "Stock levels", href: "/inventory/stock-levels" },
    };
  }

  const byTab: Record<string, { itemLabel: string; guideSummary: string; guideSteps: string[]; guideTips?: string[] }> = {
    variants: {
      itemLabel: "Product variants",
      guideSummary:
        "Variants represent sellable or stock-tracked children of a style (size, colour, flavour). Each variant should have its own identifier and, where needed, barcode, cost, and price. Good variant hygiene avoids exploding the catalog with duplicate standalone SKUs.",
      guideSteps: [
        "Define variant dimensions your org actually needs—too many slows maintenance.",
        "Give each variant a distinct SKU and scan code for warehouse accuracy.",
        "Map default sales and purchase UOM if variants differ (e.g. single vs case).",
        "Roll up reporting at style level where marketing needs it; keep finance at SKU level.",
        "Deactivate variants you no longer produce; retain history for old invoices.",
      ],
      guideTips: ["Avoid manual stock adjustments per variant when a BOM or assembly process should be used instead."],
    },
    attributes: {
      itemLabel: "Product attributes",
      guideSummary:
        "Attributes are structured facets (brand, grade, allergen, country of origin) used for search, compliance, and analytics. They differ from free-text description because they are filterable and reportable—governance matters.",
      guideSteps: [
        "Use controlled vocabularies where possible; “Coke” vs “Coca-Cola” breaks filters.",
        "Align attributes with what appears on labels and regulatory filings.",
        "Restrict who can add new attribute values to prevent taxonomy sprawl.",
        "Review attributes when launching new channels (marketplaces often require specific fields).",
      ],
      guideTips: ["If an attribute drives pricing rules, coordinate with the Pricing owner before bulk edits."],
    },
    packaging: {
      itemLabel: "Product packaging",
      guideSummary:
        "Packaging captures how quantity converts between purchase, storage, and sale: eaches, inner packs, cases, pallets. Errors here cause POs in wrong UOM and pick instructions that do not match the floor.",
      guideSteps: [
        "Define base inventory UOM first; build cases as multiples of base.",
        "Document supplier pack sizes vs retail pack sizes when they differ.",
        "Validate conversions with a test PO and SO before go-live.",
        "Coordinate with barcode strategy—one barcode per sellable unit where scanners are used.",
      ],
      guideTips: ["Round carefully on weight-based products—legal-for-trade scales may differ from system precision."],
    },
    pricing: {
      itemLabel: "Product pricing",
      guideSummary:
        "Product-level pricing stores list or promotional prices for the SKU. Enterprise price lists, customer agreements, and discount rules may still override—this tab is not the only price source. Always test a quote after changes.",
      guideSteps: [
        "Enter effective dates and currencies; avoid overlapping rows without clear priority rules.",
        "Separate list price from promotional overlays if your model distinguishes them.",
        "Cross-check margin after tax and freight assumptions.",
        "Coordinate with Sales when list price changes affect open quotes.",
        "If integrated to e-commerce, trigger a sync or cache bust per your integration playbook.",
      ],
      guideTips: ["Use Pricing Rules for “customer group 10% off” instead of duplicating rows per customer."],
    },
  };

  const spec = byTab[tab];
  if (!spec) return null;
  return {
    ...base,
    itemLabel: spec.itemLabel,
    guideSummary: spec.guideSummary,
    guideSteps: spec.guideSteps,
    ...(spec.guideTips ? { guideTips: spec.guideTips } : {}),
    recommendedNextStep: { label: "Product list", href: "/master/products" },
  };
}
