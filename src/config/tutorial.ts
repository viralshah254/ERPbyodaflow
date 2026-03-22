/**
 * Tutorial config: chapters aligned with nav, descriptions and Copilot prompts.
 * Used by the Tutorial page and PageHelp for route-based help.
 */

import { NAV_SECTIONS_CONFIG } from "@/config/navigation/sections";
import type { NavItemConfig } from "@/config/navigation/types";
import {
  ITEM_GUIDES,
  ORPHAN_ROUTE_GUIDES,
  getMasterProductOrphanGuide,
  type ElementHint,
} from "./tutorial-guides";

export interface TutorialItem {
  key: string;
  label: string;
  href: string;
  copilotPrompt?: string;
  /** Short explanation of what the page does and what the user sees. */
  guideSummary?: string;
  /** Optional "How to use this page" steps. */
  guideSteps?: string[];
  /** Optional power-user shortcuts and tips. */
  guideTips?: string[];
  /** Optional element-level hints (selector + hint text). */
  elementHints?: ElementHint[];
  /** Recommended next step after this page. */
  recommendedNextStep?: { label: string; href: string };
}

export interface TutorialChapter {
  id: string;
  title: string;
  description: string;
  copilotPrompt: string;
  items: TutorialItem[];
}

/** Item-level prompts for key screens (override section default). Sessions 1–2 use fuller prompts for Copilot defaults. */
const ITEM_PROMPTS: Partial<Record<string, string>> = {
  "control-tower":
    "Act as a CFO/COO coach for the Control Tower: walk through each KPI area, what ‘good’ vs ‘bad’ looks like, which exceptions to clear first, and how this screen differs from the personal Dashboard. Suggest a 10-minute daily routine.",
  dashboard:
    "Explain this Dashboard as a daily driver for my role: which widgets to trust first, how branch/org context affects numbers, how to drill to lists, and how ⌘K/Ctrl+K and Copilot fit in. Mention what to configure in Setup if tiles are empty.",
  approvals:
    "Differentiate Approvals hub, Approvals Inbox, My requests, and the global Inbox. Explain when an item appears here, how approval policies work at a high level, and what I should verify before approving POs or journals.",
  "approvals-inbox":
    "Give a step-by-step approval discipline: open document, verify line amounts/tax/currency, check attachments, approve or reject with comments, and when to escalate. Include audit and segregation-of-duties considerations.",
  "approvals-requests":
    "Explain how to track my submitted approvals, read rejection comments, resubmit correctly, and avoid duplicate documents when something is rejected.",
  tasks:
    "Explain Tasks vs Approvals vs Inbox: how tasks are created, how to complete or reassign, and how to link work to the underlying ERP record.",
  "docs-so":
    "Give a full order-to-cash narrative for Sales Orders: create → lines → pricing/tax → approval → delivery → invoice. Call out credit, stock, and linkage best practices.",
  "docs-po":
    "Give a full procure-to-pay narrative for Purchase Orders: create → approval → GRN → supplier invoice → payment. Include three-way match and variance handling.",
  "docs-grn":
    "Explain GRN in depth: PO linkage, partial receipts, lot/batch, posting to stock, and what to do before the supplier invoice lands in AP.",
  "docs-invoice":
    "Explain sales vs purchase invoices: draft vs posted, AR/AP, tax, FX, and when to use credit/debit notes instead of editing posted invoices.",
  "docs-credit-note":
    "Explain sales credit notes: when to use them vs returns, link to original invoice, revenue/AR/tax impact, and inventory when applicable.",
  "docs-debit-note":
    "Explain sales debit notes: appropriate charges, tax, AR impact, and customer communication.",
  "docs-purchase-credit-note":
    "Explain supplier credit notes: linkage to bills, inventory returns, and AP impact.",
  "docs-purchase-debit-note":
    "Explain purchase debit notes: extra supplier charges, AP impact, and coordination with GRN.",
  "docs-journal":
    "Explain manual journals: period control, accruals vs cash, balancing, supporting narratives, and who should post.",
  "masters-hub":
    "Explain master data sequencing: parties, products, warehouses, tax, before transactions. Include duplicate prevention and governance.",
  "inventory-products":
    "Explain this inventory-by-product view: on-hand, reserved, available, value, and how to investigate anomalies via movements.",
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
  "inventory-movements":
    "Deep-dive Stock Movements: column-by-column meaning, how to filter for investigations, how references tie to documents, export for audit, and common root causes of unexpected rows.",
  "docs-hub":
    "Explain the Document Center as a map of all document types: typical order-to-cash and procure-to-pay paths, what each tile opens, and how document linking supports traceability and month-end.",
  "masters-products":
    "Explain product master end-to-end: identifiers, UOM, tax, variants/packaging/pricing tabs, and validation before go-live.",
  "masters-parties":
    "Explain party master for customers and suppliers: legal, tax, credit, banking, duplicates, and handoff to AR/AP.",
  "inventory-stock-levels":
    "Explain how to read stock levels: on-hand vs reserved vs available, warehouse splits, reorder logic, and when to jump to movements or documents.",
  "finance-chart-of-accounts": "Explain the chart of accounts. How do I add or edit accounts? What account types exist?",
  "sales-orders": "Explain the sales order flow. How do I create an order, post delivery, and invoice?",
  "purchasing-orders": "Explain purchase orders. How do I create a PO, receive goods, and match the invoice?",
  // Session 2 — Inventory B, Warehouse, Sales, Purchasing (full prompts)
  "inventory-receipts":
    "Explain the GRN list for receivers: statuses, creating from PO, posting, variance, and handoff to putaway and AP.",
  "inventory-receiving":
    "Explain the receiving queue: prioritisation, capturing quantities and lots, exceptions, and coordination with buyers.",
  "inventory-costing":
    "Explain costing methods, when to run costing, how inventory ties to GL, and what breaks margin if cost is wrong.",
  "inventory-stock-explorer":
    "Explain how to use Stock Explorer for investigations: filters, time ranges, drilling to movements, and when to escalate to finance.",
  "inventory-valuation":
    "Explain valuation for month-end: scopes, export, reconciliation to GL, and FX if applicable.",
  "inventory-transfers":
    "Explain inter-warehouse transfers: availability, reservations, in-transit, posting, and reconciliation.",
  "inventory-stocktake":
    "Explain physical counts: planning, blind counts, variance approval, posting adjustments, and root-cause analysis.",
  "inventory-warehouses":
    "Explain warehouse and location hierarchy: bins, capacity, and impact on picks and transfers.",
  "warehouse-overview":
    "Explain how a warehouse manager uses this overview: priorities across pick, putaway, transfer, and count backlogs.",
  "warehouse-transfers":
    "Explain execution of transfers: picking, shipping, receiving, losses in transit, and system posting order.",
  "warehouse-pick-pack":
    "Explain pick/pack best practices: accuracy, shorts, staging, and alignment with delivery documents.",
  "warehouse-putaway":
    "Explain putaway discipline: from dock to bin, system updates, and impact on available-to-promise.",
  "warehouse-bin-locations":
    "Explain bin master maintenance and how bin accuracy affects pick rates and cycle counts.",
  "warehouse-cycle-counts":
    "Explain running cycle counts from the warehouse lens: scheduling, recounts, and posting adjustments.",
  "sales-overview":
    "Interpret sales KPIs: revenue, margin, backlog, and which downstream screen to open for each problem pattern.",
  "sales-quotes":
    "Explain quote-to-order: validity, pricing authority, conversion, and pipeline hygiene.",
  "sales-deliveries":
    "Explain delivery posting: partials, backorders, stock impact, and alignment with invoicing policy.",
  "sales-invoices":
    "Explain billing operations: drafts, posting, AR, tax, integrations (e-invoice), and collections handoff.",
  "sales-customers":
    "Explain customer master for sales: credit, pricing, contacts, and dispute handling.",
  "sales-returns":
    "Explain returns and credit notes: RMA, stock disposition, AR, and analysis of return reasons.",
  "purchasing-requests":
    "Explain requisitions: intake, approval matrices, conversion to PO, and duplicate prevention.",
  "purchasing-guided-sourcing-flow":
    "Explain the procurement sourcing journey: flow health metrics, each step card, landed cost, variance, and finance review handoff.",
  "purchasing-grn":
    "Explain GRN from the buyer/receiver perspective: PO compliance, supplier performance, and AP readiness.",
  "purchasing-suppliers":
    "Explain supplier lifecycle: onboarding, compliance, performance, and payment terms.",
  "purchasing-supplier-invoices":
    "Explain AP bill processing: match, tax, approval, and payment timing.",
  "purchasing-returns":
    "Explain purchase returns and supplier debit notes: logistics, inventory, and AP.",
  "purchasing-cash-weight-audit":
    "Explain cash-to-weight audit for commodities: tolerance, landed cost, fraud/shrink signals, and month-end.",
  // Session 3 — Pricing, Manufacturing, Distribution
  "pricing-overview":
    "Explain the pricing module end-to-end: list vs rules vs overrides, effective dates, margin guardrails, and how to roll out a price change safely.",
  "pricing-price-lists":
    "Explain designing and maintaining price lists: lines, currencies, customer assignment, bulk import, and reconciliation with quotes/orders.",
  "pricing-rules":
    "Explain pricing rules: conditions, effects, priority, stacking, testing edge cases, and governance to avoid margin leakage.",
  "manufacturing-boms":
    "Explain BOM structure, revisions, scrap, alternates, and impact on MRP, costing, and work orders.",
  "manufacturing-routing":
    "Explain routings: work centers, operations, times, capacity, and link to BOMs and costing.",
  "manufacturing-work-orders":
    "Explain work order lifecycle: release, issue, complete, receive FG, variances, and period-end WIP.",
  "manufacturing-mrp":
    "Explain MRP inputs/outputs, netting, exceptions, and how planners convert suggestions to firm orders.",
  "manufacturing-subcontracting":
    "Explain subcontracting: material issue, receipt, costing, and control of external processing.",
  "manufacturing-yield":
    "Explain yield and mass balance: standards, actuals, variance investigation, and tie-in to procurement audit.",
  "manufacturing-byproducts":
    "Explain byproduct receipt, valuation, and inventory impact alongside main output.",
  "distribution-routes":
    "Explain route design, customer assignment, sequencing, and maintenance for field operations.",
  "distribution-deliveries":
    "Explain distribution deliveries: load planning, POD, stock impact, and van stock reconciliation.",
  "distribution-trips":
    "Explain trip execution: stops, status, delays, completion, and KPIs.",
  "distribution-transfer-planning":
    "Explain network transfer planning: when to move stock between sites and how to measure effectiveness.",
  "distribution-collections":
    "Explain on-route collections: cash control, AR posting, reconciliation, and driver accountability.",
};

