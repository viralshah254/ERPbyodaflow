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

function buildSidebarPayload(sectionOrder: string[], itemOrders: Record<string, string[]>, hidden: Set<string>): SidebarLayout {
  const topLevelItemOrder: Record<string, string[]> = {};
  for (const sk of sectionOrder) {
    const keys = itemOrders[sk];
    if (keys?.length) topLevelItemOrder[sk] = [...keys];
  }
  return {
    sectionOrder: [...sectionOrder],
    topLevelItemOrder,
    hiddenItemKeys: hidden.size ? [...hidden] : [],
  };
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
      <div className="min-w-0 flex-1">{children}</div>
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const applyDraftFromPrefs = React.useCallback(
    (p: Preferences | null, base: typeof baseSections) => {
      const draft = buildLayoutDraftFromPrefs(base, p?.sidebarLayout ?? undefined);
      setSectionOrder(draft.sectionOrder);
      setItemOrders(draft.itemOrders);
      setHidden(draft.hidden);
      setItemSectionKey((prev) => {
        if (prev && draft.sectionOrder.includes(prev)) return prev;
        return draft.sectionOrder[0] ?? null;
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

  const onSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSectionOrder((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
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

  const handleSave = async () => {
    if (!isApiConfigured()) {
      toast.error("Set NEXT_PUBLIC_API_URL to save.");
      return;
    }
    setSaving(true);
    try {
      const sidebarLayout = buildSidebarPayload(sectionOrder, itemOrders, hidden);
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

  return (
    <PageLayout
      title="Sidebar navigation"
      description="Reorder sidebar sections and top-level links for your organization (after permissions and modules)."
    >
      <Card>
        <CardHeader>
          <CardTitle>Modular sidebar</CardTitle>
          <CardDescription>
            Changes apply to all users in this organization. Core stays first and Processing stays after Core when manufacturing is enabled.
            Saving requires the <code className="rounded bg-muted px-1">admin.settings</code> permission.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={layoutTab} onValueChange={setLayoutTab}>
            <TabsList>
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="items">Top-level links</TabsTrigger>
            </TabsList>
          </Tabs>

          {layoutTab === "sections" ? (
            <div className="space-y-3 pt-4">
              <p className="text-sm text-muted-foreground">Drag sections to change order (Core / Processing pinning still applies in the live sidebar).</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2">
                    {loading ? (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    ) : (
                      sectionOrder.map((key) => (
                        <SortableChrome key={key} id={key}>
                          <span className="truncate text-sm font-medium">{sectionMeta.get(key) ?? key}</span>
                          <span className="truncate text-xs text-muted-foreground">{key}</span>
                        </SortableChrome>
                      ))
                    )}
                  </div>
                </SortableContext>
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
