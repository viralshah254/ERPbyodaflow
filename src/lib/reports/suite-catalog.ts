import { SAGE_REPORT_MAP, type SageReportEntry } from "./sage-report-map";
export const SUITE_CARDS = [
  { id: "general-ledger", name: "General ledger statement", group: "General Ledger", permissions: ["finance.gl.read"], description: "Opening balances, posted activity and account running balances by currency." },
  { id: "trial-balance", name: "Trial balance movement", group: "General Ledger", permissions: ["finance.gl.read"], description: "Opening and period movements, closing debit/credit balances and ledger differences." },
  { id: "stock-statement", name: "Stock statement", group: "Inventory", permissions: ["inventory.read"], description: "Opening, receipts, issues and closing quantities by warehouse, SKU and variant." },
  { id: "stock-valuation", name: "Stock valuation", group: "Inventory", permissions: ["inventory.read", "finance.read"], description: "Current stock values using your configured costing method, with missing costs flagged." },
  { id: "stock-lots", name: "Lot stock register", group: "Inventory", permissions: ["inventory.read"], description: "Find each lot, warehouse, remaining quantity, expiry date and quality status." },
  { id: "expiry-stock", name: "Expiry & shelf-life exceptions", group: "Inventory", permissions: ["inventory.read"], description: "Review expired, near-expiry and undated stock in operational 30/90-day bands." },
  { id: "qc-held-stock", name: "Quality-held stock", group: "Inventory", permissions: ["inventory.read"], description: "See quarantined and rejected lots before stock is released for use." },
  { id: "inventory-labels", name: "Inventory label register", group: "Inventory", permissions: ["inventory.read"], description: "Export stored SKU, size, UOM and barcode identifiers for label preparation." },
  { id: "customer-balances", name: "Customer balance summary", group: "Accounts Receivable", permissions: ["finance.ar.read"], description: "Current customer debits, credits and net balances, separated by currency." },
  { id: "supplier-balances", name: "Supplier balance summary", group: "Accounts Payable", permissions: ["finance.ap.read"], description: "Current supplier balances and credits, with statement drill-through." },
  { id: "customer-aging", name: "Customer outstanding & aging", group: "Accounts Receivable", permissions: ["finance.ar.read"], description: "Inspect open invoices, receipts and credits with recorded due dates and aging." },
  { id: "supplier-aging", name: "Supplier outstanding & aging", group: "Accounts Payable", permissions: ["finance.ap.read"], description: "Plan supplier follow-up using signed open balances and due-date exceptions." },
  { id: "production-output", name: "Production output & costing", group: "Manufacturing", permissions: ["manufacturing.workorders.read", "finance.read"], description: "Review posted completion quantities, scrap and original input/output cost evidence." },
  { id: "production-material-variance", name: "Production material variance", group: "Manufacturing", permissions: ["manufacturing.workorders.read"], description: "Compare frozen requirements for actual output with cumulative consumed materials." },
  { id: "production-process", name: "Production operation progress", group: "Manufacturing", permissions: ["manufacturing.workorders.read"], description: "Follow routing stages, work centres, operators and recorded quality outcomes." },
] as const;
export const SUITE_DESCRIPTIONS = Object.fromEntries(SUITE_CARDS.map((c) => [c.id, c.description]));
export const REPORT_SUITE_CATALOG: SageReportEntry[] = [
  ...SAGE_REPORT_MAP,
  ...SUITE_CARDS.map((card) => ({ id: `suite-${card.id}`, name: card.name, group: card.group, permission: card.permissions[0], additionalPermissions: [...card.permissions], status: "new-report" as const, href: `/reports/operations/${card.id}`, phase: 1, kind: "report" as const })),
  { id: "suite-supplier-statements", name: "Supplier statements", group: "Accounts Payable", permission: "finance.ap.read", status: "workspace", href: "/ap/statements", phase: 1, kind: "report" },
];
