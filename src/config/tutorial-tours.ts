/**
 * Spotlight tour definitions.
 * Hand-written tours win on their exact route. Every other screen gets a
 * page-specific tour from its guide, nav label, or settings hub entry.
 * Steps use a CSS selector or a function that returns the element to highlight.
 */

import { ITEM_GUIDES, ORPHAN_ROUTE_GUIDES } from "./tutorial-guides";
import { TUTORIAL_CHAPTERS } from "./tutorial";
import { NAV_SECTIONS, type NavItem } from "./nav";
import { SETTINGS_HUB_GROUPS } from "@/lib/settings/settings-hub-links";

export interface TourStep {
  element: string | (() => Element);
  title: string;
  description: string;
}

export interface TourDef {
  tourId: string;
  route: string;
  title: string;
  steps: TourStep[];
}

export const TUTORIAL_TOURS: TourDef[] = [
  {
    tourId: "dashboard-tour",
    route: "/dashboard",
    title: "Dashboard tour",
    steps: [
      {
        element: "h1",
        title: "Dashboard",
        description:
          "Your role-based home. Scan KPIs and widgets first, then use shortcuts to documents or lists. Numbers respect your org, branch, and permissions.",
      },
      {
        element: "[data-tour-step=dashboard-kpis]",
        title: "Key metrics",
        description:
          "Each card summarises a metric (sales, stock risk, approvals, etc.). Click through when you need the underlying list or trend—not every card applies to every role.",
      },
      {
        element: "[data-tour-step=command-hint]",
        title: "Quick search",
        description:
          "⌘K / Ctrl+K opens the command palette: jump to any screen by name or start a Copilot prompt with page context. This is the fastest navigation once you know where you’re going.",
      },
    ],
  },
  {
    tourId: "control-tower-tour",
    route: "/control-tower",
    title: "Control Tower tour",
    steps: [
      {
        element: "h1",
        title: "Control Tower",
        description: "Operational visibility: KPIs, exceptions, procurement variance, and franchise data.",
      },
    ],
  },
  {
    tourId: "docs-hub-tour",
    route: "/docs",
    title: "Documents tour",
    steps: [
      {
        element: "h1",
        title: "Document Center",
        description:
          "Every operational posting flows through a document type here: order-to-cash, procure-to-pay, stock, and journals. Pick the type that matches your business action.",
      },
      {
        element: "[data-tour-step=doc-type-list]",
        title: "Document types",
        description:
          "Each tile opens that document’s list. From there you use Create / New to draft. Keeping PO → GRN → supplier invoice linked is what makes audit and three-way match possible.",
      },
    ],
  },
  {
    tourId: "sales-orders-tour",
    route: "/docs/sales-order",
    title: "Sales Orders tour",
    steps: [
      {
        element: "h1",
        title: "Sales Orders",
        description: "Create and manage customer orders. Orders drive deliveries and invoicing.",
      },
      {
        element: "[data-tour-step=create-button]",
        title: "Create",
        description: "Click to create a new sales order. Add lines, customer, and submit.",
      },
    ],
  },
  {
    tourId: "purchase-orders-tour",
    route: "/docs/purchase-order",
    title: "Purchase Orders tour",
    steps: [
      {
        element: "h1",
        title: "Purchase Orders",
        description: "Create POs to suppliers. Use for receiving goods and matching invoices.",
      },
      {
        element: "[data-tour-step=create-button]",
        title: "Create",
        description: "Click to create a new purchase order. Add lines and submit for approval if required.",
      },
    ],
  },
  {
    tourId: "masters-products-tour",
    route: "/master/products",
    title: "Products tour",
    steps: [
      {
        element: "h1",
        title: "Products",
        description: "Master data for all your products or SKUs. Set up before creating documents.",
      },
      {
        element: "[data-tour-step=create-button]",
        title: "Add product",
        description: "Create a new product with code, name, unit, and optional pricing.",
      },
    ],
  },
  {
    tourId: "masters-parties-tour",
    route: "/master/parties",
    title: "Parties tour",
    steps: [
      {
        element: "h1",
        title: "Parties",
        description: "Customers and suppliers. Set up contact and payment terms here.",
      },
    ],
  },
  {
    tourId: "inventory-stock-levels-tour",
    route: "/inventory/stock-levels",
    title: "Stock Levels tour",
    steps: [
      {
        element: "h1",
        title: "Stock Levels",
        description: "Current quantity and value per product and warehouse.",
      },
      {
        element: "[data-tutorial-hint=search]",
        title: "Search",
        description: "Search by SKU or product name to find specific items.",
      },
    ],
  },
  {
    tourId: "inventory-movements-tour",
    route: "/inventory/movements",
    title: "Stock Movements tour",
    steps: [
      {
        element: "h1",
        title: "Stock Movements",
        description: "All inventory movements: in, out, transfer, adjustment. Created when you post documents.",
      },
      {
        element: "[data-tutorial-hint=search]",
        title: "Search",
        description: "Search by SKU, product name, or reference.",
      },
      {
        element: "[data-tutorial-hint=export]",
        title: "Export",
        description: "Export to CSV. Movements link to source documents.",
      },
    ],
  },
  {
    tourId: "treasury-payment-runs-tour",
    route: "/treasury/payment-runs",
    title: "Payment Runs tour",
    steps: [
      {
        element: "h1",
        title: "Payment Runs",
        description: "Batch payables and generate bank files or cheques.",
      },
      {
        element: "[data-tour-step=create-button]",
        title: "Create run",
        description: "Create a payment run, select bills, and export or post.",
      },
    ],
  },
  {
    tourId: "treasury-collections-tour",
    route: "/treasury/collections",
    title: "Collections tour",
    steps: [
      {
        element: "h1",
        title: "Collections",
        description: "Track and record customer payments. Prioritize by overdue or amount.",
      },
    ],
  },
  {
    tourId: "finance-chart-of-accounts-tour",
    route: "/finance/chart-of-accounts",
    title: "Chart of Accounts tour",
    steps: [
      {
        element: "h1",
        title: "Chart of Accounts",
        description: "GL account structure. View balances and transactions by account.",
      },
    ],
  },
  {
    tourId: "finance-gl-tour",
    route: "/finance/gl",
    title: "General Ledger tour",
    steps: [
      {
        element: "h1",
        title: "General Ledger",
        description: "Central ledger. Filter by account, period, or branch. Drill to source documents.",
      },
    ],
  },
  // Tier 2: Warehouse, Sales, Purchasing, Reports, Analytics
  {
    tourId: "warehouse-overview-tour",
    route: "/warehouse/overview",
    title: "Warehouse Overview tour",
    steps: [
      { element: "h1", title: "Warehouse Overview", description: "Summary of warehouse operations: pending putaway, pick tasks, and recent activity." },
    ],
  },
  {
    tourId: "warehouse-transfers-tour",
    route: "/warehouse/transfers",
    title: "Transfers tour",
    steps: [
      { element: "h1", title: "Transfers", description: "Move stock between warehouses. Create transfers and post to update both locations." },
      { element: "[data-tour-step=create-button]", title: "Create transfer", description: "Create a new transfer and select source and destination warehouses." },
    ],
  },
  {
    tourId: "warehouse-pick-pack-tour",
    route: "/warehouse/pick-pack",
    title: "Pick & Pack tour",
    steps: [
      { element: "h1", title: "Pick & Pack", description: "Pick tasks for orders or shipments. Complete picks to confirm items are picked and packed." },
      { element: "[data-tutorial-hint=pick-pack-stock]", title: "Verify available stock", description: "Pick from the assigned warehouse and record shortages instead of silently overriding stock." },
      { element: "[data-tutorial-hint=pick-pack-pack]", title: "Pack and hand off", description: "Confirm units, package count, lot traceability, and vehicle before creating dispatch." },
    ],
  },
  {
    tourId: "warehouse-putaway-tour",
    route: "/warehouse/putaway",
    title: "Putaway tour",
    steps: [
      { element: "h1", title: "Putaway", description: "Receipts or moves that need to be put away into locations. Assign or confirm putaway." },
    ],
  },
  {
    tourId: "warehouse-cycle-counts-tour",
    route: "/warehouse/cycle-counts",
    title: "Cycle Counts tour",
    steps: [
      { element: "h1", title: "Cycle Counts", description: "Periodic counts to keep inventory accurate. Create counts, enter results, and post adjustments." },
    ],
  },
  {
    tourId: "sales-overview-tour",
    route: "/sales/overview",
    title: "Sales Overview tour",
    steps: [
      { element: "h1", title: "Sales Overview", description: "Key sales metrics and recent orders or invoices. Jump to orders, deliveries, or invoices." },
    ],
  },
  {
    tourId: "sales-invoices-tour",
    route: "/sales/invoices",
    title: "Sales Invoices tour",
    steps: [
      { element: "h1", title: "Sales Invoices", description: "Invoices sent to customers. Posting creates receivables and updates the ledger." },
      { element: "[data-tour-step=create-button]", title: "Create invoice", description: "Create an invoice from an order or manually." },
    ],
  },
  {
    tourId: "sales-deliveries-tour",
    route: "/sales/deliveries",
    title: "Deliveries tour",
    steps: [
      { element: "h1", title: "Deliveries", description: "Delivery documents or shipments. Post a delivery to reduce stock and update order status." },
    ],
  },
  {
    tourId: "ap-bills-tour",
    route: "/ap/bills",
    title: "AP Bills tour",
    steps: [
      { element: "h1", title: "AP Bills", description: "Supplier bills. Match to PO and GRN, then post and pay via payment run." },
      { element: "[data-tour-step=create-button]", title: "Create bill", description: "Create or import a bill and link to PO/GRN." },
    ],
  },
  {
    tourId: "ap-three-way-match-tour",
    route: "/ap/three-way-match",
    title: "3-way Match tour",
    steps: [
      { element: "h1", title: "3-way Match", description: "Reconcile PO, GRN, and supplier invoice. Resolve variances and post when quantities and prices match." },
    ],
  },
  {
    tourId: "reports-tour",
    route: "/reports",
    title: "Reports tour",
    steps: [
      { element: "h1", title: "Report Library", description: "Available reports. Run a report for a period or filter and view or export." },
    ],
  },
  {
    tourId: "reports-saved-tour",
    route: "/reports/saved",
    title: "Saved Views tour",
    steps: [
      { element: "h1", title: "Saved Views", description: "Saved report configurations. Open a saved view to run the report with stored filters." },
    ],
  },
  {
    tourId: "analytics-tour",
    route: "/analytics",
    title: "Analytics tour",
    steps: [
      { element: "h1", title: "Analytics Studio", description: "Explore data, view insights, or open product, finance, or other analytics." },
    ],
  },
  {
    tourId: "analytics-explore-tour",
    route: "/analytics/explore",
    title: "Explore tour",
    steps: [
      { element: "h1", title: "Explore", description: "Query and visualize data. Select dimensions and metrics and build ad-hoc views." },
    ],
  },
  {
    tourId: "analytics-insights-tour",
    route: "/analytics/insights",
    title: "Insights tour",
    steps: [
      { element: "h1", title: "Insights", description: "AI or rule-based insights: anomalies, suggestions, or trends." },
    ],
  },
  // Tier 3: Manufacturing, Distribution, Franchise, Payroll, Settings
  {
    tourId: "manufacturing-boms-tour",
    route: "/manufacturing/boms",
    title: "BOMs tour",
    steps: [
      { element: "h1", title: "Bills of Material", description: "Define what goes into a finished product. Use BOMs for production and MRP." },
      { element: "[data-tour-step=create-button]", title: "Create BOM", description: "Create a BOM for a finished product and add component lines." },
    ],
  },
  {
    tourId: "manufacturing-work-orders-tour",
    route: "/manufacturing/work-orders",
    title: "Work Orders tour",
    steps: [
      { element: "h1", title: "Work Orders", description: "Release production. Consume components and produce finished goods; post to update stock." },
      { element: "[data-tutorial-hint=work-order-lifecycle]", title: "Lifecycle", description: "Release, start, and complete in sequence. Completion performs the inventory posting." },
      { element: "[data-tutorial-hint=work-order-measurement]", title: "Measurement", description: "The configured measurement mode controls whether weight and a device reading are mandatory." },
      { element: "[data-tutorial-hint=work-order-reconciliation]", title: "Reconciliation", description: "Review immutable WIP, mass, count, and cost variance after completion." },
    ],
  },
  {
    tourId: "distribution-trips-tour",
    route: "/distribution/trips",
    title: "Trips tour",
    steps: [
      { element: "h1", title: "Trips", description: "Plan and track delivery trips. Create a trip, add orders or stops, and update status." },
    ],
  },
  {
    tourId: "franchise-overview-tour",
    route: "/franchise/overview",
    title: "Franchise Overview tour",
    steps: [
      { element: "h1", title: "Franchise Overview", description: "Network-level KPIs and activity across outlets." },
    ],
  },
  {
    tourId: "payroll-pay-runs-tour",
    route: "/payroll/pay-runs",
    title: "Pay Runs tour",
    steps: [
      { element: "h1", title: "Pay Runs", description: "Process payroll for a period. Create a run, calculate gross and deductions, then post." },
    ],
  },
  {
    tourId: "settings-users-roles-tour",
    route: "/settings/users-roles",
    title: "Users & Roles tour",
    steps: [
      { element: "h1", title: "Users & Roles", description: "Assign least-privilege roles and verify the effective mobile workspace." },
      { element: "[data-tutorial-hint=users-roles-tabs]", title: "Users and roles", description: "Users receive one or more roles; roles contain live backend permission keys." },
      { element: "[data-tutorial-hint=roles-permissions]", title: "Role permissions", description: "A role edit affects every assigned user. Another administrator must edit a role assigned to you." },
      { element: "[data-tutorial-hint=roles-provision]", title: "Standard catalogue", description: "Provision template-aware standard roles before creating custom duplicates." },
    ],
  },
  {
    tourId: "settings-approval-policy-tour",
    route: "/settings/approval-policy",
    title: "Approval policy tour",
    steps: [
      { element: "h1", title: "Approval policy", description: "Configure versioned maker-checker routing by document, amount, branch, and designated approver." },
      { element: "[data-tutorial-hint=approval-policy-rules]", title: "Matching rules", description: "The highest matching amount threshold applies. Keep maker-checker enabled when submitter and approver must differ." },
      { element: "[data-tutorial-hint=approval-policy-save]", title: "Save and test", description: "Save a new version, then submit a draft and verify it reaches the expected Inbox." },
    ],
  },
  {
    tourId: "settings-sequences-tour",
    route: "/settings/sequences",
    title: "Numbering Sequences tour",
    steps: [
      { element: "h1", title: "Numbering Sequences", description: "How document numbers are generated. Set prefix, length, and next number." },
    ],
  },
  // Additional docs and masters
  {
    tourId: "docs-grn-tour",
    route: "/docs/grn",
    title: "Goods Receipt tour",
    steps: [
      { element: "h1", title: "Goods Receipt", description: "Record receipt of goods against purchase orders. Posting updates inventory." },
      { element: "[data-tour-step=create-button]", title: "Create GRN", description: "Create a GRN linked to a PO. Enter received quantities and post." },
    ],
  },
  {
    tourId: "docs-invoice-tour",
    route: "/docs/invoice",
    title: "Invoices tour",
    steps: [
      { element: "h1", title: "Invoices", description: "Sales or purchase invoices. Post to receivables or payables." },
      { element: "[data-tour-step=create-button]", title: "Create invoice", description: "Create a new invoice and link to an order or bill if applicable." },
    ],
  },
  {
    tourId: "docs-journal-tour",
    route: "/docs/journal",
    title: "Journal Entries tour",
    steps: [
      { element: "h1", title: "Journal Entries", description: "Manual accounting entries that post to the general ledger." },
      { element: "[data-tour-step=create-button]", title: "Create journal", description: "Create a journal entry and add debit/credit lines." },
    ],
  },
  {
    tourId: "masters-hub-tour",
    route: "/master",
    title: "Masters tour",
    steps: [
      { element: "h1", title: "Masters", description: "Master data: products, parties, and warehouses. Set these up before creating transactions." },
    ],
  },
  {
    tourId: "masters-warehouses-tour",
    route: "/master/warehouses",
    title: "Warehouses tour",
    steps: [
      { element: "h1", title: "Warehouses", description: "Storage locations. Each warehouse can have locations or bins." },
    ],
  },
  {
    tourId: "inventory-products-tour",
    route: "/inventory/products",
    title: "Inventory Products tour",
    steps: [
      { element: "h1", title: "Inventory Products", description: "Product stock and value by warehouse. On-hand, reserved, and value per SKU." },
    ],
  },
  {
    tourId: "inventory-receipts-tour",
    route: "/inventory/receipts",
    title: "Receipts (GRN) tour",
    steps: [
      { element: "h1", title: "Receipts", description: "Goods receipt documents. Each receipt is tied to a purchase order." },
      { element: "[data-tour-step=create-button]", title: "Create GRN", description: "Create a new GRN from the Create button, linked to a PO." },
      { element: "[data-tutorial-hint=grn-lot-qc-measurement]", title: "Lot, QC, and measurement", description: "Capture lot and received measurement before post; release quarantined lots only after QC." },
      { element: "[data-tutorial-hint=grn-confirm-processing]", title: "Confirm processing", description: "Confirm final measured output once; this locks weights and posts the stock adjustment." },
    ],
  },
  {
    tourId: "pricing-overview-tour",
    route: "/pricing/overview",
    title: "Pricing Overview tour",
    steps: [
      { element: "h1", title: "Pricing Overview", description: "Price lists and discount policies. Manage list prices and rules." },
    ],
  },
  {
    tourId: "pricing-price-lists-tour",
    route: "/pricing/price-lists",
    title: "Price Lists tour",
    steps: [
      { element: "h1", title: "Price Lists", description: "Selling prices per product, customer, or channel. Assign to parties or use as default." },
    ],
  },
  {
    tourId: "finance-overview-tour",
    route: "/finance",
    title: "Finance Dashboard tour",
    steps: [
      { element: "h1", title: "Finance", description: "Key financial KPIs and links to GL, AR, AP, and reports." },
    ],
  },
  {
    tourId: "finance-bank-recon-tour",
    route: "/finance/bank-recon",
    title: "Bank reconciliation tour",
    steps: [
      {
        element: "h1",
        title: "Bank reconciliation",
        description: "Import statement lines, review suggestions, and confirm only one payment or receipt per bank line.",
      },
      {
        element: "[data-tutorial-hint=bank-match-workspace]",
        title: "Review before matching",
        description: "Ambiguous equal amounts require a manual choice. Fees and adjustments also require a ledger account.",
      },
      {
        element: "[data-tutorial-hint=bank-close]",
        title: "Close only when tied",
        description: "The statement closing balance must agree to the reconciled GL balance before close.",
      },
    ],
  },
  {
    tourId: "finance-period-close-tour",
    route: "/finance/period-close",
    title: "Period close tour",
    steps: [
      {
        element: "h1",
        title: "Period close",
        description: "Resolve every red checklist item before locking the selected fiscal period.",
      },
      {
        element: "[data-tutorial-hint=period-close-checklist]",
        title: "Close checklist",
        description: "Unposted documents, payroll, and unmatched bank lines block close.",
      },
      {
        element: "[data-tutorial-hint=period-close-action]",
        title: "Close period",
        description: "After close, posting in this period is blocked. Reopen only under your correction policy.",
      },
    ],
  },
  {
    tourId: "treasury-overview-tour",
    route: "/treasury/overview",
    title: "Treasury Overview tour",
    steps: [
      { element: "h1", title: "Treasury Overview", description: "Cash position, pending payments, and collections." },
    ],
  },
  {
    tourId: "approvals-inbox-tour",
    route: "/approvals/inbox",
    title: "Approvals Inbox tour",
    steps: [
      { element: "h1", title: "Approvals Inbox", description: "Approval requests assigned to you. Approve or reject with optional comments." },
      { element: "[data-tutorial-hint=approval-review-queue]", title: "Review queue", description: "Open the source document and supporting evidence before deciding." },
      { element: "[data-tutorial-hint=approval-review-item]", title: "Decision", description: "Approval authorises the next workflow step; it does not post the source document." },
    ],
  },
  {
    tourId: "tasks-tour",
    route: "/tasks",
    title: "Tasks tour",
    steps: [
      { element: "h1", title: "Tasks", description: "Assigned tasks and work items. Complete or reassign as needed." },
    ],
  },
  {
    tourId: "automation-rules-tour",
    route: "/automation/rules",
    title: "Rules Engine tour",
    steps: [
      { element: "h1", title: "Rules Engine", description: "Define triggers, conditions, and actions. When a trigger fires, the action runs." },
      { element: "[data-tutorial-hint=automation-create-rule]", title: "Create a rule", description: "Start with one precise event, narrow conditions, and a clearly owned action." },
      { element: "[data-tutorial-hint=automation-rule-builder]", title: "Control risk", description: "Require approval for automated actions that create financial, stock, or access risk." },
      { element: "[data-tutorial-hint=automation-rules-list]", title: "Monitor versions", description: "Review status and version before enabling; disabling does not reverse completed runs." },
    ],
  },
  {
    tourId: "crm-accounts-tour",
    route: "/crm/accounts",
    title: "CRM Accounts tour",
    steps: [
      { element: "h1", title: "CRM Accounts", description: "Customer and partner records. View contact details and link to activities and deals." },
    ],
  },
  {
    tourId: "assets-register-tour",
    route: "/assets/register",
    title: "Asset Register tour",
    steps: [
      { element: "h1", title: "Asset Register", description: "Fixed assets with cost, depreciation method, and book value." },
    ],
  },
  {
    tourId: "onboarding-setup-tour",
    route: "/onboarding",
    title: "Setup checklist tour",
    steps: [
      {
        element: "h1",
        title: "Setup",
        description:
          "Complete company setup: profile, currencies, chart of accounts, taxes, bank accounts, users, and first document.",
      },
    ],
  },
  {
    tourId: "inbox-tour",
    route: "/inbox",
    title: "Inbox tour",
    steps: [
      {
        element: "h1",
        title: "Inbox",
        description: "Approvals and notifications together. Open items to act or drill to the related record.",
      },
    ],
  },
  {
    tourId: "approvals-hub-tour",
    route: "/approvals",
    title: "Approvals hub tour",
    steps: [
      {
        element: "h1",
        title: "Approvals",
        description: "Use Inbox for items assigned to you or My requests for what you submitted for approval.",
      },
    ],
  },
  {
    tourId: "approvals-requests-tour",
    route: "/approvals/requests",
    title: "My approval requests tour",
    steps: [
      {
        element: "h1",
        title: "My requests",
        description: "Track requests you submitted: pending, approved, or rejected, with comments.",
      },
    ],
  },
  {
    tourId: "docs-credit-note-tour",
    route: "/docs/credit-note",
    title: "Sales credit notes tour",
    steps: [
      {
        element: "h1",
        title: "Sales credit notes",
        description: "Reverse or reduce revenue; link to the original invoice where applicable.",
      },
    ],
  },
  {
    tourId: "docs-purchase-credit-note-tour",
    route: "/docs/purchase-credit-note",
    title: "Purchase credit notes tour",
    steps: [
      {
        element: "h1",
        title: "Purchase credit notes",
        description: "Record supplier credits against payables; link to the original bill when possible.",
      },
    ],
  },
  // Session 2 — Inventory B, Warehouse, Sales, Purchasing
  {
    tourId: "inventory-costing-tour",
    route: "/inventory/costing",
    title: "Costing tour",
    steps: [
      {
        element: "h1",
        title: "Costing",
        description: "Review costing method and run or inspect costing so inventory value matches your policy.",
      },
    ],
  },
  {
    tourId: "inventory-stock-explorer-tour",
    route: "/inventory/stock-explorer",
    title: "Stock Explorer tour",
    steps: [
      {
        element: "h1",
        title: "Stock Explorer",
        description: "Drill into stock by product, warehouse, and time. Trace movements and balances.",
      },
    ],
  },
  {
    tourId: "inventory-valuation-tour",
    route: "/inventory/valuation",
    title: "Valuation tour",
    steps: [
      {
        element: "h1",
        title: "Valuation",
        description:
          "Latest costing snapshot per SKU and warehouse—use with the Costing page; full period close and GL tie-out workflows are still coordinated with finance.",
      },
    ],
  },
  {
    tourId: "inventory-receiving-tour",
    route: "/inventory/receiving",
    title: "Receiving queue tour",
    steps: [
      {
        element: "h1",
        title: "Receiving queue",
        description: "Process expected receipts against purchase orders and post to update stock.",
      },
    ],
  },
  {
    tourId: "inventory-warehouses-tour",
    route: "/inventory/warehouses",
    title: "Warehouses & locations tour",
    steps: [
      {
        element: "h1",
        title: "Warehouses & locations",
        description: "Structure storage: warehouses, locations, and bins used for stock and operations.",
      },
    ],
  },
  {
    tourId: "warehouse-bin-locations-tour",
    route: "/warehouse/bin-locations",
    title: "Bin locations tour",
    steps: [
      {
        element: "h1",
        title: "Bin locations",
        description: "View and manage bins; see stock per bin within your warehouse network.",
      },
    ],
  },
  {
    tourId: "sales-quotes-tour",
    route: "/sales/quotes",
    title: "Sales quotes tour",
    steps: [
      {
        element: "h1",
        title: "Quotes",
        description: "Create and track quotes; convert to a sales order when the customer confirms.",
      },
    ],
  },
  {
    tourId: "sales-orders-list-tour",
    route: "/sales/orders",
    title: "Sales orders tour",
    steps: [
      {
        element: "h1",
        title: "Sales orders",
        description: "List and manage customer orders. Open a row for lines, delivery, and invoicing.",
      },
    ],
  },
  {
    tourId: "sales-customers-tour",
    route: "/sales/customers",
    title: "Customers tour",
    steps: [
      {
        element: "h1",
        title: "Customers",
        description: "Customer master data: balances, terms, and links to orders and invoices.",
      },
    ],
  },
  {
    tourId: "sales-returns-tour",
    route: "/sales/returns",
    title: "Sales returns tour",
    steps: [
      {
        element: "h1",
        title: "Returns / notes",
        description: "Sales returns and credit notes: adjust stock and receivables when customers return goods.",
      },
    ],
  },
  {
    tourId: "purchasing-requests-tour",
    route: "/purchasing/requests",
    title: "Purchase requests tour",
    steps: [
      {
        element: "h1",
        title: "Purchase requests",
        description: "Internal requisitions; submit for approval and convert to a purchase order when approved.",
      },
    ],
  },
  {
    tourId: "purchasing-sourcing-flow-tour",
    route: "/purchasing/sourcing-flow",
    title: "Guided sourcing flow tour",
    steps: [
      {
        element: "h1",
        title: "Procurement sourcing journey",
        description:
          "This journey tracks sourcing from demand through PO, receipt, variance, and landed cost. Use it when you want a single narrative instead of jumping between modules.",
      },
      {
        element: "[data-tour-step=sourcing-flow-health]",
        title: "Flow health",
        description:
          "Open POs, variance exceptions, and GRNs waiting for landed cost tell you where the pipeline is stuck. Clear exceptions before month-end close.",
      },
      {
        element: "[data-tour-step=sourcing-step-cards]",
        title: "Step cards",
        description:
          "Each card is a journey step with CTAs (e.g. open POs, receiving, landed cost, processing yield, finance review). Work active steps first and use these links as the single operational flow.",
      },
    ],
  },
  {
    tourId: "purchasing-purchase-returns-tour",
    route: "/purchasing/purchase-returns",
    title: "Purchase returns tour",
    steps: [
      {
        element: "h1",
        title: "Purchase returns",
        description: "Physical returns reduce inventory and the supplier payable after approval and posting.",
      },
      {
        element: "[data-tutorial-hint=purchase-return-start]",
        title: "Start from the receipt",
        description: "Open the source GRN so supplier, warehouse, products, and received quantities remain traceable.",
      },
      {
        element: "[data-tutorial-hint=purchase-return-submit]",
        title: "Submit for approval",
        description: "Verify the draft, then submit it. Approval happens in the central Approvals Inbox.",
      },
      {
        element: "[data-tutorial-hint=purchase-return-post]",
        title: "Post the physical return",
        description: "Post only after approval and when the goods have left your control.",
      },
    ],
  },
  {
    tourId: "purchasing-cash-weight-audit-tour",
    route: "/purchasing/cash-weight-audit",
    title: "Cash-to-weight audit tour",
    steps: [
      {
        element: "h1",
        title: "Cash-to-weight audit",
        description: "Reconcile weight-based procurement: ordered vs received weight and variance.",
      },
    ],
  },
  // Session 3 — Pricing, Manufacturing, Distribution
  {
    tourId: "pricing-rules-tour",
    route: "/pricing/rules",
    title: "Pricing rules tour",
    steps: [
      {
        element: "h1",
        title: "Pricing rules",
        description:
          "Conditional pricing: quantity breaks, customer or product filters, and how rules layer on top of price lists. Test changes before campaigns go live.",
      },
    ],
  },
  {
    tourId: "manufacturing-routing-tour",
    route: "/manufacturing/routing",
    title: "Routing tour",
    steps: [
      {
        element: "h1",
        title: "Routing",
        description:
          "Operations, work centers, and sequence define how and where a product is made—inputs to capacity and standard cost.",
      },
    ],
  },
  {
    tourId: "manufacturing-mrp-tour",
    route: "/manufacturing/mrp",
    title: "MRP tour",
    steps: [
      {
        element: "h1",
        title: "MRP",
        description:
          "Material requirements planning: explode BOMs, net demand, and review suggested POs and work orders. Master data quality drives result quality.",
      },
    ],
  },
  {
    tourId: "manufacturing-subcontracting-tour",
    route: "/manufacturing/subcontracting",
    title: "Subcontracting tour",
    steps: [
      {
        element: "h1",
        title: "Subcontracting",
        description:
          "External processing: issue materials, receive finished or semi-finished goods, and align costs with AP.",
      },
    ],
  },
  {
    tourId: "manufacturing-yield-tour",
    route: "/manufacturing/yield",
    title: "Yield tour",
    steps: [
      {
        element: "h1",
        title: "Yield / mass balance",
        description:
          "Compare input vs output and investigate variance—critical for process industries and commodity procurement.",
      },
    ],
  },
  {
    tourId: "manufacturing-byproducts-tour",
    route: "/manufacturing/byproducts",
    title: "Byproducts tour",
    steps: [
      {
        element: "h1",
        title: "Byproducts",
        description:
          "Secondary outputs from production: receive into stock with correct valuation alongside the main product.",
      },
    ],
  },
  {
    tourId: "distribution-routes-tour",
    route: "/distribution/routes",
    title: "Routes tour",
    steps: [
      {
        element: "h1",
        title: "Routes",
        description:
          "Territories and stop sequences for field delivery; foundation for trips and collections.",
      },
    ],
  },
  {
    tourId: "distribution-deliveries-tour",
    route: "/distribution/deliveries",
    title: "Distribution deliveries tour",
    steps: [
      {
        element: "h1",
        title: "Deliveries",
        description:
          "Outbound distribution runs: load, deliver, POD, and stock impact—often multi-stop.",
      },
    ],
  },
  {
    tourId: "distribution-transfer-planning-tour",
    route: "/distribution/transfer-planning",
    title: "Transfer planning tour",
    steps: [
      {
        element: "h1",
        title: "Transfer planning",
        description:
          "Plan stock moves between branches or depots to position inventory ahead of demand.",
      },
    ],
  },
  {
    tourId: "distribution-collections-tour",
    route: "/distribution/collections",
    title: "Route collections tour",
    steps: [
      {
        element: "h1",
        title: "Collections",
        description:
          "Cash or mobile collections on route against invoices—tight controls and AR posting matter here.",
      },
    ],
  },
];

