import type { KenyaTaxProfile, KenyaVatRate, KenyaWhtCode, TaxMapping } from "@/lib/types/tax-kenya";
import { apiRequest, requireLiveApi } from "@/lib/api/client";
import { fetchFinanceAccountsApi } from "@/lib/api/finance";

type BackendTax = {
  id: string;
  code: string;
  name: string;
  rate?: number;
};

type BackendKenyaProfile = {
  vatRegistered?: boolean;
  vatPinMasked?: string | null;
};

function mapVatKind(item: BackendTax): KenyaVatRate["kind"] {
  if (item.code.toUpperCase() === "EXEMPT") return "exempt";
  if ((item.rate ?? 0) === 0) return "zero";
  return "standard";
}

export async function getKenyaProfile(): Promise<KenyaTaxProfile> {
  requireLiveApi("Kenya tax profile");
  const payload = await apiRequest<BackendKenyaProfile>("/api/settings/tax/kenya");
  return {
    vatRegistered: payload.vatRegistered ?? false,
    vatPinMasked: payload.vatPinMasked ?? null,
  };
}

export async function saveKenyaProfile(p: KenyaTaxProfile): Promise<void> {
  requireLiveApi("Save Kenya tax profile");
  await apiRequest("/api/settings/tax/kenya", {
    method: "PATCH",
    body: { vatRegistered: p.vatRegistered, vatPinMasked: p.vatPinMasked },
  });
}

export async function listVatRates(): Promise<KenyaVatRate[]> {
  requireLiveApi("VAT rates");
  const payload = await apiRequest<{ items: BackendTax[] }>("/api/settings/tax/vat");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    rate: item.rate ?? 0,
    kind: mapVatKind(item),
  }));
}

export async function createVatRate(rate: Pick<KenyaVatRate, "code" | "name" | "rate">): Promise<void> {
  requireLiveApi("Create VAT rate");
  await apiRequest("/api/settings/tax/vat", {
    method: "POST",
    body: {
      code: rate.code,
      name: rate.name,
      rate: rate.rate,
    },
  });
}

export async function listWhtCodes(): Promise<KenyaWhtCode[]> {
  requireLiveApi("WHT codes");
  const payload = await apiRequest<{ items: BackendTax[] }>("/api/settings/tax/withholding");
  return (payload.items ?? []).map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    rate: item.rate ?? 0,
  }));
}

export async function listTaxMappings(): Promise<TaxMapping[]> {
  requireLiveApi("Tax mappings");
  const payload = await apiRequest<{ mappings?: TaxMapping[] }>("/api/settings/tax/tax-mappings");
  return payload.mappings ?? [];
}

export async function saveTaxMappings(mappings: TaxMapping[]): Promise<void> {
  requireLiveApi("Save tax mappings");
  await apiRequest("/api/settings/tax/tax-mappings", {
    method: "PATCH",
    body: { mappings },
  });
}

export async function getCoaAccountsForMapping(): Promise<Array<{ id: string; code: string; name: string }>> {
  const accounts = await fetchFinanceAccountsApi();
  return accounts
    .filter((account) => account.code && account.name)
    .map((account) => ({ id: account.id, code: account.code, name: account.name }));
}
