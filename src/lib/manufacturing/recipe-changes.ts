import type { RecipeRevisionChange, RecipeSnapshotItem } from "@/lib/api/manufacturing";

export type ChangeTone = "added" | "removed" | "changed";

export type DescribedChange = { tone: ChangeTone; subject: string; detail?: string };

export type NameLookup = {
  product: (productId: string) => string;
  warehouse: (warehouseId: string) => string;
};

const qty = (value: unknown) =>
  typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(value ?? "—");

const money = (value: unknown) =>
  typeof value === "number" ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "product price";

const HEADER_LABELS: Record<string, string> = {
  name: "Recipe name",
  quantity: "Batch output",
  uom: "Output unit",
  routeId: "Routing",
  outputWarehouseId: "Output store",
  yieldTolerancePercent: "Yield tolerance",
  isActive: "Status",
};

function headerDetail(change: RecipeRevisionChange, names: NameLookup): string {
  const show = (value: RecipeRevisionChange["from"]) => {
    if (value == null || value === "") return "none";
    if (change.field === "isActive") return value ? "live" : "inactive";
    if (change.field === "outputWarehouseId" && typeof value === "string") return names.warehouse(value);
    if (change.field === "yieldTolerancePercent") return `${qty(value)}%`;
    return qty(value);
  };
  return `${show(change.from)} → ${show(change.to)}`;
}

function itemDetail(change: RecipeRevisionChange, names: NameLookup): string {
  switch (change.field) {
    case "quantity": return `${qty(change.from)} → ${qty(change.to)}`;
    case "uom": return `unit ${change.from} → ${change.to}`;
    case "scrapPercent": return `scrap ${qty(change.from)}% → ${qty(change.to)}%`;
    case "unitCost": return `cost ${money(change.from)} → ${money(change.to)}`;
    case "isOptional": return change.to ? "now optional" : "now required";
    case "warehouseId": {
      const store = (value: RecipeRevisionChange["from"]) => (typeof value === "string" ? names.warehouse(value) : "chosen on work order");
      return `store ${store(change.from)} → ${store(change.to)}`;
    }
    default: return `${change.field} ${String(change.from)} → ${String(change.to)}`;
  }
}

/** Combine per-field changes for the same ingredient into one readable line. */
export function describeChanges(changes: RecipeRevisionChange[], names: NameLookup): DescribedChange[] {
  const out: DescribedChange[] = [];
  const changedByProduct = new Map<string, string[]>();
  for (const change of changes) {
    if (change.kind === "header") {
      out.push({ tone: "changed", subject: HEADER_LABELS[change.field] ?? change.field, detail: headerDetail(change, names) });
    } else if (change.kind === "added") {
      out.push({ tone: "added", subject: names.product(change.productId ?? ""), detail: qty(change.to) });
    } else if (change.kind === "removed") {
      out.push({ tone: "removed", subject: names.product(change.productId ?? "") });
    } else {
      const key = change.productId ?? "";
      changedByProduct.set(key, [...(changedByProduct.get(key) ?? []), itemDetail(change, names)]);
    }
  }
  for (const [productId, details] of changedByProduct) {
    out.push({ tone: "changed", subject: names.product(productId), detail: details.join(", ") });
  }
  const order: Record<ChangeTone, number> = { added: 0, changed: 1, removed: 2 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}

export function changeCounts(changes: RecipeRevisionChange[]) {
  const changedProducts = new Set(changes.filter((c) => c.kind === "changed").map((c) => c.productId));
  return {
    added: changes.filter((c) => c.kind === "added").length,
    removed: changes.filter((c) => c.kind === "removed").length,
    changed: changedProducts.size + changes.filter((c) => c.kind === "header").length,
  };
}

export type ComparedRow = {
  productId: string;
  left?: RecipeSnapshotItem;
  right?: RecipeSnapshotItem;
  status: "same" | "added" | "removed" | "changed";
};

const scrap = (item?: RecipeSnapshotItem) => {
  const value = Number(item?.scrapFactor);
  if (!item || !Number.isFinite(value) || value <= 0) return 0;
  if (item.scrapFactorMode === "PERCENT" || (!item.scrapFactorMode && value >= 1)) return value / 100;
  return value;
};

const sameItem = (a: RecipeSnapshotItem, b: RecipeSnapshotItem) =>
  Math.abs(Number(a.quantity) - Number(b.quantity)) < 1e-9 &&
  (a.uom || "EA").toUpperCase() === (b.uom || "EA").toUpperCase() &&
  Math.abs(scrap(a) - scrap(b)) < 5e-5 &&
  (a.unitCost ?? null) === (b.unitCost ?? null) &&
  (a.warehouseId || "") === (b.warehouseId || "") &&
  Boolean(a.isOptional) === Boolean(b.isOptional);

/** Side-by-side rows for two versions, matched by product. */
export function compareItems(left: RecipeSnapshotItem[], right: RecipeSnapshotItem[]): ComparedRow[] {
  const remaining = [...right];
  const rows: ComparedRow[] = left.map((item) => {
    const index = remaining.findIndex((candidate) => candidate.productId === item.productId);
    const match = index >= 0 ? remaining.splice(index, 1)[0] : undefined;
    return { productId: item.productId, left: item, right: match, status: !match ? "removed" : sameItem(item, match) ? "same" : "changed" };
  });
  return [...rows, ...remaining.map((item) => ({ productId: item.productId, right: item, status: "added" as const }))];
}

/** Item-level changes between two ingredient lists, in the same shape the server records. */
export function diffItems(before: RecipeSnapshotItem[], after: RecipeSnapshotItem[]): RecipeRevisionChange[] {
  return compareItems(before, after).flatMap<RecipeRevisionChange>((row) => {
    if (row.status === "added") return [{ kind: "added", productId: row.productId, field: "quantity", from: null, to: row.right!.quantity }];
    if (row.status === "removed") return [{ kind: "removed", productId: row.productId, field: "quantity", from: row.left!.quantity, to: null }];
    if (row.status === "same") return [];
    const a = row.left!, b = row.right!;
    const out: RecipeRevisionChange[] = [];
    if (Math.abs(Number(a.quantity) - Number(b.quantity)) >= 1e-9) out.push({ kind: "changed", productId: row.productId, field: "quantity", from: a.quantity, to: b.quantity });
    if ((a.uom || "EA").toUpperCase() !== (b.uom || "EA").toUpperCase()) out.push({ kind: "changed", productId: row.productId, field: "uom", from: a.uom ?? "EA", to: b.uom ?? "EA" });
    if (Math.abs(scrap(a) - scrap(b)) >= 5e-5) out.push({ kind: "changed", productId: row.productId, field: "scrapPercent", from: Math.round(scrap(a) * 10000) / 100, to: Math.round(scrap(b) * 10000) / 100 });
    if ((a.unitCost ?? null) !== (b.unitCost ?? null)) out.push({ kind: "changed", productId: row.productId, field: "unitCost", from: a.unitCost ?? null, to: b.unitCost ?? null });
    if ((a.warehouseId || "") !== (b.warehouseId || "")) out.push({ kind: "changed", productId: row.productId, field: "warehouseId", from: a.warehouseId || null, to: b.warehouseId || null });
    if (Boolean(a.isOptional) !== Boolean(b.isOptional)) out.push({ kind: "changed", productId: row.productId, field: "isOptional", from: Boolean(a.isOptional), to: Boolean(b.isOptional) });
    return out;
  });
}

export function scrapPercentOf(item?: RecipeSnapshotItem): number {
  return Math.round(scrap(item) * 10000) / 100;
}
