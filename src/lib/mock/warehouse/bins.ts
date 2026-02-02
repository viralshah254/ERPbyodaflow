/**
 * Mock bin locations for /warehouse/bin-locations.
 */

export interface BinRow {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  warehouse: string;
  zone: string;
  aisle: string;
  rack: string;
  shelf: string;
  active: boolean;
}

export const MOCK_BINS: BinRow[] = [
  { id: "b1", code: "WH-Main-A-01-01", name: "Aisle A, Rack 01, Shelf 01", warehouseId: "w1", warehouse: "WH-Main", zone: "A", aisle: "A1", rack: "R01", shelf: "S01", active: true },
  { id: "b2", code: "WH-Main-A-01-02", name: "Aisle A, Rack 01, Shelf 02", warehouseId: "w1", warehouse: "WH-Main", zone: "A", aisle: "A1", rack: "R01", shelf: "S02", active: true },
  { id: "b3", code: "WH-Main-A-02-01", name: "Aisle A, Rack 02, Shelf 01", warehouseId: "w1", warehouse: "WH-Main", zone: "A", aisle: "A1", rack: "R02", shelf: "S01", active: true },
  { id: "b4", code: "WH-Main-B-01-01", name: "Aisle B, Rack 01, Shelf 01", warehouseId: "w1", warehouse: "WH-Main", zone: "B", aisle: "B1", rack: "R01", shelf: "S01", active: true },
  { id: "b5", code: "WH-East-A-01-01", name: "East A-01-01", warehouseId: "w2", warehouse: "WH-East", zone: "A", aisle: "A1", rack: "R01", shelf: "S01", active: true },
];

export function getMockBins(filters?: { warehouse?: string; zone?: string }): BinRow[] {
  let out = [...MOCK_BINS];
  if (filters?.warehouse) out = out.filter((b) => b.warehouse === filters.warehouse);
  if (filters?.zone) out = out.filter((b) => b.zone === filters.zone);
  return out;
}
