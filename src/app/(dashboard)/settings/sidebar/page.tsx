"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchPreferencesApi, updatePreferencesApi, type Preferences } from "@/lib/api/preferences";
import type { SidebarLayout } from "@/config/navigation/sidebar-layout";
import type { ResolvedNavSection } from "@/config/navigation";
import {
  computeDashboardSidebarSections,
  type ComputeDashboardSidebarSectionsParams,
} from "@/lib/nav/compute-dashboard-sidebar-sections";
import { isApiConfigured } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const RAIL_ID_MAIN = "m:";
const RAIL_ID_MORE = "o:";

function parseRailDndId(id: string): { rail: "main" | "more"; key: string } | null {
  if (id.startsWith(RAIL_ID_MAIN)) return { rail: "main", key: id.slice(RAIL_ID_MAIN.length) };
  if (id.startsWith(RAIL_ID_MORE)) return { rail: "more", key: id.slice(RAIL_ID_MORE.length) };
  return null;
}

/** Primary-tier section keys above the divider when no explicit rail prefs. */
function defaultMainMembership(sectionOrder: string[], base: ResolvedNavSection[]): Set<string> {
  const tierMain = new Set(base.filter((s) => s.tier === "primary").map((s) => s.key));
  return new Set(sectionOrder.filter((k) => tierMain.has(k)));
}

/** Build full section order: main keys in persisted order first, then the rest (global order unchanged within “More”). */
function mergeSectionOrderWithMainRailFirst(sectionOrder: string[], mainKeysOrdered: string[]): string[] {
  const allow = new Set(sectionOrder);
  const mains = mainKeysOrdered.filter((k) => allow.has(k));
  const mainsSet = new Set(mains);
  const mores = sectionOrder.filter((k) => !mainsSet.has(k));
  return [...mains, ...mores];
}

function recombineSectionsByMembership(sectionOrder: string[], mem: Set<string>): string[] {
  const mains = sectionOrder.filter((k) => mem.has(k));
  const mores = sectionOrder.filter((k) => !mem.has(k));
  return [...mains, ...mores];
}

function mergeKeyOrder(saved: string[] | undefined, currentKeys: string[]): string[] {
  if (!saved?.length) return [...currentKeys];
  const allow = new Set(currentKeys);
  const next: string[] = [];
  const seen = new Set<string>();
  for (const k of saved) {
    if (allow.has(k) && !seen.has(k)) {
      next.push(k);
      seen.add(k);
    }
  }
  for (const k of currentKeys) {
    if (!seen.has(k)) next.push(k);
  }
  return next;
}

function buildLayoutDraftFromPrefs(
  base: ResolvedNavSection[],
  layout: SidebarLayout | null | undefined
): {
  sectionOrder: string[];
  itemOrders: Record<string, string[]>;
  hidden: Set<string>;
} {
  const sectionOrder = mergeKeyOrder(layout?.sectionOrder, base.map((s) => s.key));
  const itemOrders: Record<string, string[]> = {};
  for (const sec of base) {
    const keys = sec.items.map((i) => i.key);
    itemOrders[sec.key] = mergeKeyOrder(layout?.topLevelItemOrder?.[sec.key], keys);
  }
  const hidden = new Set(layout?.hiddenItemKeys ?? []);
  const visibleKeys = new Set(base.flatMap((s) => s.items.map((i) => i.key)));
  for (const k of [...hidden]) {
    if (!visibleKeys.has(k)) hidden.delete(k);
  }
  return { sectionOrder, itemOrders, hidden };
}

function buildSidebarPayload(
  sectionOrder: string[],
  itemOrders: Record<string, string[]>,
  hidden: Set<string>,
  mainSectionKeysForApi: string[] | null | undefined
): SidebarLayout {
  const topLevelItemOrder: Record<string, string[]> = {};
  for (const sk of sectionOrder) {
    const keys = itemOrders[sk];
    if (keys?.length) topLevelItemOrder[sk] = [...keys];
  }
  const out: SidebarLayout = {
    sectionOrder: [...sectionOrder],
    topLevelItemOrder,
    hiddenItemKeys: hidden.size ? [...hidden] : [],
  };
  if (mainSectionKeysForApi === undefined) return out;
  if (mainSectionKeysForApi === null) out.mainSectionKeys = null;
  else out.mainSectionKeys = [...mainSectionKeysForApi];
  return out;
}