const TOUR_EXCLUDED_PREFIXES = ["/tutorial", "/login", "/signup", "/platform"];

type ScreenGuide = {
  href: string;
  label: string;
  summary: string;
  steps: string[];
  hints: { selector: string; hint: string }[];
};

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/";
}

function clip(text: string, max = 380): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const stop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "));
  if (stop > 160) return slice.slice(0, stop + 1);
  return `${slice.replace(/\s+\S*$/, "")}…`;
}

function firstExisting(selectors: string[]): () => Element {
  return () => {
    for (const selector of selectors) {
      const found = document.querySelector(selector);
      if (found) return found;
    }
    return document.body;
  };
}

function workArea(): () => Element {
  return () => {
    const root = document.querySelector("[data-tutorial-hint=page-main]");
    if (!root) return document.querySelector("h1") ?? document.body;

    const table = root.querySelector("table, [role='grid']");
    if (table) return table;

    const tabs = root.querySelector("[role='tablist']");
    if (tabs) return tabs;

    const form = [...root.querySelectorAll("form")].find(
      (el) => !el.closest("[data-tutorial-hint=page-title], [data-tutorial-hint=page-actions]")
    );
    if (form) return form;

    const title = root.querySelector("[data-tutorial-hint=page-title]");
    let node: Element | null = title;
    while (node && node.parentElement && node.parentElement !== root) {
      node = node.parentElement;
      const sibling = node.nextElementSibling;
      if (sibling && sibling.getBoundingClientRect().height > 48) return sibling;
    }
    return root;
  };
}

