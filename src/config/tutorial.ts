/**
 * Tutorial config: chapters aligned with nav, descriptions and Copilot prompts.
 * Used by the Tutorial page and PageHelp for route-based help.
 */

import { NAV_SECTIONS_CONFIG } from "@/config/navigation/sections";
import type { NavItemConfig } from "@/config/navigation/types";
import { ITEM_GUIDES } from "./tutorial-guides";

export interface TutorialItem {
  key: string;
  label: string;
  href: string;
  copilotPrompt?: string;
  /** Short explanation of what the page does and what the user sees. */
  guideSummary?: string;
  /** Optional "How to use this page" steps. */
  guideSteps?: string[];
}

export interface TutorialChapter {
  id: string;
  title: string;
  description: string;
  copilotPrompt: string;
  items: TutorialItem[];
}

/** Item-level prompts for key screens (override section default). */
const ITEM_PROMPTS: Partial<Record<string, string>> = {
  "treasury-payment-runs": "Explain payment runs, bank files, and approval flow.",
  "treasury-collections": "Suggest collection actions and prioritization.",
  "treasury-bank-accounts": "Explain bank account setup and GL mapping.",
  "treasury-cashflow": "Explain cashflow forecast and drilldowns to source docs.",
  "finance-bank-recon": "Explain bank reconciliation and matching.",
  "assets-register": "Explain asset register, depreciation methods, and linked vendor/invoice.",
  "assets-depreciation": "Explain depreciation runs and methods.",
  "assets-disposals": "Explain asset disposal and gain/loss accounting.",
  "payroll-payruns": "Explain pay run flow and statutory computation.",
  "payroll-statutories": "Explain VAT vs WHT in Kenya. Explain NSSF, NHIF, PAYE.",
  "projects-list": "Explain projects, cost centers, and linked transactions.",
  "intercompany-overview": "Explain consolidation and elimination entries.",
  "intercompany-transactions": "Explain intercompany transactions and reconciliation.",
  "settings-entities": "Explain multi-entity and intercompany accounts mapping.",
  "ap-three-way-match": "Explain three-way match: PO, receipt, and invoice.",
  "reports-saved": "Explain saved reports and how to create them.",
  "reports-scheduled": "Explain scheduled reports and delivery.",
  "automation-rules": "Explain automation rules: triggers, conditions, and actions.",
  "franchise-manage-outlets": "Explain how to add franchisees and give them login access.",
  "inventory-movements": "Guide me through this page: what it shows, how to filter and use the table, and how movements are created from documents.",
};

/** Section-level descriptions and default Copilot prompts. */
const CHAPTER_META: Record<
  string,
  { description: string; copilotPrompt: string }
