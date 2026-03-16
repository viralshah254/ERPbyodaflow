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
