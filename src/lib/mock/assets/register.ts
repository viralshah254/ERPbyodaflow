/**
 * Mock fixed asset register for /assets/register.
 */

export type DepreciationMethod = "STRAIGHT_LINE";

export interface AssetRow {
  id: string;
  code: string;
  name: string;
  category: string;
  acquisitionDate: string;
  cost: number;
  salvage: number;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  linkedVendorId?: string;
  linkedInvoiceId?: string;
  status: "ACTIVE" | "DISPOSED";
}

export const MOCK_ASSETS: AssetRow[] = [
  {
    id: "a1",
    code: "FA-001",
    name: "Laptop Dell XPS",
    category: "IT Equipment",
    acquisitionDate: "2023-01-15",
    cost: 120000,
    salvage: 12000,
    usefulLifeYears: 3,
    depreciationMethod: "STRAIGHT_LINE",
    linkedVendorId: "s1",
    linkedInvoiceId: "inv-1",
    status: "ACTIVE",
  },
  {
    id: "a2",
    code: "FA-002",
    name: "Forklift",
    category: "Machinery",
    acquisitionDate: "2022-06-01",
    cost: 850000,
    salvage: 85000,
    usefulLifeYears: 5,
    depreciationMethod: "STRAIGHT_LINE",
    status: "ACTIVE",
  },
  {
    id: "a3",
    code: "FA-003",
    name: "Office Furniture Set",
    category: "Furniture",
    acquisitionDate: "2024-03-10",
    cost: 250000,
    salvage: 25000,
    usefulLifeYears: 5,
    depreciationMethod: "STRAIGHT_LINE",
    status: "ACTIVE",
  },
];

export function getMockAssets(): AssetRow[] {
  return [...MOCK_ASSETS];
}

export function getMockAssetById(id: string): AssetRow | undefined {
  return getMockAssets().find((a) => a.id === id);
}
