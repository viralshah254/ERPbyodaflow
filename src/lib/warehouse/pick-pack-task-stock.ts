import type { WarehousePickPackRow } from "@/lib/api/warehouse-execution";

type PickPackLine = WarehousePickPackRow["lines"][number];

const EPS = 1e-9;

/** Format kg for display — full measured precision, no business rounding. */
export function formatKg(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";

  const abs = Math.abs(n);
  if (abs >= 1e15 || (abs > 0 && abs < 1e-9)) {
    return String(n);
  }

  for (let d = 0; d <= 15; d++) {
    const candidate = parseFloat(n.toFixed(d));
    if (Math.abs(n - candidate) < 1e-9) {
      let s = n.toFixed(d);
      if (s.includes(".")) {
        s = s.replace(/\.?0+$/, "");
      }
      return s;
    }
  }

  return String(n);
}

/** Lines with the same SKU share one pick pool (handles duplicate catalogue product ids). */
export function stockPoolKey(line: Pick<PickPackLine, "productId" | "sku" | "id">): string {
  const sku = line.sku?.trim().toUpperCase();
  if (sku) return `sku:${sku}`;
  const pid = line.productId?.trim();
  if (pid) return `pid:${pid}`;
  return `line:${line.id}`;
}

export function poolKeyForCatalogProduct(productId: string, sku?: string): string {
  const normalizedSku = sku?.trim().toUpperCase();
  if (normalizedSku) return `sku:${normalizedSku}`;
  return `pid:${productId.trim()}`;
}

export function linesShareStockPool(
  a: Pick<PickPackLine, "productId" | "sku" | "id">,
  b: Pick<PickPackLine, "productId" | "sku" | "id">
): boolean {
  return stockPoolKey(a) === stockPoolKey(b);
}

export function parsePickPackPickedQty(
  line: PickPackLine,
  linePickedDraft: Record<string, string>,
  taskStatusUpper: string
): number {
  if (taskStatusUpper === "PENDING") {
    const raw = linePickedDraft[line.id];
    if (raw !== undefined) {
      const trimmed = raw.trim();
      if (trimmed) {
        const n = Number(trimmed);
        if (Number.isFinite(n) && n >= 0) return n;
      }
    }
    const avail = typeof line.onHandWarehouse === "number" ? line.onHandWarehouse : line.quantity;
    const initial =
      line.pickedQty != null && line.pickedQty > 0
        ? line.pickedQty
        : Math.min(line.quantity, avail);
    return initial;
  }
  return line.pickedQty ?? line.quantity;
}

export type TaskStockSnapshot = {
  warehouseByPool: Map<string, number>;
  primaryByPool: Map<string, number>;
  /** Total picked qty per SKU/product pool across all lines on this task. */
  claimedByPool: Map<string, number>;
  pickedByLineId: Map<string, number>;
  lineCountByPool: Map<string, number>;
};

function mergePoolMax(map: Map<string, number>, key: string, value: number) {
  const prev = map.get(key);
  map.set(key, prev == null ? value : Math.max(prev, value));
}

export function buildTaskStockSnapshot(
  lines: PickPackLine[],
  linePickedDraft: Record<string, string>,
  taskStatusUpper: string
): TaskStockSnapshot {
  const warehouseByPool = new Map<string, number>();
  const primaryByPool = new Map<string, number>();
  const claimedByPool = new Map<string, number>();
  const pickedByLineId = new Map<string, number>();
  const lineCountByPool = new Map<string, number>();

  for (const line of lines) {
    const pool = stockPoolKey(line);

    if (typeof line.onHandWarehouse === "number" && Number.isFinite(line.onHandWarehouse)) {
      mergePoolMax(warehouseByPool, pool, line.onHandWarehouse);
    }
    if (typeof line.onHandPrimaryWarehouse === "number" && Number.isFinite(line.onHandPrimaryWarehouse)) {
      mergePoolMax(primaryByPool, pool, line.onHandPrimaryWarehouse);
    }

    lineCountByPool.set(pool, (lineCountByPool.get(pool) ?? 0) + 1);

    const picked = parsePickPackPickedQty(line, linePickedDraft, taskStatusUpper);
    pickedByLineId.set(line.id, picked);
    if (picked > EPS) {
      claimedByPool.set(pool, (claimedByPool.get(pool) ?? 0) + picked);
    }
  }

  return { warehouseByPool, primaryByPool, claimedByPool, pickedByLineId, lineCountByPool };
}

export function claimedOnOtherLines(
  snapshot: TaskStockSnapshot,
  lines: PickPackLine[],
  poolKey: string,
  excludeLineId: string
): number {
  let sum = 0;
  for (const line of lines) {
    if (line.id === excludeLineId) continue;
    if (stockPoolKey(line) !== poolKey) continue;
    sum += snapshot.pickedByLineId.get(line.id) ?? 0;
  }
  return sum;
}

