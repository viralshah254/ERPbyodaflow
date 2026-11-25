import { resolveScreenGuide } from "@/lib/tutorial/screen-guides";

export const APP_TITLE = "ERP by OdaFlow";

const SECTION_BY_SEGMENT: Record<string, string> = {
  analytics: "Analytics",
  ap: "Payables",
  approvals: "Approvals",
  ar: "Receivables",
  assets: "Assets",
  automation: "Automation",
  "control-tower": "Control tower",
  crm: "CRM",
  distribution: "Distribution",
  documents: "Documents",
  finance: "Finance",
  franchise: "Franchise",
  inbox: "Inbox",
  intercompany: "Intercompany",
  inventory: "Inventory",
  master: "Masters",
  onboarding: "Onboarding",
  operations: "Operations",
  payroll: "Payroll",
  pricing: "Pricing",
  projects: "Projects",
  purchasing: "Purchasing",
  reports: "Reports",
  retail: "Retail",
  sales: "Sales",
  settings: "Settings",
  tasks: "Tasks",
  timesheets: "Timesheets",
  treasury: "Treasury",
  tutorial: "Tutorial",
  warehouse: "Warehouse",
  work: "Work",
};

const SALES_DOCS = new Set(["quote", "sales-order", "delivery-note", "invoice", "credit-note", "debit-note"]);
const PURCHASE_DOCS = new Set(["purchase-request", "purchase-order", "grn", "bill", "purchase-credit-note", "purchase-debit-note"]);

function sectionFor(segments: string[], manufacturingLabel: string): string {
  const [first, second] = segments;
  if (first === "manufacturing") return manufacturingLabel;
  if (first === "docs") {
    if (second && SALES_DOCS.has(second)) return "Sales";
    if (second && PURCHASE_DOCS.has(second)) return "Purchasing";
    if (second === "journal") return "Finance";
    return "Documents";
  }
  return first ? SECTION_BY_SEGMENT[first] ?? "" : "";
}

/** Browser tab title: the screen first, so a row of tabs stays readable, then its area. */
export function pageTitleFor(pathname: string, manufacturingLabel = "Manufacturing"): string {
  const screen = resolveScreenGuide(pathname)?.title?.trim() ?? "";
  const section = sectionFor(pathname.split(/[?#]/)[0].split("/").filter(Boolean), manufacturingLabel);
  const parts = [screen, section && section.toLowerCase() !== screen.toLowerCase() ? section : "", APP_TITLE].filter(Boolean);
  return parts.join(" · ");
}