> = {
  core: {
    description:
      "Control Tower, Dashboard, Approvals, and Work Queue. Your command center for KPIs, pending approvals, and tasks.",
    copilotPrompt:
      "Explain the Control Tower and dashboard. How do approvals and the work queue work?",
  },
  docs: {
    description:
      "Create and manage documents: Sales Orders, Purchase Orders, Goods Receipts, Invoices, and Journal Entries. All transactions start here.",
    copilotPrompt:
      "Explain the document center. How do I create a sales order, PO, or invoice?",
  },
  masters: {
    description:
      "Master data: Products, Parties (customers and suppliers), and Warehouses. Set these up before creating documents.",
    copilotPrompt:
      "Explain products, parties, and warehouses. How do I add a new product or customer?",
  },
  inventory: {
    description:
      "Stock levels, movements, receipts, costing, and stock explorer. Track quantity and value across warehouses.",
    copilotPrompt:
      "Explain inventory: stock levels, movements, and costing. How do I receive goods?",
  },
  warehouse: {
    description:
      "Warehouse operations: overview, transfers, pick & pack, putaway, bin locations, and cycle counts.",
    copilotPrompt:
      "Explain warehouse operations: transfers, pick and pack, and cycle counts.",
  },
  sales: {
    description:
      "Sales overview, quotes, orders, deliveries, invoices, customers, and returns. Full order-to-cash flow.",
    copilotPrompt:
      "Explain the sales flow: quotes, orders, deliveries, and invoices.",
  },
  purchasing: {
    description:
      "Purchase requests, POs, GRN, suppliers, AP bills, returns, and cash-to-weight audit. Procure-to-pay flow.",
    copilotPrompt:
      "Explain purchasing: requests, POs, receipts, and supplier invoices.",
  },
  pricing: {
    description:
      "Pricing overview, price lists, and pricing rules. Manage list prices and discounts.",
    copilotPrompt:
      "Explain pricing: price lists and pricing rules. How do tiered prices work?",
  },
  manufacturing: {
    description:
      "BOMs, routing, work orders, MRP, subcontracting, yield, and byproducts. Production and planning.",
    copilotPrompt:
      "Explain manufacturing: BOMs, work orders, and MRP. How do I run production?",
  },
  distribution: {
    description:
      "Routes, deliveries, trips, transfer planning, and collections. For distributors and field operations.",
    copilotPrompt:
      "Explain distribution: routes, trips, and deliveries. How do I plan a trip?",
  },
  franchise: {
    description:
      "Outlet workspace, manage franchisees, overview, commission, VMI, and comparison. For franchisors and franchisees.",
    copilotPrompt:
      "Explain franchise: outlet workspace, adding franchisees, and VMI.",
  },
  retail: {
    description:
      "Replenishment, promotions, and store performance. For retail and multi-outlet setups.",
    copilotPrompt:
      "Explain retail: replenishment and store performance.",
  },
  treasury: {
    description:
      "Treasury overview, payment runs, collections, bank accounts, cashflow, and bank reconciliation.",
    copilotPrompt:
      "Explain treasury: payment runs, collections, bank accounts, and cashflow.",
  },
  assets: {
    description:
      "Fixed assets: register, depreciation, and disposals. Track and depreciate assets.",
    copilotPrompt:
      "Explain fixed assets: register, depreciation, and disposals.",
  },
  projects: {
    description:
      "Projects, cost centers, timesheets. Project costing and linked transactions.",
    copilotPrompt:
      "Explain projects, cost centers, and timesheets. How do I track project burn?",
  },
  payroll: {
    description:
      "Payroll overview, employees, pay runs, payslips, and statutories (NSSF, NHIF, PAYE).",
    copilotPrompt:
      "Explain payroll: pay runs, payslips, and statutory deductions in Kenya.",
  },
  intercompany: {
    description:
      "Intercompany overview and transactions. Consolidation and elimination entries.",
    copilotPrompt:
      "Explain intercompany transactions and consolidation.",
  },
  finance: {
    description:
      "Finance dashboard, GL, chart of accounts, journals, AR, AP, payments, tax, statements, period close, budgets, ledger, and audit.",
    copilotPrompt:
      "Explain finance: GL, AR, AP, journals, and financial statements.",
  },
  crm: {
    description:
      "Accounts, activities, deals, and support tickets. Customer and opportunity management.",
    copilotPrompt:
      "Explain CRM: accounts, activities, deals, and tickets.",
  },
  reports: {
    description:
      "Report library, saved views, scheduled reports, exports, VAT and WHT summaries.",
    copilotPrompt:
      "Explain reports: saved views, scheduled reports, and VAT/WHT summaries.",
  },
  analytics: {
    description:
      "Analytics Studio, explore, insights, anomalies, simulations. Product, pricing, inventory, finance, and payroll analytics.",
    copilotPrompt:
      "Explain analytics: insights, anomalies, and simulations. How do I use the product or finance analytics?",
  },
  automation: {
    description:
      "Automation dashboard, rules, alerts, schedules, approval workflows, integrations, AI insights, and work queue.",
    copilotPrompt:
      "Explain automation: rules, workflows, and the work queue. How do I create a rule?",
  },
  settings: {
    description:
      "Organization, billing, entities, branches, users and roles, sequences, financial and tax settings, inventory and product settings.",
    copilotPrompt:
      "Explain settings: organization, users, financial setup, and tax configuration.",
  },
  help: {
    description:
      "Product tutorial and help. Learn the ERP by module and use Copilot for assistance on any page.",
    copilotPrompt:
      "I need help learning the ERP. Where do I start? How can I use the tutorial and Copilot?",
  },
};