export type LineStockView = {
  poolKey: string;
  warehouseTotal: number | undefined;
  primaryTotal: number | undefined;
  claimedOtherLines: number;
  /** Stock left for this line after other lines on this pick (same SKU pool). */
  remainingForLine: number;
  remainingPrimaryForLine: number;
  thisLinePick: number;
  afterThisLinePick: number;
  afterPrimaryPick: number;
  overPickThisLine: boolean;
  shortVsOrder: boolean;
};

export function lineStockView(
  line: PickPackLine,
  lines: PickPackLine[],
  snapshot: TaskStockSnapshot,
  linePickedDraft: Record<string, string>,
  taskStatusUpper: string
): LineStockView {
  const poolKey = stockPoolKey(line);
  const warehouseTotal = snapshot.warehouseByPool.get(poolKey);
  const primaryTotal = snapshot.primaryByPool.get(poolKey);
  const claimedOtherLines = claimedOnOtherLines(snapshot, lines, poolKey, line.id);
  const wh = typeof warehouseTotal === "number" ? warehouseTotal : 0;
  const primary = typeof primaryTotal === "number" ? primaryTotal : wh;
  const remainingForLine = Math.max(0, wh - claimedOtherLines);
  const remainingPrimaryForLine = Math.max(0, primary - claimedOtherLines);
  const thisLinePick = parsePickPackPickedQty(line, linePickedDraft, taskStatusUpper);
  const afterThisLinePick = remainingForLine - thisLinePick;
  const afterPrimaryPick = remainingPrimaryForLine - thisLinePick;

  return {
    poolKey,
    warehouseTotal,
    primaryTotal,
    claimedOtherLines,
    remainingForLine,
    remainingPrimaryForLine,
    thisLinePick,
    afterThisLinePick,
    afterPrimaryPick,
    overPickThisLine: thisLinePick > remainingForLine + EPS,
    shortVsOrder: thisLinePick + EPS < line.quantity,
  };
}

export function effectiveAvailForProduct(
  snapshot: TaskStockSnapshot,
  lines: PickPackLine[],
  productId: string,
  options?: { sku?: string; excludeLineId?: string; fallbackWarehouse?: number }
): { warehouseTotal: number; claimedOtherLines: number; remaining: number; poolKey: string } {
  const poolKey = poolKeyForCatalogProduct(productId, options?.sku);
  let warehouseTotal = snapshot.warehouseByPool.get(poolKey) ?? 0;
  if (warehouseTotal <= EPS && typeof options?.fallbackWarehouse === "number") {
    warehouseTotal = options.fallbackWarehouse;
  }
  const claimedOtherLines = options?.excludeLineId
    ? claimedOnOtherLines(snapshot, lines, poolKey, options.excludeLineId)
    : snapshot.claimedByPool.get(poolKey) ?? 0;
  return {
    poolKey,
    warehouseTotal,
    claimedOtherLines,
    remaining: Math.max(0, warehouseTotal - claimedOtherLines),
  };
}

export type SharedPoolShortfall = {
  poolKey: string;
  sku?: string;
  productName?: string;
  warehouse: number;
  totalPicked: number;
  shortfall: number;
  lineCount: number;
};

export function sharedPoolShortfalls(
  snapshot: TaskStockSnapshot,
  lines: PickPackLine[]
): SharedPoolShortfall[] {
  const out: SharedPoolShortfall[] = [];
  for (const [poolKey, wh] of snapshot.warehouseByPool) {
    const totalPicked = snapshot.claimedByPool.get(poolKey) ?? 0;
    if (totalPicked <= wh + EPS) continue;
    const sample = lines.find((l) => stockPoolKey(l) === poolKey);
    out.push({
      poolKey,
      sku: sample?.sku,
      productName: sample?.productName,
      warehouse: wh,
      totalPicked,
      shortfall: totalPicked - wh,
      lineCount: snapshot.lineCountByPool.get(poolKey) ?? 0,
    });
  }
  return out;
}

export function formatShortAvailSuffix(effectiveRemaining: number, hasOtherLinesClaim = false): string {
  const qty = formatKg(effectiveRemaining);
  return hasOtherLinesClaim ? `${qty} left` : `${qty} avail`;
}

/** @deprecated Use formatShortAvailSuffix — kept for callers passing old args. */
export function formatTaskAwareAvailLabel(
  effectiveRemaining: number,
  _warehouseTotal?: number,
  claimedOnTask?: number,
  stockKnown = true
): string {
  if (!stockKnown) return "";
  const hasOther = (claimedOnTask ?? 0) > EPS;
  return formatShortAvailSuffix(effectiveRemaining, hasOther);
}