function putScreen(map: Map<string, ScreenGuide>, screen: ScreenGuide) {
  const href = normalizePath(screen.href);
  const next = { ...screen, href };
  const prev = map.get(href);
  if (!prev || next.summary.length > prev.summary.length) map.set(href, next);
}

function collectScreens(): ScreenGuide[] {
  const map = new Map<string, ScreenGuide>();

  for (const chapter of TUTORIAL_CHAPTERS) {
    for (const item of chapter.items) {
      if (!item.href) continue;
      const guideSteps = item.guideSteps ?? [];
      putScreen(map, {
        href: item.href,
        label: item.label,
        summary:
          item.guideSummary?.trim() ||
          `${item.label} is the ${chapter.title} screen for this work. Use the heading to confirm you are in the right place, then act on the list or form below.`,
        steps:
          guideSteps.length > 0
            ? guideSteps
            : [
                "Confirm the heading matches the job you came to do.",
                "Use the main area to review rows, open a record, or complete the form.",
                "Use the header actions when you need to create, filter, or export.",
              ],
        hints: item.elementHints ?? [],
      });
    }
  }

  const walkNav = (items: NavItem[]) => {
    for (const item of items) {
      if (item.href) {
        const guide = ITEM_GUIDES[item.id];
        putScreen(map, {
          href: item.href,
          label: item.label,
          summary:
            guide?.guideSummary?.trim() ||
            `${item.label}. Use this screen to review ${item.label.toLowerCase()} and open a record when you need to change it.`,
          steps:
            guide?.guideSteps && guide.guideSteps.length > 0
              ? guide.guideSteps
              : [
                  "Scan the page from the heading down.",
                  "Open a row or use the header actions to continue the task.",
                ],
          hints: guide?.elementHints ?? [],
        });
      }
      if (item.children?.length) walkNav(item.children);
    }
  };
  for (const section of NAV_SECTIONS) walkNav(section.items);

  for (const [href, orphan] of Object.entries(ORPHAN_ROUTE_GUIDES)) {
    putScreen(map, {
      href,
      label: orphan.itemLabel,
      summary: orphan.guideSummary,
      steps: orphan.guideSteps,
      hints: orphan.elementHints ?? [],
    });
  }

  putScreen(map, {
    href: "/settings",
    label: "Settings",
    summary:
      "Settings is the configuration home: organisation, people and access, financial setup, tax, inventory, and integrations. Open a card to change that area. Day-to-day selling and stock stay in the operational menus.",
    steps: [
      "Pick the group that matches the change: organisation, people, finance, tax, inventory, or integrations.",
      "Open one card and save there before starting a second change.",
      "Use Tutorial on this page when you want the written map of the product.",
    ],
    hints: [
      {
        selector: "[data-tutorial-hint=settings-hub]",
        hint: "Each card opens one configuration area. Permissions hide cards you cannot change.",
      },
    ],
  });

  for (const group of SETTINGS_HUB_GROUPS) {
    for (const link of group.links) {
      putScreen(map, {
        href: link.href,
        label: link.label,
        summary: `${link.label}. ${link.description}. This sits under Settings → ${group.title}.`,
        steps: [
          `Review the current ${link.label.toLowerCase()} values before editing.`,
          "Save when the values match how the organisation should post and report.",
          "Return to Settings if the next change belongs in a different card.",
        ],
        hints: [],
      });
    }
  }

  return [...map.values()];
}

