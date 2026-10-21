import { describe, expect, it } from "vitest";
import { queueConfirmedSalesOrders, type ConfirmedSalesOrder } from "./pick-pack-queue";
import type { WarehousePickPackRow } from "@/lib/api/warehouse-execution";

function task(partial: Partial<WarehousePickPackRow> & Pick<WarehousePickPackRow, "id" | "status">): WarehousePickPackRow {
  return {
    number: partial.number ?? partial.id,
    reference: partial.reference ?? partial.number ?? partial.id,
    lines: [],
    ...partial,
  };
}

const orders: ConfirmedSalesOrder[] = [
  { id: "so-new", number: "SO0010", party: "New customer", createdAt: "2026-10-21T12:00:00.000Z" },
  { id: "so-open", number: "SO0008", party: "Westend", createdAt: "2026-10-21T11:00:00.000Z" },
  { id: "so-packed", number: "SO0009", party: "Nostalgic", createdAt: "2026-10-21T10:00:00.000Z" },
];

describe("queueConfirmedSalesOrders", () => {
  it("shows a confirmed order that has not been picked, and hides one that is already packed", () => {
    const open = [
      task({
        id: "pp-8",
        status: "PENDING",
        sourceDocumentType: "sales-order",
        sourceDocumentId: "so-open",
        sourceDocumentNumber: "SO0008",
        createdAt: "2026-10-21T11:05:00.000Z",
      }),
      task({
        id: "pp-dn",
        status: "PENDING",
        sourceDocumentType: "delivery-note",
        sourceDocumentNumber: "DN0005",
        createdAt: "2026-10-07T10:00:00.000Z",
      }),
    ];
    const known = [
      ...open,
      task({
        id: "pp-9",
        status: "PACKED",
        sourceDocumentType: "sales-order",
        sourceDocumentId: "so-packed",
        sourceDocumentNumber: "SO0009",
      }),
    ];
    const rows = queueConfirmedSalesOrders({ openTasks: open, knownTasks: known, orders });
    expect(rows.map((row) => row.sourceDocumentNumber)).toEqual(["SO0010", "SO0008"]);
    expect(rows[0]?.status).toBe("READY");
    expect(rows[0]?.readySalesOrderId).toBe("so-new");
    expect(rows[1]?.id).toBe("pp-8");
  });
});
