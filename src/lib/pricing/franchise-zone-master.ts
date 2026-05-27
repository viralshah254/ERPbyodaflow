import type { PriceList } from "@/lib/products/pricing-types";

export function isFranchiseList(pl: {
  channel?: string;
  pricingEngineChannel?: string;
}): boolean {
  return (
    pl.channel === "FRANCHISE" ||
    pl.channel === "Franchise" ||
    pl.pricingEngineChannel === "FRANCHISE"
  );
}

/** Same selection as backend resolveZoneMasterPriceListId (most recently updated root FRANCHISE master). */
export function pickCanonicalZoneMaster(
  priceLists: Pick<
    PriceList,
    | "id"
    | "name"
    | "zoneId"
    | "channel"
    | "pricingEngineChannel"
    | "parentPriceListId"
    | "updatedAt"
    | "lastCalculatedAt"
  >[],
  zoneId: string
) {
  return priceLists
    .filter((pl) => pl.zoneId === zoneId && isFranchiseList(pl) && !pl.parentPriceListId)
    .sort((a, b) => masterSortKey(b) - masterSortKey(a))[0];
}

function masterSortKey(pl: {
  updatedAt?: string;
  lastCalculatedAt?: string;
}): number {
  const updated = pl.updatedAt ? new Date(pl.updatedAt).getTime() : 0;
  if (updated > 0) return updated;
  return pl.lastCalculatedAt ? new Date(pl.lastCalculatedAt).getTime() : 0;
}

export function franchiseMastersForZone(
  priceLists: Pick<
    PriceList,
    | "id"
    | "name"
    | "zoneId"
    | "channel"
    | "pricingEngineChannel"
    | "parentPriceListId"
    | "updatedAt"
    | "lastCalculatedAt"
  >[],
  zoneId: string
) {
  return priceLists.filter(
    (pl) => pl.zoneId === zoneId && isFranchiseList(pl) && !pl.parentPriceListId
  );
}
