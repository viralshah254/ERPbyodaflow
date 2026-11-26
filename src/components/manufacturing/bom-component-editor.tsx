"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MANUFACTURING_DEFER_STORE_LABEL,
  ManufacturingWarehouseSelect,
  manufacturingWarehouseLabel,
} from "@/components/manufacturing/manufacturing-warehouse-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DocumentProductPickerSheet, type CatalogAddItem } from "@/components/docs/DocumentProductPickerSheet";
import {
  deleteDocumentDraftApi,
  fetchDocumentDraftApi,
  saveDocumentDraftApi,
} from "@/lib/api/document-drafts";
import { isApiConfigured } from "@/lib/api/client";
import { fetchProductsPageApi } from "@/lib/api/products";
import { fetchProductPackagingBatchApi } from "@/lib/api/product-master";
import {
  normalizeUomCode,
  physicalUnitChoices,
  prepareSkuAlternateUoms,
  resolveFactorToBase,
  type SkuAlternateUom,
} from "@/lib/products/sku-uom";
import { updateManufacturingBom, type ManufacturingBom, type ManufacturingBomItem, type RecipeRevisionChange } from "@/lib/api/manufacturing";
import { diffItems } from "@/lib/manufacturing/recipe-changes";
import { ChangeChips } from "@/components/manufacturing/recipe-history";
import { canonicalIndustryTemplateId, FMCG_SELLING_TEMPLATE_IDS } from "@/config/industry";
import { useOrgContextStore } from "@/stores/orgContextStore";
import type { ProductRow } from "@/lib/types/masters";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";

type WarehouseOption = { id: string; code?: string; name: string };

type ComponentDraftLine = {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  quantity: string;
  uom: string;
  isOptional: boolean;
  scrapPercent: string;
  warehouseId: string;
  /** Cost per recipe unit, excl. VAT. Empty uses the product's catalogue price. */
  unitCost: string;
};

/** Units a product can be measured in for production, and its catalogue price per base unit. */
type ProductUnits = { baseUom: string; unitPrice?: number; rows: SkuAlternateUom[] };

function unitChoices(info: ProductUnits): string[] {
  const alternates = info.rows.filter((row) => row.status !== "inactive").map((row) => normalizeUomCode(row.uom));
  return [...new Set([info.baseUom, ...physicalUnitChoices(info.baseUom), ...alternates])];
}

/** Base units per one recipe unit; null when no conversion is set up, undefined while loading. */
function factorToBase(info: ProductUnits | undefined, uom: string): number | null | undefined {
  if (!info) return undefined;
  return resolveFactorToBase(uom, info.rows, info.baseUom);
}

function lineUnitCost(line: ComponentDraftLine, info: ProductUnits | undefined): number | undefined {
  if (line.unitCost.trim()) {
    const typed = Number(line.unitCost);
    return Number.isFinite(typed) && typed >= 0 ? typed : undefined;
  }
  const factor = factorToBase(info, line.uom);
  return info?.unitPrice != null && info.unitPrice > 0 && factor ? info.unitPrice * factor : undefined;
}