/** Section-level descriptions and default Copilot prompts. */
const CHAPTER_META: Record<
  string,
  { description: string; copilotPrompt: string }
> = {
  core: {
    description:
      "Control Tower (org-wide KPIs and exceptions), Dashboard (your home), Approvals (Inbox & requests), Tasks, Setup, and global Inbox. Together they are how you see risk early and clear work queues before it compounds.",
    copilotPrompt:
      "Explain how Control Tower, Dashboard, Approvals, Tasks, and Inbox fit together in a daily routine for an operations or finance user.",
  },
  docs: {
    description:
      "Document Center: every transactional document type—sales and purchase cycles, goods receipt, invoicing, credit/debit notes, and manual journals. Documents are the audit trail that connects operations to the general ledger.",
    copilotPrompt:
      "Explain the document types in this ERP, typical flows (order-to-cash, procure-to-pay), and how documents link to each other for traceability.",
  },
  masters: {
    description:
      "Master data: Products, Parties (customers and suppliers), and Warehouses. Quality here determines whether documents, stock, and finance reconcile; invest before scaling transaction volume.",
    copilotPrompt:
      "Explain how to design and maintain product, party, and warehouse masters: codes, tax, credit, and duplicate prevention.",
  },
  inventory: {
    description:
      "Inventory: stock by product and warehouse, movements, receipts, receiving queue, costing, explorer, valuation, transfers, cycle counts, and locations. Bridges operations (physical stock) and finance (inventory GL).",
    copilotPrompt:
      "Explain how inventory quantity and value are tracked from GRN and deliveries through costing to the balance sheet.",
  },
  warehouse: {
    description:
      "Warehouse operations: overview, transfers, pick & pack, putaway, bin locations, and cycle counts.",
    copilotPrompt:
      "Explain end-to-end warehouse execution: inbound putaway, outbound pick/pack/ship, transfers, bin accuracy, and cycle counting—how each affects available stock.",
  },
  sales: {
    description:
      "Sales overview, quotes, orders, deliveries, invoices, customers, and returns. Full order-to-cash flow.",
    copilotPrompt:
      "Explain order-to-cash: quote → order → delivery → invoice → AR/collections, including credit and returns.",
  },
  purchasing: {
    description:
      "Purchase requests, POs, GRN, suppliers, AP bills, returns, and cash-to-weight audit. Procure-to-pay flow.",
    copilotPrompt:
      "Explain procure-to-pay: requisition → PO → GRN → supplier invoice → payment, including sourcing journey and landed cost where used.",
  },
  pricing: {
    description:
      "Pricing overview, price lists, and pricing rules—list prices, customer/channel assignment, promotional logic, and guardrails before margin erodes.",
    copilotPrompt:
      "Explain how list prices, price lists, and pricing rules interact; how to test a change and avoid conflicting effective dates.",
  },
  manufacturing: {
    description:
      "BOMs, routing, work orders, MRP, subcontracting, yield, and byproducts. Connects engineering master data to shop floor execution and inventory cost.",
    copilotPrompt:
      "Explain manufacturing planning and execution: BOM/routing → work order → issue/receive → MRP suggestions and variances.",
  },
  distribution: {
    description:
      "Routes, deliveries, trips, transfer planning, and on-route collections for field sales and van delivery. Links logistics execution to stock and AR.",
    copilotPrompt:
      "Explain distribution operations: route planning, trip execution, delivery posting, transfers between sites, and route collections vs treasury collections.",
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
        guideTips: guide?.guideTips,
        elementHints: guide?.elementHints,
        recommendedNextStep: guide?.recommendedNextStep,
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
  /** Guide tips (power-user shortcuts). */
  guideTips: string[];
  /** Element-level hints. */
  elementHints: ElementHint[];
  /** Recommended next step. */
  recommendedNextStep?: { label: string; href: string };
}

/**
 * Get tutorial chapter and prompt for a given pathname.
 * Matches exact href first; then prefix match for dynamic routes (e.g. /docs/sales-order/123).
 */
function orphanPayloadToTutorial(o: {
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
}): TutorialForRoute {
  return {
    chapterId: o.chapterId,
    chapterTitle: o.chapterTitle,
    copilotPrompt: o.copilotPrompt,
    hrefToChapter: o.hrefToChapter,
    itemLabel: o.itemLabel,
    guideSummary: o.guideSummary,
    guideSteps: o.guideSteps,
    guideTips: o.guideTips ?? [],
    elementHints: o.elementHints ?? [],
    recommendedNextStep: o.recommendedNextStep,
  };
}

export function getTutorialForRoute(pathname: string): TutorialForRoute | null {
  const normalized = pathname.replace(/\/$/, "") || "/";

  const exactOrphan = ORPHAN_ROUTE_GUIDES[normalized];
  if (exactOrphan) {
    return orphanPayloadToTutorial(exactOrphan);
  }

  const productOrphan = getMasterProductOrphanGuide(normalized);
  if (productOrphan) {
    return orphanPayloadToTutorial(productOrphan);
  }

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
          guideTips: item.guideTips ?? [],
          elementHints: item.elementHints ?? [],
          recommendedNextStep: item.recommendedNextStep,
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
      guideTips: best.item?.guideTips ?? [],
      elementHints: best.item?.elementHints ?? [],
      recommendedNextStep: best.item?.recommendedNextStep,
    };
  }
  return null;
}
