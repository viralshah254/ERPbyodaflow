import {
  getMockGRNById,
  getMockGRNs,
  type GrnDetailRow,
  type PurchasingDocRow,
} from "@/lib/mock/purchasing";
import { loadStoredValue, saveStoredValue } from "@/lib/data/persisted-store";

const GRNS_KEY = "odaflow_grns";
const DETAILS_KEY = "odaflow_grn_details";

function seedGrns(): PurchasingDocRow[] {
  return getMockGRNs().map((row) => ({ ...row }));
}

function seedDetails(): Record<string, GrnDetailRow> {
  return getMockGRNs().reduce<Record<string, GrnDetailRow>>((acc, row) => {
    const detail = getMockGRNById(row.id);
    if (detail) acc[row.id] = { ...detail, lines: detail.lines.map((line) => ({ ...line })) };
    return acc;
  }, {});
}

export function listGrns(): PurchasingDocRow[] {
  return loadStoredValue(GRNS_KEY, seedGrns).map((row) => ({ ...row }));
}

export function getGrnById(id: string): GrnDetailRow | null {
  const detail = loadStoredValue(DETAILS_KEY, seedDetails)[id];
  return detail ? { ...detail, lines: detail.lines.map((line) => ({ ...line })) } : null;
}

export function updateGrnStatus(id: string, status: string): void {
  saveStoredValue(
    GRNS_KEY,
    listGrns().map((row) => (row.id === id ? { ...row, status } : row))
  );
  const details = loadStoredValue(DETAILS_KEY, seedDetails);
  if (details[id]) {
    saveStoredValue(DETAILS_KEY, {
      ...details,
      [id]: { ...details[id], status },
    });
  }
}

