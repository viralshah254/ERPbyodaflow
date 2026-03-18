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
        description: "Your main command center. View KPIs, recent activity, and quick links to documents and modules.",
      },
      {
        element: "[data-tour-step=dashboard-kpis]",
        title: "Key metrics",
        description: "KPI cards show your most important numbers. Click a card to drill into detail.",
      },
      {
        element: "[data-tour-step=command-hint]",
        title: "Quick search",
        description: "Press ⌘K to open the command palette. Search for any page or ask Copilot.",
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
        description: "All transaction documents start here. Choose a type to list or create.",
      },
      {
        element: "[data-tour-step=doc-type-list]",
        title: "Document types",
        description: "Sales orders, purchase orders, invoices, and more. Click to open the list or create new.",
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
];

/**
 * Get tour definition for a pathname.
 */
export function getTourForRoute(pathname: string): TourDef | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return TUTORIAL_TOURS.find((t) => {
    if (normalized === t.route) return true;
    if (normalized.startsWith(t.route + "/")) return true;
    return false;
  }) ?? null;
}