let screenCache: ScreenGuide[] | null = null;
function getScreens(): ScreenGuide[] {
  if (!screenCache) screenCache = collectScreens();
  return screenCache;
}

const synthesizedTours = new Map<string, TourDef>();

function synthesizeTour(screen: ScreenGuide): TourDef {
  const cached = synthesizedTours.get(screen.href);
  if (cached) return cached;

  const howTo = screen.steps
    .slice(0, 4)
    .map((step, index) => `${index + 1}. ${step}`)
    .join(" ");

  const steps: TourStep[] = [
    {
      element: firstExisting(["[data-tutorial-hint=page-title]", "h1", "[data-tutorial-hint=page-main]"]),
      title: screen.label,
      description: clip(screen.summary),
    },
    {
      element: workArea(),
      title: "How to use this page",
      description: clip(howTo, 420),
    },
  ];

  const tour: TourDef = {
    tourId: `page-tour:${screen.href}`,
    route: screen.href,
    title: `${screen.label} tour`,
    steps,
  };
  synthesizedTours.set(screen.href, tour);
  return tour;
}

const genericTours = new Map<string, TourDef>();
const expandedTours = new Map<string, TourDef>();

const REPLAY_STEP: TourStep = {
  element: firstExisting([
    "[data-tutorial-hint=command-search]",
    "[data-tour-step=command-hint]",
    "[data-tutorial-hint=page-help]",
  ]),
  title: "Jump or replay",
  description:
    "Search or run opens the command palette (⌘K or Ctrl+K) so you can jump to a related screen. The tour button in the page header replays this walkthrough, and the book icon opens the written guide.",
};

