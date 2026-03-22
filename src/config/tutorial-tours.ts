/**
 * Spotlight tour definitions for high-value pages.
 * Keys match route pathnames (normalized). Steps use CSS selectors or data-tour-step.
 */

export interface TourStep {
  element: string;
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
      { element: "h1", title: "Users & Roles", description: "Invite users, assign roles, and enable or disable access. Enable Copilot per user here." },
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
        description: "Inventory value by product, category, or warehouse for reporting and period-end checks.",
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
          "Each card is a journey step with CTAs (e.g. open POs, receiving, landed cost, finance review). Work active steps first; use Finance review when procurement and treasury must align.",
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
        description: "Returns to suppliers and debit notes: reduce payables and adjust inventory.",
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

/**
 * Get tour definition for a pathname.
 * Prefers exact route match; otherwise longest prefix match so /docs/sales-order gets the SO tour, not the hub.
 */
export function getTourForRoute(pathname: string): TourDef | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const exact = TUTORIAL_TOURS.find((t) => normalized === t.route);
  if (exact) return exact;

  let best: TourDef | null = null;
  let bestLen = -1;
  for (const t of TUTORIAL_TOURS) {
    if (normalized.startsWith(t.route + "/") && t.route.length > bestLen) {
      best = t;
      bestLen = t.route.length;
    }
  }
  return best;
}
