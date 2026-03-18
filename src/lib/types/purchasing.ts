export type PurchasingDocRow = {
  id: string;
  number: string;
  date: string;
  party?: string;
  total?: number;
  currency?: string;
  exchangeRate?: number;
  status: string;
  poRef?: string;
  warehouse?: string;
};

export type GrnLineRow = {
  id: string;
  sku: string;
  productName: string;
  qty: number;
  uom: string;
  value: number;
  receivedWeightKg?: number;
  paidWeightKg?: number;
};

export type GrnDetailRow = PurchasingDocRow & {
  supplier?: string;
  currency?: string;
  totalAmount?: number;
  lines: GrnLineRow[];
};

export type PurchaseOrderDetailRow = PurchasingDocRow & {
  supplier: string;
  currency: string;
  fxRate: number;
  country: "Kenya" | "Uganda";
  region: string;
  cashMode: "CASH" | "CREDIT";
  lines: Array<{
    id: string;
    sku: string;
    productName: string;
    qty: number;
    uom: string;
    rate: number;
    total: number;
  }>;
};