function ensureInteractive(tour: TourDef): TourDef {
  const cached = expandedTours.get(tour.tourId);
  if (cached) return cached;

  const screen = getScreens().find((item) => item.href === tour.route);
  const steps = [...tour.steps];
  const selectors = new Set(
    steps.filter((step) => typeof step.element === "string").map((step) => step.element as string)
  );

  if (steps.length < 2) {
    const howTo =
      screen?.steps.slice(0, 4).map((step, index) => `${index + 1}. ${step}`).join(" ") ||
      "Review the main area under the heading, then use header actions to create, filter, or open a record.";
    steps.push({
      element: workArea(),
      title: "How to use this page",
      description: clip(howTo, 420),
    });
  }

  let addedHints = 0;
  for (const hint of screen?.hints ?? []) {
    if (selectors.has(hint.selector) || addedHints >= 3) continue;
    steps.push({
      element: firstExisting([hint.selector, "[data-tutorial-hint=page-main]", "h1"]),
      title: screen?.label ?? tour.title,
      description: hint.hint,
    });
    selectors.add(hint.selector);
    addedHints += 1;
  }

  if (!steps.some((step) => step.title === "Jump or replay")) {
    steps.push(REPLAY_STEP);
  }

  const next = steps.length === tour.steps.length ? tour : { ...tour, steps };
  expandedTours.set(tour.tourId, next);
  return next;
}