function lineCost(line: ComponentDraftLine, info: ProductUnits | undefined): number | undefined {
  const cost = lineUnitCost(line, info);
  const quantity = Number(line.quantity);
  if (cost == null || !Number.isFinite(quantity)) return undefined;
  const scrap = Number(line.scrapPercent);
  return quantity * (1 + (Number.isFinite(scrap) && scrap > 0 ? scrap / 100 : 0)) * cost;
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatQuantity(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

type DraftPayload = { lines: ComponentDraftLine[]; savedAt: string };

const DRAFT_DEBOUNCE_MS = 700;

const ADD_INGREDIENT_HINT =
  `Search and press Enter to add the next product. Set quantity, unit, cost, store, and scrap on the row. ` +
  `Leave the store on ${MANUFACTURING_DEFER_STORE_LABEL} unless this ingredient must always come from one store. ` +
  "Units list only what the product can be measured in; add more under the product's Packaging tab.";

function draftType(bomId: string): string {
  return `bom-components:${bomId}`;
}

function localDraftKey(bomId: string): string {
  return `erp.bom-components.draft.${bomId}`;
}

function scrapPercentFromStored(scrapFactor?: number, mode?: "RATIO" | "PERCENT"): string {
  if (scrapFactor == null || !Number.isFinite(scrapFactor) || scrapFactor <= 0) return "";
  const ratio = mode === "RATIO" ? scrapFactor : mode === "PERCENT" ? scrapFactor / 100 : scrapFactor >= 1 ? scrapFactor / 100 : scrapFactor;
  const percent = Math.round(ratio * 10000) / 100;
  return percent > 0 ? String(percent) : "";
}

function toDraftLine(item: ManufacturingBomItem): ComponentDraftLine {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    quantity: String(item.quantity ?? 1),
    uom: item.uom || "EA",
    isOptional: item.isOptional === true,
    scrapPercent: scrapPercentFromStored(item.scrapFactor, item.scrapFactorMode),
    warehouseId: item.warehouseId ?? "",
    unitCost: item.unitCost != null ? String(item.unitCost) : "",
  };
}

function normalizeLine(value: unknown): ComponentDraftLine | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Omit<Partial<ComponentDraftLine>, "unitCost"> & { unitCost?: unknown };
  if (typeof row.id !== "string" || typeof row.productId !== "string" || !row.productId) return null;
  return {
    id: row.id,
    productId: row.productId,
    productName: typeof row.productName === "string" ? row.productName : undefined,
    productSku: typeof row.productSku === "string" ? row.productSku : undefined,
    quantity: row.quantity != null ? String(row.quantity) : "1",
    uom: typeof row.uom === "string" && row.uom ? row.uom : "EA",
    isOptional: row.isOptional === true,
    scrapPercent: row.scrapPercent != null ? String(row.scrapPercent) : "",
    warehouseId: typeof row.warehouseId === "string" ? row.warehouseId : "",
    unitCost: typeof row.unitCost === "number" || typeof row.unitCost === "string" ? String(row.unitCost) : "",
  };
}

function parseDraft(payload: unknown): DraftPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { lines?: unknown; savedAt?: unknown };
  if (!Array.isArray(record.lines)) return null;
  const lines = record.lines.map(normalizeLine).filter((line): line is ComponentDraftLine => line != null);
  if (!lines.length) return null;
  return {
    lines,
    savedAt: typeof record.savedAt === "string" ? record.savedAt : new Date(0).toISOString(),
  };
}

