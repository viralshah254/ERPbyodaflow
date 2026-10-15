import { apiRequest, requireLiveApi } from "@/lib/api/client";

export type KraCuRegisterRow = {
  id: string;
  typeKey: string;
  number: string;
  date?: string;
  party?: string;
  total?: number;
  status?: string;
  cuInvoiceNumber?: string;
  supplierInvoiceNumber?: string;
  supplierCuInvoiceNumber?: string;
};

export type KraCuRegister = {
  sales: KraCuRegisterRow[];
  purchases: KraCuRegisterRow[];
  salesTotal: number;
  purchaseTotal: number;
  truncated: boolean;
};

export type KraPurchaseMatchBill = {
  id: string;
  number: string;
  typeKey?: string;
  date?: string;
  status?: string;
  supplierName?: string;
  total?: number;
  supplierInvoiceNumber?: string;
  supplierCuInvoiceNumber?: string;
};

export type KraPurchaseFileRow = {
  cuInvoiceNumber: string;
  supplierInvoiceNumber?: string;
  supplierName?: string;
  amount?: number;
  date?: string;
};

export type KraPurchaseMatchResult = {
  matched: Array<{ bill: KraPurchaseMatchBill; kra: KraPurchaseFileRow }>;
  erpOnly: KraPurchaseMatchBill[];
  kraOnly: KraPurchaseFileRow[];
  missingCu: KraPurchaseMatchBill[];
  duplicates: Array<{ bill: KraPurchaseMatchBill; kra: KraPurchaseFileRow }>;
  kraRowCount: number;
  truncated: boolean;
};

export async function fetchKraCuRegisterApi(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<KraCuRegister> {
  requireLiveApi("KRA CU register");
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params?.dateTo) search.set("dateTo", params.dateTo);
  const query = search.toString();
  return apiRequest<KraCuRegister>(`/api/kra/cu-register${query ? `?${query}` : ""}`);
}

export async function matchKraPurchasesApi(csv: string): Promise<KraPurchaseMatchResult> {
  requireLiveApi("KRA purchase match");
  return apiRequest<KraPurchaseMatchResult>("/api/kra/purchase-match", {
    method: "POST",
    body: { csv },
  });
}
