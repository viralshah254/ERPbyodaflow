import type { TourDef, TourStep } from "@/config/tutorial-tours";

const BOILERPLATE_TITLES = new Set(["How to use this page", "Jump or replay", "Work in the main area"]);

const CHROME_HINTS = new Set([
  "page-title",
  "page-actions",
  "page-help",
  "page-main",
  "command-search",
]);

/** Plain-language meaning for controls that show up on many ERP screens. */
const KNOWN: Record<string, string> = {
  "add customer": "Create the customer master first. Orders, invoices, and credit all need this record.",
  import: "Load many customers from a spreadsheet instead of typing them one by one.",
  "all customers": "Every customer in this organisation, across channels.",
  multichain: "Customers tagged as multichain. Use this when you only want that channel.",
  "general trade": "Customers in general trade. The count is how many match this channel.",
  distributors: "Distributor customers. Open one to see their orders, invoices, and credit.",
  "van sales": "Customers served by van sales. Use this view before you plan a route.",
  "pending approval": "Customers waiting for approval. Open one, check the details, then approve or send it back.",
  "credit (finance)": "Jump to this customer's finance credit view: limit, balance, and age.",
  "credit & tax sheet": "Open the credit and tax sheet for this list.",
  "no customers yet": "This view has no customers. Add one, import a file, or switch channel tab if you expected rows.",
  "edit customer":
    "Update the name, contacts, tax PIN, and terms. Orders and invoices raised after you save use the new details.",
  edit: "Opens this draft so the parties, lines, or notes can be changed. A posted document is not rewritten from here.",
  "request approval": "Sends this document to the approver. Stock and the ledger stay unchanged until it is approved and posted.",
  cancel: "Voids this document. A cancelled order is not delivered or invoiced.",
  more: "Print, export, and the other actions that sit outside the main buttons.",
  lines: "The products on this document: description, unit, quantity, what is still open, discount, and tax.",
  "taxes/charges": "Tax and extra charges on this document. Check the rate before you approve.",
  attachments: "Files saved on this document, including the customer order PDF.",
  comments: "Notes between your team about this document.",
  approval: "Who was asked to approve, and whether they have decided.",
  audit: "The history of changes on this document, in the order they happened.",
  "new document": "Starts a customer order from here. For a purchase order, receipt, invoice, or journal, open that tile and use New on its list.",
  "new order": "Start a sales order already linked to this customer, so you do not pick the party again.",
  "new sales order": "Opens a new customer order. Pick the customer and lines, then save. It stays a draft until you submit it.",
  pipeline: "Where orders sit: draft, pending approval, approved, invoiced, and paid.",
  "recent orders": "The latest sales orders. Open a row to continue that document.",
  "quick actions": "Jumps into a new order, the order list, or invoices without going back to the menu.",
  "credit note": "Raises a credit note for a customer. It reduces what they owe, and it stays a draft until you submit it.",
  "debit note": "Raises a debit note when the customer owes more. It stays a draft until you submit it.",
  "pickup / ad-hoc invoice": "Bills a customer without a delivery note. For a delivery sale, convert the delivery note after proof of delivery instead.",
  "back to list": "Return to the customer directory. Nothing on this record is posted by going back.",
  overview:
    "Balances, credit limit, and the profile. Read this before you raise an order or chase a payment.",
  orders: "Sales orders for this customer. Open a row to continue a draft or to see what was posted.",
  invoices: "Invoices billed to this customer, and which ones still have a balance.",
  payments: "Receipts already applied to this customer. Use this before you record another collection.",
  credit:
    "The credit limit and credit notes. A limit that is too low blocks new orders when the balance is high.",
  ledger: "The customer account in date order: invoices, receipts, and notes.",
  outstanding: "The amount this customer still owes.",
  "credit limit": "The ceiling for new credit. Orders can stop when the balance or the age of invoices exceeds it.",
  "not paid": "How many invoices still have a balance.",
  "cleared invoices": "Invoices that have been paid off.",
  profile: "Email, phone, tax PIN, and address. Documents and statements use these details.",
  "credit notes": "Documents that reduce what this customer owes.",
  export: "Download the rows currently on screen for a spreadsheet or an audit pack.",
  search: "Narrows the list. Searching does not change a posted document.",
};

