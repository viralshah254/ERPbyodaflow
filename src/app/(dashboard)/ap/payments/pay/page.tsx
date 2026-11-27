"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { SettlementBatchPage } from "@/components/finance/SettlementBatchPage";
import type { EntryPrefill } from "@/components/finance/SettlementEntryForm";

export default function PaySuppliersPage() {
  const searchParams = useSearchParams();
  const prefill = React.useMemo<EntryPrefill | null>(() => {
    const partyId = searchParams.get("supplierId")?.trim();
    if (!partyId) return null;
    const amount = Number(searchParams.get("amount"));
    return {
      partyId,
      partyName: searchParams.get("supplierName")?.trim() || partyId,
      documentNumber: searchParams.get("billNumber")?.trim() || undefined,
      amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
    };
  }, [searchParams]);
  return <SettlementBatchPage side="AP" prefill={prefill} />;
}
