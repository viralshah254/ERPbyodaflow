"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentProductPickerSheet, type CatalogAddItem } from "@/components/docs/DocumentProductPickerSheet";
import {
  deleteDocumentDraftApi,
  fetchDocumentDraftApi,
  saveDocumentDraftApi,
} from "@/lib/api/document-drafts";
import { isApiConfigured } from "@/lib/api/client";
import { fetchProductsPageApi } from "@/lib/api/products";
import { updateManufacturingBom, type ManufacturingBom, type ManufacturingBomItem } from "@/lib/api/manufacturing";
import { canonicalIndustryTemplateId, FMCG_SELLING_TEMPLATE_IDS } from "@/config/industry";
import { useOrgContextStore } from "@/stores/orgContextStore";
import type { ProductRow } from "@/lib/types/masters";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

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
  unitCost?: number;
};

type DraftPayload = { lines: ComponentDraftLine[]; savedAt: string };

const DRAFT_DEBOUNCE_MS = 700;

function draftType(bomId: string): string {
  return `bom-components:${bomId}`;
}

function localDraftKey(bomId: string): string {
  return `erp.bom-components.draft.${bomId}`;
}

function scrapPercentFromStored(scrapFactor?: number): string {
  if (scrapFactor == null || !Number.isFinite(scrapFactor) || scrapFactor <= 0) return "";
  const ratio = scrapFactor >= 1 ? scrapFactor / 100 : scrapFactor;
  const percent = Math.round(ratio * 10000) / 100;
  return percent > 0 ? String(percent) : "";
}

function warehouseOptionLabel(warehouse: WarehouseOption): string {
  return warehouse.code ? `${warehouse.code} — ${warehouse.name}` : warehouse.name;
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
    scrapPercent: scrapPercentFromStored(item.scrapFactor),
    warehouseId: item.warehouseId ?? "",
    unitCost: item.unitCost,
  };
}

function normalizeLine(value: unknown): ComponentDraftLine | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<ComponentDraftLine>;
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
    unitCost: typeof row.unitCost === "number" ? row.unitCost : undefined,
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
    scrapFactor: scrap != null && Number.isFinite(scrap) && scrap > 0 ? scrap / 100 : undefined,
    warehouseId: line.warehouseId || undefined,
    unitCost: line.unitCost,
  };
}

function formatDraftTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function BomComponentEditor({
  bomId,
  savedItems,
  uoms,
  warehouses,
  canWrite,
  onSaved,
}: {
  bomId: string;
  savedItems: ManufacturingBomItem[];
  uoms: string[];
  warehouses: WarehouseOption[];
  canWrite: boolean;
  onSaved: (bom: ManufacturingBom) => void;
}) {
  const templateId = useOrgContextStore((state) => state.templateId);
  const fmcgOrg = (FMCG_SELLING_TEMPLATE_IDS as readonly string[]).includes(canonicalIndustryTemplateId(templateId));
  const savedRef = React.useRef(savedItems);
  savedRef.current = savedItems;
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
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<ProductRow[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const [pickerOpen, setPickerOpen] = React.useState(false);

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

  const dirty = hydrated && JSON.stringify(lines) !== baselineRef.current;

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

  function discardDraft() {
    const serverLines = savedRef.current.map(toDraftLine);
    baselineRef.current = JSON.stringify(serverLines);
    setLines(serverLines);
    clearLocalDraft(bomId);
    if (isApiConfigured()) void deleteDocumentDraftApi(draftType(bomId)).catch(() => {});
    draftActiveRef.current = false;
    setDraftSavedAt(null);
    setDraftStatus("idle");
    toast.success("Draft discarded. Showing the saved components.");
  }

  async function saveComponents() {
    for (const line of lines) {
      const quantity = Number(line.quantity);
      if (!line.productId || !Number.isFinite(quantity) || quantity <= 0) {
        toast.error("Each component needs a quantity greater than zero.");
        return;
      }
    }
    setSaving(true);
    try {
      const updated = await updateManufacturingBom(bomId, { items: lines.map(toBomItem) });
      const next = updated.items.map(toDraftLine);
      baselineRef.current = JSON.stringify(next);
      savedRef.current = updated.items;
      setLines(next);
      clearLocalDraft(bomId);
      if (isApiConfigured()) await deleteDocumentDraftApi(draftType(bomId)).catch(() => {});
      draftActiveRef.current = false;
      setDraftSavedAt(null);
      setDraftStatus("idle");
      onSaved(updated);
      toast.success("Components saved.");
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
                placeholder="Search name, SKU, or barcode"
                className="h-9 pl-9"
                disabled={!hydrated}
                aria-label="Search products to add"
              />
              {searchOpen && search.trim() && (
                <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
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
                              <span className="block font-medium leading-snug">{product.name}</span>
                              <span className="block text-xs text-muted-foreground">
                                {[product.sku, product.unit].filter(Boolean).join(" · ")}
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
            <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={!hydrated} onClick={() => setPickerOpen(true)}>
              Browse
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Search and press Enter to add the next product. Set quantity, unit, store, and scrap on the row.
          </p>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="w-28">Qty</TableHead>
            <TableHead className="w-28">UOM</TableHead>
            <TableHead className="min-w-44">Input store</TableHead>
            <TableHead className="w-24">Optional</TableHead>
            <TableHead className="w-24">Scrap %</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        {hydrated ? (canWrite ? "No components yet. Search above to add the first product." : "No components on this BOM.") : "Loading components…"}
              </TableCell>
            </TableRow>
          ) : (
            lines.map((line) => {
              const uomOptions = line.uom && !uoms.includes(line.uom) ? [line.uom, ...uoms] : uoms;
              const store = warehouses.find((warehouse) => warehouse.id === line.warehouseId);
              return (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">
                    <span className="block">{line.productSku ? `${line.productSku} — ${line.productName ?? ""}` : line.productName ?? line.productId}</span>
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <Input
                        className="h-8 tabular-nums"
                        inputMode="decimal"
                        aria-label={`Quantity for ${line.productName ?? line.productSku ?? "component"}`}
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                      />
                    ) : (
                      line.quantity
                    )}
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <Select value={line.uom || "EA"} onValueChange={(value) => updateLine(line.id, { uom: value })}>
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
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <Select
                        value={line.warehouseId || "__none__"}
                        onValueChange={(value) => updateLine(line.id, { warehouseId: value === "__none__" ? "" : value })}
                      >
                        <SelectTrigger className="h-8"><SelectValue placeholder="Work order store" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Work order store</SelectItem>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouseOptionLabel(warehouse)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      store ? warehouseOptionLabel(store) : "Work order store"
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
                  <TableCell>
                    {canWrite ? (
                      <Input
                        className="h-8 tabular-nums"
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

      {canWrite && (
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