function clip(text: string, max = 320): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function labelOf(el: Element): string {
  const aria = el.getAttribute("aria-label")?.trim();
  if (aria && aria.length < 80 && !/start tour|tutorial/i.test(aria)) return aria;
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("svg, .sr-only").forEach((node) => node.remove());
  for (const node of [...clone.querySelectorAll("span, div")]) {
    if (/^\d+$/.test((node.textContent ?? "").trim())) node.remove();
  }
  const text = (clone.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/(\D)\d+$/, "$1")
    .trim();
  return text.slice(0, 60);
}

function visible(el: Element): boolean {
  if (typeof el.getBoundingClientRect !== "function") return true;
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return false;
  const style = window.getComputedStyle(el);
  return style.display !== "none" && style.visibility !== "hidden";
}

function inHiddenPanel(el: Element): boolean {
  const panel = el.closest("[role='tabpanel'], [data-state='inactive']");
  if (!panel || panel === el) return false;
  return panel.getAttribute("data-state") === "inactive" || panel.hasAttribute("hidden");
}

function usable(el: Element): boolean {
  return visible(el) && !inHiddenPanel(el);
}

function knownCopy(label: string): string | undefined {
  return KNOWN[label.toLowerCase()];
}

function explain(label: string, kind: "action" | "tab" | "section" | "search" | "table" | "filters"): string {
  const known = knownCopy(label);
  if (known) return known;
  if (kind === "tab") {
    return `The ${label} tab is a separate working area on this page. Open it to review ${label.toLowerCase()} without leaving the record.`;
  }
  if (kind === "action" && /^create\b/i.test(label)) {
    return `${label} opens a new document. Complete the parties and lines, then save. It stays a draft until you submit or post it.`;
  }
  if (kind === "action") {
    return `${label} is in the page header. Use it when this is the record you mean to continue or change.`;
  }
  if (kind === "search") {
    return "Type a name, code, or number to narrow the list. Clearing the search shows the full set again.";
  }
  if (kind === "filters") {
    return "Filters decide which rows stay on screen. Clear them when a list looks empty for the wrong reason.";
  }
  if (kind === "table") {
    return "Each row is a record. Open a row for the full document, status, and the next action.";
  }
  return `${label} is part of the work on this page. Read it before you post or approve.`;
}

function step(element: Element, title: string, description: string): TourStep {
  return {
    element: () => (element.isConnected ? element : document.body),
    title,
    description: clip(description),
  };
}

const SKIP_ACTION = /start tour|tutorial|ask copilot|don't show|search or run|^⌘?k$|^refresh$|previous page|next page|rows per page/i;

function isPrimaryAction(el: HTMLElement, label: string): boolean {
  if (el.matches("[data-tour-step=create-button]") || Boolean(el.querySelector("[data-tour-step=create-button]"))) return true;
  return /^(add|new|create|import|edit|post|save|approve|receive|dispatch|credit|debit|pickup|request|cancel|reverse|more|print|convert)\b/i.test(label);
}

function clickable(root: Element): HTMLElement[] {
  return [...root.querySelectorAll("a, button")].filter((el): el is HTMLElement => {
    if (!(el instanceof HTMLElement) || !usable(el)) return false;
    if (el.closest("[data-tutorial-hint=page-help]")) return false;
    const label = labelOf(el);
    if (!label || label.length < 2 || SKIP_ACTION.test(label)) return false;
    return true;
  });
}

