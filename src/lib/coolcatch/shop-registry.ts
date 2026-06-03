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
    if (!s.erp_shop_id?.trim()) return `Row ${i + 1}: shop id (e.g. F0002) is required.`;
    if (!s.location?.trim()) return `Row ${i + 1}: location name is required.`;
    if (!s.outlet_org_id?.trim()) return `Row ${i + 1}: outlet is required.`;
    if (!s.wa_phone_e164?.trim()) return `Row ${i + 1}: WhatsApp number (E.164) is required.`;
    if (!s.wa_phone_e164.trim().startsWith("+")) {
      return `Row ${i + 1}: WhatsApp number should start with + (E.164).`;
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
