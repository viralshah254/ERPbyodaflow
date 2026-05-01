import type { ResolvedNavItem, ResolvedNavSection } from "./index";

export type SidebarLayout = {
  sectionOrder?: string[];
  /**
   * When loading: array = explicit sections above “More”; `undefined`/`null`/`missing` = use built‑in tiers.
   * When PATCHing: array saves placement; `null` clears persisted override so built‑in tiers apply; omit keeps prior value on merge.
   */
  mainSectionKeys?: string[] | null;
  topLevelItemOrder?: Partial<Record<string, string[]>>;
  hiddenItemKeys?: string[];
};

export type SidebarLayoutPins = {
  dashboardEnabled: boolean;
  manufacturingEnabled: boolean;
};

function filterHiddenItems(items: ResolvedNavItem[], hidden: Set<string>): ResolvedNavItem[] {
  const out: ResolvedNavItem[] = [];
  for (const item of items) {
    if (hidden.has(item.key)) continue;
    const children = item.children ? filterHiddenItems(item.children, hidden) : undefined;
    if (item.children?.length && (!children || children.length === 0) && !item.href) continue;
    out.push({ ...item, children: children?.length ? children : undefined });
  }
  return out;
}

function reorderSections(sections: ResolvedNavSection[], order: string[] | undefined): ResolvedNavSection[] {
  if (!order?.length) return sections;
  const byKey = new Map(sections.map((s) => [s.key, s]));
  const seen = new Set<string>();
  const result: ResolvedNavSection[] = [];
  for (const k of order) {
    const s = byKey.get(k);
    if (s && !seen.has(k)) {
      result.push(s);
      seen.add(k);
    }
  }
  for (const s of sections) {
    if (!seen.has(s.key)) result.push(s);
  }
  return result;
}

function reorderTopLevelItems(items: ResolvedNavItem[], order: string[] | undefined): ResolvedNavItem[] {
  if (!order?.length) return items;
  const byKey = new Map(items.map((i) => [i.key, i]));
  const seen = new Set<string>();
  const result: ResolvedNavItem[] = [];
  for (const k of order) {
    const i = byKey.get(k);
    if (i && !seen.has(k)) {
      result.push(i);
      seen.add(k);
    }
  }
  for (const i of items) {
    if (!seen.has(i.key)) result.push(i);
  }
  return result;
}

/** Keep Core first and Processing immediately after Core when manufacturing is enabled (matches buildVisibleNav invariants). */
function enforceSectionPins(sections: ResolvedNavSection[], pins: SidebarLayoutPins): ResolvedNavSection[] {
  const byKey = new Map(sections.map((s) => [s.key, s]));
  let ordered = sections.map((s) => s.key);

  if (pins.dashboardEnabled && byKey.has("core")) {
    ordered = ordered.filter((k) => k !== "core");
    ordered.unshift("core");
  }

  if (pins.manufacturingEnabled && byKey.has("processing")) {
    ordered = ordered.filter((k) => k !== "processing");
    const coreIdx = ordered.indexOf("core");
    if (coreIdx >= 0) ordered.splice(coreIdx + 1, 0, "processing");
    else ordered.unshift("processing");
  }

  return ordered.map((k) => byKey.get(k)).filter((s): s is ResolvedNavSection => s !== undefined);
}

function layoutHasCustomization(layout: SidebarLayout): boolean {
  if (layout.hiddenItemKeys?.length) return true;
  if (layout.sectionOrder?.length) return true;
  if (layout.mainSectionKeys != null) return true;
  const t = layout.topLevelItemOrder;
  if (t && Object.keys(t).length > 0) return true;
  return false;
}

/**
 * Split ordered sections between the main rail and “More”, using persisted prefs when configured.
 * Legacy when `layout.mainSectionKeys` is omitted: tier === "primary" above divider. Empty array puts all sections under “More”.
 */
export function splitSectionsMainAndMore(
  ordered: ResolvedNavSection[],
  layout: SidebarLayout | null | undefined
): { main: ResolvedNavSection[]; more: ResolvedNavSection[] } {
  const raw = layout?.mainSectionKeys;
  if (raw == null) {
    return {
      main: ordered.filter((s) => s.tier === "primary"),
      more: ordered.filter((s) => s.tier !== "primary"),
    };
  }

  const pinned = raw;
  if (!pinned.length) {
    return { main: [], more: [...ordered] };
  }

  const byKey = new Map(ordered.map((s) => [s.key, s]));
  const mainSet = new Set(pinned);
  const main: ResolvedNavSection[] = [];
  for (const k of pinned) {
    const s = byKey.get(k);
    if (s) main.push(s);
  }
  const more = ordered.filter((s) => !mainSet.has(s.key));
  return { main, more };
}

/**
 * Applies org preference sidebar layout after permission/module gating.
 * Unknown keys in saved layout are ignored (clamped to current `sections`).
 */
export function applySidebarLayout(
  sections: ResolvedNavSection[],
  layout: SidebarLayout | null | undefined,
  pins: SidebarLayoutPins
): ResolvedNavSection[] {
  let result = sections;
  if (layout && layoutHasCustomization(layout)) {
    const hidden = new Set(layout.hiddenItemKeys ?? []);
    result = result
      .map((sec) => ({
        ...sec,
        items: filterHiddenItems(sec.items, hidden),
      }))
      .filter((sec) => sec.items.length > 0);

    result = reorderSections(result, layout.sectionOrder);
    result = result.map((sec) => ({
      ...sec,
      items: reorderTopLevelItems(sec.items, layout.topLevelItemOrder?.[sec.key]),
    }));
  }

  return enforceSectionPins(result, pins);
}