function genericTour(route: string): TourDef {
  const cached = genericTours.get(route);
  if (cached) return cached;
  const slug = route.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "this page";
  const label = slug.charAt(0).toUpperCase() + slug.slice(1);
  const tour: TourDef = {
    tourId: `page-tour:${route}`,
    route,
    title: `${label} tour`,
    steps: [
      {
        element: firstExisting(["[data-tutorial-hint=page-title]", "h1", "[data-tutorial-hint=page-main]"]),
        title: label,
        description: `${label} is part of the working ERP. Read the heading, then use the content below to review or update records.`,
      },
      {
        element: workArea(),
        title: "Work in the main area",
        description:
          "Lists open into a record. Forms save from the header or the bottom of the page. Filters narrow what you see without changing posted data.",
      },
      {
        element: firstExisting([
          "[data-tutorial-hint=command-search]",
          "[data-tour-step=command-hint]",
          "[data-tutorial-hint=page-help]",
        ]),
        title: "Jump or replay",
        description:
          "Use Search or run in the top bar to jump elsewhere. Replay this tour from the page header whenever you need the steps again.",
      },
    ],
  };
  genericTours.set(route, tour);
  return tour;
}

function longestPrefix<T extends { route?: string; href?: string }>(
  items: T[],
  normalized: string,
  key: "route" | "href"
): T | null {
  let best: T | null = null;
  let bestLen = -1;
  for (const item of items) {
    const value = item[key];
    if (!value) continue;
    if (normalized.startsWith(value + "/") && value.length > bestLen) {
      best = item;
      bestLen = value.length;
    }
  }
  return best;
}

