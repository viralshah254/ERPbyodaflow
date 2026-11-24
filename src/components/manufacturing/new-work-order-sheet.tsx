"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { Table } from "@/components/ui/table";
import { MaterialComponentLinks } from "@/components/manufacturing/material-component-links";
import { StorePicker, storeOptionLabel } from "@/components/manufacturing/store-picker";
import { CAPS_ON_PRODUCT_CLASS } from "@/lib/org/product-text";
import {
  checkWorkOrderAvailability,
  createManufacturingWorkOrder,
  fetchBomInputStoreRecommendation,
  fetchManufacturingBom,
  fetchManufacturingBomsPage,
  fetchManufacturingRouteById,
  fetchManufacturingRoutesPage,
  fetchProductionPlanDefaults,
  type BomUnitGap,
  type ManufacturingBom,
  type ManufacturingRoute,
  type ManufacturingWorkOrder,
  type ProductionPlanRow,
  type InputStoreRecommendation,
  type MaterialAvailabilityLine,
} from "@/lib/api/manufacturing";
import { fetchGRNs } from "@/lib/api/grn";
import { fetchAllWarehousesApi } from "@/lib/api/warehouses";
import { compareStoresForBatch, recommendOutputStore } from "@/lib/manufacturing/store-list-order";
import { bomUnitGapText } from "@/lib/manufacturing/unit-gaps";
import { productionVoice } from "@/lib/manufacturing/production-language";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { type PurchasingDocRow } from "@/lib/types/purchasing";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";

type StoreRow = { id: string; code?: string; name: string; purpose?: string | null };

function routeLabel(route: Pick<ManufacturingRoute, "code" | "name" | "operationCount" | "operations">) {
  const count = route.operationCount ?? route.operations?.length ?? 0;
  return `${route.code} - ${route.name} (${count} ops)`;
}

