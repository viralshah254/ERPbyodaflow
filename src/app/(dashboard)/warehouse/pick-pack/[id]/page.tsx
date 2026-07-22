"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchPickPackTask, patchPickPackLines, patchPickPackWarehouse, runPickPackAction, stagePickPackStock, type WarehousePickPackRow } from "@/lib/api/warehouse-execution";
import { fetchWarehouseOptions, type LookupOption } from "@/lib/api/lookups";
import { patchDocumentApi } from "@/lib/api/documents";
import { fetchProductsPageApi } from "@/lib/api/products";
import type { ProductRow } from "@/lib/types/masters";
import {
  WarehouseProductPicker,
  formatProductPickerLabel,
  productPickerAvailability,
} from "@/components/warehouse/warehouse-product-picker";
import {
  buildTaskStockSnapshot,
  effectiveAvailForProduct,
  formatKg,
  lineStockView,
  sharedPoolShortfalls,
  type LineStockView,
} from "@/lib/warehouse/pick-pack-task-stock";
import {
  breakdownCatalogSearchTerm,
  isRoundFishMixLine,
  sizeProductsForBreakdown,
} from "@/lib/warehouse/pick-pack-round-fish";
import { fetchDistributionVehicles, type DistributionVehicleRow } from "@/lib/api/logistics";
import { useCanWriteInventory } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { isPieceUom } from "@/lib/fmcg/pricing";

function formatPickQty(n: number, fmcg: boolean, unit = "PCS"): string {
  const v = formatKg(n);
  if (!fmcg) return v;
  return `${v} ${unit}`;
}

function formatPickQtyWithUnit(n: number, fmcg: boolean): string {
  return fmcg ? formatPickQty(n, true, "PCS") : `${formatKg(n)} kg`;
}

/** Human label for pack UOM count field (Carton vs Bale vs …). */
function packUomCountLabel(uom: string): { unit: string; countLabel: string; plural: string } {
  const u = String(uom ?? "").trim().toUpperCase();
  if (u === "BALE" || u === "BALES" || u === "BL") {
    return { unit: "BALE", countLabel: "Bales count", plural: "bales" };
  }
  if (u === "OUTER" || u === "OUTERS" || u === "OTR") {
    return { unit: "OUTER", countLabel: "Outers count", plural: "outers" };
  }
  if (u === "CTN" || u === "CARTON" || u === "CARTONS" || u === "CS") {
    return { unit: "CARTON", countLabel: "Cartons count", plural: "cartons" };
  }
  if (u === "PK" || u === "PACK" || u === "PACKS") {
    return { unit: "PACK", countLabel: "Packs count", plural: "packs" };
  }
  const nice = u ? u.charAt(0) + u.slice(1).toLowerCase() : "Carton";
  return { unit: u || "CARTON", countLabel: `${nice}s count`, plural: `${nice.toLowerCase()}s` };
}

function resolveShipmentPackUom(
  lines: Array<{ documentUnit?: string; unitsPer?: number; documentQuantity?: number }>
): string {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const u = String(line.documentUnit ?? "").trim();
    if (!u || isPieceUom(u)) continue;
    if ((line.unitsPer ?? 0) <= 1 && (line.documentQuantity ?? 0) <= 0) continue;
    const key = u.toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = "CARTON";
  let bestN = 0;
  for (const [u, n] of counts) {
    if (n > bestN) {
      best = u;
      bestN = n;
    }
  }
  return best;
}

/** 400 from pick-pack action may include shortLines (same shape as dispatch). */
function toastPickPackInsufficientError(e: unknown) {
  const err = e as Error & {
    status?: number;
    body?: {
      error?: string;
      shortLines?: Array<{ sku?: string; productId: string; need: number; available: number }>;
    };
  };
  if (err.status === 400 && err.body?.shortLines?.length) {
    const detail = err.body.shortLines
      .map((s) => `${s.sku ?? s.productId}: need ${s.need}, here ${s.available}`)
      .join(" · ");
    toast.error(err.body.error ?? "Insufficient stock.", { description: detail, duration: 14000 });
    return;
  }
  toast.error(e instanceof Error ? e.message : "Action failed.");
}

function pickPackStockHintMessage(hint: string | undefined): string | null {
  switch (hint) {
    case "no_stock_levels_for_line_product_ids":
      return "No stock records match the product IDs on these lines (Inventory may list the same SKU under a different product). Check the delivery note lines or duplicate catalogue entries.";
    case "reserved_or_insufficient_across_sites":
      return "Stock records exist but nothing is available to pick everywhere (fully reserved, zero on hand, or all at inactive sites). Review reservations and stock levels.";
    case "some_line_product_ids_missing_stock_levels":
      return "Some line products have no stock records while others do. Compare product IDs on this pick with Inventory stock levels.";
    default:
      return null;
  }
}

function parsePickedQtyInput(raw: string | undefined, fallback: number): number {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return fallback;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function LineCanPickCell({ stock }: { stock: LineStockView }) {
  if (typeof stock.warehouseTotal !== "number" || !Number.isFinite(stock.warehouseTotal)) {
    return <span>—</span>;
  }
  return <span className="tabular-nums">{formatKg(stock.remainingForLine)}</span>;
}

function LineRunningAvailCell({
  remaining,
  thisLinePick,
  showDelta,
}: {
  remaining: number | undefined;
  thisLinePick: number;
  showDelta: boolean;
}) {
  if (typeof remaining !== "number" || !Number.isFinite(remaining)) {
    return <span>—</span>;
  }
  const after = remaining - thisLinePick;
  if (!showDelta || thisLinePick <= 0) {
    return <span className="tabular-nums">{formatKg(remaining)}</span>;
  }
  return (
    <div className="tabular-nums">
      <div>{formatKg(remaining)}</div>
      <div className="text-[11px] font-normal leading-tight text-muted-foreground">
        −{formatKg(thisLinePick)} this line
        <span className={cn("block", after < -1e-9 && "text-amber-600")}>
          {after >= -1e-9 ? `After pick: ${formatKg(after)}` : `Short ${formatKg(Math.abs(after))}`}
        </span>
      </div>
    </div>
  );
}

function AvailWithPickDelta({
  value,
  pickedQty,
  showDelta,
}: {
  value: number | undefined;
  pickedQty: number;
  showDelta: boolean;
}) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return <span>—</span>;
  }
  const pq = Math.max(0, pickedQty);
  if (!showDelta || pq <= 0) {
    return <span>{formatKg(value)}</span>;
  }
  const after = value - pq;
  return (
    <div className="tabular-nums">
      <div>{formatKg(value)}</div>
      <div className="text-[11px] font-normal text-muted-foreground leading-tight">
        −{formatKg(pq)} this task
        {after >= 0 ? <span className="block opacity-90">After pick: {formatKg(after)}</span> : null}
      </div>
    </div>
  );
}