function flattenNavItems(items: NavItemConfig[]): TutorialItem[] {
  const out: TutorialItem[] = [];
  for (const item of items) {
    const key = item.key;
    const href = item.href;
    if (href) {
      const guide = ITEM_GUIDES[key];
      out.push({
        key,
        label: item.label,
        href,
        copilotPrompt: ITEM_PROMPTS[key],
        guideSummary: guide?.guideSummary,
        guideSteps: guide?.guideSteps,
      });
    }
    if (item.children?.length) {
      out.push(...flattenNavItems(item.children));
    }
  }
  return out;
}

/** Build tutorial chapters from nav config. */
export const TUTORIAL_CHAPTERS: TutorialChapter[] = NAV_SECTIONS_CONFIG.map(
  (section) => {
    const meta = CHAPTER_META[section.key] ?? {
      description: `Learn about ${section.label}.`,
      copilotPrompt: `Explain ${section.label} and how to use it.`,
    };
    const items = flattenNavItems(section.items);
    return {
      id: section.key,
      title: section.label,
      description: meta.description,
      copilotPrompt: meta.copilotPrompt,
      items,
    };
  }
);

export interface TutorialForRoute {
  chapterId: string;
  chapterTitle: string;
  copilotPrompt: string;
  hrefToChapter: string;
  itemLabel?: string;
  /** Guide summary (item or chapter fallback). */
  guideSummary: string;
  /** Guide steps (item or empty). */
  guideSteps: string[];
}

/**
 * Get tutorial chapter and prompt for a given pathname.
 * Matches exact href first; then prefix match for dynamic routes (e.g. /docs/sales-order/123).
 */
export function getTutorialForRoute(pathname: string): TutorialForRoute | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  let best: { chapter: TutorialChapter; item?: TutorialItem; score: number } | null =
    null;

  for (const chapter of TUTORIAL_CHAPTERS) {
    for (const item of chapter.items) {
      const itemPath = item.href.replace(/\/$/, "") || "/";
      if (normalized === itemPath) {
        return {
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          copilotPrompt: item.copilotPrompt ?? chapter.copilotPrompt,
          hrefToChapter: `/tutorial/${chapter.id}`,
          itemLabel: item.label,
          guideSummary: item.guideSummary ?? chapter.description,
          guideSteps: item.guideSteps ?? [],
        };
      }
      if (normalized.startsWith(itemPath + "/") && itemPath.length > (best?.score ?? 0)) {
        best = { chapter, item, score: itemPath.length };
      }
    }
  }

  const firstSegment = normalized.split("/").filter(Boolean)[0];
  if (firstSegment && !best) {
    const chapterBySegment = TUTORIAL_CHAPTERS.find(
      (ch) => ch.items.some((it) => it.href.replace(/\/$/, "").startsWith("/" + firstSegment))
    );
    if (chapterBySegment) {
      best = { chapter: chapterBySegment, score: firstSegment.length };
    }
  }

  if (best) {
    return {
      chapterId: best.chapter.id,
      chapterTitle: best.chapter.title,
      copilotPrompt: best.item?.copilotPrompt ?? best.chapter.copilotPrompt,
      hrefToChapter: `/tutorial/${best.chapter.id}`,
      itemLabel: best.item?.label,
      guideSummary: best.item?.guideSummary ?? best.chapter.description,
      guideSteps: best.item?.guideSteps ?? [],
    };
  }
  return null;
}
