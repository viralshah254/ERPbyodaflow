import type {
  CoolcatchShopCandidateDto,
  CoolcatchShopRowDto,
} from "@/lib/api/coolcatch-bot-integration";

export function candidatesToShopRows(
  candidates: CoolcatchShopCandidateDto[],
  existing: CoolcatchShopRowDto[]
): CoolcatchShopRowDto[] {
  const byOutlet = new Map(existing.map((s) => [s.outlet_org_id, s]));
  return candidates.map((c) => {
    const prev = byOutlet.get(c.outletOrgId);
    return {
      erp_shop_id: prev?.erp_shop_id?.trim() || c.erpShopId,
      location: prev?.location?.trim() || c.location,
      outlet_org_id: c.outletOrgId,
      wa_phone_e164: prev?.wa_phone_e164?.trim() || c.suggestedWaPhoneE164,
      ...(prev?.branch_id ? { branch_id: prev.branch_id } : {}),
    };
  });
}

export function validateShopRows(shops: CoolcatchShopRowDto[]): string | null {
  for (let i = 0; i < shops.length; i++) {
    const s = shops[i];
    const name = s.location?.trim() || s.erp_shop_id?.trim() || `Outlet ${i + 1}`;
    if (!s.erp_shop_id?.trim()) return `${name} is missing a shop code.`;
    if (!s.location?.trim()) return `${s.erp_shop_id} is missing a location name.`;
    if (!s.outlet_org_id?.trim()) return `${name} is not linked to a franchise outlet.`;
    if (!s.wa_phone_e164?.trim()) return `${name} is missing a WhatsApp number.`;
    if (!s.wa_phone_e164.trim().startsWith("+")) {
      return `${name}'s WhatsApp number needs a country code (e.g. +254…).`;
    }
  }
  return null;
}

export function moveShopRow(shops: CoolcatchShopRowDto[], index: number, dir: -1 | 1): CoolcatchShopRowDto[] {
  const j = index + dir;
  if (j < 0 || j >= shops.length) return shops;
  const next = [...shops];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}