export const NewWorkOrderSheet = React.memo(function NewWorkOrderSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const bakery = productionVoice(useOrgContextStore((s) => s.templateId)) === "bakery";
  const [sheetMetaLoading, setSheetMetaLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [bomId, setBomId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [selectedProductOption, setSelectedProductOption] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [selectedBomOption, setSelectedBomOption] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [routingId, setRoutingId] = React.useState("");
  const [selectedRouteOption, setSelectedRouteOption] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [warehouses, setWarehouses] = React.useState<StoreRow[]>([]);
  const [inputWarehouseIds, setInputWarehouseIds] = React.useState<string[]>([]);
  const [outputWarehouseId, setOutputWarehouseId] = React.useState("");
  const [storeRecommendation, setStoreRecommendation] = React.useState<InputStoreRecommendation | null>(null);
  const [measurementMode, setMeasurementMode] = React.useState<ManufacturingWorkOrder["measurementMode"]>("COUNT_ONLY");
  const [quantity, setQuantity] = React.useState("1");
  const [dueDate, setDueDate] = React.useState("");
  const [grnId, setGrnId] = React.useState("");
  const [availableGrns, setAvailableGrns] = React.useState<PurchasingDocRow[]>([]);
  const [grnsLoading, setGrnsLoading] = React.useState(false);
  const [availLines, setAvailLines] = React.useState<MaterialAvailabilityLine[]>([]);
  const [unitGaps, setUnitGaps] = React.useState<BomUnitGap[]>([]);
  const [availError, setAvailError] = React.useState("");
  const [availLoading, setAvailLoading] = React.useState(false);
  const availDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRecommendationCache = React.useRef(new Map<string, InputStoreRecommendation | null>());
  const inputRecommendationFlight = React.useRef(new Map<string, Promise<InputStoreRecommendation | null>>());
  const inputRecommendationKey = React.useRef("");
  const makeableById = React.useRef(new Map<string, ProductionPlanRow>());
  const bomById = React.useRef(new Map<string, ManufacturingBom>());
  const routeById = React.useRef(new Map<string, ManufacturingRoute>());
  const hydrateSeq = React.useRef(0);

  const requestInputRecommendation = React.useCallback((nextBomId: string, nextQuantity: number) => {
    const key = `${nextBomId}:${nextQuantity}`;
    if (inputRecommendationCache.current.has(key)) return Promise.resolve(inputRecommendationCache.current.get(key) ?? null);
    const existing = inputRecommendationFlight.current.get(key);
    if (existing) return existing;
    const pending = fetchBomInputStoreRecommendation(nextBomId, nextQuantity)
      .then((next) => {
        inputRecommendationCache.current.set(key, next);
        return next;
      })
      .catch(() => null)
      .finally(() => { inputRecommendationFlight.current.delete(key); });
    inputRecommendationFlight.current.set(key, pending);
    return pending;
  }, []);

  const rememberRoute = React.useCallback(async (id: string) => {
    setRoutingId(id);
    const cached = routeById.current.get(id);
    if (cached) {
      setSelectedRouteOption({ id, label: routeLabel(cached) });
      return;
    }
    const route = await fetchManufacturingRouteById(id);
    if (!route) return;
    routeById.current.set(route.id, route);
    setSelectedRouteOption({ id: route.id, label: routeLabel(route) });
  }, []);

  const rememberBom = React.useCallback((bom: ManufacturingBom) => {
    bomById.current.set(bom.id, bom);
    setBomId(bom.id);
    setSelectedBomOption({ id: bom.id, label: `${bom.code} - ${bom.name}` });
    setProductId(bom.finishedProductId);
    setSelectedProductOption({
      id: bom.finishedProductId,
      label: bom.finishedProductSku
        ? `${bom.finishedProductSku} — ${bom.finishedProductName ?? bom.name}`
        : (bom.finishedProductName ?? bom.name),
      labelClassName: CAPS_ON_PRODUCT_CLASS,
    });
    if (bom.outputWarehouseId) setOutputWarehouseId(bom.outputWarehouseId);
    if (bom.routeId) void rememberRoute(bom.routeId);
  }, [rememberRoute]);

  const hydrateBom = React.useCallback((id: string) => {
    const seq = ++hydrateSeq.current;
    const cached = bomById.current.get(id);
    if (cached) {
      setBomId(cached.id);
      setSelectedBomOption({ id: cached.id, label: `${cached.code} - ${cached.name}` });
    } else {
      setBomId(id);
    }
    void fetchManufacturingBom(id).then((bom) => {
      if (!bom || seq !== hydrateSeq.current) return;
      rememberBom(bom);
    });
  }, [rememberBom]);

  function resetForm() {
    hydrateSeq.current += 1;
    setBomId("");
    setProductId("");
    setSelectedProductOption(null);
    setSelectedBomOption(null);
    setRoutingId("");
    setSelectedRouteOption(null);
    setInputWarehouseIds([]);
    setOutputWarehouseId("");
    setStoreRecommendation(null);
    setMeasurementMode("COUNT_ONLY");
    setGrnId("");
    setQuantity("1");
    setDueDate("");
    setAvailLines([]);
    setUnitGaps([]);
    setAvailError("");
    setWarehouses([]);
    setAvailableGrns([]);
    inputRecommendationCache.current.clear();
  }

  const loadAvailableGrns = React.useCallback(async () => {
    if (!isApiConfigured()) return;
    setGrnsLoading(true);
    try {
      setAvailableGrns(await fetchGRNs({ availableForProcessing: true }));
    } catch {
      setAvailableGrns([]);
    } finally {
      setGrnsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSheetMetaLoading(true);
    void loadAvailableGrns();
    void fetchAllWarehousesApi()
      .then((next) => {
        if (!cancelled) setWarehouses(next.filter((warehouse) => warehouse.status !== "INACTIVE"));
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load stores for the form.");
      })
      .finally(() => {
        if (!cancelled) setSheetMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loadAvailableGrns]);

  const inputStoreKey = inputWarehouseIds.join(",");
  const [recheck, setRecheck] = React.useState(0);
  const hasUnitGaps = unitGaps.length > 0;
  React.useEffect(() => {
    if (!open || !hasUnitGaps) return;
    const onFocus = () => setRecheck((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [open, hasUnitGaps]);

  React.useEffect(() => {
    if (availDebounce.current) clearTimeout(availDebounce.current);
    if (!bomId || !Number(quantity)) {
      setAvailLines([]);
      setUnitGaps([]);
      setAvailError("");
      return;
    }
    availDebounce.current = setTimeout(async () => {
      setAvailLoading(true);
      try {
        const result = await checkWorkOrderAvailability(bomId, Number(quantity), inputStoreKey ? inputStoreKey.split(",") : []);
        setAvailLines(result.lines);
        setUnitGaps(result.unitGaps ?? []);
        setAvailError("");
      } catch (error) {
        setAvailLines([]);
        setUnitGaps([]);
        setAvailError(error instanceof Error ? error.message : "Could not check materials for this recipe.");
      } finally {
        setAvailLoading(false);
      }
    }, 400);
    return () => {
      if (availDebounce.current) clearTimeout(availDebounce.current);
    };
  }, [bomId, quantity, inputStoreKey, recheck]);

  React.useEffect(() => {
    if (!open || !bomId || !Number(quantity)) {
      if (!open || !bomId) inputRecommendationKey.current = "";
      setStoreRecommendation(null);
      return;
    }
    const qty = Number(quantity);
    const key = `${bomId}:${qty}`;
    if (inputRecommendationCache.current.has(key)) {
      inputRecommendationKey.current = key;
      setStoreRecommendation(inputRecommendationCache.current.get(key) ?? null);
      return;
    }
    const productJustSelected = !inputRecommendationKey.current.startsWith(`${bomId}:`);
    if (productJustSelected) setStoreRecommendation(null);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      inputRecommendationKey.current = key;
      void requestInputRecommendation(bomId, qty).then((next) => { if (!cancelled) setStoreRecommendation(next); });
    }, productJustSelected ? 0 : 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, bomId, quantity, requestInputRecommendation]);

  React.useEffect(() => {
    if (!grnId) return;
    const selectedGrn = availableGrns.find((g) => g.id === grnId);
    if (!selectedGrn) return;
    const selectedBom = bomById.current.get(bomId);
    if (selectedBom && selectedBom.items.length > 0) {
      const bomProductIds = new Set(selectedBom.items.map((item) => item.productId).filter(Boolean));
      const matchedWeight = (selectedGrn.lineAvailability ?? [])
        .filter((line) => line.available && bomProductIds.has(line.productId ?? ""))
        .reduce((sum, line) => sum + line.receivedWeightKg, 0);
      if (matchedWeight > 0) setQuantity(String(matchedWeight));
      else if (selectedGrn.receivedWeightKg) setQuantity(String(selectedGrn.receivedWeightKg));
    } else if (selectedGrn.receivedWeightKg) {
      setQuantity(String(selectedGrn.receivedWeightKg));
    }
    if (!bomId) {
      const firstLine = (selectedGrn.lineAvailability ?? []).find((line) => line.available && line.productId);
      if (firstLine?.productId) setProductId(firstLine.productId);
    }
  }, [grnId, bomId, availableGrns]);

  const loadMakeableProducts = React.useCallback(async (query: string): Promise<AsyncSearchableSelectOption[]> => {
    const page = await fetchProductionPlanDefaults({ search: query || undefined, limit: 10, scope: "makeable" });
    for (const row of page.items ?? []) makeableById.current.set(row.productId, row);
    return (page.items ?? []).map((row) => ({
      id: row.productId,
      label: row.productSku ? `${row.productSku} — ${row.productName}` : row.productName,
      labelClassName: CAPS_ON_PRODUCT_CLASS,
    }));
  }, []);

  const loadFormulas = React.useCallback(async (query: string): Promise<AsyncSearchableSelectOption[]> => {
    const page = await fetchManufacturingBomsPage({ search: query || undefined, limit: 10, activeOnly: true });
    for (const bom of page.items) bomById.current.set(bom.id, bom);
    return page.items.map((bom) => ({ id: bom.id, label: `${bom.code} - ${bom.name}` }));
  }, []);

  const loadRoutes = React.useCallback(async (query: string): Promise<AsyncSearchableSelectOption[]> => {
    const page = await fetchManufacturingRoutesPage({ search: query || undefined, limit: 10, includeOperations: false });
    for (const route of page.items) routeById.current.set(route.id, route);
    return page.items.map((route) => ({ id: route.id, label: routeLabel(route) }));
  }, []);

  const hasShortfall = availLines.some((line) => line.shortfall > 0);
  const blockedByUnits = unitGaps.length > 0 || /conversion/i.test(availError);
  const storeCatalog = React.useMemo(() => (
    storeRecommendation && !warehouses.some((store) => store.id === storeRecommendation.warehouseId)
      ? [{ id: storeRecommendation.warehouseId, code: storeRecommendation.code, name: storeRecommendation.name || storeRecommendation.code || "Recommended store" }, ...warehouses]
      : warehouses
  ), [storeRecommendation, warehouses]);
  const recommendedId = storeRecommendation?.warehouseId;
  const recommendationReason = storeRecommendation
    ? `Input store. Has ${storeRecommendation.linesCovered} of ${storeRecommendation.linesNeeded} ingredients this batch needs: ${storeRecommendation.lines.filter((line) => line.covered).map((line) => line.productName || "ingredient").join(", ") || "part of the ingredients"}.${storeRecommendation.lines.some((line) => !line.covered) ? ` Still short: ${storeRecommendation.lines.filter((line) => !line.covered).map((line) => line.productName || "ingredient").join(", ")}.` : ""}`
    : "";
  const formulaOutputId = bomById.current.get(bomId)?.outputWarehouseId;
  const outputRecommendation = recommendOutputStore(storeCatalog, formulaOutputId);
  const outputRecommendedId = outputRecommendation?.id;
  const outputRecommendationReason = "Shelf store. A completed batch shows on the shelf when it is received into Storage, Receiving, or Dispatch.";
  const sortedInputs = React.useMemo(
    () => [...storeCatalog].sort((a, b) => compareStoresForBatch(a, b, recommendedId, storeOptionLabel)),
    [storeCatalog, recommendedId],
  );
  const sortedOutputs = React.useMemo(
    () => [...storeCatalog].sort((a, b) => compareStoresForBatch(a, b, outputRecommendedId, storeOptionLabel)),
    [storeCatalog, outputRecommendedId],
  );

  React.useEffect(() => {
    if (!open || outputWarehouseId || !outputRecommendedId) return;
    setOutputWarehouseId(outputRecommendedId);
  }, [open, outputWarehouseId, outputRecommendedId]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <SheetContent className="w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{bakery ? "New baked batch" : "New work order"}</SheetTitle>
          <SheetDescription>
            {bakery
              ? "Pick what was baked, how many, and the stores. You record the bake on the next screen."
              : grnId
              ? "Link a GRN batch to track input weight and production outputs."
              : "Pick the finished or semi-finished SKU. The matching formula is attached so complete can issue raw materials and receive finished goods."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>
              GRN batch
              <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Select
              value={grnId || "__none__"}
              onValueChange={(value) => {
                const next = value === "__none__" ? "" : value;
                setGrnId(next);
                if (!next && !bomId) setProductId("");
              }}
            >
              <SelectTrigger>
                {grnsLoading ? (
                  <span className="text-sm text-muted-foreground">Loading receipts…</span>
                ) : (
                  <SelectValue placeholder="Select a GRN receipt" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No GRN linked</SelectItem>
                {availableGrns.map((grn) => {
                  const eligible = grn.eligibleLineCount ?? grn.lineAvailability?.filter((line) => line.available).length ?? 0;
                  const total = grn.lineAvailability?.length ?? 0;
                  const hasWo = !!(grn.workOrderId && grn.workOrderStatus !== "CANCELLED");
                  return (
                    <SelectItem key={grn.id} value={grn.id}>
                      {grn.number}
                      {grn.poRef ? ` · PO: ${grn.poRef}` : ""}
                      {` · ${grn.status}`}
                      {total > 0 ? ` · ${eligible}/${total} lines` : ""}
                      {grn.receivedWeightKg ? ` · ${grn.receivedWeightKg.toLocaleString()} kg` : ""}
                      {hasWo ? ` · ⚠ ${grn.workOrderNumber ?? "WO linked"}` : ""}
                    </SelectItem>
                  );
                })}
                {!grnsLoading && availableGrns.length === 0 && (
                  <SelectItem value="__empty__" disabled>No available receipts</SelectItem>
                )}
              </SelectContent>
            </Select>
            {grnId && (() => {
              const grn = availableGrns.find((item) => item.id === grnId);
              if (!grn) return null;
              const lines = grn.lineAvailability?.filter((line) => line.available) ?? [];
              const hasWo = !!(grn.workOrderId && grn.workOrderStatus !== "CANCELLED");
              return (
                <div className="space-y-1.5">
                  {hasWo && (
                    <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        This GRN is already linked to <span className="font-medium">{grn.workOrderNumber ?? "a work order"}</span>. Creating another will be blocked.
                      </span>
                    </div>
                  )}
                  <div className="space-y-1 rounded-md border bg-muted/30 px-3 py-2">
                    {lines.length > 0 ? lines.map((line, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{line.productName}</span>
                        <span className="font-medium tabular-nums">{line.receivedWeightKg.toLocaleString()} kg</span>
                      </div>
                    )) : grn.receivedWeightKg ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Total received</span>
                        <span className="font-medium tabular-nums">{grn.receivedWeightKg.toLocaleString()} kg</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="space-y-2">
            <Label>
              Product
              <span className="ml-1 text-xs text-destructive">*</span>
            </Label>
            <AsyncSearchableSelect
              value={productId}
              selectedOption={selectedProductOption}
              onValueChange={(nextProductId) => {
                setProductId(nextProductId);
                const cached = makeableById.current.get(nextProductId);
                if (cached?.bomId) hydrateBom(cached.bomId);
                else if (cached?.routingId) void rememberRoute(cached.routingId);
              }}
              onOptionSelect={setSelectedProductOption}
              loadOptions={loadMakeableProducts}
              placeholder="Search SKU to make…"
              searchPlaceholder="Type SKU or name — searches the server"
              emptyMessage="No matching formula SKU. Raw materials are bought, not made here."
              searchDebounceMs={400}
              floating={false}
            />
            <p className="text-xs text-muted-foreground">
              Pick a SKU that has a formula. Completing the work order issues raw materials and receives this SKU onto stock levels. Do not Stock In those unless you are posting an opening balance.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Formula / BOM</Label>
            <AsyncSearchableSelect
              value={bomId}
              selectedOption={selectedBomOption}
              onValueChange={(nextBomId) => {
                if (!nextBomId) {
                  hydrateSeq.current += 1;
                  setBomId("");
                  setSelectedBomOption(null);
                  return;
                }
                hydrateBom(nextBomId);
              }}
              onOptionSelect={setSelectedBomOption}
              loadOptions={loadFormulas}
              placeholder="Search formula"
              searchPlaceholder="Type formula code or name"
              emptyMessage="No formula matches."
              allowClear
              searchDebounceMs={300}
              floating={false}
            />
          </div>

          <div className="space-y-2">
            <Label>Routing</Label>
            <AsyncSearchableSelect
              value={routingId}
              selectedOption={selectedRouteOption}
              onValueChange={(next) => {
                if (!next) {
                  setRoutingId("");
                  setSelectedRouteOption(null);
                  return;
                }
                void rememberRoute(next);
              }}
              onOptionSelect={setSelectedRouteOption}
              loadOptions={loadRoutes}
              placeholder="Optional routing"
              searchPlaceholder="Type routing code or name"
              emptyMessage="No routing matches."
              allowClear
              searchDebounceMs={300}
              floating={false}
            />
          </div>

          <div className="space-y-2">
            <Label>{bakery ? "How many were baked?" : "Quantity"}</Label>
            <Input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StorePicker
              mode="multiple"
              label="Input stores"
              hint={recommendedId && !inputWarehouseIds.length ? "Pick where the ingredients come from. The recommended store has the most of them." : undefined}
              stores={sortedInputs}
              loading={sheetMetaLoading}
              value={inputWarehouseIds}
              onChange={setInputWarehouseIds}
              recommendedId={recommendedId}
              recommendedReason={recommendationReason}
              searchPlaceholder="Find an input store"
            />
            <StorePicker
              mode="single"
              label="Output store"
              stores={sortedOutputs}
              loading={sheetMetaLoading}
              value={outputWarehouseId}
              onChange={setOutputWarehouseId}
              recommendedId={outputRecommendedId}
              recommendedReason={outputRecommendationReason}
              searchPlaceholder="Find an output store"
            />
          </div>

          <div className="space-y-2">
            <Label>Production measurement</Label>
            <Select value={measurementMode} onValueChange={(value) => setMeasurementMode(value as ManufacturingWorkOrder["measurementMode"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COUNT_ONLY">Count only (no weighing)</SelectItem>
                <SelectItem value="MANUAL_SCALE">Manual scale</SelectItem>
                <SelectItem value="DEVICE_SCALE">Connected device scale</SelectItem>
                <SelectItem value="WEIGHBRIDGE">Weighbridge</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!bakery && (
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
          )}

          {bomId && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Material availability</span>
                {availLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                {!availLoading && hasShortfall && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Shortfall
                  </Badge>
                )}
                {!availLoading && !hasShortfall && availLines.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    All available
                  </Badge>
                )}
              </div>
              {unitGaps.length > 0 && (
                <div role="alert" className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-medium">Fix units before creating this work order</p>
                  <ul className="space-y-1">
                    {unitGaps.map((gap) => (
                      <li key={`${gap.productId}-${gap.fromUom}-${gap.kind}`}>
                        {bomUnitGapText(gap)}{" "}
                        <Link href={`/master/products/${encodeURIComponent(gap.productId)}?tab=packaging`} className="font-medium underline" target="_blank">
                          Set up units
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" size="sm" variant="outline" className="h-7" disabled={availLoading} onClick={() => setRecheck((n) => n + 1)}>
                      {availLoading ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                      Check again
                    </Button>
                    <Link href={`/manufacturing/boms/${encodeURIComponent(bomId)}`} className="underline" target="_blank">Open recipe</Link>
                  </div>
                  <p className="text-[11px] opacity-80">Units open in a new tab. This rechecks when you come back.</p>
                </div>
              )}
              {availError && !unitGaps.length && (
                <p className="text-xs text-destructive">{availError}</p>
              )}
              {availLines.length > 0 && (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    Click a component for stock. Each line is checked in the input stores you ticked, or in the store named on that BOM component.
                  </p>
                  <Table className="w-full min-w-[32rem] text-xs" dataScope="page">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-1 text-left font-medium">Component</th>
                        <th className="py-1 text-left font-medium">Store</th>
                        <th className="py-1 text-right font-medium">Required</th>
                        <th className="py-1 text-right font-medium">On hand</th>
                        <th className="py-1 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availLines.map((line) => (
                        <tr key={`${line.productId}-${line.warehouseId ?? ""}`} className="border-b border-border/40 last:border-0">
                          <td className="py-1 pr-2 align-top whitespace-nowrap"><MaterialComponentLinks line={line} compact /></td>
                          <td className="py-1 pr-2 align-top whitespace-nowrap text-muted-foreground">{line.warehouseName ?? "—"}</td>
                          <td className="py-1 text-right tabular-nums whitespace-nowrap">{Math.round(line.requiredQty * 1000) / 1000} {line.uom}</td>
                          <td className="py-1 text-right tabular-nums whitespace-nowrap">{Math.round(line.onHandQty * 1000) / 1000} {line.uom}</td>
                          <td className="py-1 text-right whitespace-nowrap">
                            {line.shortfall > 0 ? (
                              <span className="font-medium text-destructive">−{Math.round(line.shortfall * 1000) / 1000}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
              {availLines.length === 0 && !availLoading && unitGaps.length === 0 && !availError && (
                <p className="text-xs text-muted-foreground">No component lines on this BOM.</p>
              )}
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button
            disabled={saving || sheetMetaLoading || blockedByUnits || (!productId && !grnId && !bomId) || inputWarehouseIds.length === 0 || !outputWarehouseId}
            onClick={async () => {
              setSaving(true);
              try {
                const created = await createManufacturingWorkOrder({
                  productId,
                  bomId: bomId || undefined,
                  routingId: routingId || undefined,
                  grnId: grnId || undefined,
                  inputWarehouseIds,
                  inputWarehouseId: inputWarehouseIds[0],
                  outputWarehouseId,
                  measurementMode,
                  weighingRequired: measurementMode !== "COUNT_ONLY",
                  quantity: Number(quantity) || 0,
                  dueDate: bakery ? undefined : dueDate || undefined,
                });
                resetForm();
                onOpenChange(false);
                onCreated();
                if (bakery) router.push(`/manufacturing/work-orders/${encodeURIComponent(created.id)}`);
                else toast.success("Work order created.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Failed to create work order.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {hasShortfall && <AlertTriangle className="mr-2 h-4 w-4 text-amber-400" />}
            {bakery ? "Continue to record bake" : "Create work order"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
