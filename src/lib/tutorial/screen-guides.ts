import catalog from "@/config/erp-screen-catalog.json";
import additions from "@/config/screen-guide-overrides.json";
import { getTutorialForRoute, TUTORIAL_CHAPTERS } from "@/config/tutorial";
import { getDocTypeConfig } from "@/config/documents";
import type { ElementHint } from "@/config/tutorial-guides";

export interface ScreenGuide {
  route: string;
  identity: string;
  title: string;
  summary: string;
  tasks: string[];
  hints: ElementHint[];
  sections: Array<{ title: string; description?: string }>;
  fields: string[];
  kind: "workspace" | "record" | "create" | "edit" | "report";
  redirect?: string;
}
const routes = [...catalog].sort((a, b) => {
  const score = (route: string) => route.split("/").reduce((s, part) => s + (part.startsWith("[") ? 1 : 10), 0);
  return score(b.route) - score(a.route);
});
export const ERP_SCREEN_ROUTES = catalog.map(screen => screen.route);
export function matchScreenRoute(pathname: string) {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  const parts = path.split("/");
  return routes.find(screen => {
    const pattern = screen.route.split("/");
    return parts.length === pattern.length && pattern.every((part, i) => part.startsWith("[") ? !!parts[i] : part === parts[i]);
  });
}
const sentence = (value: string) => value ? value[0].toUpperCase() + value.slice(1) : value;
const human = (value: string) => sentence(value.replaceAll("-", " "));

const DOCUMENT_PURPOSE: Record<string, string> = {
  quote: "Prepare a customer quotation and review pricing before conversion to an order.",
  "sales-order": "Manage customer demand and its approval, fulfilment and invoicing links.",
  "delivery-note": "Verify shipped and received quantities, proof of delivery and invoice linkage.",
  invoice: "Review customer billing, fiscal signing, receivables and the source delivery or order.",
  "credit-note": "Review a customer credit against its original invoice and eligible remaining value.",
  "debit-note": "Review an additional customer charge and its tax and receivable effect.",
  "purchase-request": "Request products for procurement and review scope before supplier ordering.",
  "purchase-order": "Order products from a supplier and track receipt and bill linkage.",
  grn: "Record the quantity actually received against the supplier and source purchase order.",
  bill: "Review supplier billing against purchase and receipt evidence before posting and payment.",
  "purchase-credit-note": "Review a supplier credit against the original bill and payable balance.",
  "purchase-debit-note": "Review an additional supplier charge with its original bill and payable treatment.",
  journal: "Prepare balanced debit and credit account lines with a controlled accounting date and evidence.",
  "franchise-security-deposit": "Review the outlet, deposit amount and accounting evidence for a franchise security deposit.",
};

/** Exact route identity is separate from record identifiers, document types and report IDs. */
export function resolveScreenGuide(pathname: string): ScreenGuide | null {
  return resolveGuide(pathname, new Set<string>());
}
function resolveGuide(pathname: string, visited: Set<string>): ScreenGuide | null {
  const screen = matchScreenRoute(pathname);
  if (!screen || visited.has(screen.route)) return null;
  visited.add(screen.route);
  if (screen.redirect) {
    const parts = pathname.split(/[?#]/)[0].split("/");
    const params = new Map(screen.route.split("/").map((part, i) => [part.replace(/^\[|\]$/g, ""), parts[i]]));
    const destination = screen.redirect.replace(/\$\{(\w+)\}/g, (_, key: string) => params.get(key) ?? "");
    const canonical = resolveGuide(destination, visited);
    if (canonical) return { ...canonical, route: screen.route, redirect: destination };
  }
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, "");
  const override = (additions as Record<string, { title: string; summary: string; tasks: string[] }>)[screen.route];
  const exact = TUTORIAL_CHAPTERS.filter(c => c.id !== "workflows").flatMap(c => c.items).find(i => i.href === path || i.href === screen.route);
  const info = getTutorialForRoute(path);
  const kind: ScreenGuide["kind"] = screen.route.endsWith("/edit") ? "edit" : screen.route.endsWith("/new") ? "create" : screen.route.startsWith("/reports/") && screen.route.includes("[reportId]") ? "report" : screen.route.includes("[") && !screen.route.startsWith("/tutorial/") && screen.route !== "/docs/[type]" ? "record" : "workspace";
  let title = override?.title ?? exact?.label ?? screen.title;
  let summary = override?.summary ?? exact?.guideSummary ?? screen.description ?? "";
  let tasks = override?.tasks ?? exact?.guideSteps ?? [];
  let identity = screen.route;
  const parts = path.split("/");
  if (parts[1] === "docs" && parts[2]) {
    const config = getDocTypeConfig(parts[2]);
    if (!config && screen.route.includes("[type]")) return null;
    if (config) {
      const name = human(parts[2]);
      title = `${kind === "create" ? "New " : kind === "edit" ? "Edit " : ""}${name}${kind === "record" ? " record" : ""}`;
      summary = DOCUMENT_PURPOSE[parts[2]] ?? summary;
      identity = screen.route.replace("[type]", parts[2]);
      const fields = config.createFormSections.flatMap(s => s.fields.map(f => f.label));
      if (kind === "create" || kind === "edit") tasks = [
        `${kind === "edit" ? "Confirm the selected document and its editable state. " : ""}${summary}`,
        `Review the document header: ${fields.join(", ") || "the required parties, dates and references"}. Keep inherited source links when the document was opened from a related transaction.`,
        parts[2] === "journal" ? "Inspect debit and credit account lines and their balance. Confirm the accounting period and supporting narrative before saving." : `Review ${config.createFormSections.map(s => s.label).join(", ")}. Check product units, quantities, prices and tax against source evidence where those fields are present.`,
        "Resolve validation messages and review totals. Save deliberately using the document workflow; completing this tutorial does not save, approve, post or sign a document.",
      ];
      else if (kind === "record") tasks = [summary, `Inspect the current document state. This type's configured workflow includes ${config.statusWorkflow.map(s => s.label).join(", ")}; only the applicable actions are displayed.`, ...tasks.slice(1)];
    }
  }
  if (kind === "report") {
    identity = screen.route.replace("[reportId]", parts.at(-1)!);
    title = exact?.label ?? `${human(parts.at(-1)!)} report`;
    summary = exact?.guideSummary ?? `${title}. ${summary}`;
    tasks = exact?.guideSteps?.length ? exact.guideSteps : tasks;
  }
  // Do not turn an unverified inherited list guide into a record guide.
  if (!tasks.length) tasks = info?.guideSteps ?? [];
  if (!summary) summary = info?.guideSummary ?? "";
  return { route: screen.route, identity, title, summary, tasks, hints: exact?.elementHints ?? info?.elementHints ?? [], sections: screen.sections, fields: screen.fields, kind, redirect: screen.redirect };
}

/** Use the organisation's production language without changing guide identity or targets. */
export function localizeScreenGuide(guide: ScreenGuide, terminology: Record<string, string | undefined>): ScreenGuide {
  if (!guide.route.startsWith("/manufacturing/")) return guide;
  const adapt = (value: string) => {
    let result = value;
    if (terminology.bom) result = result.replace(/\b(?:recipes?|bills? of materials?|BOMs?)\b/gi, terminology.bom);
    if (terminology.workOrder) result = result.replace(/\b(?:work orders?|production batches|production batch|production runs?)\b/gi, terminology.workOrder);
    return result;
  };
  return { ...guide, title: adapt(guide.title), summary: adapt(guide.summary), tasks: guide.tasks.map(adapt), hints: guide.hints.map(hint => ({ ...hint, hint: adapt(hint.hint) })) };
}
