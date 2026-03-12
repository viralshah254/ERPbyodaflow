import {
  getMockTransfers,
  type TransferRow,
  type TransferStatus,
} from "@/lib/mock/warehouse/transfers";
import { appendStoredItem, loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

const KEY = "odaflow_warehouse_transfers";

function seedTransfers(): TransferRow[] {
  return getMockTransfers().map((row) => ({
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  }));
}

export function listTransfers(): TransferRow[] {
  return loadStoredValue(KEY, seedTransfers).map((row) => ({
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  }));
}

export function getTransferById(id: string): TransferRow | null {
  return listTransfers().find((row) => row.id === id) ?? null;
}

export function createTransferRecord(body: {
  date: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  reference?: string;
  lines: { sku: string; productName?: string; quantity: number; unit?: string }[];
}): TransferRow {
  const created: TransferRow = {
    id: `trf-${Date.now()}`,
    number: body.reference?.trim() || `TRF-${new Date().toISOString().slice(0, 10)}-${listTransfers().length + 1}`,
    date: body.date,
    fromWarehouse: body.fromWarehouseId,
    toWarehouse: body.toWarehouseId,
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    lines: body.lines.map((line, index) => ({
      id: `trf-line-${Date.now()}-${index}`,
      sku: line.sku,
      productName: line.productName ?? line.sku,
      quantity: line.quantity,
      unit: line.unit,
    })),
  };
  appendStoredItem(KEY, seedTransfers, created, true);
  return created;
}

export function updateTransferRecordStatus(id: string, status: TransferStatus): void {
  saveStoredValue(
    KEY,
    listTransfers().map((row) => (row.id === id ? { ...row, status } : row))
  );
}

