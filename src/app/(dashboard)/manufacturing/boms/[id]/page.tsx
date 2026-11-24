"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BomComponentEditor, type RecipeCostSummary } from "@/components/manufacturing/bom-component-editor";
import { RecipePriceSimulator } from "@/components/manufacturing/recipe-price-simulator";
import { ChangeChips, RecipeHistorySheet, namesFromHistory } from "@/components/manufacturing/recipe-history";
import { BomPilotHelp } from "@/components/manufacturing/BomPilotHelp";
import { bomUnitGapText } from "@/lib/manufacturing/unit-gaps";
import {
  deleteManufacturingBom,
  fetchManufacturingBom,
  fetchManufacturingRoutes,
  fetchRecipeHistory,
  makeRecipeCurrent,
  restoreRecipeRevision,
  updateManufacturingBom,
  type ManufacturingBom,
  type ManufacturingRoute,
  type RecipeHistory,
  type RecipeRevisionChange,
} from "@/lib/api/manufacturing";
import { fetchWarehousesApi } from "@/lib/api/warehouses";
import { fetchDocumentDraftApi } from "@/lib/api/document-drafts";
import { listUoms } from "@/lib/data/uom.repo";
import { manufacturingAreaLabel } from "@/lib/terminology";
import { productionTerms } from "@/lib/manufacturing/production-language";
import { canonicalIndustryTemplateId, FMCG_BAKERY_TEMPLATE_ID } from "@/config/industry";
import { useOrgContextStore, useTerminology } from "@/stores/orgContextStore";
import { useCanWriteManufacturing, useHasPermission } from "@/lib/rbac/use-write-guard";
import { cn } from "@/lib/utils";

const formatMoney = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 });

type RecordState = "live" | "inactive" | "draft" | "earlier";

function recordState(bom: ManufacturingBom): RecordState {
  if (bom.lifecycle === "RETIRED") return "earlier";
  if (bom.lifecycle === "DRAFT") return "draft";
  return bom.isActive ? "live" : "inactive";
}

