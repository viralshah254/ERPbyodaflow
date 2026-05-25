import type { APBillRow } from "@/lib/types/ap";

export type LinkedShipmentCostRow = {
  costNumber: string;
  costType: string;
  costReference?: string;
  amount: number;
  currency: string;
  billId?: string;
  billNumber?: string;
  billStatus?: string;
  allocationId: string;
  lineIndex: number;
  attachments?: Array<{ id: string; fileName: string; contentType?: string }>;
};

export type APBillDisplayRow = APBillRow & {
  rowKind: "bill" | "cost";
  /** Parent supplier bill number when this is a nested cost line. */
  parentBillNumber?: string;
  /** True for indented shipment cost lines under a supplier bill. */
  isNestedCost?: boolean;
  /** Allocation line index (for lazy-loading receipts). */
  lineIndex?: number;
};

function linkedCostToRow(
  cost: LinkedShipmentCostRow,
  parent: Pick<APBillRow, "number" | "sourceGrnId" | "sourceGrnNumber">,
): APBillDisplayRow {
  return {
    id: cost.billId ?? `${cost.allocationId}:${cost.lineIndex}`,
    number: cost.billNumber ?? cost.costNumber,
    date: "",
    party: "",
    total: cost.amount,
    currency: cost.currency,
    status: cost.billStatus ?? "DRAFT",
    rowKind: "cost",
    isNestedCost: true,
    isLandedCostBill: true,
    parentBillNumber: parent.number,
    costNumber: cost.costNumber,
    costType: cost.costType,
    costReference: cost.costReference,
    sourceGrnId: parent.sourceGrnId,
    sourceGrnNumber: parent.sourceGrnNumber,
    allocationId: cost.allocationId,
    lineIndex: cost.lineIndex,
    costAttachments: cost.attachments,
    linkedBillId: cost.billId,
    linkedBillNumber: cost.billNumber,
  };
}

function costBillToNestedRow(row: APBillRow, parentBillNumber: string): APBillDisplayRow {
  return {
    ...row,
    rowKind: "cost",
    isNestedCost: true,
    parentBillNumber,
    number: row.linkedBillNumber ?? row.costNumber ?? row.number,
  };
}

/** Insert shipment cost lines immediately after their linked supplier bill. */
export function expandApBillRows(rows: APBillRow[]): APBillDisplayRow[] {
  const costsByGrn = new Map<string, APBillRow[]>();
  for (const row of rows) {
    if (row.isLandedCostBill && row.sourceGrnId) {
      const list = costsByGrn.get(row.sourceGrnId) ?? [];
      list.push(row);
      costsByGrn.set(row.sourceGrnId, list);
    }
  }

  const usedCostBillIds = new Set<string>();
  const result: APBillDisplayRow[] = [];

  for (const row of rows) {
    if (row.isLandedCostBill) continue;

    result.push({ ...row, rowKind: "bill" });

    const grnId = row.sourceGrnId;
    if (!grnId) continue;

    const linked = row.linkedShipmentCosts ?? [];
    if (linked.length) {
      for (const cost of linked) {
        const display = linkedCostToRow(cost, row);
        result.push(display);
        if (cost.billId) usedCostBillIds.add(cost.billId);
      }
      continue;
    }

    const costBills = [...(costsByGrn.get(grnId) ?? [])].sort((a, b) =>
      (a.costNumber ?? a.number).localeCompare(b.costNumber ?? b.number),
    );
    for (const costBill of costBills) {
      usedCostBillIds.add(costBill.id);
      result.push(costBillToNestedRow(costBill, row.number));
    }
  }

  for (const row of rows) {
    if (row.isLandedCostBill && !usedCostBillIds.has(row.id)) {
      result.push({
        ...row,
        rowKind: "cost",
        number: row.costNumber ?? row.number,
      });
    }
  }

  return result;
}