function discover(root: Element): TourStep[] {
  const steps: TourStep[] = [];
  const buttons = clickable(root);
  const seenLabels = new Set<string>();
  for (const el of buttons) {
    const label = labelOf(el);
    if (!isPrimaryAction(el, label)) continue;
    const key = label.toLowerCase();
    if (seenLabels.has(key)) continue;
    seenLabels.add(key);
    steps.push(step(el, label, explain(label, "action")));
    if (seenLabels.size >= 4) break;
  }

  if (seenLabels.size === 0) {
    const header = buttons.filter((el) => el.closest("[data-tutorial-hint=page-actions], [data-tutorial-hint=record-actions]"));
    for (const el of header.slice(0, 4)) {
      const label = labelOf(el);
      const key = label.toLowerCase();
      if (!label || seenLabels.has(key)) continue;
      seenLabels.add(key);
      steps.push(step(el, label, explain(label, "action")));
    }
  }

  const search = [...root.querySelectorAll("input[type='search'], input[type='text'], input:not([type]), [role='searchbox']")].find(
    (el) => usable(el) && !el.closest("[data-tutorial-hint=page-help]")
  );
  if (search) steps.push(step(search, "Search", explain("search", "search")));

  const filters = [...root.querySelectorAll("[role='combobox']")].find(
    (el) => usable(el) && !el.closest("[data-tutorial-hint=page-help]")
  );
  if (filters) steps.push(step(filters, "Filters", explain("filters", "filters")));

  const tourRegions: Record<string, { title: string; description: string }> = {
    "sourcing-flow-health": {
      title: "Sourcing health",
      description: "Open requests, orders, and receipts in one view. Use it to see where buying is stuck before you open a single document.",
    },
    "sourcing-step-cards": {
      title: "Sourcing steps",
      description: "The path from request to order to receipt. Open the step that matches the work in front of you.",
    },
  };
  for (const el of [...root.querySelectorAll("[data-tour-step]")].filter(usable).slice(0, 4)) {
    const key = el.getAttribute("data-tour-step") || "";
    if (!key || key === "create-button" || key === "command-hint" || key === "dashboard-kpis" || key === "doc-type-list") continue;
    const mapped = tourRegions[key];
    if (mapped) {
      steps.push(step(el, mapped.title, mapped.description));
      continue;
    }
    const heading = el.querySelector("h2, h3");
    const title = heading ? labelOf(heading) : "";
    if (title) steps.push(step(el, title, explain(title, "section")));
  }

  const tabs = [...root.querySelectorAll("[role='tab']")].filter(usable);
  for (const tab of tabs.slice(0, 6)) {
    const label = labelOf(tab);
    if (!label) continue;
    steps.push(step(tab, label, explain(label, "tab")));
  }

  const HINT_STEPS: Record<string, { title: string; description: string }> = {
    "customer-kpis": {
      title: "Balances",
      description:
        "Outstanding is what this customer still owes. Credit limit is the ceiling for new orders. Not paid counts open invoices. Cleared invoices are the ones already settled.",
    },
    "customer-profile": {
      title: "Profile",
      description: knownCopy("profile") ?? "Email, phone, tax PIN, and address on this customer.",
    },
    "settings-hub": {
      title: "Settings areas",
      description: "Each card opens one configuration area. Change one area and save it before you open the next.",
    },
    "dashboard-kpis": {
      title: "Home widgets",
      description:
        "Pending approvals are documents waiting for you. Active alerts need attention. Recent documents are the latest records in this organisation. Open a card to go to that list.",
    },
    "doc-type-list": {
      title: "Document types",
      description:
        "Each tile is one document type: customer order, purchase order, goods receipt, invoice, credit and debit notes, and journals. Open a tile to list those documents, then use New to draft one.",
    },
    "sales-kpis": {
      title: "Sales position",
      description:
        "Open orders is demand not yet closed. Pending approval is waiting for a decision. Outstanding AR is what customers still owe. Top customer ordered the most this month.",
    },
    "my-tasks": {
      title: "My tasks",
      description: "Tasks assigned to you. Claim one to take it, then complete it when the work is done. An empty list means nothing is waiting on you.",
    },
    "queue-signals": {
      title: "Queue signals",
      description: "Approvals and exceptions raised for the organisation, beyond the tasks you created yourself.",
    },
    "trial-balance": {
      title: "Account balances",
      description:
        "Debits and credits for every account in the period. Filter by period or account type. Balanced means the two sides match. Open a row when you need that account's ledger.",
    },
    "work-queue": {
      title: "Queue categories",
      description:
        "Alerts group into payroll, tax, pricing, stock, receivables, payables, bank, and approvals. Open View on a row to reach the document that needs a decision.",
    },
    "statement-party": {
      title: "Choose the party",
      description:
        "Pick the customer or supplier, then set the dates and generate. The statement lists invoices or bills, payments, credit notes, and the opening balance for that period.",
    },
  };

  const hinted = [...root.querySelectorAll("[data-tutorial-hint]")].filter((el) => {
    const hint = el.getAttribute("data-tutorial-hint") ?? "";
    if (!hint || CHROME_HINTS.has(hint) || hint === "record-actions" || hint === "customer-tabs") return false;
    if (el.querySelector("[role='tab']")) return false;
    return usable(el);
  });
  for (const el of hinted.slice(0, 4)) {
    const hint = el.getAttribute("data-tutorial-hint") ?? "";
    const mapped = HINT_STEPS[hint];
    const heading = el.querySelector("h2, h3")?.textContent?.replace(/\s+/g, " ").trim();
    const title = mapped?.title || heading || hint.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    steps.push(step(el, title, mapped?.description ?? explain(title, "section")));
  }

  const tables = [...root.querySelectorAll("table")].filter(usable);
  const table = tables.sort((a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0];
  const usedTitles = new Set(steps.map((item) => item.title.toLowerCase()));
  if (table) {
    const caption = table.parentElement?.querySelector("h2, h3") ?? table.closest("div")?.parentElement?.querySelector("h2, h3");
    const captionLabel = caption && usable(caption) ? labelOf(caption) : "";
    const title = captionLabel || "Records";
    usedTitles.add(title.toLowerCase());
    steps.push(step(table, title, captionLabel ? explain(captionLabel, "section") : explain("records", "table")));
  }

  const headings = [...root.querySelectorAll("h2, h3")].filter((el) => {
    if (!usable(el) || el.closest("table")) return false;
    if (el.closest("[data-tutorial-hint=page-title], [data-tutorial-hint=page-help]")) return false;
    const region = el.closest("[data-tour-step], [data-tutorial-hint]");
    if (region && region !== el) {
      const hint = region.getAttribute("data-tutorial-hint") || "";
      const tourStep = region.getAttribute("data-tour-step") || "";
      const marked = (hint && !CHROME_HINTS.has(hint) && hint !== "settings-hub") || Boolean(tourStep);
      if (marked) return false;
    }
    const label = labelOf(el);
    if (!label || label.length < 2 || label.length > 48) return false;
    if (usedTitles.has(label.toLowerCase())) return false;
    usedTitles.add(label.toLowerCase());
    return true;
  });
  const sectionHeads = headings.filter((el) => el.tagName === "H2");
  const chosen = sectionHeads.length >= 3 ? sectionHeads : headings;
  for (const heading of chosen.slice(0, table ? 3 : 6)) {
    const label = labelOf(heading);
    steps.push(step(heading, label, explain(label, "section")));
  }

  const exportButton = buttons.find((el) => /^export$/i.test(labelOf(el)));
  if (exportButton) steps.push(step(exportButton, "Export", explain("export", "action")));

  return steps;
}

function dedupe(steps: TourStep[]): TourStep[] {
  const seen = new Set<string>();
  const out: TourStep[] = [];
  for (const item of steps) {
    const key = `${item.title}|${item.description.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.slice(0, 12);
}

/**
 * Turn a short route tour into a walk through the controls on the open page.
 * Detail records do not stop at the list-page sentence.
 */
export function expandLiveTourSteps(tour: TourDef, pathname = window.location.pathname): TourStep[] {
  const root = document.querySelector("[data-tutorial-hint=page-main]") ?? document.body;
  const heading = root.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() || tour.title.replace(/ tour$/, "");
  const path = pathname.replace(/\/$/, "") || "/";
  const isRecord = path !== tour.route && path.startsWith(`${tour.route}/`);

  const authored = tour.steps.filter((item) => !BOILERPLATE_TITLES.has(item.title));
  const specificAuthored = authored.filter((item) => typeof item.element === "string" && item.element.includes("data-tutorial-hint"));

  const functional = discover(root);
  if (specificAuthored.length >= 2 && !isRecord) {
    return dedupe([...authored, ...functional]);
  }

  const introSource = authored[0];
  const tabNames = [...root.querySelectorAll("[role='tab']")].filter(usable).map(labelOf).filter(Boolean);
  const intro: TourStep = {
    element: () =>
      document.querySelector("[data-tutorial-hint=page-title]") ??
      document.querySelector("h1") ??
      document.body,
    title: heading,
    description: isRecord
      ? clip(
          `${heading} is the open record. The next steps cover the header actions${
            tabNames.length ? ` and ${tabNames.join(", ")}` : " and the main sections on this page"
          }.`
        )
      : clip(introSource?.description || `${heading} is this screen. The next steps point at the controls you actually use here.`),
  };

  return dedupe([intro, ...functional]);
}
