import {
  type CashflowForecastRow,
} from "@/lib/types/treasury";
import { apiRequest, requireLiveApi } from "./client";

type BackendCashflowItem = {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
};

type BackendCashflowResponse = {
  items: BackendCashflowItem[];
};

export async function fetchCashflowApi(filters?: {
  currency?: string;
  from?: string;
  to?: string;
}): Promise<CashflowForecastRow[]> {
  requireLiveApi("Treasury cashflow");
  const data = await apiRequest<BackendCashflowResponse>("/api/treasury/cashflow");
  let runningBalance = 0;
  const rows = data.items.map((item, index) => {
    runningBalance += item.net;
    return {
      id: `cashflow-${index + 1}`,
      date: item.date,
      description:
        item.inflow > 0 && item.outflow > 0
          ? "Mixed cashflow"
          : item.inflow > 0
            ? "Cash inflow"
            : "Cash outflow",
      type: item.inflow > 0 ? "receipt" : "payment",
      inflow: item.inflow,
      outflow: item.outflow,
      balance: runningBalance,
      currency: filters?.currency ?? "KES",
    } satisfies CashflowForecastRow;
  });
  if (filters?.from) {
    return rows.filter((row) => row.date >= filters.from! && (!filters?.to || row.date <= filters.to!));
  }
  if (filters?.to) {
    return rows.filter((row) => row.date <= filters.to!);
  }
  return rows;
}