/**
 * Get tour definition for a pathname.
 * Exact hand-written tours win. A more specific screen beats a shorter parent tour,
 * so Journal Entries does not reuse the Finance dashboard tour.
 * Detail URLs such as /docs/sales-order/123 keep the parent document tour.
 */
export function getTourForRoute(pathname: string): TourDef | null {
  const normalized = normalizePath(pathname);
  if (TOUR_EXCLUDED_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    return null;
  }

  const exact = TUTORIAL_TOURS.find((tour) => tour.route === normalized);
  if (exact) return ensureInteractive(exact);

  const screens = getScreens();
  const exactScreen = screens.find((screen) => screen.href === normalized);
  const prefixScreen = longestPrefix(screens, normalized, "href");
  const prefixTour = longestPrefix(TUTORIAL_TOURS, normalized, "route");

  const screen = exactScreen ?? prefixScreen;
  if (screen) {
    const handWritten = TUTORIAL_TOURS.find((tour) => tour.route === screen.href);
    if (handWritten && (!prefixTour || handWritten.route.length >= prefixTour.route.length)) {
      return ensureInteractive(handWritten);
    }
    if (!prefixTour || screen.href.length > prefixTour.route.length) {
      return ensureInteractive(synthesizeTour(screen));
    }
  }

  if (prefixTour) return ensureInteractive(prefixTour);
  if (screen) return ensureInteractive(synthesizeTour(screen));
  return ensureInteractive(genericTour(normalized));
}