const STATE_PILL: Record<RecordState, { label: string; className: string; dot: string }> = {
  live: { label: "In production", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  inactive: { label: "Inactive", className: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  draft: { label: "Draft", className: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200", dot: "bg-amber-500" },
  earlier: { label: "Earlier copy", className: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

function Stat({ icon: Icon, label, children, hint, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode; hint?: React.ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-3.5" />{label}</span>
      <span className="mt-2 block text-xl font-semibold tracking-tight tabular-nums">{children}</span>
      {hint && <span className="mt-1 block truncate text-xs text-muted-foreground">{hint}</span>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="group min-w-0 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </button>
  ) : (
    <div className="min-w-0 rounded-xl border bg-card p-4">{body}</div>
  );
}

function Banner({ tone, icon: Icon, title, children, actions }: { tone: "amber" | "muted" | "primary"; icon: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className={cn(
      "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center",
      tone === "amber" && "border-amber-500/30 bg-amber-500/[0.06]",
      tone === "muted" && "bg-muted/40",
      tone === "primary" && "border-primary/30 bg-primary/[0.05]",
    )}>
      <Icon className={cn("size-5 shrink-0", tone === "amber" ? "text-amber-600 dark:text-amber-400" : tone === "primary" ? "text-primary" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-0.5 text-muted-foreground">{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export default function BomDetailPage() {
  const params = useParams();
  const rawId = params.id as string;
  const id = (() => {
    try {
      return decodeURIComponent(rawId);
    } catch {
      return rawId;
    }
  })();
  const router = useRouter();
  const canWrite = useCanWriteManufacturing();
  const canApprove = useHasPermission("manufacturing.production.approve");
  const templateId = useOrgContextStore((s) => s.templateId);
  const canonical = canonicalIndustryTemplateId(templateId);
  const bakery = canonical === FMCG_BAKERY_TEMPLATE_ID;
  const releaseFlow = canonical === "fmcg-manufacturer";
  const terminology = useTerminology();
  const terms = productionTerms(templateId);
  const areaLabel = manufacturingAreaLabel(terminology);
  const uoms = React.useMemo(() => listUoms().map((item) => item.code), []);

  const [bom, setBom] = React.useState<ManufacturingBom | null>(null);
  const [routes, setRoutes] = React.useState<ManufacturingRoute[]>([]);
  const [warehouses, setWarehouses] = React.useState<Array<{ id: string; code?: string; name: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [section, setSection] = React.useState("components");
  const [editing, setEditing] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [quantityDraft, setQuantityDraft] = React.useState("");
  const [uomDraft, setUomDraft] = React.useState("");
  const [tolerance, setTolerance] = React.useState("");
  const [cost, setCost] = React.useState<RecipeCostSummary | null>(null);
  const [history, setHistory] = React.useState<RecipeHistory | null>(null);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState("");
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmApply, setConfirmApply] = React.useState<{ id: string; label: string } | null>(null);

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      setHistory(await fetchRecipeHistory(id));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Could not load the version history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [nextBom, nextRoutes, nextWarehouses] = await Promise.all([
        fetchManufacturingBom(id),
        fetchManufacturingRoutes(),
        fetchWarehousesApi(),
      ]);
      setBom(nextBom);
      setRoutes(nextRoutes);
      setWarehouses(nextWarehouses.filter((warehouse) => warehouse.status !== "INACTIVE"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to load ${terms.formula}.`);
    } finally {
      setLoading(false);
    }
  }, [id, terms.formula]);

  React.useEffect(() => {
    void refresh();
    void loadHistory();
  }, [refresh, loadHistory]);

  const [checkingUnits, setCheckingUnits] = React.useState(false);
  const recheckUnits = React.useCallback(async () => {
    setCheckingUnits(true);
    try {
      const next = await fetchManufacturingBom(id);
      if (next) setBom((current) => (current ? { ...current, unitGaps: next.unitGaps } : next));
    } finally {
      setCheckingUnits(false);
    }
  }, [id]);
  const hasUnitGaps = (bom?.unitGaps?.length ?? 0) > 0;
  React.useEffect(() => {
    if (!hasUnitGaps) return;
    const onFocus = () => void recheckUnits();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [hasUnitGaps, recheckUnits]);

  const [hasDraft, setHasDraft] = React.useState(false);
  React.useEffect(() => {
    if (editing) return;
    let cancelled = false;
    const local = typeof window !== "undefined" && window.localStorage.getItem(`erp.bom-components.draft.${id}`) != null;
    if (local) { setHasDraft(true); return; }
    void fetchDocumentDraftApi(`bom-components:${id}`)
      .then((draft) => { if (!cancelled) setHasDraft(Array.isArray((draft as { lines?: unknown } | null)?.lines)); })
      .catch(() => { if (!cancelled) setHasDraft(false); });
    return () => { cancelled = true; };
  }, [id, editing]);

  const startEditing = React.useCallback(() => {
    if (!bom) return;
    setNameDraft(bom.name);
    setQuantityDraft(String(bom.quantity));
    setUomDraft(bom.uom);
    setSection("components");
    setEditing(true);
  }, [bom]);

  const searchParams = useSearchParams();
  const autoEdit = React.useRef(searchParams?.get("edit") === "1");
  React.useEffect(() => {
    if (!autoEdit.current || !bom || !canWrite || bom.lifecycle === "RETIRED") return;
    autoEdit.current = false;
    startEditing();
    router.replace(`/manufacturing/boms/${encodeURIComponent(id)}`, { scroll: false });
  }, [bom, canWrite, startEditing, router, id]);

  const afterSave = React.useCallback((updated: ManufacturingBom) => {
    if (updated.id !== id) {
      router.replace(`/manufacturing/boms/${encodeURIComponent(updated.id)}`);
    }
    setBom(updated);
    setEditing(false);
    void loadHistory();
  }, [id, router, loadHistory]);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const restore = (revisionNo: number) => runAction(async () => {
    if (!bom) return;
    const updated = await restoreRecipeRevision(bom.id, revisionNo);
    setBom(updated);
    setEditing(false);
    setNameDraft(updated.name);
    setQuantityDraft(String(updated.quantity));
    setUomDraft(updated.uom);
    setHistoryOpen(false);
    toast.success(updated.revisionNo ? `Version ${revisionNo} restored. Production now uses it as version ${updated.revisionNo}.` : `Version ${revisionNo} restored.`);
    await loadHistory();
  });

  const makeCurrent = (recordId: string) => runAction(async () => {
    const result = await makeRecipeCurrent(recordId);
    toast.success(result.merged ? "Saved onto the live recipe as a new version." : "This recipe is now used for production.");
    setHistoryOpen(false);
    if (result.id !== id) router.push(`/manufacturing/boms/${encodeURIComponent(result.id)}`);
    else { await refresh(); await loadHistory(); }
  });

  const toggleActive = () => runAction(async () => {
    if (!bom) return;
    const updated = await updateManufacturingBom(bom.id, { isActive: !bom.isActive });
    setBom(updated);
    toast.success(updated.isActive ? "Recipe is live again." : "Recipe deactivated. It will not be offered for new production.");
    await loadHistory();
  });

  const remove = () => runAction(async () => {
    if (!bom) return;
    await deleteManufacturingBom(bom.id);
    toast.success(`${bom.code} deleted.`);
    router.push("/manufacturing/boms");
  });

  const headerChanges = React.useMemo<RecipeRevisionChange[]>(() => {
    if (!bom || !editing) return [];
    const out: RecipeRevisionChange[] = [];
    if (nameDraft.trim() && nameDraft.trim() !== bom.name) out.push({ kind: "header", field: "name", from: bom.name, to: nameDraft.trim() });
    const quantity = Number(quantityDraft);
    if (Number.isFinite(quantity) && quantity > 0 && quantity !== bom.quantity) out.push({ kind: "header", field: "quantity", from: bom.quantity, to: quantity });
    if (uomDraft && uomDraft !== bom.uom) out.push({ kind: "header", field: "uom", from: bom.uom, to: uomDraft });
    return out;
  }, [bom, editing, nameDraft, quantityDraft, uomDraft]);
  const headerPayload = React.useMemo(() => Object.fromEntries(headerChanges.map((change) => [change.field, change.to])), [headerChanges]);
  const discardEditing = React.useCallback(() => setEditing(false), []);
  const versioned = React.useMemo(() => ({ nextVersion: (history?.revisions[0]?.revisionNo ?? bom?.revisionNo ?? 0) + 1, onDiscard: discardEditing }), [history, bom?.revisionNo, discardEditing]);

  if (loading && !bom) {
    return (
      <PageShell>
        <PageHeader title={`Loading ${terms.formula}…`} breadcrumbs={[{ label: areaLabel, href: "/manufacturing/boms" }, { label: terms.formulasTitle }]} />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => <div key={key} className="h-28 animate-pulse rounded-xl bg-muted/50" />)}
        </div>
      </PageShell>
    );
  }

  if (!bom) {
    return (
      <PageShell>
        <PageHeader title={`${terms.formulaTitle} not found`} breadcrumbs={[{ label: areaLabel, href: "/manufacturing/boms" }, { label: terms.formulasTitle }]} />
        <div className="p-6">
          <p className="text-muted-foreground">This {terms.formula} could not be loaded. It may be unavailable or the connection may have failed.</p>
          <div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => void refresh()}>Retry</Button><Button variant="ghost" asChild><Link href="/manufacturing/boms">Back to {terms.formulas}</Link></Button></div>
        </div>
      </PageShell>
    );
  }

  const state = recordState(bom);
  const lifecycle = bom.lifecycle ?? "LEGACY";
  const editable = canWrite && (bakery ? lifecycle !== "RETIRED" : releaseFlow ? lifecycle === "DRAFT" : !["EFFECTIVE", "RETIRED"].includes(lifecycle));
  const deletable = canWrite && !["EFFECTIVE", "RETIRED"].includes(lifecycle);
  const names = namesFromHistory(history, Object.fromEntries(bom.items.map((item) => [item.productId, item.productName ?? item.productSku ?? item.productId])));
  const currentRevision = history?.revisions.find((revision) => revision.isCurrent);
  const liveSibling = history?.otherRecords.find((record) => record.isActive && !record.pendingDraft);
  const versionNo = currentRevision?.revisionNo ?? bom.revisionNo;
  const lastChanged = bom.updatedAt ? new Date(bom.updatedAt) : null;
  const optionalCount = bom.items.filter((item) => item.isOptional).length;
  const selectedRoute = routes.find((route) => route.id === bom.routeId);
  const productLabel = bom.finishedProductSku ? `${bom.finishedProductSku} · ${bom.finishedProductName ?? bom.finishedProductId}` : bom.finishedProductName ?? bom.finishedProductId;
  const pill = STATE_PILL[state];
  const saveTolerance = () => runAction(async () => {
    if (!tolerance || !Number.isFinite(Number(tolerance)) || Number(tolerance) < 0 || Number(tolerance) > 1000) return;
    const updated = await updateManufacturingBom(bom.id, { yieldTolerancePercent: Number(tolerance) });
    setBom(updated);
    setTolerance("");
    toast.success("Yield tolerance saved for future batches.");
    await loadHistory();
  });

  return (
    <PageShell>
      <PageHeader
        title={`${bom.code} — ${bom.name}`}
        help={<BomPilotHelp screen="detail" steps={[
          { id: "summary", target: "[data-bom-summary]", title: "Check this recipe", description: "See what the recipe makes, what one batch costs, how many ingredients it has and which version production is using." },
          { id: "components", target: "[data-bom-tabs]", title: "Ingredients", description: editable ? "Choose Edit recipe to add, remove or change ingredients. Saving creates the next version; the previous one stays in history." : "Review the ingredients, quantities, units, stores and scrap. Your access or this record's state does not allow editing.", instruction: "Select the Ingredients tab.", complete: section === "components" },
          { id: "history", target: "[data-bom-history]", title: "Version history", description: "History shows every saved version with what changed, who changed it and when. Compare any version with the current recipe or restore it. Batches already made keep the recipe they were made with." },
        ]} />}
        description={`Makes ${formatQty(bom.quantity)} ${bom.uom} of ${productLabel}`}
        breadcrumbs={[
          { label: areaLabel, href: "/manufacturing/boms" },
          { label: terms.formulasTitle, href: "/manufacturing/boms" },
          { label: bom.code },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", pill.className)}>
              <span className={cn("size-1.5 rounded-full", pill.dot)} aria-hidden />{pill.label}
            </span>
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)} data-bom-history>
              <Icons.History className="mr-1.5 size-4" />History
              {versionNo ? <span className="ml-1.5 rounded bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">v{versionNo}</span> : null}
            </Button>
            {editable && !editing && (
              <Button size="sm" onClick={startEditing}>
                <Icons.Pencil className="mr-1.5 size-4" />Edit {terms.formula}
              </Button>
            )}
            {(editable || deletable || releaseFlow) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8" aria-label="More actions"><Icons.MoreHorizontal className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {editable && !releaseFlow && (state === "live" || state === "inactive") && (
                    <DropdownMenuItem disabled={busy} onSelect={() => void toggleActive()}>
                      {bom.isActive ? <Icons.PauseCircle className="mr-2 size-4" /> : <Icons.PlayCircle className="mr-2 size-4" />}
                      {bom.isActive ? "Deactivate" : "Make live again"}
                    </DropdownMenuItem>
                  )}
                  {releaseFlow && (
                    <DropdownMenuItem asChild>
                      <Link href="/manufacturing/recipe-governance"><Icons.GitBranch className="mr-2 size-4" />{terms.governance}</Link>
                    </DropdownMenuItem>
                  )}
                  {deletable && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={busy} onSelect={() => setConfirmDelete(true)}>
                        <Icons.Trash2 className="mr-2 size-4" />Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/manufacturing/boms"><Icons.ArrowLeft className="mr-1.5 size-4" />{terms.formulasTitle}</Link>
            </Button>
          </div>
        }
      />
      <div className="space-y-5 p-4 sm:p-6">
        {(bom.unitGaps ?? []).length > 0 && (
          <Banner
            tone="amber"
            icon={Icons.AlertTriangle}
            title="Set unit conversions before a work order"
            actions={
              <>
                <Button size="sm" asChild>
                  <Link href={`/master/products/${encodeURIComponent((bom.unitGaps ?? [])[0]?.productId ?? "")}?tab=packaging`} target="_blank">Set up units</Link>
                </Button>
                <Button size="sm" variant="outline" disabled={checkingUnits} onClick={() => void recheckUnits()}>
                  {checkingUnits ? <Icons.Loader2 className="mr-1.5 size-4 animate-spin" /> : <Icons.RefreshCw className="mr-1.5 size-4" />}
                  Check again
                </Button>
              </>
            }
          >
            <ul className="mt-1 space-y-1">
              {(bom.unitGaps ?? []).map((gap) => (
                <li key={`${gap.productId}-${gap.fromUom}-${gap.kind}`}>
                  {bomUnitGapText(gap)}{" "}
                  <Link href={`/master/products/${encodeURIComponent(gap.productId)}?tab=packaging`} target="_blank" className="underline">Open product units</Link>
                </li>
              ))}
            </ul>
            <p className="mt-1">Work orders for this recipe stay blocked until this is fixed. You can also change the recipe unit to match the stock unit.</p>
          </Banner>
        )}
        {state === "earlier" && (
          <Banner
            tone="muted"
            icon={Icons.FileClock}
            title="Earlier copy of this recipe"
            actions={
              <>
                {liveSibling && <Button size="sm" variant="outline" asChild><Link href={`/manufacturing/boms/${encodeURIComponent(liveSibling.id)}`}>Open live recipe</Link></Button>}
                {bakery && canWrite && <Button size="sm" disabled={busy} onClick={() => setConfirmApply({ id: bom.id, label: "Use this copy" })}><Icons.RotateCcw className="mr-1.5 size-4" />Use this copy</Button>}
              </>
            }
          >
            Kept for reference. Batches made with it keep their own record. {bakery ? "To bring it back, use this copy; it is saved onto the live recipe as a new version." : ""}
          </Banner>
        )}
        <div data-bom-summary className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Icons.Package} label="Makes" hint={productLabel}>
            {formatQty(bom.quantity)} <span className="text-sm font-normal text-muted-foreground">{bom.uom}</span>
          </Stat>
          <Stat
            icon={Icons.Wallet}
            label="Batch cost (excl. VAT)"
            hint={cost == null ? "Calculating…" : cost.unpriced > 0 ? `${cost.unpriced} ingredient${cost.unpriced === 1 ? "" : "s"} without a price` : cost.perOutput != null && bom.quantity !== 1 ? `${formatMoney(cost.perOutput)} per ${bom.uom}` : "All ingredients priced"}
          >
            {cost == null ? <span className="inline-block h-6 w-24 animate-pulse rounded bg-muted" /> : formatMoney(cost.total)}
            {cost != null && cost.unpriced > 0 && <Icons.AlertTriangle className="ml-2 inline size-4 align-[-2px] text-amber-500" aria-label="Incomplete" />}
          </Stat>
          <Stat icon={Icons.Layers} label="Ingredients" hint={optionalCount ? `${optionalCount} optional` : bom.outputWarehouseName ? `Output to ${bom.outputWarehouseName}` : undefined}>
            {bom.items.length}
          </Stat>
          <Stat
            icon={Icons.History}
            label="Version"
            onClick={() => setHistoryOpen(true)}
            hint={lastChanged && !Number.isNaN(lastChanged.getTime()) ? `Changed ${formatDistanceToNow(lastChanged, { addSuffix: true })}${bom.lastChangedByName ? ` by ${bom.lastChangedByName}` : ""}` : "View history"}
          >
            {versionNo ? `Version ${versionNo}` : bom.version ? `Version ${bom.version}` : "—"}
          </Stat>
        </div>

        {!editing && editable && hasDraft && (
          <Banner tone="primary" icon={Icons.PenLine} title="You have unsaved edits to this recipe" actions={<Button size="sm" onClick={startEditing}>Continue editing</Button>}>
            They are kept as a draft and are not used by production until you save them.
          </Banner>
        )}

        {!editing && currentRevision && currentRevision.changes.length > 0 && history?.historyStarted && (
          <div className="flex flex-col gap-2 rounded-xl border bg-card/60 px-4 py-3 sm:flex-row sm:items-center">
            <p className="shrink-0 text-xs font-medium text-muted-foreground">Latest change</p>
            <ChangeChips changes={currentRevision.changes} names={names} limit={4} className="min-w-0 flex-1" />
            <Button variant="link" size="sm" className="h-auto shrink-0 p-0 text-xs" onClick={() => setHistoryOpen(true)}>Full history →</Button>
          </div>
        )}

        <Tabs value={section} onValueChange={setSection}>
          <TabsList data-bom-tabs aria-label={`${terms.formulaTitle} sections`}>
            <TabsTrigger value="components">Ingredients</TabsTrigger>
            <TabsTrigger value="routing">Routing</TabsTrigger>
            <TabsTrigger value="simulator">Price simulator</TabsTrigger>
          </TabsList>

          <TabsContent value="components" forceMount hidden={section !== "components"}>
            <Card className={cn("overflow-hidden transition-shadow", editing && "border-primary/40 shadow-md ring-1 ring-primary/10")}>
              <CardHeader className={cn(editing && "border-b bg-primary/[0.04]")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {editing ? <><Icons.Pencil className="size-4 text-primary" />Editing {terms.formula}</> : "Ingredients"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {editing
                        ? `Add, remove or change ingredients. Saving makes this version ${versioned.nextVersion}; version ${versioned.nextVersion - 1 || 1} stays in history and batches already made are not affected.`
                        : editable
                          ? `What goes into one batch. Choose Edit ${terms.formula} to change it.`
                          : "What goes into one batch."}
                    </CardDescription>
                  </div>
                  {!editing && editable && (
                    <Button variant="outline" size="sm" onClick={startEditing}><Icons.Pencil className="mr-1.5 size-4" />Edit</Button>
                  )}
                </div>
                {editing && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="space-y-1.5">
                      <Label htmlFor="recipe-name" className="text-xs">{terms.nameLabel}</Label>
                      <Input id="recipe-name" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={200} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="recipe-batch" className="text-xs">One batch makes</Label>
                      <Input id="recipe-batch" inputMode="decimal" className="tabular-nums" value={quantityDraft} onChange={(event) => setQuantityDraft(event.target.value)} aria-invalid={!(Number(quantityDraft) > 0)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="recipe-uom" className="text-xs">Unit</Label>
                      <Select value={uomDraft} onValueChange={setUomDraft}>
                        <SelectTrigger id="recipe-uom"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[...new Set([bom.uom, ...uoms])].map((uom) => <SelectItem key={uom} value={uom}>{uom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {canApprove && editing && (
                  <div className="flex flex-wrap items-end gap-3 border-b bg-muted/20 px-4 py-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bom-tolerance" className="text-xs">Yield tolerance % <span className="font-normal text-muted-foreground">(now {bom.yieldTolerancePercent ?? 0})</span></Label>
                      <Input id="bom-tolerance" className="h-8 max-w-40" type="number" min="0" max="1000" step="0.1" value={tolerance} onChange={(event) => setTolerance(event.target.value)} />
                    </div>
                    <Button variant="outline" size="sm" disabled={busy || !tolerance || !Number.isFinite(Number(tolerance)) || Number(tolerance) < 0 || Number(tolerance) > 1000} onClick={() => void saveTolerance()}>Save tolerance</Button>
                  </div>
                )}
                <BomComponentEditor
                  bomId={bom.id}
                  savedItems={bom.items}
                  uoms={uoms}
                  warehouses={warehouses}
                  canWrite={editable && editing}
                  outputQuantity={editing && Number(quantityDraft) > 0 ? Number(quantityDraft) : bom.quantity}
                  outputUom={editing ? uomDraft : bom.uom}
                  onSaved={afterSave}
                  versioned={versioned}
                  extraPayload={headerPayload}
                  extraChanges={headerChanges}
                  onCostSummary={setCost}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="routing" forceMount hidden={section !== "routing"}>
            <Card>
              <CardHeader>
                <CardTitle>Routing</CardTitle>
                <CardDescription>The production steps work orders follow for this {terms.formula}. A change is saved straight away as a new version.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="bom-route">Production routing</Label>
                  <Select
                    disabled={!editable || busy}
                    value={bom.routeId ?? "__none__"}
                    onValueChange={(value) => void runAction(async () => {
                      const updated = await updateManufacturingBom(bom.id, { routeId: value === "__none__" ? null : value });
                      setBom(updated);
                      toast.success("Routing updated.");
                      await loadHistory();
                    })}
                  >
                    <SelectTrigger id="bom-route" className="w-full max-w-md"><SelectValue placeholder="Select route" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No route</SelectItem>
                      {routes.map((route) => <SelectItem key={route.id} value={route.id}>{route.code} - {route.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRoute && <p className="text-sm text-muted-foreground">{selectedRoute.code} has {selectedRoute.operations.length} operation(s).</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="simulator">
            {section === "simulator" && (
              <Card>
                <CardHeader>
                  <CardTitle>Price simulator</CardTitle>
                  <CardDescription>Try a different formula or ingredient price and see the cost and margin before you change the {terms.formula}. Nothing is saved here.</CardDescription>
                </CardHeader>
                <CardContent className="p-0"><RecipePriceSimulator bom={bom} /></CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <RecipeHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title={`${bom.code} — ${bom.name}`}
        history={history}
        loading={historyLoading}
        error={historyError}
        canRestore={editable && !editing}
        busy={busy}
        onRestore={restore}
        onMakeCurrent={bakery ? makeCurrent : undefined}
        onRetry={() => void loadHistory()}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${bom.code}?`}
        description="This removes the record. Recipes used by production cannot be deleted; deactivate them instead."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => void remove()}
      />
      <ConfirmDialog
        open={confirmApply != null}
        onOpenChange={(open) => { if (!open) setConfirmApply(null); }}
        title={confirmApply?.label ?? "Apply"}
        description="Its ingredients become the recipe production uses, saved as a new version. Earlier versions stay in history and batches already made are not affected."
        confirmLabel="Apply"
        onConfirm={() => { if (confirmApply) void makeCurrent(confirmApply.id); }}
      />
    </PageShell>
  );
}
