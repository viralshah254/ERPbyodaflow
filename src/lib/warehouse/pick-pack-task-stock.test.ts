import { describe, expect, it } from "vitest";
import {
  buildTaskStockSnapshot,
  effectiveAvailForProduct,
  formatKg,
  lineStockView,
  sharedPoolShortfalls,
  stockPoolKey,
} from "./pick-pack-task-stock";
import type { WarehousePickPackRow } from "@/lib/api/warehouse-execution";

type Line = WarehousePickPackRow["lines"][number];

function line(
  id: string,
  productId: string,
  sku: string,
  quantity: number,
  onHandWarehouse: number,
  pickedQty = 0
): Line {
  return {
    id,
    productId,
    sku,
    productName: sku,
    quantity,
    pickedQty,
    onHandWarehouse,
    onHandPrimaryWarehouse: onHandWarehouse,
  } as Line;
}

describe("formatKg", () => {
  it("preserves measured precision without business rounding", () => {
    expect(formatKg(12.3456789)).toBe("12.3456789");
    expect(formatKg(0)).toBe("0");
  });
});

describe("stock pool sharing", () => {
  it("groups duplicate product ids by SKU", () => {
    const a = line("a", "pid-1", "TP-GUTTED-S2", 10, 50);
    const b = line("b", "pid-2", "TP-GUTTED-S2", 8, 50);
    expect(stockPoolKey(a)).toBe(stockPoolKey(b));
  });

  it("reduces remaining on second line when first line picks same SKU", () => {
    const lines = [
      line("l1", "p1", "TP-GUTTED-S2", 10, 30),
      line("l2", "p2", "TP-GUTTED-S2", 8, 30),
    ];
    const draft = { l1: "20", l2: "5" };
    const snapshot = buildTaskStockSnapshot(lines, draft, "PENDING");
    const view2 = lineStockView(lines[1]!, lines, snapshot, draft, "PENDING");
    expect(view2.remainingForLine).toBe(10);
    expect(view2.overPickThisLine).toBe(false);
  });

  it("flags over-pick on a line", () => {
    const lines = [line("l1", "p1", "TP-GUTTED-S2", 10, 5)];
    const draft = { l1: "8" };
    const snapshot = buildTaskStockSnapshot(lines, draft, "PENDING");
    const view = lineStockView(lines[0]!, lines, snapshot, draft, "PENDING");
    expect(view.overPickThisLine).toBe(true);
  });

  it("reports shared pool shortfalls across lines", () => {
    const lines = [
      line("l1", "p1", "TP-GUTTED-S2", 10, 12),
      line("l2", "p2", "TP-GUTTED-S2", 10, 12),
    ];
    const draft = { l1: "8", l2: "8" };
    const snapshot = buildTaskStockSnapshot(lines, draft, "PENDING");
    const shortfalls = sharedPoolShortfalls(snapshot, lines);
    expect(shortfalls).toHaveLength(1);
    expect(shortfalls[0]?.shortfall).toBe(4);
  });

  it("subtracts other-line picks from picker remaining", () => {
    const lines = [
      line("l1", "p1", "TP-GUTTED-S2", 10, 40),
      line("l2", "p2", "TP-GUTTED-S3", 5, 20),
    ];
    const draft = { l1: "15", l2: "3" };
    const snapshot = buildTaskStockSnapshot(lines, draft, "PENDING");
    const withClaim = effectiveAvailForProduct(snapshot, lines, "p1", {
      sku: "TP-GUTTED-S2",
    });
    expect(withClaim.remaining).toBe(25);
    const excludingPickerLine = effectiveAvailForProduct(snapshot, lines, "p1", {
      sku: "TP-GUTTED-S2",
      excludeLineId: "l1",
    });
    expect(excludingPickerLine.remaining).toBe(40);
  });
});
