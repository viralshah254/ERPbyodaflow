/**
 * Mock price lists (Retail, Wholesale, Distributor, etc.).
 */

import type { PriceList } from "@/lib/products/pricing-types";

export const MOCK_PRICE_LISTS: PriceList[] = [
  { id: "pl-retail", name: "Retail", currency: "KES", channel: "Retail", isDefault: true },
  { id: "pl-wholesale", name: "Wholesale", currency: "KES", channel: "Wholesale" },
  { id: "pl-dist", name: "Distributor", currency: "KES", channel: "Distributor" },
  { id: "pl-mt", name: "Modern Trade", currency: "KES", channel: "ModernTrade" },
  { id: "pl-export", name: "Export", currency: "USD", channel: "Export" },
];

export function getMockPriceLists(): PriceList[] {
  return [...MOCK_PRICE_LISTS];
}

export function getMockPriceListById(id: string): PriceList | undefined {
  return getMockPriceLists().find((pl) => pl.id === id);
}
