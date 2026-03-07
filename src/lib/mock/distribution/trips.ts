/**
 * Mock logistics trips (Cool Catch: leased vs spot truck, cost allocation).
 * See BACKEND_SPEC_COOL_CATCH.md §2.7, §3.8.
 */

export type TripType = "INBOUND" | "OUTBOUND";
export type VehicleMode = "LEASED" | "SPOT_HIRE";
export type TripStatus = "PLANNED" | "IN_TRANSIT" | "COMPLETED";

export interface TripCostLineRow {
  id: string;
  costType: "FUEL" | "DRIVER" | "HIRE_FEE" | "TOLL" | "OTHER";
  amount: number;
  currency: string;
  reference?: string;
}

export interface TripRow {
  id: string;
  reference: string;
  type: TripType;
  vehicleMode: VehicleMode;
  vehicleCode?: string;
  plannedAt: string;
  completedAt?: string;
  status: TripStatus;
  totalCost?: number;
  currency: string;
  costLines?: TripCostLineRow[];
}

export const MOCK_TRIPS: TripRow[] = [
  {
    id: "t1",
    reference: "TRIP-2025-001",
    type: "INBOUND",
    vehicleMode: "LEASED",
    vehicleCode: "LKV-001",
    plannedAt: "2025-01-18T06:00:00",
    completedAt: "2025-01-18T14:30:00",
    status: "COMPLETED",
    totalCost: 45000,
    currency: "KES",
    costLines: [
      { id: "c1", costType: "FUEL", amount: 18000, currency: "KES" },
      { id: "c2", costType: "DRIVER", amount: 12000, currency: "KES" },
      { id: "c3", costType: "TOLL", amount: 2500, currency: "KES" },
    ],
  },
  {
    id: "t2",
    reference: "TRIP-2025-002",
    type: "OUTBOUND",
    vehicleMode: "SPOT_HIRE",
    plannedAt: "2025-01-20T08:00:00",
    status: "IN_TRANSIT",
    totalCost: 28000,
    currency: "KES",
    costLines: [
      { id: "c1", costType: "HIRE_FEE", amount: 25000, currency: "KES", reference: "Spot hire Nairobi–Kisumu" },
      { id: "c2", costType: "FUEL", amount: 3000, currency: "KES" },
    ],
  },
  {
    id: "t3",
    reference: "TRIP-2025-003",
    type: "INBOUND",
    vehicleMode: "LEASED",
    vehicleCode: "LKV-002",
    plannedAt: "2025-01-22T05:00:00",
    status: "PLANNED",
    currency: "KES",
    costLines: [],
  },
];

export function getMockTrips(params?: { type?: TripType; status?: TripStatus }): TripRow[] {
  let out = [...MOCK_TRIPS];
  if (params?.type) out = out.filter((t) => t.type === params.type);
  if (params?.status) out = out.filter((t) => t.status === params.status);
  return out;
}

export function getMockTripById(id: string): TripRow | null {
  const t = MOCK_TRIPS.find((x) => x.id === id);
  return t ? { ...t, costLines: t.costLines ? [...t.costLines] : [] } : null;
}

export const MOCK_VEHICLES = [
  { id: "v1", code: "LKV-001", name: "Leased truck 1", type: "LEASED", monthlyCost: 180000 },
  { id: "v2", code: "LKV-002", name: "Leased truck 2", type: "LEASED", monthlyCost: 180000 },
];
