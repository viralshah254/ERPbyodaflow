/** Command palette entries: nav, create doc, Copilot, search. */

export type CommandGroup = "nav" | "create" | "copilot" | "search";

export interface CommandItemBase {
  id: string;
  label: string;
  keywords?: string[];
  icon?: string;
}

export interface CommandItemNav extends CommandItemBase {
  group: "nav";
  href: string;
}

export interface CommandItemCreate extends CommandItemBase {
  group: "create";
  docType: "quote" | "sales-order" | "delivery-note" | "invoice" | "purchase-request" | "purchase-order" | "grn" | "bill" | "journal";
}

export interface CommandItemCopilot extends CommandItemBase {
  group: "copilot";
  copilotPrompt: string;
}

export type CommandItem = CommandItemNav | CommandItemCreate | CommandItemCopilot;

export const COMMAND_NAV_ITEMS: CommandItemNav[] = [
  { id: "nav-dashboard", label: "Dashboard", group: "nav", href: "/dashboard", keywords: ["home"], icon: "LayoutDashboard" },
  { id: "nav-docs", label: "Document Center", group: "nav", href: "/docs", keywords: ["documents", "docs", "center"], icon: "FileText" },
  { id: "nav-approvals-inbox", label: "Approvals Inbox", group: "nav", href: "/approvals/inbox", keywords: ["approvals", "inbox", "pending"], icon: "Inbox" },
  { id: "nav-approvals-requests", label: "My approval requests", group: "nav", href: "/approvals/requests", keywords: ["approvals", "requests", "submitted"], icon: "Send" },
  { id: "nav-inbox", label: "Inbox (alerts & tasks)", group: "nav", href: "/inbox", keywords: ["alerts", "tasks"], icon: "Inbox" },
  { id: "nav-products", label: "Products", group: "nav", href: "/inventory/products", keywords: ["inventory", "search"], icon: "Package" },
  { id: "nav-orders", label: "Sales Orders", group: "nav", href: "/docs/sales-order", keywords: ["sales", "orders", "docs", "SO"], icon: "ShoppingCart" },
  { id: "nav-po", label: "Purchase Orders", group: "nav", href: "/docs/purchase-order", keywords: ["purchasing", "orders", "docs", "PO"], icon: "FileText" },
  { id: "nav-invoices", label: "Invoices", group: "nav", href: "/docs/invoice", keywords: ["invoices", "sales", "docs", "billing"], icon: "Receipt" },
  { id: "nav-bills", label: "Bills", group: "nav", href: "/ap/bills", keywords: ["bills", "AP", "supplier invoices", "docs"], icon: "FileText" },
  { id: "nav-deliveries", label: "Deliveries", group: "nav", href: "/sales/deliveries", keywords: ["deliveries", "sales", "shipping", "dispatch"], icon: "Truck" },
  { id: "nav-grn", label: "Goods Receipt (GRN)", group: "nav", href: "/inventory/receipts", keywords: ["grn", "receipt", "goods", "receipts", "docs", "purchasing"], icon: "PackageCheck" },
  { id: "nav-finance", label: "Finance", group: "nav", href: "/finance", keywords: ["accounting"], icon: "TrendingUp" },
  { id: "nav-journals", label: "Journal Entries", group: "nav", href: "/finance/journals", keywords: ["journal", "journals", "docs", "GL", "entries"], icon: "FileEdit" },
  { id: "nav-reports", label: "Reports", group: "nav", href: "/reports", keywords: ["reporting"], icon: "FileText" },
  { id: "nav-analytics", label: "Analytics Studio", group: "nav", href: "/analytics", keywords: ["analytics", "studio", "intelligence", "metrics", "explore", "dashboards"], icon: "BarChart3" },
  { id: "nav-analytics-explore", label: "Analytics Explore", group: "nav", href: "/analytics/explore", keywords: ["analytics", "explore", "metric", "dimension"], icon: "Compass" },
  { id: "nav-analytics-insights", label: "Analytics Insights", group: "nav", href: "/analytics/insights", keywords: ["analytics", "insights", "ai"], icon: "Lightbulb" },
  { id: "nav-analytics-anomalies", label: "Analytics Anomalies", group: "nav", href: "/analytics/anomalies", keywords: ["analytics", "anomalies", "detection"], icon: "AlertTriangle" },
  { id: "nav-analytics-simulations", label: "Analytics Simulations", group: "nav", href: "/analytics/simulations", keywords: ["analytics", "simulations", "what-if"], icon: "SlidersHorizontal" },
  { id: "nav-analytics-products", label: "Analytics Products", group: "nav", href: "/analytics/products", keywords: ["analytics", "products", "margin"], icon: "Package" },
  { id: "nav-analytics-pricing", label: "Analytics Pricing", group: "nav", href: "/analytics/pricing", keywords: ["analytics", "pricing", "leakage"], icon: "TrendingUp" },
  { id: "nav-pricing-overview", label: "Pricing Overview", group: "nav", href: "/pricing/overview", keywords: ["pricing", "price lists", "overview"], icon: "LayoutDashboard" },
  { id: "nav-pricing-lists", label: "Price Lists", group: "nav", href: "/pricing/price-lists", keywords: ["pricing", "price lists", "wholesale", "retail", "distributor"], icon: "List" },
  { id: "nav-pricing-rules", label: "Pricing Rules", group: "nav", href: "/pricing/rules", keywords: ["pricing", "rules", "discount", "policies"], icon: "Workflow" },
  { id: "nav-analytics-inventory", label: "Analytics Inventory", group: "nav", href: "/analytics/inventory", keywords: ["analytics", "inventory", "stockout"], icon: "Warehouse" },
  { id: "nav-analytics-finance", label: "Analytics Finance", group: "nav", href: "/analytics/finance", keywords: ["analytics", "finance", "cash"], icon: "Landmark" },
  { id: "nav-analytics-payroll", label: "Analytics Payroll", group: "nav", href: "/analytics/payroll", keywords: ["analytics", "payroll", "labor"], icon: "CreditCard" },
  { id: "nav-coa", label: "Chart of Accounts", group: "nav", href: "/settings/financial/chart-of-accounts", keywords: ["coa", "accounts", "financial"], icon: "ListTree" },
  { id: "nav-taxes", label: "Taxes", group: "nav", href: "/settings/financial/taxes", keywords: ["tax", "vat", "financial"], icon: "Receipt" },
  { id: "nav-fiscal", label: "Fiscal years", group: "nav", href: "/settings/financial/fiscal-years", keywords: ["fiscal", "periods", "close"], icon: "Calendar" },
  { id: "nav-users", label: "Users & Roles", group: "nav", href: "/settings/users-roles", keywords: ["rbac", "users", "roles", "permissions"], icon: "Users" },
  { id: "nav-sequences", label: "Numbering sequences", group: "nav", href: "/settings/sequences", keywords: ["numbering", "sequences", "prefix"], icon: "Hash" },
  { id: "nav-warehouse", label: "Warehouse Overview", group: "nav", href: "/warehouse/overview", keywords: ["warehouse", "pick", "pack", "putaway", "transfers"], icon: "LayoutDashboard" },
  { id: "nav-warehouse-transfers", label: "Warehouse Transfers", group: "nav", href: "/warehouse/transfers", keywords: ["transfers", "warehouse"], icon: "Truck" },
  { id: "nav-costing", label: "Inventory Costing", group: "nav", href: "/inventory/costing", keywords: ["costing", "valuation", "landed cost"], icon: "Calculator" },
  { id: "nav-boms", label: "BOMs", group: "nav", href: "/manufacturing/boms", keywords: ["bom", "bills of material", "formula", "manufacturing"], icon: "List" },
  { id: "nav-manufacturing-routing", label: "Manufacturing Routing", group: "nav", href: "/manufacturing/routing", keywords: ["routing", "work centers", "operations", "manufacturing"], icon: "GitBranch" },
  { id: "nav-mrp", label: "MRP", group: "nav", href: "/manufacturing/mrp", keywords: ["mrp", "planning", "manufacturing", "requirements"], icon: "BarChart3" },
  { id: "nav-treasury", label: "Treasury", group: "nav", href: "/treasury/overview", keywords: ["treasury", "payments", "cashflow", "bank"], icon: "Landmark" },
  { id: "nav-payment-runs", label: "Payment runs", group: "nav", href: "/treasury/payment-runs", keywords: ["payment run", "pay run", "AP", "supplier", "runs"], icon: "CreditCard" },
  { id: "nav-collections", label: "Collections", group: "nav", href: "/treasury/collections", keywords: ["collections", "AR", "receipts", "cash", "customer payments"], icon: "Receipt" },
  { id: "nav-bank-recon", label: "Bank reconciliation", group: "nav", href: "/finance/bank-recon", keywords: ["bank", "reconcile", "statement"], icon: "Wallet" },
  { id: "nav-assets", label: "Fixed Assets", group: "nav", href: "/assets/overview", keywords: ["assets", "depreciation", "disposals", "register"], icon: "BookOpen" },
  { id: "nav-projects", label: "Projects", group: "nav", href: "/projects/overview", keywords: ["projects", "timesheets", "budget", "cost center"], icon: "FolderKanban" },
  { id: "nav-timesheets", label: "Timesheets", group: "nav", href: "/timesheets", keywords: ["timesheets", "hours", "projects"], icon: "Clock" },
  { id: "nav-payroll", label: "Payroll", group: "nav", href: "/payroll/overview", keywords: ["payroll", "employees", "pay runs", "payslips", "statutories"], icon: "CreditCard" },
  { id: "nav-payroll-employees", label: "Payroll Employees", group: "nav", href: "/payroll/employees", keywords: ["payroll", "employees"], icon: "Users" },
  { id: "nav-payroll-payruns", label: "Pay runs", group: "nav", href: "/payroll/pay-runs", keywords: ["payroll", "pay run"], icon: "CreditCard" },
  { id: "nav-payroll-payslips", label: "Payslips", group: "nav", href: "/payroll/payslips", keywords: ["payroll", "payslip"], icon: "FileText" },
  { id: "nav-intercompany", label: "Intercompany", group: "nav", href: "/intercompany/overview", keywords: ["intercompany", "entities", "consolidation", "IC"], icon: "ArrowLeftRight" },
  { id: "nav-compliance", label: "Compliance", group: "nav", href: "/settings/compliance", keywords: ["compliance", "tax", "e-invoicing", "withholding"], icon: "ShieldCheck" },
  { id: "nav-tax-kenya", label: "Kenya tax profile", group: "nav", href: "/settings/tax/kenya", keywords: ["tax", "kenya", "vat", "wht", "profile"], icon: "Globe" },
  { id: "nav-tax-vat", label: "VAT settings", group: "nav", href: "/settings/tax/vat", keywords: ["tax", "vat", "kenya"], icon: "Receipt" },
  { id: "nav-tax-withholding", label: "Withholding tax", group: "nav", href: "/settings/tax/withholding", keywords: ["tax", "wht", "withholding", "kenya"], icon: "Percent" },
  { id: "nav-tax-mappings", label: "Tax mappings", group: "nav", href: "/settings/tax/tax-mappings", keywords: ["tax", "mappings", "coa", "vat", "wht"], icon: "Link" },
  { id: "nav-vat-summary", label: "VAT summary report", group: "nav", href: "/reports/vat-summary", keywords: ["vat", "report", "summary"], icon: "Receipt" },
  { id: "nav-wht-summary", label: "WHT summary report", group: "nav", href: "/reports/wht-summary", keywords: ["wht", "withholding", "report", "summary"], icon: "Percent" },
  { id: "nav-notifications", label: "Notifications", group: "nav", href: "/settings/notifications", keywords: ["notifications", "email", "sms", "whatsapp"], icon: "Bell" },
  { id: "nav-onboarding", label: "Setup / Onboarding", group: "nav", href: "/onboarding", keywords: ["onboarding", "setup", "checklist"], icon: "ClipboardCheck" },
  { id: "nav-work-queue", label: "Work queue", group: "nav", href: "/work/queue", keywords: ["work", "queue", "payroll", "tax", "pricing", "alerts"], icon: "ListTodo" },
  { id: "nav-dev", label: "Dev (QA)", group: "nav", href: "/dev", keywords: ["dev", "qa", "route", "audit", "health"], icon: "Wrench" },
  { id: "nav-settings", label: "Settings", group: "nav", href: "/settings/org", keywords: ["org", "preferences"], icon: "Settings" },
  { id: "search-products", label: "Search products", group: "nav", href: "/inventory/products", keywords: ["search", "masters", "products"], icon: "Search" },
  { id: "search-parties", label: "Search parties", group: "nav", href: "/master/parties", keywords: ["search", "masters", "customers", "suppliers", "parties"], icon: "Search" },
];

