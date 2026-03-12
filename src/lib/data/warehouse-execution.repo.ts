import {
  getMockPickPack,
  type PickListLineRow,
  type PickPackOrderRow,
} from "@/lib/mock/warehouse/pick-pack";
import {
  getMockPutaway,
  type PutawayGRNRow,
} from "@/lib/mock/warehouse/putaway";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

const PICK_PACK_KEY = "odaflow_warehouse_pick_pack";
const PUTAWAY_KEY = "odaflow_warehouse_putaway";

function seedPickPack(): PickPackOrderRow[] {
  return getMockPickPack().map((row) => ({
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  }));
}

function seedPutaway(): PutawayGRNRow[] {
  return getMockPutaway().map((row) => ({
    ...row,
    lines: row.lines.map((line) => ({
      ...line,
      allocatedBins: line.allocatedBins?.map((bin) => ({ ...bin })),
    })),
  }));
}

export function listPickPackOrders(): PickPackOrderRow[] {
  return loadStoredValue(PICK_PACK_KEY, seedPickPack).map((row) => ({
    ...row,
    lines: row.lines.map((line) => ({ ...line })),
  }));
}

export function getPickPackOrderById(id: string): PickPackOrderRow | null {
  return listPickPackOrders().find((row) => row.id === id) ?? null;
}

function savePickPackOrders(rows: PickPackOrderRow[]): void {
  saveStoredValue(PICK_PACK_KEY, rows);
}

export function confirmPickPackPick(id: string): void {
  savePickPackOrders(
    listPickPackOrders().map((row) =>
      row.id === id
        ? {
            ...row,
            status: "PACK",
            lines: row.lines.map((line) => ({ ...line, pickedQty: line.quantity })),
          }
        : row
    )
  );
}

export function confirmPickPackPack(id: string, cartonsCount: number, packingNote: string): void {
  savePickPackOrders(
    listPickPackOrders().map((row) =>
      row.id === id ? { ...row, status: "DISPATCH", cartonsCount, packingNote } : row
    )
  );
}

export function dispatchPickPackOrder(id: string, courier: string, trackingRef: string): void {
  savePickPackOrders(
    listPickPackOrders().map((row) =>
      row.id === id ? { ...row, courier, trackingRef } : row
    )
  );
}

export function completePickPackOrder(id: string): void {
  savePickPackOrders(
    listPickPackOrders().map((row) =>
      row.id === id ? { ...row, status: "DISPATCH" } : row
    )
  );
}

export function listPutawayGrns(): PutawayGRNRow[] {
  return loadStoredValue(PUTAWAY_KEY, seedPutaway).map((row) => ({
    ...row,
    lines: row.lines.map((line) => ({
      ...line,
      allocatedBins: line.allocatedBins?.map((bin) => ({ ...bin })),
    })),
  }));
}

export function getPutawayGrnById(id: string): PutawayGRNRow | null {
  return listPutawayGrns().find((row) => row.id === id) ?? null;
}

export function savePutawayAllocation(
  id: string,
  allocations: Record<string, { putawayQty: number; binCode?: string }>
): void {
  saveStoredValue(
    PUTAWAY_KEY,
    listPutawayGrns().map((row) =>
      row.id === id
        ? {
            ...row,
            lines: row.lines.map((line) => {
              const allocation = allocations[line.id];
              if (!allocation) return line;
              return {
                ...line,
                putawayQty: allocation.putawayQty,
                allocatedBins: allocation.binCode
                  ? [{ binCode: allocation.binCode, qty: allocation.putawayQty }]
                  : line.allocatedBins,
              };
            }),
          }
        : row
    )
  );
}

export function confirmPutaway(id: string): void {
  const row = getPutawayGrnById(id);
  if (!row) return;
  savePutawayAllocation(
    id,
    Object.fromEntries(
      row.lines.map((line) => [
        line.id,
        {
          putawayQty: line.putawayQty || line.receivedQty,
          binCode: line.allocatedBins?.[0]?.binCode,
        },
      ])
    )
  );
}