function SortableChrome({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-md border bg-card px-2 py-2">
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted"
        {...attributes}
        {...listeners}
      >
        <Icons.GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

export default function SidebarSettingsPage() {
  const { user, org, permissions } = useAuthStore();
  const {
    orgType: ctxOrgType,
    enabledModules,
    featureFlags,
    template,
    orgRole,
    franchisePersona,
  } = useOrgContextStore();

  const navParams = React.useMemo(
    (): ComputeDashboardSidebarSectionsParams => ({
      ctxOrgType,
      orgOrgType: org?.orgType,
      enabledModules,
      featureFlags: featureFlags ?? {},
      template,
      user,
      permissions,
      orgRole,
      franchisePersona,
    }),
    [ctxOrgType, org?.orgType, enabledModules, featureFlags, template, user, permissions, orgRole, franchisePersona]
  );

  const baseSections = React.useMemo(() => computeDashboardSidebarSections(navParams), [navParams]);

  const sectionMeta = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of baseSections) map.set(s.key, s.label);
    return map;
  }, [baseSections]);

  const itemMeta = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of baseSections) {
      for (const i of s.items) map.set(i.key, i.label);
    }
    return map;
  }, [baseSections]);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [prefs, setPrefs] = React.useState<Preferences | null>(null);

  const [sectionOrder, setSectionOrder] = React.useState<string[]>([]);
  const [itemOrders, setItemOrders] = React.useState<Record<string, string[]>>({});
  const [hidden, setHidden] = React.useState<Set<string>>(() => new Set());
  const [itemSectionKey, setItemSectionKey] = React.useState<string | null>(null);
  const [layoutTab, setLayoutTab] = React.useState("sections");

  /** Section keys rendered above “More”; when placement is implicit, tiers from nav config determine membership. */
  const [railMainMembership, setRailMainMembership] = React.useState<Set<string>>(() => new Set());
  /** When true, `mainSectionKeys` is persisted; when false, live sidebar uses built-in tiers. */
  const [railPlacementExplicit, setRailPlacementExplicit] = React.useState(false);

  const baseSectionMap = React.useMemo(() => new Map(baseSections.map((s) => [s.key, s])), [baseSections]);

  const sectionOrderRef = React.useRef(sectionOrder);
  sectionOrderRef.current = sectionOrder;
  const railMainMembershipRef = React.useRef(railMainMembership);
  railMainMembershipRef.current = railMainMembership;
  const railPlacementExplicitRef = React.useRef(railPlacementExplicit);
  railPlacementExplicitRef.current = railPlacementExplicit;
  const baseSectionsRef = React.useRef(baseSections);
  baseSectionsRef.current = baseSections;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const applyDraftFromPrefs = React.useCallback(
    (p: Preferences | null, base: typeof baseSections) => {
      const draft = buildLayoutDraftFromPrefs(base, p?.sidebarLayout ?? undefined);
      setItemOrders(draft.itemOrders);
      setHidden(draft.hidden);

      const savedMainKeys = p?.sidebarLayout?.mainSectionKeys;
      let nextSectionOrder = draft.sectionOrder;
      if (Array.isArray(savedMainKeys)) {
        setRailPlacementExplicit(true);
        const memFiltered = savedMainKeys.filter((k) => draft.sectionOrder.includes(k));
        setRailMainMembership(new Set(memFiltered));
        nextSectionOrder = mergeSectionOrderWithMainRailFirst(draft.sectionOrder, memFiltered);
      } else {
        setRailPlacementExplicit(false);
        setRailMainMembership(defaultMainMembership(draft.sectionOrder, base));
      }
      setSectionOrder(nextSectionOrder);

      setItemSectionKey((prev) => {
        if (prev && nextSectionOrder.includes(prev)) return prev;
        return nextSectionOrder[0] ?? null;
      });
    },
    []
  );

  React.useEffect(() => {
    if (!isApiConfigured()) {
      applyDraftFromPrefs(null, baseSections);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchPreferencesApi()
      .then((data) => {
        if (!cancelled) setPrefs(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load preferences.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only preferences fetch
  }, []);

  React.useEffect(() => {
    applyDraftFromPrefs(prefs, baseSections);
  }, [prefs, baseSections, applyDraftFromPrefs]);

  React.useEffect(() => {
    if (railPlacementExplicit) return;
    setRailMainMembership(defaultMainMembership(sectionOrder, baseSections));
  }, [railPlacementExplicit, baseSections, sectionOrder]);

  const recombineGroupedOrder = React.useCallback((ord: string[], mem: Set<string>) => recombineSectionsByMembership(ord, mem), []);

  const onSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSectionOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      const moved = arrayMove(items, oldIndex, newIndex);
      if (!railPlacementExplicitRef.current) return moved;
      return recombineGroupedOrder(moved, railMainMembershipRef.current);
    });
  };

  const onRailsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const parsedA = parseRailDndId(String(active.id));
    const parsedO = parseRailDndId(String(over.id));
    if (!parsedA || !parsedO) return;

    const ord = sectionOrderRef.current;
    let membership = railPlacementExplicitRef.current
      ? new Set(railMainMembershipRef.current)
      : defaultMainMembership(ord, baseSectionsRef.current);
    let placementExplicitNext = true;

    const recombineFromParts = (mains: string[], mores: string[]) => [...mains, ...mores];

    if (parsedA.rail === "main" && parsedO.rail === "main") {
      const mains = ord.filter((k) => membership.has(k));
      const oldIndex = mains.indexOf(parsedA.key);
      const newIndex = mains.indexOf(parsedO.key);
      if (oldIndex < 0 || newIndex < 0) return;
      const nextMains = arrayMove(mains, oldIndex, newIndex);
      const mores = ord.filter((k) => !membership.has(k));
      setRailPlacementExplicit(placementExplicitNext);
      setRailMainMembership(membership);
      setSectionOrder(recombineFromParts(nextMains, mores));
      return;
    }

    if (parsedA.rail === "more" && parsedO.rail === "more") {
      const mores = ord.filter((k) => !membership.has(k));
      const oldIndex = mores.indexOf(parsedA.key);
      const newIndex = mores.indexOf(parsedO.key);
      if (oldIndex < 0 || newIndex < 0) return;
      const nextMores = arrayMove(mores, oldIndex, newIndex);
      const mains = ord.filter((k) => membership.has(k));
      setRailPlacementExplicit(placementExplicitNext);
      setRailMainMembership(membership);
      setSectionOrder(recombineFromParts(mains, nextMores));
      return;
    }

    const ak = parsedA.key;

    if (parsedA.rail === "more" && parsedO.rail === "main") {
      const without = ord.filter((k) => k !== ak);
      const nextMem = new Set(membership);
      nextMem.add(ak);
      let mains = without.filter((k) => nextMem.has(k));
      const pivotIdx = mains.indexOf(parsedO.key);
      if (pivotIdx < 0) mains = [...mains, ak];
      else mains = [...mains.slice(0, pivotIdx), ak, ...mains.slice(pivotIdx)];
      const mores = without.filter((k) => !nextMem.has(k));
      setRailPlacementExplicit(placementExplicitNext);
      setRailMainMembership(nextMem);
      setSectionOrder(recombineFromParts(mains, mores));
      return;
    }

    if (parsedA.rail === "main" && parsedO.rail === "more") {
      const without = ord.filter((k) => k !== ak);
      const nextMem = new Set(membership);
      nextMem.delete(ak);
      const mains = without.filter((k) => nextMem.has(k));
      let mores = without.filter((k) => !nextMem.has(k));
      const pivotIdx = mores.indexOf(parsedO.key);
      if (pivotIdx < 0) mores = [...mores, ak];
      else mores = [...mores.slice(0, pivotIdx), ak, ...mores.slice(pivotIdx)];
      setRailPlacementExplicit(placementExplicitNext);
      setRailMainMembership(nextMem);
      setSectionOrder(recombineFromParts(mains, mores));
    }
  };

  const onItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!itemSectionKey || !over || active.id === over.id) return;
    setItemOrders((prev) => {
      const items = prev[itemSectionKey] ?? [];
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      return { ...prev, [itemSectionKey]: arrayMove(items, oldIndex, newIndex) };
    });
  };

  const handleRestoreBuiltInRails = React.useCallback(() => {
    setRailPlacementExplicit(false);
    const mem = defaultMainMembership(sectionOrder, baseSections);
    setRailMainMembership(mem);
    setSectionOrder(recombineSectionsByMembership(sectionOrder, mem));
  }, [sectionOrder, baseSections]);

  const handleSave = async () => {
    if (!isApiConfigured()) {
      toast.error("Set NEXT_PUBLIC_API_URL to save.");
      return;
    }
    setSaving(true);
    try {
      const mainSectionKeysForApi = railPlacementExplicit
        ? sectionOrder.filter((k) => railMainMembership.has(k))
        : null;
      const sidebarLayout = buildSidebarPayload(sectionOrder, itemOrders, hidden, mainSectionKeysForApi);
      const updated = await updatePreferencesApi({ sidebarLayout });
      setPrefs(updated);
      toast.success("Sidebar layout saved.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("403") || /forbidden/i.test(msg)) {
        toast.error("Saving requires admin organization settings permission (admin.settings).");
      } else {
        toast.error(msg || "Failed to save.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!isApiConfigured()) {
      toast.error("Set NEXT_PUBLIC_API_URL to reset.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updatePreferencesApi({ sidebarLayout: null });
      setPrefs(updated);
      toast.success("Sidebar layout reset to defaults.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("403") || /forbidden/i.test(msg)) {
        toast.error("Reset requires admin organization settings permission (admin.settings).");
      } else {
        toast.error(msg || "Failed to reset.");
      }
    } finally {
      setSaving(false);
    }
  };

  const itemKeysForSection = itemSectionKey ? itemOrders[itemSectionKey] ?? [] : [];

  const mainKeysOrdered = React.useMemo(
    () => sectionOrder.filter((k) => railMainMembership.has(k)),
    [sectionOrder, railMainMembership]
  );
  const moreKeysOrdered = React.useMemo(
    () => sectionOrder.filter((k) => !railMainMembership.has(k)),
    [sectionOrder, railMainMembership]
  );

  const visibilityHintForSection = React.useCallback(
    (secKey: string): string | null => {
      const sec = baseSectionMap.get(secKey);
      if (!sec || sec.items.length === 0) {
        return "Not shown — no links available for your modules or permissions.";
      }
      const keys = itemOrders[secKey]?.length ? itemOrders[secKey]! : sec.items.map((i) => i.key);
      if (!keys.some((k) => !hidden.has(k))) {
        return "Not shown — all top-level links are hidden here; use Top-level links to show at least one.";
      }
      return null;
    },
    [baseSectionMap, hidden, itemOrders]
  );

  return (
    <PageLayout
      title="Sidebar navigation"
      description="Reorder sidebar sections and top-level links for your organization (after permissions and modules)."
    >
      <Card>
        <CardHeader>
          <CardTitle>Modular sidebar</CardTitle>
          <CardDescription>
            Changes apply organization-wide after modules and permission checks. Until you customize Main / More, placement
            uses built‑in tiers (primary sections above the divider, secondary under &ldquo;More&rdquo;). Core stays first,
            and Processing stays immediately after Core when manufacturing is enabled. Saving requires the{" "}
            <code className="rounded bg-muted px-1">admin.settings</code> permission.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={layoutTab} onValueChange={setLayoutTab}>
            <TabsList>
              <TabsTrigger value="sections">Sections order</TabsTrigger>
              <TabsTrigger value="rails">Main / More</TabsTrigger>
              <TabsTrigger value="items">Top-level links</TabsTrigger>
            </TabsList>
          </Tabs>

          {layoutTab === "sections" ? (
            <div className="space-y-3 pt-4">
              <p className="text-sm text-muted-foreground">
                Drag to set the canonical order within each rail (Main block, then More). Pins still apply live: Core first,
                then Processing after Core when manufacturing is on.
              </p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : (
                      sectionOrder.map((key) => {
                        const hint = visibilityHintForSection(key);
                        return (
                          <SortableChrome key={key} id={key}>
                            <span className="truncate text-sm font-medium">{sectionMeta.get(key) ?? key}</span>
                            <span className="truncate font-mono text-xs text-muted-foreground">{key}</span>
                            {hint ? <span className="text-xs text-amber-600 dark:text-amber-500">{hint}</span> : null}
                          </SortableChrome>
                        );
                      })
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : layoutTab === "rails" ? (
            <div className="space-y-4 pt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-xl text-sm text-muted-foreground">
                  Drag sections between columns to decide what stays above &ldquo;More&rdquo; in the live sidebar. Ordering
                  within each column follows the Sections order tab within that rail block.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRestoreBuiltInRails}
                  disabled={loading || saving}
                >
                  Use built‑in tiers
                </Button>
              </div>
              {!railPlacementExplicit ? (
                <p className="text-xs text-muted-foreground">
                  Currently using automatic placement (primary-tier sections → Main).
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Custom placement will be saved with your sidebar layout.</p>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRailsDragEnd}>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Main (above divider)</h3>
                    <SortableContext
                      items={mainKeysOrdered.map((k) => `${RAIL_ID_MAIN}${k}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex min-h-[4rem] flex-col gap-2 rounded-md border border-dashed bg-muted/20 p-2">
                        {loading ? (
                          <p className="text-sm text-muted-foreground">Loading…</p>
                        ) : mainKeysOrdered.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted-foreground">Nothing in Main — drag from More</p>
                        ) : (
                          mainKeysOrdered.map((key) => (
                            <SortableChrome key={`${RAIL_ID_MAIN}${key}`} id={`${RAIL_ID_MAIN}${key}`}>
                              <span className="truncate text-sm font-medium">{sectionMeta.get(key) ?? key}</span>
                              <span className="truncate font-mono text-xs text-muted-foreground">{key}</span>
                            </SortableChrome>
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">More (below divider)</h3>
                    <SortableContext
                      items={moreKeysOrdered.map((k) => `${RAIL_ID_MORE}${k}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex min-h-[4rem] flex-col gap-2 rounded-md border border-dashed bg-muted/20 p-2">
                        {loading ? (
                          <p className="text-sm text-muted-foreground">Loading…</p>
                        ) : moreKeysOrdered.length === 0 ? (
                          <p className="py-6 text-center text-sm text-muted-foreground">Everything is in Main</p>
                        ) : (
                          moreKeysOrdered.map((key) => (
                            <SortableChrome key={`${RAIL_ID_MORE}${key}`} id={`${RAIL_ID_MORE}${key}`}>
                              <span className="truncate text-sm font-medium">{sectionMeta.get(key) ?? key}</span>
                              <span className="truncate font-mono text-xs text-muted-foreground">{key}</span>
                            </SortableChrome>
                          ))
                        )}
                      </div>
                    </SortableContext>
                  </div>
                </div>
              </DndContext>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Section</Label>
                <Select
                  value={itemSectionKey ?? ""}
                  onValueChange={(v) => setItemSectionKey(v)}
                  disabled={loading || sectionOrder.length === 0}
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Choose section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectionOrder.map((sk) => (
                      <SelectItem key={sk} value={sk}>
                        {sectionMeta.get(sk) ?? sk}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {itemSectionKey ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Drag to reorder links. Uncheck to hide a link from the sidebar for users who can already access it.
                  </p>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemDragEnd}>
                    <SortableContext items={itemKeysForSection} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-col gap-2">
                        {itemKeysForSection.map((itemKey) => (
                          <SortableChrome key={itemKey} id={itemKey}>
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`show-${itemKey}`}
                                checked={!hidden.has(itemKey)}
                                onCheckedChange={(v) => {
                                  setHidden((h) => {
                                    const next = new Set(h);
                                    if (v === true) next.delete(itemKey);
                                    else next.add(itemKey);
                                    return next;
                                  });
                                }}
                              />
                              <Label htmlFor={`show-${itemKey}`} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0">
                                <span className="truncate text-sm font-medium">{itemMeta.get(itemKey) ?? itemKey}</span>
                                <span className="truncate text-xs text-muted-foreground">{itemKey}</span>
                              </Label>
                            </div>
                          </SortableChrome>
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No sections available.</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving || loading}>
              <Icons.Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save layout"}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} disabled={saving || loading}>
              <Icons.RotateCcw className="mr-2 h-4 w-4" />
              Reset to default
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