export const COMMAND_CREATE_ITEMS: CommandItemCreate[] = [
  { id: "create-quote", label: "Create Quote", group: "create", docType: "quote", keywords: ["quote", "docs"], icon: "FileText" },
  { id: "create-so", label: "Create Sales Order", group: "create", docType: "sales-order", keywords: ["so", "order", "docs"], icon: "ShoppingCart" },
  { id: "create-dn", label: "Create Delivery Note", group: "create", docType: "delivery-note", keywords: ["delivery", "dn", "docs"], icon: "Truck" },
  { id: "create-inv", label: "Create Invoice", group: "create", docType: "invoice", keywords: ["invoice", "docs"], icon: "Receipt" },
  { id: "create-pr", label: "Create Purchase Request", group: "create", docType: "purchase-request", keywords: ["pr", "requisition", "docs"], icon: "ClipboardList" },
  { id: "create-po", label: "Create Purchase Order", group: "create", docType: "purchase-order", keywords: ["po", "order", "docs"], icon: "FileText" },
  { id: "create-grn", label: "Create Goods Receipt", group: "create", docType: "grn", keywords: ["grn", "receipt", "docs"], icon: "PackageCheck" },
  { id: "create-bill", label: "Create Bill", group: "create", docType: "bill", keywords: ["bill", "supplier invoice", "docs"], icon: "Receipt" },
  { id: "create-je", label: "Create Journal Entry", group: "create", docType: "journal", keywords: ["journal", "je", "docs"], icon: "FileEdit" },
];

export const COMMAND_COPILOT_ITEMS: CommandItemCopilot[] = [
  { id: "copilot-ask", label: "Ask Copilot about this page", group: "copilot", copilotPrompt: "Explain this page and suggest next steps.", keywords: ["ai", "help"], icon: "Sparkles" },
  { id: "copilot-open", label: "Open Copilot", group: "copilot", copilotPrompt: "", keywords: ["ai", "chat"], icon: "MessageSquare" },
  { id: "copilot-vat-wht", label: "Explain VAT vs WHT in Kenya", group: "copilot", copilotPrompt: "Explain VAT vs WHT in Kenya. When to apply each.", keywords: ["vat", "wht", "kenya", "tax"], icon: "Receipt" },
  { id: "copilot-vat-higher", label: "Why is VAT higher this month?", group: "copilot", copilotPrompt: "Why is VAT higher this month? Summarize output vs input.", keywords: ["vat", "summary", "tax"], icon: "TrendingUp" },
];

export function getCreateDocHref(docType: string): string {
  return `/docs/${docType}/new`;
}
