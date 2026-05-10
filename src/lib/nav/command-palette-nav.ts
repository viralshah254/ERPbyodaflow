/**
 * Derives command-palette nav items from the live resolved sidebar sections.
 * This keeps the ⌘K palette in sync with permissions, modules, and feature flags.
 */
import type { ResolvedNavSection, ResolvedNavItem } from "@/config/navigation";
import type { CommandItemNav } from "@/config/command-palette";

/**
 * Extra keyword synonyms for routes that have terse sidebar labels.
 * Only add hints that can't be inferred from the label or section name.
 */
const KEYWORD_HINTS: Record<string, string[]> = {
  "/control-tower": ["ai", "intelligence", "layers", "planning"],
  "/dashboard": ["home", "overview", "kpi"],
  "/docs": ["documents", "center", "browse"],
  "/approvals/inbox": ["pending", "review", "queue"],
  "/approvals/requests": ["submitted", "my approvals"],
  "/inventory/products": ["sku", "catalogue", "catalog", "items"],
  "/docs/sales-order": ["so", "sales order"],
  "/docs/purchase-order": ["po", "purchase order"],
  "/docs/invoice": ["inv", "billing", "ar"],
  "/ap/bills": ["supplier invoice", "ap"],
  "/docs/delivery-note": ["dn", "dispatch", "shipment"],
  "/inventory/receipts": ["grn", "goods receipt", "inbound"],
  "/finance": ["accounting", "gl"],
  "/finance/journals": ["je", "journal entry", "gl"],
  "/treasury/overview": ["cash", "bank", "payments"],
  "/treasury/payment-runs": ["pay run", "ap"],
  "/treasury/collections": ["ar", "receipts"],
  "/finance/bank-recon": ["reconcile", "statement"],
  "/assets/overview": ["depreciation", "disposals", "register"],
  "/payroll/overview": ["employees", "pay runs", "payslips"],
  "/distribution/trips": ["trip", "logistics", "outbound"],
  "/distribution/logistics/fleet": ["vehicle", "truck", "fleet", "leased"],
  "/manufacturing/boms": ["bill of material", "formula", "recipe"],
  "/manufacturing/mrp": ["mrp", "planning", "requirements"],
  "/settings/users-roles": ["rbac", "permissions", "access"],
  "/settings/billing": ["subscription", "seats", "franchise billing"],
  "/analytics": ["studio", "intelligence", "metrics", "explore"],
  "/reports": ["reporting", "p&l", "balance sheet"],
  "/settings": ["configuration", "preferences", "org"],
};

/** Recursively flatten a ResolvedNavItem tree, emitting one entry per node with an href. */
function flattenItem(
  item: ResolvedNavItem,
  sectionLabel: string,
  parentLabel?: string
): CommandItemNav[] {
  const out: CommandItemNav[] = [];

  if (item.href) {
    const breadcrumb = parentLabel ? `${parentLabel} › ${item.label}` : item.label;
    const sectionTokens = sectionLabel.toLowerCase().split(/\W+/).filter(Boolean);
    const pathTokens = item.href.replace(/^\//, "").split("/").filter((s) => s !== "docs");
    const extra = KEYWORD_HINTS[item.href] ?? [];

    out.push({
      id: `nav-sidebar-${item.key}`,
      group: "nav",
      href: item.href,
      label: item.label,
      icon: item.icon ?? "Circle",
      keywords: [
        ...(item.label !== sectionLabel ? [sectionLabel.toLowerCase()] : []),
        ...sectionTokens,
        ...pathTokens,
        ...(parentLabel ? [parentLabel.toLowerCase()] : []),
        ...extra,
      ],
      // Store breadcrumb as subtitle for display in the palette
      _breadcrumb: breadcrumb !== item.label ? `${sectionLabel} › ${parentLabel ? parentLabel + " › " : ""}${item.label}` : sectionLabel,
    } as CommandItemNav & { _breadcrumb?: string });
  }

  if (item.children?.length) {
    for (const child of item.children) {
      out.push(...flattenItem(child, sectionLabel, item.label));
    }
  }

  return out;
}

/**
 * Flatten resolved sidebar sections into CommandItemNav[].
 * Deduplicates by href; first occurrence (earliest section) wins.
 */
export function flattenNavSectionsToCommandItems(
  sections: ResolvedNavSection[],
  fallbackItems: CommandItemNav[] = []
): (CommandItemNav & { _breadcrumb?: string; _section?: string })[] {
  const seen = new Set<string>();
  const out: (CommandItemNav & { _breadcrumb?: string; _section?: string })[] = [];

  for (const section of sections) {
    for (const item of section.items) {
      const items = flattenItem(item, section.label);
      for (const nav of items) {
        const key = nav.href.toLowerCase().replace(/\/$/, "");
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ ...nav, _section: section.label });
        }
      }
    }
  }

  // Merge extras that aren't already covered by the live sidebar
  for (const fb of fallbackItems) {
    const key = fb.href.toLowerCase().replace(/\/$/, "");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(fb);
    }
  }

  return out;
}

// ─── Recent-routes helpers ───────────────────────────────────────────────────

const RECENTS_KEY = "oda_cmd_recents_v1";
const RECENTS_MAX = 10;

export type RecentRoute = {
  href: string;
  label: string;
  icon?: string;
  visitedAt: number;
};

export function getRecentRoutes(): RecentRoute[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: RecentRoute[] = JSON.parse(raw);
    return parsed.slice(0, RECENTS_MAX);
  } catch {
    return [];
  }
}

export function recordRecentRoute(route: Omit<RecentRoute, "visitedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentRoutes().filter((r) => r.href !== route.href);
    const next: RecentRoute[] = [{ ...route, visitedAt: Date.now() }, ...existing].slice(0, RECENTS_MAX);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // localStorage might be unavailable in private mode
  }
}

/** Score a nav item for relevance against query tokens (higher = better match). */
export function scoreNavItem(item: CommandItemNav, tokens: string[]): number {
  const label = item.label.toLowerCase();
  const keywords = (item.keywords ?? []).join(" ").toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (label.startsWith(token)) score += 4;
    else if (label.includes(token)) score += 3;
    else if (keywords.includes(token)) score += 1;
    else return -1; // token must appear somewhere
  }
  return score;
}