function readLocalDraft(bomId: string): DraftPayload | null {
  try {
    const raw = window.localStorage.getItem(localDraftKey(bomId));
    if (!raw) return null;
    return parseDraft(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function writeLocalDraft(bomId: string, payload: DraftPayload): void {
  window.localStorage.setItem(localDraftKey(bomId), JSON.stringify(payload));
}

function clearLocalDraft(bomId: string): void {
  window.localStorage.removeItem(localDraftKey(bomId));
}

function pickNewer(left: DraftPayload | null, right: DraftPayload | null): DraftPayload | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(left.savedAt) >= Date.parse(right.savedAt) ? left : right;
}

function lineFromProduct(product: ProductRow, qty: number): ComponentDraftLine {
  return {
    id: `line-${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    quantity: String(qty > 0 ? qty : 1),
    uom: product.unit || "EA",
    isOptional: false,
    scrapPercent: "",
    warehouseId: "",
    unitCost: "",
  };
}

function mergeProducts(current: ComponentDraftLine[], items: Array<{ product: ProductRow; qty: number }>): ComponentDraftLine[] {
  const next = current.map((line) => ({ ...line }));
  for (const item of items) {
    const qty = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1;
    const existing = next.find((line) => line.productId === item.product.id);
    if (existing) {
      const currentQty = Number(existing.quantity);
      existing.quantity = String((Number.isFinite(currentQty) ? currentQty : 0) + qty);
      continue;
    }
    next.push(lineFromProduct(item.product, qty));
  }
  return next;
}

function toBomItem(line: ComponentDraftLine): ManufacturingBomItem {
  const quantity = Number(line.quantity);
  const scrap = line.scrapPercent.trim() ? Number(line.scrapPercent) : undefined;
  return {
    id: line.id,
    productId: line.productId,
    productName: line.productName,
    productSku: line.productSku,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    uom: line.uom || "EA",
    isOptional: line.isOptional,
    scrapFactorMode: "RATIO",
    scrapFactor: scrap != null && Number.isFinite(scrap) && scrap > 0 ? scrap / 100 : undefined,
    warehouseId: line.warehouseId || undefined,
    unitCost: line.unitCost.trim() ? Number(line.unitCost) : undefined,
  };
}

function formatDraftTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export type RecipeCostSummary = { total: number; unpriced: number; perOutput?: number };

export function BomComponentEditor({
  bomId,
  savedItems,
  uoms,
  warehouses,
  canWrite,
  outputQuantity,
  outputUom,
  onSaved,
  versioned,
  extraPayload,
  extraChanges,
  onCostSummary,
}: {
  bomId: string;
  savedItems: ManufacturingBomItem[];
  uoms: string[];
  warehouses: WarehouseOption[];
  canWrite: boolean;
  outputQuantity?: number;
  outputUom?: string;
  onSaved: (bom: ManufacturingBom) => void;
  /** Save as the next version with a change preview and an optional note. */
  versioned?: { nextVersion: number; onDiscard: () => void };
  /** Recipe header edits (name, batch size) saved in the same version as the components. */
  extraPayload?: Record<string, unknown>;
  extraChanges?: RecipeRevisionChange[];
  onCostSummary?: (summary: RecipeCostSummary) => void;
}) {
  const templateId = useOrgContextStore((state) => state.templateId);
  const fmcgOrg = (FMCG_SELLING_TEMPLATE_IDS as readonly string[]).includes(canonicalIndustryTemplateId(templateId));
  const savedRef = React.useRef(savedItems);
  savedRef.current = savedItems;
  const savedFingerprint = React.useMemo(
    () =>
      JSON.stringify(
        savedItems.map((item) => [
          item.id,
          item.productId,
          item.quantity,
          item.uom,
          item.unitCost,
          item.warehouseId,
          item.isOptional,
          item.scrapFactor,
          item.scrapFactorMode,
        ]),
      ),
    [savedItems],
  );
  const baselineRef = React.useRef("");
  const hydratedRef = React.useRef(false);
  const draftActiveRef = React.useRef(false);
  const draftGenRef = React.useRef(0);
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  const [lines, setLines] = React.useState<ComponentDraftLine[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [draftSavedAt, setDraftSavedAt] = React.useState<string | null>(null);
  const [draftStatus, setDraftStatus] = React.useState<"idle" | "saving" | "saved" | "local">("idle");
  const [saving, setSaving] = React.useState(false);
  const [changeNote, setChangeNote] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<ProductRow[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [productUnits, setProductUnits] = React.useState<Record<string, ProductUnits>>({});
  const requestedUnitsRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (!isApiConfigured()) return;
    const missing = [...new Set(lines.map((line) => line.productId))].filter((id) => !requestedUnitsRef.current.has(id)).slice(0, 100);
    if (!missing.length) return;
    missing.forEach((id) => requestedUnitsRef.current.add(id));
    void Promise.all([fetchProductsPageApi({ ids: missing, limit: 100, includeStock: false }), fetchProductPackagingBatchApi(missing)])
      .then(([page, packaging]) => {
        setProductUnits((current) => {
          const next = { ...current };
          for (const product of page.items) {
            const baseUom = normalizeUomCode(product.unit) || "EA";
            next[product.id] = { baseUom, unitPrice: product.unitPrice, rows: prepareSkuAlternateUoms(packaging[product.id] ?? [], baseUom).rows };
          }
          return next;
        });
      })
      .catch(() => missing.forEach((id) => requestedUnitsRef.current.delete(id)));
  }, [lines]);

  React.useEffect(() => {
    let cancelled = false;
    hydratedRef.current = false;
    setHydrated(false);
    const serverLines = savedRef.current.map(toDraftLine);
    baselineRef.current = JSON.stringify(serverLines);

    async function load() {
      const local = readLocalDraft(bomId);
      let remote: DraftPayload | null = null;
      if (isApiConfigured()) {
        try {
          remote = parseDraft(await fetchDocumentDraftApi(draftType(bomId)));
        } catch {
          remote = null;
        }
      }
      if (cancelled) return;
      const draft = pickNewer(local, remote);
      const usingDraft = canWrite && Boolean(draft && JSON.stringify(draft.lines) !== baselineRef.current);
      setLines(usingDraft && draft ? draft.lines : serverLines);
      setDraftSavedAt(usingDraft && draft ? draft.savedAt : null);
      setDraftStatus(usingDraft ? "saved" : "idle");
      hydratedRef.current = true;
      setHydrated(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [bomId, canWrite]);

  /** Restore or save elsewhere: show the server recipe when the user is not actively editing. */
  React.useEffect(() => {
    if (!hydrated) return;
    const serverLines = savedItems.map(toDraftLine);
    const nextBaseline = JSON.stringify(serverLines);
    if (nextBaseline === baselineRef.current) return;
    let applied = false;
    setLines((current) => {
      const locallyDirty = JSON.stringify(current) !== baselineRef.current;
      if (locallyDirty && canWrite) return current;
      applied = true;
      return serverLines;
    });
    if (!applied) return;
    baselineRef.current = nextBaseline;
    draftGenRef.current += 1;
    draftActiveRef.current = false;
    setDraftSavedAt(null);
    setDraftStatus("idle");
    setChangeNote("");
    clearLocalDraft(bomId);
    if (isApiConfigured()) void deleteDocumentDraftApi(draftType(bomId)).catch(() => {});
  }, [savedFingerprint, hydrated, canWrite, bomId, savedItems]);

  const linesDirty = hydrated && JSON.stringify(lines) !== baselineRef.current;
  const dirty = linesDirty || Boolean(extraChanges?.length);

  React.useEffect(() => {
    if (!hydratedRef.current || !canWrite) return;
    const serialized = JSON.stringify(lines);
    if (serialized === baselineRef.current) {
      draftGenRef.current += 1;
      if (!draftActiveRef.current) return;
      draftActiveRef.current = false;
      clearLocalDraft(bomId);
      if (isApiConfigured()) void deleteDocumentDraftApi(draftType(bomId)).catch(() => {});
      setDraftSavedAt(null);
      setDraftStatus("idle");
      return;
    }
    const payload: DraftPayload = { lines, savedAt: new Date().toISOString() };
    writeLocalDraft(bomId, payload);
    draftActiveRef.current = true;
    const gen = ++draftGenRef.current;
    const timer = window.setTimeout(() => {
      if (!isApiConfigured()) {
        if (gen !== draftGenRef.current) return;
        setDraftSavedAt(payload.savedAt);
        setDraftStatus("local");
        return;
      }
      setDraftStatus("saving");
      void saveDocumentDraftApi(draftType(bomId), payload)
        .then(() => {
          if (gen !== draftGenRef.current) return;
          setDraftSavedAt(payload.savedAt);
          setDraftStatus("saved");
        })
        .catch(() => {
          if (gen !== draftGenRef.current) return;
          setDraftSavedAt(payload.savedAt);
          setDraftStatus("local");
        });
    }, DRAFT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [lines, bomId, canWrite]);

  React.useEffect(() => {
    const query = search.trim();
    if (!canWrite || query.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void fetchProductsPageApi({
        search: query,
        status: "ACTIVE",
        limit: 20,
        includeStock: false,
      })
        .then((page) => {
          setResults(page.items);
          setHighlight(0);
          setSearchOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, canWrite]);

  function addProducts(items: Array<{ product: ProductRow; qty: number }>) {
    if (!items.length) return;
    setLines((current) => mergeProducts(current, items));
    setSearch("");
    setResults([]);
    setSearchOpen(false);
    searchRef.current?.focus();
  }

  function addPickerItems(items: CatalogAddItem[]) {
    addProducts(items.map((item) => ({ product: item.product, qty: item.qty })));
  }

  function updateLine(id: string, patch: Partial<ComponentDraftLine>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  /** A typed cost is per recipe unit, so it follows the unit (240 per KG stays 240 per KG, becomes 0.24 per G). */
  function changeUnit(line: ComponentDraftLine, uom: string) {
    const info = productUnits[line.productId];
    const from = factorToBase(info, line.uom);
    const to = factorToBase(info, uom);
    const typed = Number(line.unitCost);
    const unitCost = line.unitCost.trim() && Number.isFinite(typed) && from && to ? String(Math.round((typed / from) * to * 10000) / 10000) : line.unitCost;
    updateLine(line.id, { uom, unitCost });
  }

  function discardDraft() {
    const serverLines = savedRef.current.map(toDraftLine);
    baselineRef.current = JSON.stringify(serverLines);
    setLines(serverLines);
    clearLocalDraft(bomId);
    if (isApiConfigured()) void deleteDocumentDraftApi(draftType(bomId)).catch(() => {});
    draftActiveRef.current = false;
    setDraftSavedAt(null);
    setDraftStatus("idle");
    setChangeNote("");
    if (versioned) versioned.onDiscard();
    else toast.success("Draft discarded. Showing the saved components.");
  }

  async function saveComponents() {
    for (const line of lines) {
      const quantity = Number(line.quantity);
      if (!line.productId || !Number.isFinite(quantity) || quantity <= 0) {
        toast.error("Each component needs a quantity greater than zero.");
        return;
      }
      const cost = Number(line.unitCost);
      if (line.unitCost.trim() && (!Number.isFinite(cost) || cost < 0)) {
        toast.error(`Enter a cost of zero or more for ${line.productName ?? line.productSku ?? "each component"}.`);
        return;
      }
      const info = productUnits[line.productId];
      if (factorToBase(info, line.uom) === null) {
        toast.error(`${line.productName ?? line.productSku ?? "A component"} has no ${line.uom} to ${info?.baseUom} conversion. Pick another unit or set the conversion up on the product.`);
        return;
      }
    }
    setSaving(true);
    try {
      const updated = await updateManufacturingBom(bomId, {
        ...extraPayload,
        items: lines.map(toBomItem),
        ...(versioned && changeNote.trim() ? { changeNote: changeNote.trim() } : {}),
      });
      const next = updated.items.map(toDraftLine);
      baselineRef.current = JSON.stringify(next);
      savedRef.current = updated.items;
      setLines(next);
      clearLocalDraft(bomId);
      if (isApiConfigured()) await deleteDocumentDraftApi(draftType(bomId)).catch(() => {});
      draftActiveRef.current = false;
      setDraftSavedAt(null);
      setDraftStatus("idle");
      setChangeNote("");
      onSaved(updated);
      toast.success(versioned && updated.revisionNo ? `Saved as version ${updated.revisionNo}. Production uses this recipe now; the previous version stays in history.` : "Components saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save components.");
    } finally {
      setSaving(false);
    }
  }

  const draftLabel = !dirty
    ? "Saved on this BOM."
    : draftStatus === "saving"
      ? "Saving draft…"
      : draftSavedAt
        ? `Draft saved ${formatDraftTime(draftSavedAt)}. Save components to update this BOM.`
        : "Unsaved changes.";

  const costs = lines.map((line) => lineCost(line, productUnits[line.productId]));
  const unpriced = costs.filter((cost) => cost == null).length;
  const totalCost = costs.reduce<number>((sum, cost) => sum + (cost ?? 0), 0);
  const perOutput = outputQuantity && outputQuantity > 0 ? totalCost / outputQuantity : undefined;

  const pricesLoaded = lines.every((line) => productUnits[line.productId]);
  React.useEffect(() => {
    if (hydrated && pricesLoaded) onCostSummary?.({ total: totalCost, unpriced, perOutput });
  }, [hydrated, pricesLoaded, totalCost, unpriced, perOutput, onCostSummary]);

  const pendingChanges = React.useMemo<RecipeRevisionChange[]>(() => {
    if (!versioned || !hydrated) return [];
    const snapshot = (items: ManufacturingBomItem[]) => items.map((item) => ({ ...item, uom: item.uom || "EA" }));
    return [...(extraChanges ?? []), ...diffItems(snapshot(savedRef.current), snapshot(lines.map(toBomItem)))];
  }, [versioned, hydrated, lines, extraChanges]);
  const lineNames = React.useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of [...savedRef.current, ...lines]) byId.set(item.productId, item.productName ?? item.productSku ?? item.productId);
    return { product: (id: string) => byId.get(id) ?? id, warehouse: (id: string) => manufacturingWarehouseLabel(warehouses.find((w) => w.id === id) ?? { id, name: id }) };
  }, [lines, warehouses]);

  return (
    <div>
      {canWrite && (
        <div className="space-y-2 border-b p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => {
                  if (results.length) setSearchOpen(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => setSearchOpen(false), 150);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setHighlight((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setHighlight((index) => Math.max(index - 1, 0));
                  } else if (event.key === "Enter") {
                    event.preventDefault();
                    const product = results[highlight];
                    if (product) addProducts([{ product, qty: 1 }]);
                  } else if (event.key === "Escape") {
                    setSearchOpen(false);
                  }
                }}
                placeholder="Name, size, or barcode"
                className="h-9 pl-9"
                disabled={!hydrated}
                aria-label="Search products to add"
              />
              {searchOpen && search.trim() && (
                <div
                  className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {searching && results.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">Searching…</p>
                  ) : results.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No products match “{search.trim()}”.</p>
                  ) : (
                    <ul>
                      {results.map((product, index) => (
                        <li key={product.id}>
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/70",
                              index === highlight && "bg-muted/70"
                            )}
                            onMouseEnter={() => setHighlight(index)}
                            onClick={() => addProducts([{ product, qty: 1 }])}
                          >
                            <span className="min-w-0 flex-1">
                              <span className={cn("block font-medium leading-snug", CAPS_ON_PRODUCT_CLASS)}>{product.name}</span>
                              <span className="block text-xs text-muted-foreground">
                                {[product.sku, product.size, product.barcode, product.unit].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    aria-label="How to add ingredients"
                  >
                    <Icons.CircleHelp className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {ADD_INGREDIENT_HINT}
                </PopoverContent>
              </Popover>
              <Button type="button" variant="outline" size="sm" disabled={!hydrated} onClick={() => setPickerOpen(true)}>
                Browse
              </Button>
            </div>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="min-w-[8.5rem] w-[8.5rem]">Qty</TableHead>
            <TableHead className="w-36">UOM</TableHead>
            <TableHead className="w-32">Cost / unit (excl. VAT)</TableHead>
            <TableHead className="w-28 text-right">Line cost</TableHead>
            <TableHead className="min-w-44">Input store</TableHead>
            <TableHead className="w-24">Optional</TableHead>
            <TableHead className="min-w-[5.5rem] w-[5.5rem]">Scrap %</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                        {hydrated ? (canWrite ? "No components yet. Search above to add the first product." : "No components on this BOM.") : "Loading components…"}
              </TableCell>
            </TableRow>
          ) : (
            lines.map((line, index) => {
              const info = productUnits[line.productId];
              const choices = info ? unitChoices(info) : uoms;
              const uomOptions = line.uom && !choices.includes(line.uom) ? [line.uom, ...choices] : choices;
              const factor = factorToBase(info, line.uom);
              const quantity = Number(line.quantity);
              const stockHint = info && factor && factor !== 1 && Number.isFinite(quantity) && quantity > 0
                ? `= ${formatQuantity(quantity * factor)} ${info.baseUom} from stock`
                : null;
              const defaultCost = lineUnitCost({ ...line, unitCost: "" }, info);
              const cost = costs[index];
              const store = warehouses.find((warehouse) => warehouse.id === line.warehouseId);
              return (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">
                    <span className="block">
                      {line.productSku ? <span className="font-mono">{line.productSku} — </span> : null}
                      <span className={line.productName || !line.productSku ? CAPS_ON_PRODUCT_CLASS : undefined}>
                        {line.productName ?? (line.productSku ? "" : line.productId)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="min-w-[8.5rem] w-[8.5rem] align-top">
                    {canWrite ? (
                      <Input
                        data-arrow-field="qty"
                        className="h-8 w-full min-w-0 tabular-nums text-sm"
                        inputMode="decimal"
                        aria-label={`Quantity for ${line.productName ?? line.productSku ?? "component"}`}
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                      />
                    ) : (
                      <span className="tabular-nums text-sm">{line.quantity}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <Select value={line.uom || "EA"} onValueChange={(value) => changeUnit(line, value)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {uomOptions.map((uom) => (
                            <SelectItem key={uom} value={uom}>{uom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      line.uom
                    )}
                    {stockHint && <span className="mt-1 block text-xs text-muted-foreground tabular-nums">{stockHint}</span>}
                    {factor === null && (
                      <span className="mt-1 block text-xs text-destructive">
                        No {line.uom} to {info?.baseUom} conversion.{" "}
                        <Link href={`/master/products/${encodeURIComponent(line.productId)}?tab=packaging`} target="_blank" className="underline">
                          Set it up
                        </Link>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <Input
                        data-arrow-field="cost"
                        className="h-8 tabular-nums"
                        inputMode="decimal"
                        aria-label={`Cost per ${line.uom} for ${line.productName ?? line.productSku ?? "component"}`}
                        placeholder={defaultCost != null ? formatAmount(defaultCost) : "No price"}
                        value={line.unitCost}
                        onChange={(event) => updateLine(line.id, { unitCost: event.target.value })}
                      />
                    ) : (
                      <span className="tabular-nums">{lineUnitCost(line, info) != null ? formatAmount(lineUnitCost(line, info)!) : "—"}</span>
                    )}
                    {canWrite && !line.unitCost.trim() && defaultCost != null && (
                      <span className="mt-1 block text-xs text-muted-foreground">Product price</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{cost != null ? formatAmount(cost) : "—"}</TableCell>
                  <TableCell>
                    {canWrite ? (
                      <ManufacturingWarehouseSelect
                        kind="input"
                        compact
                        value={line.warehouseId}
                        warehouses={warehouses}
                        onValueChange={(warehouseId) => updateLine(line.id, { warehouseId })}
                      />
                    ) : (
                      store ? manufacturingWarehouseLabel(store) : MANUFACTURING_DEFER_STORE_LABEL
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <Checkbox
                        checked={line.isOptional}
                        onCheckedChange={(value) => updateLine(line.id, { isOptional: value === true })}
                        aria-label={`Optional ${line.productName ?? "component"}`}
                      />
                    ) : (
                      line.isOptional ? "Yes" : "No"
                    )}
                  </TableCell>
                  <TableCell className="min-w-[5.5rem] w-[5.5rem]">
                    {canWrite ? (
                      <Input
                        data-arrow-field="scrap"
                        className="h-8 w-full min-w-0 tabular-nums"
                        inputMode="decimal"
                        aria-label={`Scrap percent for ${line.productName ?? "component"}`}
                        placeholder="0"
                        value={line.scrapPercent}
                        onChange={(event) => updateLine(line.id, { scrapPercent: event.target.value })}
                      />
                    ) : (
                      line.scrapPercent ? `${line.scrapPercent}%` : "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setLines((current) => current.filter((candidate) => candidate.id !== line.id))}
                      >
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {lines.length > 0 && (
        <div className="flex flex-col gap-1 border-t px-4 py-3 text-sm sm:flex-row sm:items-baseline sm:justify-between">
          <p className="font-medium tabular-nums">
            Total cost (excl. VAT): {formatAmount(totalCost)}
            {outputQuantity != null && outputQuantity > 0 && ` for ${formatQuantity(outputQuantity)} ${outputUom ?? ""}`}
            {perOutput != null && outputQuantity !== 1 && ` · ${formatAmount(perOutput)} per ${outputUom ?? "unit"}`}
          </p>
          {unpriced > 0 && (
            <p className="text-xs text-muted-foreground">
              {unpriced === 1 ? "1 component has" : `${unpriced} components have`} no price, so the total is incomplete.
            </p>
          )}
        </div>
      )}

      {canWrite && versioned && (
        <div className="sticky bottom-0 z-10 space-y-3 border-t bg-card/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          {pendingChanges.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Will be saved as version {versioned.nextVersion}</p>
              <ChangeChips changes={pendingChanges} names={lineNames} limit={6} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Add, remove or change ingredients. Nothing is saved until you choose Save.</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              maxLength={500}
              placeholder="What changed and why? (optional)"
              aria-label="Change note"
              className="h-9 sm:flex-1"
              disabled={!dirty || saving}
            />
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={discardDraft}>
                {dirty ? "Discard changes" : "Close editor"}
              </Button>
              <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void saveComponents()}>
                <Icons.Check className="mr-1.5 h-4 w-4" />
                {saving ? "Saving…" : `Save as version ${versioned.nextVersion}`}
              </Button>
            </div>
          </div>
          {linesDirty && draftSavedAt && <p className="text-[11px] text-muted-foreground">Unsaved edits are kept as a draft ({formatDraftTime(draftSavedAt)}) if you leave this page.</p>}
        </div>
      )}

      {canWrite && !versioned && (
        <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">{draftLabel}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!dirty || saving} onClick={discardDraft}>
              Discard draft
            </Button>
            <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void saveComponents()}>
              {saving ? "Saving…" : "Save components"}
            </Button>
          </div>
        </div>
      )}

      <DocumentProductPickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        productFilter="all"
        fmcgOrg={fmcgOrg}
        existingProductIds={lines.map((line) => line.productId)}
        onAddMany={addPickerItems}
      />
    </div>
  );
}
