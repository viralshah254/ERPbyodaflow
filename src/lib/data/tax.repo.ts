/**
 * Tax repo: Kenya profile, VAT, WHT, tax mappings. localStorage overlay on mocks.
 */

import type { KenyaTaxProfile, KenyaVatRate, KenyaWhtCode, TaxMapping } from "@/lib/mock/tax/kenya";
import {
  getMockKenyaProfile,
  getMockKenyaVatRates,
  getMockKenyaWhtCodes,
  getMockTaxMappings,
} from "@/lib/mock/tax/kenya";
import { getMockCOA } from "@/lib/mock/coa";

const KEY_PROFILE = "odaflow_tax_kenya_profile";
const KEY_VAT = "odaflow_tax_vat_rates";
const KEY_WHT = "odaflow_tax_wht_codes";
const KEY_MAPPINGS = "odaflow_tax_mappings";

function loadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function getKenyaProfile(): KenyaTaxProfile {
  const stored = loadJson<KenyaTaxProfile>(KEY_PROFILE);
  if (stored) return stored;
  return getMockKenyaProfile();
}

export function saveKenyaProfile(p: KenyaTaxProfile): void {
  saveJson(KEY_PROFILE, p);
}

export function listVatRates(): KenyaVatRate[] {
  const stored = loadJson<KenyaVatRate[]>(KEY_VAT);
  if (stored && Array.isArray(stored)) return stored;
  return getMockKenyaVatRates();
}

export function saveVatRates(rates: KenyaVatRate[]): void {
  saveJson(KEY_VAT, rates);
}

export function listWhtCodes(): KenyaWhtCode[] {
  const stored = loadJson<KenyaWhtCode[]>(KEY_WHT);
  if (stored && Array.isArray(stored)) return stored;
  return getMockKenyaWhtCodes();
}

export function saveWhtCodes(codes: KenyaWhtCode[]): void {
  saveJson(KEY_WHT, codes);
}

export function listTaxMappings(): TaxMapping[] {
  const stored = loadJson<TaxMapping[]>(KEY_MAPPINGS);
  if (stored && Array.isArray(stored)) return stored;
  return getMockTaxMappings();
}

export function saveTaxMappings(mappings: TaxMapping[]): void {
  saveJson(KEY_MAPPINGS, mappings);
}

export function getCoaAccountsForMapping() {
  return getMockCOA().filter((a) => !a.isControlAccount && a.isActive);
}
