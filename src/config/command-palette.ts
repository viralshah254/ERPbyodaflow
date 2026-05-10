/**
 * Command palette static configuration.
 *
 * COMMAND_NAV_FALLBACK_ITEMS contains only routes NOT present in the sidebar nav
 * (e.g. deep utility pages, dev tools, quick-search shortcuts). The main nav list
 * is derived dynamically from the live sidebar via flattenNavSectionsToCommandItems()
 * so it stays in sync with permissions, feature flags, and org modules.
 */

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
  docType:
    | "quote"
    | "sales-order"
    | "delivery-note"
    | "invoice"
    | "credit-note"
    | "debit-note"
    | "purchase-request"
    | "purchase-order"
    | "grn"
    | "bill"
    | "purchase-credit-note"
    | "purchase-debit-note"
    | "journal";
}

export interface CommandItemCopilot extends CommandItemBase {
  group: "copilot";
  copilotPrompt: string;
}

export type CommandItem = CommandItemNav | CommandItemCreate | CommandItemCopilot;

/**
 * Extra routes that don't appear in the sidebar nav tree but should be reachable
 * from the palette (e.g. deep utility pages, QA tool, shortcut search pages).
 */
export const COMMAND_NAV_FALLBACK_ITEMS: CommandItemNav[] = [
  { id: "nav-dev", label: "Dev (QA)", group: "nav", href: "/dev", keywords: ["dev", "qa", "route", "audit", "health"], icon: "Wrench" },
  { id: "search-parties", label: "Search parties", group: "nav", href: "/master/parties", keywords: ["search", "masters", "customers", "suppliers", "parties"], icon: "Search" },
  { id: "nav-inbox", label: "Inbox (alerts & tasks)", group: "nav", href: "/inbox", keywords: ["alerts", "tasks", "notifications"], icon: "Inbox" },
  { id: "nav-work-queue", label: "Work queue", group: "nav", href: "/work/queue", keywords: ["work", "queue", "payroll", "tax", "pricing", "alerts"], icon: "ListTodo" },
];

/** @deprecated Use COMMAND_NAV_FALLBACK_ITEMS + flattenNavSectionsToCommandItems instead. */
export const COMMAND_NAV_ITEMS: CommandItemNav[] = COMMAND_NAV_FALLBACK_ITEMS;

export const COMMAND_CREATE_ITEMS: CommandItemCreate[] = [
  { id: "create-quote", label: "Create Quote", group: "create", docType: "quote", keywords: ["quote", "docs"], icon: "FileText" },
  { id: "create-so", label: "Create Sales Order", group: "create", docType: "sales-order", keywords: ["so", "order", "docs"], icon: "ShoppingCart" },
  { id: "create-dn", label: "Create Delivery Note", group: "create", docType: "delivery-note", keywords: ["delivery", "dn", "docs"], icon: "Truck" },
  { id: "create-inv", label: "Create Invoice", group: "create", docType: "invoice", keywords: ["invoice", "docs"], icon: "Receipt" },
  { id: "create-sales-cn", label: "Create Sales Credit Note", group: "create", docType: "credit-note", keywords: ["credit note", "sales return", "docs"], icon: "RotateCcw" },
  { id: "create-sales-dn", label: "Create Sales Debit Note", group: "create", docType: "debit-note", keywords: ["debit note", "sales adjustment", "docs"], icon: "BadgePlus" },
  { id: "create-pr", label: "Create Purchase Request", group: "create", docType: "purchase-request", keywords: ["pr", "requisition", "docs"], icon: "ClipboardList" },
  { id: "create-po", label: "Create Purchase Order", group: "create", docType: "purchase-order", keywords: ["po", "order", "docs"], icon: "FileText" },
  { id: "create-grn", label: "Create Goods Receipt", group: "create", docType: "grn", keywords: ["grn", "receipt", "docs"], icon: "PackageCheck" },
  { id: "create-bill", label: "Create Bill", group: "create", docType: "bill", keywords: ["bill", "supplier invoice", "docs"], icon: "Receipt" },
  { id: "create-purchase-cn", label: "Create Purchase Credit Note", group: "create", docType: "purchase-credit-note", keywords: ["purchase credit note", "supplier adjustment", "docs"], icon: "RotateCcw" },
  { id: "create-purchase-dn", label: "Create Purchase Debit Note", group: "create", docType: "purchase-debit-note", keywords: ["purchase debit note", "purchase return", "docs"], icon: "BadgePlus" },
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