export default function PickPackDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const canWrite = useCanWriteInventory();
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  // Prefer industryCategory so FMCG orgs never see seafood kg copy if templateId is stale.
  const fmcg = industryCategory === "FMCG" || (industryCategory !== "SEAFOOD" && isFmcgOrg(templateId));
  const [task, setTask] = React.useState<WarehousePickPackRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [cartons, setCartons] = React.useState("0");
  const [packingNote, setPackingNote] = React.useState("");
  const [courier, setCourier] = React.useState("");
  const [trackingRef, setTrackingRef] = React.useState("");
  const [batchLabel, setBatchLabel] = React.useState("");
  const [vehicleMode, setVehicleMode] = React.useState<"LEASED" | "SPOT_HIRE">("LEASED");
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string>("");
  const [vehicles, setVehicles] = React.useState<DistributionVehicleRow[]>([]);

  const [warehouseOptions, setWarehouseOptions] = React.useState<LookupOption[]>([]);
  const [warehouseSaving, setWarehouseSaving] = React.useState(false);
  const [stagingLoading, setStagingLoading] = React.useState(false);
  const [pickPackLoading, setPickPackLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<"not_found" | null>(null);
  /** Editable picked qty per line while task is PENDING (keyed by line.id). */
  const [linePickedDraft, setLinePickedDraft] = React.useState<Record<string, string>>({});
  const [breakdownProducts, setBreakdownProducts] = React.useState<ProductRow[]>([]);
  const [breakdownProductsLoading, setBreakdownProductsLoading] = React.useState(false);
  const [addLineSheetPortalHost, setAddLineSheetPortalHost] = React.useState<HTMLElement | null>(null);
  const [lineEditSaving, setLineEditSaving] = React.useState<string | null>(null);
  const [breakdownLineId, setBreakdownLineId] = React.useState<string | null>(null);
  const [breakdownDraft, setBreakdownDraft] = React.useState<Record<string, string>>({});
  const [breakdownSaving, setBreakdownSaving] = React.useState(false);
  const [addLineOpen, setAddLineOpen] = React.useState(false);
  const [addLineProductId, setAddLineProductId] = React.useState("");
  const [addLineQty, setAddLineQty] = React.useState("");
  const [addLineSaving, setAddLineSaving] = React.useState(false);
  const [removeConfirm, setRemoveConfirm] = React.useState<{ lineId: string; label: string } | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const payload = await fetchPickPackTask(id);
      setTask(payload);
      setCartons(String(payload?.cartonsCount ?? 0));
      setPackingNote(payload?.packingNote ?? "");
      setCourier(payload?.courier ?? "");
      setTrackingRef(payload?.trackingRef ?? "");
    } catch (error) {
      setTask(null);
      const err = error as Error & { status?: number };
      if (err.status === 404) {
        setLoadError("not_found");
      } else {
        toast.error(err.message || "Failed to load task.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const productStockKnown = Boolean(task?.warehouseId?.trim());
  const taskStatusForStock = (task?.status ?? "").trim().toUpperCase();

  const taskStockSnapshot = React.useMemo(() => {
    if (!task) return null;
    return buildTaskStockSnapshot(task.lines, linePickedDraft, taskStatusForStock);
  }, [task, linePickedDraft, taskStatusForStock]);

  const makeGetTaskStockForProduct = React.useCallback(
    (excludeLineId?: string) =>
      (productId: string, sku?: string) => {
        if (!task || !taskStockSnapshot) return undefined;
        const stock = effectiveAvailForProduct(taskStockSnapshot, task.lines, productId, {
          sku,
          excludeLineId,
        });
        return {
          warehouseTotal: stock.warehouseTotal,
          claimedOtherLines: stock.claimedOtherLines,
          remaining: stock.remaining,
        };
      },
    [task, taskStockSnapshot]
  );

  React.useEffect(() => {
    if (!task) return;
    const statusUpper = (task.status ?? "").trim().toUpperCase();
    if (statusUpper !== "PENDING") return;
    setLinePickedDraft((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const line of task.lines) {
        if (next[line.id] !== undefined) continue;
        const avail = typeof line.onHandWarehouse === "number" ? line.onHandWarehouse : line.quantity;
        const initial =
          line.pickedQty != null && line.pickedQty > 0
            ? line.pickedQty
            : Math.min(line.quantity, avail);
        next[line.id] = String(initial);
        changed = true;
      }
      for (const id of Object.keys(next)) {
        if (!task.lines.some((l) => l.id === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [task?.id, task?.status, task?.lines]);

  React.useEffect(() => {
    void fetchWarehouseOptions()
      .then(setWarehouseOptions)
      .catch(() => {
        toast.error("Failed to load warehouses.");
      });
  }, []);

  React.useEffect(() => {
    void fetchDistributionVehicles({ active: true })
      .then(setVehicles)
      .catch(() => {
        /* Non-critical; fleet vehicles are optional */
      });
  }, []);

  const runWarehouseAction = React.useCallback(
    async (successMessage: string, fn: () => Promise<void>) => {
      try {
        await fn();
        toast.success(successMessage);
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed.");
      }
    },
    [refresh]
  );

  const fulfilmentWarehouseUi = React.useMemo(() => {
    if (!task) {
      return {
        locked: true,
        changeViaDn: false,
        isTerminal: false,
        coolCatchLocked: false,
        showPrimaryStockMismatch: false,
      };
    }
    const dn = task.sourceDocumentStatus?.trim().toUpperCase() ?? "";
    const changeViaDn = !!task.sourceDocumentId && dn === "DRAFT";
    const isTerminal = ["DISPATCHED", "COMPLETED"].includes(task.status.trim().toUpperCase());
    const coolCatchLocked = Boolean(task.coolCatchFulfilmentLocked);
    const locked = isTerminal || coolCatchLocked || (!!task.sourceDocumentId && !changeViaDn);
    const primaryWh = task.primaryStockWarehouseId?.trim();
    const fulfilWh = task.warehouseId?.trim();
    const showPrimaryStockMismatch =
      Boolean(primaryWh && fulfilWh && primaryWh !== fulfilWh) &&
      task.lines.some(
        (line) =>
          (line.onHandWarehouse ?? 0) === 0 && (line.onHandPrimaryWarehouse ?? 0) > 0
      );
    return { locked, changeViaDn, isTerminal, showPrimaryStockMismatch, coolCatchLocked };
  }, [task]);

  const showStageStockCta = React.useMemo(() => {
    if (!task || fulfilmentWarehouseUi.isTerminal) return false;
    return task.lines.some((line) => {
      const need = line.pickedQty ?? line.quantity;
      if (need <= 0) return false;
      const whAvail = line.onHandWarehouse ?? 0;
      const orgWide = line.onHandOrgWide ?? 0;
      return whAvail < need && orgWide > whAvail;
    });
  }, [task, fulfilmentWarehouseUi.isTerminal]);

  const handleWarehouseChange = React.useCallback(
    async (warehouseId: string) => {
      if (!task || warehouseId === task.warehouseId) return;
      if (fulfilmentWarehouseUi.coolCatchLocked) return;
      setWarehouseSaving(true);
      try {
        if (fulfilmentWarehouseUi.changeViaDn && task.sourceDocumentId) {
          const r = await patchDocumentApi("delivery-note", task.sourceDocumentId, { warehouseId });
          if (r.pickPackSyncWarning) toast.warning(r.pickPackSyncWarning);
        } else {
          await patchPickPackWarehouse(task.id, warehouseId);
        }
        toast.success("Fulfilment warehouse updated. Pick progress was reset.");
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update warehouse.");
      } finally {
        setWarehouseSaving(false);
      }
    },
    [task, refresh, fulfilmentWarehouseUi.changeViaDn, fulfilmentWarehouseUi.coolCatchLocked]
  );

  /** Partial pick / substitution summary — warnings only; confirm is allowed when at least one line picks > 0. */
  const partialPickSummary = React.useMemo(() => {
    type Row = {
      sku?: string;
      productName?: string;
      ordered: number;
      picked: number;
      available: number;
      remainingForLine?: number;
    };
    type SharedRow = {
      sku?: string;
      productName?: string;
      warehouse: number;
      totalPicked: number;
      shortfall: number;
      lineCount: number;
    };
    if (!task || !taskStockSnapshot) {
      return {
        missingWarehouse: false,
        skipped: [] as Row[],
        partial: [] as Row[],
        overPick: [] as Row[],
        sharedShortfall: [] as SharedRow[],
      };
    }
    const missingWarehouse = !(task.warehouseId ?? "").trim();
    if (missingWarehouse) {
      return {
        missingWarehouse: true,
        skipped: [] as Row[],
        partial: [] as Row[],
        overPick: [] as Row[],
        sharedShortfall: [] as SharedRow[],
      };
    }

    const skipped: Row[] = [];
    const partial: Row[] = [];
    const overPick: Row[] = [];
    const sharedShortfall: SharedRow[] = sharedPoolShortfalls(taskStockSnapshot, task.lines);

    for (const line of task.lines) {
      const ordered = line.quantity;
      const stock = lineStockView(line, task.lines, taskStockSnapshot, linePickedDraft, taskStatusForStock);
      const picked = stock.thisLinePick;
      const available = stock.remainingForLine;

      if (picked <= 1e-9) {
        if (ordered > 1e-9) {
          skipped.push({ sku: line.sku, productName: line.productName, ordered, picked: 0, available });
        }
        continue;
      }
      if (available <= 1e-9 && picked > 1e-9) {
        overPick.push({
          sku: line.sku,
          productName: line.productName,
          ordered,
          picked,
          available,
          remainingForLine: available,
        });
      } else if (picked + 1e-9 < ordered) {
        partial.push({
          sku: line.sku,
          productName: line.productName,
          ordered,
          picked,
          available,
          remainingForLine: available,
        });
      } else if (picked > available + 1e-9) {
        overPick.push({
          sku: line.sku,
          productName: line.productName,
          ordered,
          picked,
          available,
          remainingForLine: available,
        });
      }
    }
    return { missingWarehouse: false, skipped, partial, overPick, sharedShortfall };
  }, [task, linePickedDraft, taskStatusForStock, taskStockSnapshot]);

  const saveLineProductSubstitution = React.useCallback(
    async (lineId: string, productId: string) => {
      if (!task || !taskStockSnapshot) return;
      const line = task.lines.find((l) => l.id === lineId);
      const stock = effectiveAvailForProduct(taskStockSnapshot, task.lines, productId, {
        sku: line?.sku,
        excludeLineId: lineId,
      });
      if (line && stock.remaining + 1e-9 < line.quantity) {
        toast.warning(
          fmcg
            ? `Only ${formatPickQty(stock.remaining, true)} left on this pick for that product (need ${formatPickQty(line.quantity, true)}).`
            : `Only ${formatKg(stock.remaining)} kg left on this pick for that product (ordered ${formatKg(line.quantity)} kg).`,
          { duration: 10000 }
        );
      }
      setLineEditSaving(lineId);
      try {
        await patchPickPackLines(task.id, { updates: [{ lineId, productId }] });
        toast.success("Product updated on this line.");
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not update product.");
      } finally {
        setLineEditSaving(null);
      }
    },
    [task, taskStockSnapshot, refresh, fmcg]
  );

  const removeAddedLine = React.useCallback(
    async (lineId: string) => {
      if (!task) return;
      setLineEditSaving(lineId);
      try {
        await patchPickPackLines(task.id, { updates: [{ lineId, remove: true }] });
        await refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not remove line.");
      } finally {
        setLineEditSaving(null);
      }
    },
    [task, refresh]
  );

  const openBreakdownForLine = React.useCallback((lineId: string) => {
    setBreakdownDraft({});
    setBreakdownLineId(lineId);
  }, []);

  const breakdownLine = breakdownLineId ? task?.lines.find((l) => l.id === breakdownLineId) : null;
  const breakdownSizeProducts = breakdownProducts;
  const breakdownOrderedKg = breakdownLine?.quantity ?? 0;
  const breakdownEnteredKg = React.useMemo(() => {
    let sum = 0;
    for (const p of breakdownSizeProducts) {
      const n = Number(breakdownDraft[p.id] ?? 0);
      if (Number.isFinite(n) && n > 0) sum += n;
    }
    return sum;
  }, [breakdownDraft, breakdownSizeProducts]);
  const breakdownTotalMismatch =
    breakdownEnteredKg > 0 && Math.abs(breakdownEnteredKg - breakdownOrderedKg) > 1e-6;

  React.useEffect(() => {
    if (!breakdownLineId || !breakdownLine || !task?.warehouseId?.trim()) {
      setBreakdownProducts([]);
      return;
    }
    const whId = task.warehouseId.trim();
    const line = breakdownLine;
    let cancelled = false;
    setBreakdownProductsLoading(true);

    void (async () => {
      try {
        const merged: ProductRow[] = [];
        let cursor: string | null = "0";
        const search = breakdownCatalogSearchTerm(line);
        while (cursor && !cancelled) {
          const page = await fetchProductsPageApi({
            sellable: true,
            limit: 100,
            cursor,
            search,
            includeStock: true,
            warehouseId: whId,
          });
          merged.push(...page.items);
          cursor = page.hasMore ? page.nextCursor : null;
          if (merged.length >= 400) break;
        }
        if (!cancelled) {
          setBreakdownProducts(sizeProductsForBreakdown(merged, line));
        }
      } catch {
        if (!cancelled) setBreakdownProducts([]);
      } finally {
        if (!cancelled) setBreakdownProductsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [breakdownLine, breakdownLineId, task?.warehouseId]);

  React.useEffect(() => {
    if (!breakdownLineId || breakdownSizeProducts.length === 0) return;
    setBreakdownDraft((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const draft: Record<string, string> = {};
      for (const p of breakdownSizeProducts) draft[p.id] = "";
      return draft;
    });
  }, [breakdownLineId, breakdownSizeProducts]);

  const buildPickLinesPayload = React.useCallback(() => {
    if (!task) return [];
    return task.lines.map((line) => ({
      lineId: line.id,
      pickedQty: parsePickedQtyInput(linePickedDraft[line.id], line.quantity),
      locationId: line.locationId,
    }));
  }, [task, linePickedDraft]);

  const pickedDraftInvalid = React.useMemo(() => {
    if (!task || (task.status ?? "").trim().toUpperCase() !== "PENDING") return false;
    const hasAnyPick = task.lines.some((line) => {
      const pq = parsePickedQtyInput(linePickedDraft[line.id], line.quantity);
      return pq > 1e-9;
    });
    return !hasAnyPick;
  }, [task, linePickedDraft]);

  const shipmentPackUom = React.useMemo(
    () => (fmcg && task ? resolveShipmentPackUom(task.lines) : "CARTON"),
    [fmcg, task]
  );
  const packCountUi = packUomCountLabel(shipmentPackUom);
  const orderedPackCount = React.useMemo(() => {
    if (!fmcg || !task) return null;
    let sum = 0;
    for (const line of task.lines) {
      const u = String(line.documentUnit ?? "").trim();
      if (!u || isPieceUom(u)) continue;
      if (packUomCountLabel(u).unit !== packCountUi.unit) continue;
      sum += Number(line.documentQuantity ?? 0);
    }
    return sum > 0 ? sum : null;
  }, [fmcg, task, packCountUi.unit]);

  if (!task && loading) {
    return <PageShell><PageHeader title="Loading task..." /></PageShell>;
  }

  if (!task && loadError === "not_found") {
    return (
      <PageShell>
        <PageHeader
          title="Task not found"
          description="No pick-pack task matches this link. Delivery notes and pick-pack tasks each have their own id. If you copied the id from the document URL (/docs/delivery-note/…), open that delivery note and use Open pick-pack, or choose a row from the Pick & Pack list."
          breadcrumbs={[
            { label: "Warehouse", href: "/warehouse/overview" },
            { label: "Pick & Pack", href: "/warehouse/pick-pack" },
            { label: "Not found" },
          ]}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/pick-pack">Back to list</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  if (!task) {
    return (
      <PageShell>
        <PageHeader title="Could not load task" />
        <div className="p-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/warehouse/pick-pack">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const taskStatusUpper = (task.status ?? "").trim().toUpperCase();
  const packedOrLater = ["PACKED", "DISPATCHED", "COMPLETED"].includes(taskStatusUpper);
  const dispatchedOrComplete = ["DISPATCHED", "COMPLETED"].includes(taskStatusUpper);
  const isCancelled = taskStatusUpper === "CANCELLED";
  const canConfirmPick = taskStatusUpper === "PENDING" && !isCancelled;
  const canConfirmPackOnly = taskStatusUpper === "PICKED" && !dispatchedOrComplete && !isCancelled;
  const canDispatch = taskStatusUpper === "PACKED" && !isCancelled;
  const canComplete = taskStatusUpper === "DISPATCHED" && !isCancelled;
  const picklistCardTone =
    taskStatusUpper === "PICKED"
      ? "border-orange-500/50 bg-orange-500/[0.06]"
      : taskStatusUpper === "PACKED"
        ? "border-emerald-500/50 bg-emerald-500/[0.06]"
        : dispatchedOrComplete
          ? "border-sky-500/45 bg-sky-500/[0.07]"
          : "";
  const picklistStatusLabel =
    taskStatusUpper === "PICKED"
      ? "Picked — confirm pack if needed"
      : taskStatusUpper === "PACKED"
        ? "Packed — ready to dispatch"
        : dispatchedOrComplete
          ? taskStatusUpper === "COMPLETED"
            ? "Complete — stock issued"
            : "Dispatched — stock issued from warehouse"
          : null;
  const qtyColumnLabel = packedOrLater ? "Packed" : "Picked";
  /** After dispatch, ledger avails already reflect issues — show delta only pre-dispatch. */
  const showAvailPickDelta = taskStatusUpper === "PICKED" || taskStatusUpper === "PACKED";
  const packagingMissing = fmcg && task.lines.some((l) => l.packagingConversionMissing);
  const workflowHint = (() => {
    if (isCancelled) return "This task was cancelled.";
    if (taskStatusUpper === "PENDING")
      return fmcg
        ? "Pick quantities are in pieces (base UOM). Set picked qty, then confirm pick & pack. Set picked to 0 to skip a line."
        : "Change the product on a line to substitute (dropdown), set picked qty, then confirm pick & pack. Set picked to 0 to skip.";
    if (taskStatusUpper === "PICKED") return "Pick saved — adjust cartons if needed, then confirm pack.";
    if (taskStatusUpper === "PACKED") return "Packed — add courier/tracking and mark dispatched to issue stock from the fulfilment warehouse.";
    if (taskStatusUpper === "DISPATCHED")
      return "Dispatched — use Complete to close this warehouse task. The delivery note stays in transit until proof of delivery is recorded on the document.";
    if (taskStatusUpper === "COMPLETED")
      return "Task complete — customer receipt is recorded separately: open the delivery note and complete Record POD to mark it delivered.";
    return null;
  })();

  const canConfirmPickAndPackStockOk =
    canConfirmPick && !pickedDraftInvalid && !partialPickSummary.missingWarehouse;
  const canConfirmPackOnlyStockOk = canConfirmPackOnly && !partialPickSummary.missingWarehouse;

  return (
    <PageShell>
      <PageHeader
        title={`${task.reference} - ${task.status}`}
        description={
          task.sourceDocumentNumber
            ? `${task.customer ?? "Customer"} · Delivery ${task.sourceDocumentNumber} (${task.sourceDocumentStatus ?? "DRAFT"})`
            : task.customer
        }
        breadcrumbs={[
          { label: "Warehouse", href: "/warehouse/overview" },
          { label: "Pick & Pack", href: "/warehouse/pick-pack" },
          { label: task.reference },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse/pick-pack">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fulfilment warehouse</CardTitle>
            <CardDescription>
              Quantities shown are <strong>available</strong> to pick (on hand minus reserved) for this warehouse — not the same as the branch switcher above. Updating it resets
              pick / pack progress until you confirm pick again.
              {task.coolCatchFulfilmentLocked
                ? " Cool Catch orgs use the main stock warehouse only; fulfilment site cannot be changed here."
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-w-lg">
            {fulfilmentWarehouseUi.isTerminal ? (
              <p className="text-sm text-muted-foreground">Warehouse cannot be changed after dispatch or completion.</p>
            ) : fulfilmentWarehouseUi.coolCatchLocked ? (
              <p className="text-sm text-muted-foreground">
                Fulfilment is locked to main stock. Edit the delivery note only while it is Draft to adjust routing; for Cool Catch
                the saved warehouse is always the primary stock location.
              </p>
            ) : task.sourceDocumentId && !fulfilmentWarehouseUi.changeViaDn ? (
              <p className="text-sm text-muted-foreground">
                Pick & pack can only sync this field while the linked delivery note is still in <strong>Draft</strong>.
                <Link className="text-primary underline ml-1 inline" href={`/docs/delivery-note/${task.sourceDocumentId}`}>
                  Open delivery note
                </Link>
              </p>
            ) : null}
            {fulfilmentWarehouseUi.showPrimaryStockMismatch ? (
              <p className="text-sm rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-100">
                Available stock is showing in your <strong>MAIN</strong> (primary) warehouse — the fulfilment site above shows no
                available quantity. Either switch the fulfilment warehouse to MAIN / primary stock location, or move stock
                into the selected warehouse with a transfer.
              </p>
            ) : null}
            {pickPackStockHintMessage(task.stockLookupHint) ? (
              <p className="text-sm rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                {pickPackStockHintMessage(task.stockLookupHint)}
                {task.productIdsWithoutStockLevels?.length ? (
                  <span className="mt-2 block font-mono text-xs opacity-90">
                    IDs without stock records: {task.productIdsWithoutStockLevels.join(", ")}
                  </span>
                ) : null}
              </p>
            ) : null}
            {packagingMissing ? (
              <p className="text-sm rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
                A line uses a pack UOM (e.g. carton) but packaging has no pieces-per-pack. Pick is treating it as 1 piece —{" "}
                {task.lines
                  .filter((l) => l.packagingConversionMissing && l.productId)
                  .filter(
                    (l, i, arr) => arr.findIndex((x) => x.productId === l.productId) === i
                  )
                  .map((l, i) => (
                    <span key={l.productId}>
                      {i > 0 ? ", " : null}
                      <Link
                        href={`/master/products/${l.productId}?tab=packaging`}
                        className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-50"
                      >
                        {l.productName ?? l.sku ?? "open product"}
                      </Link>
                    </span>
                  ))}
                {" "}→ Packs, set e.g. 1 CARTON = 24 PCS, then reload this pick.
              </p>
            ) : null}
            {task.suggestedFulfilmentWarehouseId &&
            task.suggestedFulfilmentWarehouseLabel &&
            !fulfilmentWarehouseUi.locked &&
            task.suggestedFulfilmentWarehouseId !== task.warehouseId ? (
              <div className="text-sm rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sky-950 dark:text-sky-100">
                <p>
                  Better <strong>available</strong> stock coverage at{" "}
                  <strong>{task.suggestedFulfilmentWarehouseLabel}</strong>. Switch fulfilment if you intend to pick there.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  disabled={warehouseSaving || fulfilmentWarehouseUi.coolCatchLocked}
                  onClick={() => void handleWarehouseChange(task.suggestedFulfilmentWarehouseId!)}
                >
                  Use suggested warehouse
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <Label className="shrink-0 text-muted-foreground">Warehouse</Label>
              <Select
                disabled={
                  fulfilmentWarehouseUi.locked || warehouseSaving || (!warehouseOptions.length && !task.warehouseId)
                }
                value={task.warehouseId ?? undefined}
                onValueChange={(value) => void handleWarehouseChange(value)}
              >
                <SelectTrigger className="min-w-[220px] flex-1" aria-label="Fulfilment warehouse">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouseOptions.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.label}
                    </SelectItem>
                  ))}
                  {task.warehouseId && !warehouseOptions.some((wh) => wh.id === task.warehouseId) ? (
                    <SelectItem key={task.warehouseId} value={task.warehouseId}>
                      {`${task.warehouseId.slice(0, 14)}… (current)`}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              {warehouseSaving ? <span className="text-xs text-muted-foreground">Saving…</span> : null}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(picklistCardTone || undefined)}>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Picklist</CardTitle>
              {picklistStatusLabel ? (
                <span
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
                    taskStatusUpper === "PICKED"
                      ? "border-orange-500/40 text-orange-800 dark:text-orange-200"
                      : taskStatusUpper === "PACKED"
                        ? "border-emerald-500/40 text-emerald-900 dark:text-emerald-100"
                        : "border-sky-500/35 text-sky-900 dark:text-sky-100"
                  }`}
                >
                  {picklistStatusLabel}
                </span>
              ) : null}
            </div>
            <CardDescription>
              {fmcg ? (
                <>
                  Quantities to pick are in <strong>pieces (base UOM)</strong> — the same unit as Stock In. If the sales order was in
                  cartons, packaging converts cartons → pieces here. Use the product dropdown to substitute when needed; set picked to
                  0 to skip a line. <strong>Can pick</strong> and <strong>Avail. (MAIN)</strong> show remaining pieces after other lines
                  on this order claim the same SKU. Only use &quot;Add extra product line&quot; when you need a second product while
                  keeping the original line at 0.
                </>
              ) : (
                <>
                  <strong>Most substitutions:</strong> use the product dropdown on the line (e.g. change Size 3 → Size 10 when Size 3
                  is out of stock), then enter picked qty. Set picked to 0 to skip a line entirely.{" "}
                  <strong>Can pick</strong> and <strong>Avail. (MAIN)</strong> show how much is left for that line after other rows on
                  this order claim the same SKU. <strong>Round fish mix:</strong> use &quot;Break down by size&quot; on that line. Only
                  use &quot;Add extra product line&quot; when you need a second product on the shipment while keeping the original line
                  at 0 for the record.
                </>
              )}
              {dispatchedOrComplete ? (
                <span className="mt-2 block font-medium text-foreground">
                  This shipment has been dispatched from stock; remaining columns still show ledger availability before this task&apos;s
                  quantities were issued.
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[12rem]">Product (substitute)</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>{fmcg ? "To pick" : "Qty"}</TableHead>
                  <TableHead className="text-right">Can pick</TableHead>
                  <TableHead className="text-right">Avail. (MAIN)</TableHead>
                  <TableHead className="text-right">Avail. (all sites)</TableHead>
                  <TableHead className="text-right">Avail. at bin</TableHead>
                  <TableHead>Suggested bin</TableHead>
                  <TableHead>{qtyColumnLabel}</TableHead>
                  {canConfirmPick && canWrite ? <TableHead className="w-10" aria-label="Remove line" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.lines.map((line) => {
                  const wh = line.onHandWarehouse;
                  const pm = line.onHandPrimaryWarehouse;
                  const ow = line.onHandOrgWide;
                  const atBin = line.onHandBin;
                  const lineStock =
                    taskStockSnapshot != null
                      ? lineStockView(line, task.lines, taskStockSnapshot, linePickedDraft, taskStatusUpper)
                      : null;
                  const pickedForDelta = lineStock?.thisLinePick ?? 0;
                  const canEditPicked = canConfirmPick;
                  const binShort =
                    typeof atBin === "number" &&
                    Number.isFinite(atBin) &&
                    line.locationId != null &&
                    atBin < line.quantity;
                  const lineTaskStock = makeGetTaskStockForProduct(line.id);
                  const lineStockForSelected = lineTaskStock(line.productId, line.sku);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="min-w-[12rem]">
                        {canEditPicked ? (
                          <WarehouseProductPicker
                            value={line.productId}
                            disabled={lineEditSaving === line.id}
                            warehouseId={task.warehouseId}
                            allowZeroStockProductId={line.productId}
                            getTaskStockForProduct={lineTaskStock}
                            selectedProduct={{
                              id: line.productId,
                              sku: line.sku,
                              name: line.productName,
                              availableQuantity: lineStockForSelected?.remaining ?? line.onHandWarehouse,
                            }}
                            triggerClassName="h-8 text-xs"
                            onValueChange={(productId) => {
                              void saveLineProductSubstitution(line.id, productId);
                            }}
                          />
                        ) : (
                          line.productName ?? line.productId
                        )}
                        {!fmcg && canEditPicked && isRoundFishMixLine(line) ? (
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-xs"
                            onClick={() => openBreakdownForLine(line.id)}
                          >
                            Break down by size
                          </Button>
                        ) : null}
                        {fmcg && line.packagingConversionMissing ? (
                          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                            Pack UOM {line.documentUnit} has no pieces-per-pack on packaging — treating as 1.{" "}
                            {line.productId ? (
                              <Link
                                href={`/master/products/${line.productId}?tab=packaging`}
                                className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
                              >
                                Set packaging on the product
                              </Link>
                            ) : (
                              "Set packaging on the product"
                            )}
                            .
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{line.sku ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">
                        {fmcg ? (
                          <div className="space-y-0.5">
                            {line.documentUnit &&
                            line.documentQuantity != null &&
                            !isPieceUom(line.documentUnit) ? (
                              <>
                                <div className="font-medium">
                                  Ordered {formatKg(line.documentQuantity)} {line.documentUnit}
                                </div>
                                <div className="text-[11px] text-foreground">
                                  → pick {formatPickQty(line.quantity, true, line.baseUom || "PCS")}
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                  {formatKg(line.documentQuantity)} {line.documentUnit} ×{" "}
                                  {line.unitsPer ?? "?"} {line.baseUom || "PCS"} ={" "}
                                  {formatKg(line.quantity)} {line.baseUom || "PCS"} from stock
                                </div>
                              </>
                            ) : (
                              <div className="font-medium">
                                {formatPickQty(line.quantity, true, line.baseUom || "PCS")}
                              </div>
                            )}
                          </div>
                        ) : (
                          formatKg(line.quantity)
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {lineStock ? (
                          <LineCanPickCell stock={lineStock} />
                        ) : typeof wh === "number" ? (
                          formatKg(wh)
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${typeof pm === "number" && pm >= line.quantity ? "text-emerald-600/90" : ""}`}>
                        {lineStock ? (
                          <LineRunningAvailCell
                            remaining={lineStock.remainingPrimaryForLine}
                            thisLinePick={lineStock.thisLinePick}
                            showDelta={showAvailPickDelta || (taskStatusUpper === "PENDING" && pickedForDelta > 0)}
                          />
                        ) : (
                          <AvailWithPickDelta
                            value={pm}
                            pickedQty={pickedForDelta}
                            showDelta={showAvailPickDelta || (taskStatusUpper === "PENDING" && pickedForDelta > 0)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {typeof ow === "number" ? ow : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums ${binShort ? "text-amber-600 font-medium" : ""}`}
                      >
                        {line.locationId != null && typeof atBin === "number" ? atBin : "—"}
                      </TableCell>
                      <TableCell>{line.suggestedBin ?? "—"}</TableCell>
                      <TableCell className="min-w-[7rem]">
                        {canEditPicked ? (
                          <div className="space-y-1">
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="any"
                              className={cn(
                                "h-8 tabular-nums",
                                lineStock?.overPickThisLine &&
                                  "border-amber-500 focus-visible:ring-amber-500/30 dark:text-amber-100"
                              )}
                              aria-label={`Picked quantity for ${line.productName ?? line.sku ?? line.productId}`}
                              value={linePickedDraft[line.id] ?? String(line.quantity)}
                              onChange={(e) =>
                                setLinePickedDraft((prev) => ({ ...prev, [line.id]: e.target.value }))
                              }
                            />
                            {lineStock?.overPickThisLine ? (
                              <p className="text-[10px] leading-tight text-amber-600">
                                Only {formatPickQtyWithUnit(lineStock.remainingForLine, fmcg)} left for this line
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="tabular-nums">{formatKg(line.pickedQty ?? 0)}</span>
                        )}
                      </TableCell>
                      {canConfirmPick && canWrite ? (
                        <TableCell className="w-10 px-2">
                          {line.canRemove ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={lineEditSaving === line.id}
                              aria-label={`Remove ${line.productName ?? line.sku ?? "line"}`}
                              title="Remove extra line"
                              onClick={() =>
                                setRemoveConfirm({
                                  lineId: line.id,
                                  label: line.productName ?? line.sku ?? "this line",
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {canConfirmPick && canWrite ? (
              <div className="border-t px-4 py-3 space-y-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddLineOpen(true)}>
                  Add extra product line
                </Button>
                <p className="text-[11px] text-muted-foreground max-w-xl">
                  {fmcg ? (
                    <>
                      Optional — only if you ship an additional product while leaving the original line at picked 0. For a simple
                      SKU swap, use the product dropdown on that row instead. Manually added lines show{" "}
                      <Trash2 className="inline h-3 w-3 align-text-bottom" aria-hidden /> on the right.
                    </>
                  ) : (
                    <>
                      Optional — only if you ship an additional product while leaving the original line at picked 0. For a simple
                      swap (Size 9 → Size 10), use the product dropdown on that row instead. Lines from &quot;Break down by
                      size&quot; stay on the pick list without a remove icon; manually added lines show{" "}
                      <Trash2 className="inline h-3 w-3 align-text-bottom" aria-hidden /> on the right.
                    </>
                  )}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {canWrite && showStageStockCta ? (
          <Card className="border-sky-500/35">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stock is in another site</CardTitle>
              <CardDescription>
                Fulfilment warehouse is short, but more quantity exists <strong>at other sites</strong>. Move what you can into this
                fulfilment warehouse in one step (internal transfer + receipt). Lines with no stock at the source are skipped; you
                can run again after other transfers.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                disabled={stagingLoading}
                onClick={() => {
                  void (async () => {
                    setStagingLoading(true);
                    try {
                      const r = await stagePickPackStock(task.id);
                      const partial = r.lines.filter((ln) => ln.moved < ln.need);
                      toast.success(`Stock staged — ${r.number}.${partial.length ? ` ${partial.length} line(s) partially moved.` : ""}`, {
                        description: `Open Warehouse → Transfers for ${r.number} (id ${r.transferId.slice(0, 8)}…).`,
                        duration: 8000,
                      });
                      await refresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Staging failed.");
                    } finally {
                      setStagingLoading(false);
                    }
                  })();
                }}
              >
                {stagingLoading ? "Staging…" : "Stage stock to fulfilment warehouse"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{fmcg ? packCountUi.countLabel : "Cartons count"}</Label>
                <Input value={cartons} onChange={(e) => setCartons(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">
                  {fmcg ? (
                    <>
                      How many {packCountUi.plural} on this shipment (pack UOM from the order
                      {orderedPackCount != null ? (
                        <>
                          ; ordered{" "}
                          <span className="font-medium text-foreground">
                            {formatKg(orderedPackCount)} {packCountUi.unit}
                          </span>
                        </>
                      ) : null}
                      ). Leave 0 or empty to default to 1 when you confirm pick &amp; pack.
                    </>
                  ) : (
                    "Leave as 0 or empty to default to 1 when you confirm pick & pack."
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Packing note</Label>
                <Input value={packingNote} onChange={(e) => setPackingNote(e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Dispatch</CardTitle>
              <CardDescription>
                Select a fleet vehicle or spot-hire carrier. Use the same batch name (e.g. Kitengela) when grouping
                multiple delivery notes on one run.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVehicleMode("LEASED")}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    vehicleMode === "LEASED"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  Fleet vehicle
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleMode("SPOT_HIRE")}
                  className={`flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    vehicleMode === "SPOT_HIRE"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  Spot hire
                </button>
              </div>

              {vehicleMode === "LEASED" ? (
                <div className="space-y-2">
                  <Label>Vehicle</Label>
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger className="w-full" aria-label="Fleet vehicle">
                      <SelectValue placeholder={vehicles.length ? "Select vehicle…" : "No fleet vehicles found"} />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.code}
                          {v.name ? ` — ${v.name}` : ""}
                          {v.registration ? ` (${v.registration})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Carrier name</Label>
                  <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Carrier / driver name" />
                </div>
              )}

              <div className="space-y-2">
                <Label>Dispatch batch</Label>
                <Input
                  value={batchLabel}
                  onChange={(e) => setBatchLabel(e.target.value)}
                  placeholder="e.g. Kitengela, Ruiru, Mathare"
                />
              </div>

              <div className="space-y-2">
                <Label>Tracking reference</Label>
                <Input value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} placeholder="Optional" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-2">
          {workflowHint ? <p className="text-xs text-muted-foreground">{workflowHint}</p> : null}
          {pickedDraftInvalid && canConfirmPick ? (
            <p className="text-sm rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
              At least one line needs a picked quantity greater than zero. Set out-of-stock lines to 0 to ship the rest, or substitute another product.
            </p>
          ) : null}
          {partialPickSummary.missingWarehouse && canConfirmPick ? (
            <p className="text-sm rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
              Select a fulfilment warehouse before you can confirm pick &amp; pack.
            </p>
          ) : null}
          {partialPickSummary.sharedShortfall.length > 0 && canConfirmPick ? (
            <div className="text-sm rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
              <p className="font-medium">Same product on multiple lines — not enough stock</p>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                {partialPickSummary.sharedShortfall.map((s, idx) => (
                  <li key={`shared-${idx}`}>
                    {[s.productName, s.sku].filter(Boolean).join(" · ") || "Product"} —{" "}
                    {formatPickQtyWithUnit(s.totalPicked, fmcg)} across {s.lineCount} line
                    {s.lineCount === 1 ? "" : "s"}, {formatPickQtyWithUnit(s.warehouse, fmcg)} at warehouse (
                    {formatPickQtyWithUnit(s.shortfall, fmcg)} over)
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {(partialPickSummary.skipped.length > 0 ||
            partialPickSummary.partial.length > 0 ||
            partialPickSummary.overPick.length > 0) &&
          canConfirmPick ? (
            <div className="text-sm rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100">
              <p className="font-medium">Partial delivery — you can still confirm pick &amp; pack.</p>
              {partialPickSummary.skipped.length ? (
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {partialPickSummary.skipped.map((s, idx) => (
                    <li key={`skip-${idx}`}>
                      {[s.productName, s.sku].filter(Boolean).join(" · ") || "Product"} · ordered {s.ordered} —{" "}
                      <strong>skipped</strong> (set picked to 0)
                    </li>
                  ))}
                </ul>
              ) : null}
              {partialPickSummary.partial.length ? (
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {partialPickSummary.partial.map((s, idx) => (
                    <li key={`part-${idx}`}>
                      {[s.productName, s.sku].filter(Boolean).join(" · ") || "Product"} · shipping{" "}
                      {formatPickQtyWithUnit(s.picked, fmcg)} of {formatPickQtyWithUnit(s.ordered, fmcg)}
                    </li>
                  ))}
                </ul>
              ) : null}
              {partialPickSummary.overPick.length ? (
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  {partialPickSummary.overPick.map((s, idx) => (
                    <li key={`over-${idx}`}>
                      {[s.productName, s.sku].filter(Boolean).join(" · ") || "Product"} · picked{" "}
                      {formatPickQtyWithUnit(s.picked, fmcg)} but only{" "}
                      {formatPickQtyWithUnit(
                        typeof s.remainingForLine === "number" ? s.remainingForLine : s.available,
                        fmcg
                      )}{" "}
                      left on this line — will cap on confirm
                    </li>
                  ))}
                </ul>
              ) : null}
              {showStageStockCta ? (
                <p className="mt-2 text-xs opacity-95">
                  If stock exists at another warehouse, use <strong>Stage stock to fulfilment warehouse</strong> below.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
          {canWrite && canConfirmPick ? (
            <Button
              disabled={!canConfirmPickAndPackStockOk || pickPackLoading}
              title={
                pickedDraftInvalid
                  ? "Enter a picked quantity greater than zero on at least one line."
                  : partialPickSummary.missingWarehouse
                    ? "Select a fulfilment warehouse first."
                    : undefined
              }
              onClick={() =>
                void (async () => {
                  setPickPackLoading(true);
                  try {
                    await runPickPackAction(task.id, {
                      action: "pick",
                      lines: buildPickLinesPayload(),
                    });
                    await runPickPackAction(task.id, {
                      action: "pack",
                      cartonsCount: Math.max(1, Number(cartons) || 1),
                      packingNote,
                    });
                    toast.success("Pick and pack confirmed.");
                    await refresh();
                  } catch (e) {
                    toastPickPackInsufficientError(e);
                    await refresh();
                  } finally {
                    setPickPackLoading(false);
                  }
                })()
              }
            >
              {pickPackLoading ? "Saving…" : "Confirm pick & pack"}
            </Button>
          ) : null}
          {canWrite && canConfirmPackOnly ? (
            <Button
              variant="secondary"
              disabled={!canConfirmPackOnlyStockOk || pickPackLoading}
              title={
                partialPickSummary.missingWarehouse
                  ? "Select a fulfilment warehouse first."
                  : undefined
              }
              onClick={() =>
                void (async () => {
                  setPickPackLoading(true);
                  try {
                    await runPickPackAction(task.id, {
                      action: "pack",
                      cartonsCount: Math.max(1, Number(cartons) || 1),
                      packingNote,
                    });
                    toast.success("Pack confirmed.");
                    await refresh();
                  } catch (e) {
                    toastPickPackInsufficientError(e);
                  } finally {
                    setPickPackLoading(false);
                  }
                })()
              }
            >
              {pickPackLoading ? "Saving…" : "Confirm pack"}
            </Button>
          ) : null}
          {canWrite && <Button
            variant="secondary"
            disabled={!canDispatch}
            title={!canDispatch ? "Confirm pack first." : undefined}
            onClick={() => {
              void (async () => {
                try {
                  await runPickPackAction(task.id, {
                    action: "dispatch",
                    vehicleMode,
                    vehicleId: vehicleMode === "LEASED" && selectedVehicleId ? selectedVehicleId : undefined,
                    carrier: vehicleMode === "SPOT_HIRE" ? courier : undefined,
                    courier: vehicleMode === "SPOT_HIRE" ? courier : undefined,
                    batchLabel: batchLabel.trim() || undefined,
                    trackingRef,
                  });
                  toast.success("Dispatch recorded.");
                  await refresh();
                } catch (e) {
                  toastPickPackInsufficientError(e);
                }
              })();
            }}
          >
            Mark dispatched
          </Button>}
          {canWrite && <Button
            variant="outline"
            disabled={!canComplete}
            title={!canComplete ? "Mark dispatched first." : undefined}
            onClick={() =>
              void runWarehouseAction("Task completed.", () => runPickPackAction(task.id, { action: "complete" }))
            }
          >
            Complete
          </Button>}
          {task.sourceDocumentId ? (
            <Button variant="outline" asChild>
              <Link href={`/docs/delivery-note/${task.sourceDocumentId}`}>Open delivery note</Link>
            </Button>
          ) : null}
        </div>
        </div>

        <Sheet open={breakdownLineId != null} onOpenChange={(open) => !open && setBreakdownLineId(null)}>
          <SheetContent className="overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Break down by size</SheetTitle>
              <SheetDescription>
                Enter kg per size for {breakdownLine?.productName ?? "round fish"}. Ordered{" "}
                {formatKg(breakdownOrderedKg)} kg — split across the sizes you are picking for this delivery.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-3 py-4">
              {breakdownProductsLoading ? (
                <p className="text-sm text-muted-foreground">Loading size products…</p>
              ) : breakdownSizeProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No size products found in catalog. Add tilapia/perch size SKUs first.</p>
              ) : (
                breakdownSizeProducts.map((p) => {
                  const avail = productPickerAvailability(p);
                  return (
                  <div key={p.id} className="flex items-center gap-3">
                    <Label className="min-w-0 flex-1 truncate text-xs">
                      {formatProductPickerLabel(p, avail, productStockKnown)}
                    </Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="any"
                      className="h-8 w-24 tabular-nums"
                      placeholder="kg"
                      value={breakdownDraft[p.id] ?? ""}
                      onChange={(e) => setBreakdownDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                  </div>
                  );
                })
              )}
              {breakdownSizeProducts.length > 0 ? (
                <div
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm tabular-nums",
                    breakdownTotalMismatch
                      ? "border-amber-500/50 bg-amber-500/5 text-amber-900 dark:text-amber-100"
                      : "border-border bg-muted/30 text-muted-foreground"
                  )}
                >
                  Total entered: {formatKg(breakdownEnteredKg)} kg
                  {breakdownTotalMismatch ? (
                    <span>
                      {" "}
                      — differs from ordered {formatKg(breakdownOrderedKg)} kg. Adjust sizes or continue if actual
                      weights differ.
                    </span>
                  ) : breakdownEnteredKg > 0 ? (
                    <span> — matches ordered quantity.</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <SheetFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={breakdownSaving}
                onClick={() => setBreakdownLineId(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={breakdownSaving || !breakdownLineId || breakdownSizeProducts.length === 0}
                onClick={() =>
                  void (async () => {
                    if (!task || !breakdownLineId) return;
                    const breakdown = breakdownSizeProducts
                      .map((p) => ({
                        productId: p.id,
                        quantity: Number(breakdownDraft[p.id] ?? 0),
                      }))
                      .filter((row) => Number.isFinite(row.quantity) && row.quantity > 0);
                    if (!breakdown.length) {
                      toast.error("Enter at least one size quantity.");
                      return;
                    }
                    if (breakdownTotalMismatch) {
                      toast.message("Total differs from ordered qty", {
                        description: `Entered ${formatKg(breakdownEnteredKg)} kg vs ordered ${formatKg(breakdownOrderedKg)} kg.`,
                      });
                    }
                    setBreakdownSaving(true);
                    try {
                      await patchPickPackLines(task.id, {
                        replaceLineWithBreakdown: { lineId: breakdownLineId, breakdown },
                      });
                      toast.success("Line broken down into sizes.");
                      setBreakdownLineId(null);
                      await refresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Breakdown failed.");
                    } finally {
                      setBreakdownSaving(false);
                    }
                  })()
                }
              >
                {breakdownSaving ? "Saving…" : "Apply breakdown"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Sheet open={addLineOpen} onOpenChange={setAddLineOpen}>
          <SheetContent className="sm:max-w-md">
            <div ref={setAddLineSheetPortalHost} className="flex flex-col gap-4">
            <SheetHeader>
              <SheetTitle>Add extra product line</SheetTitle>
              <SheetDescription>
                Adds another row to this pick list. Use this only when the customer ordered one product but you are shipping an extra
                SKU as well (original line stays at picked 0). To replace a line entirely, use the product dropdown on that row.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <WarehouseProductPicker
                  value={addLineProductId}
                  onValueChange={setAddLineProductId}
                  warehouseId={task?.warehouseId}
                  portalContainer={addLineSheetPortalHost}
                  getTaskStockForProduct={makeGetTaskStockForProduct()}
                  placeholder="Search and select product"
                />
              </div>
              <div className="space-y-2">
                <Label>{fmcg ? "Quantity (PCS)" : "Quantity (kg)"}</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={addLineQty}
                  onChange={(e) => setAddLineQty(e.target.value)}
                />
                {fmcg ? (
                  <p className="text-[11px] text-muted-foreground">
                    Enter pieces (base UOM) — same unit as Stock In and the pick list. Pack/carton conversion applies on sales
                    order lines, not here.
                  </p>
                ) : null}
              </div>
            </div>
            <SheetFooter>
              <Button
                type="button"
                disabled={addLineSaving || !addLineProductId}
                onClick={() =>
                  void (async () => {
                    if (!task) return;
                    const qty = Number(addLineQty);
                    if (!Number.isFinite(qty) || qty <= 0) {
                      toast.error("Enter a quantity greater than zero.");
                      return;
                    }
                    setAddLineSaving(true);
                    try {
                      await patchPickPackLines(task.id, {
                        addLines: [{ productId: addLineProductId, quantity: qty }],
                      });
                      setAddLineOpen(false);
                      setAddLineProductId("");
                      setAddLineQty("");
                      await refresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not add line.");
                    } finally {
                      setAddLineSaving(false);
                    }
                  })()
                }
              >
                {addLineSaving ? "Adding…" : "Add line"}
              </Button>
            </SheetFooter>
            </div>
          </SheetContent>
        </Sheet>

        <ConfirmDialog
          open={removeConfirm != null}
          onOpenChange={(open) => {
            if (!open) setRemoveConfirm(null);
          }}
          title="Remove extra product line?"
          description={
            removeConfirm
              ? `"${removeConfirm.label}" will be removed from this pick list. This cannot be undone. To skip an order line without deleting it, set picked qty to 0 instead.`
              : undefined
          }
          confirmLabel="Remove line"
          cancelLabel="Keep line"
          variant="destructive"
          onConfirm={() => {
            if (removeConfirm) void removeAddedLine(removeConfirm.lineId);
          }}
        />
      </div>
    </PageShell>
  );
}
