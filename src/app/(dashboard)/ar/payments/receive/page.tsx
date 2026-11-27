"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { SettlementBatchPage } from "@/components/finance/SettlementBatchPage";
import type { EntryPrefill } from "@/components/finance/SettlementEntryForm";

export default function ReceivePaymentsPage() {
  const searchParams = useSearchParams();
  const prefill = React.useMemo<EntryPrefill | null>(() => {
    const partyId = searchParams.get("customerId")?.trim();
    if (!partyId) return null;
    const amount = Number(searchParams.get("amount"));
    return {
      partyId,
      partyName: searchParams.get("customerName")?.trim() || partyId,
      documentNumber: searchParams.get("invoiceNumber")?.trim() || undefined,
      amount: Number.isFinite(amount) && amount > 0 ? amount : undefined,
    };
  }, [searchParams]);
  return <SettlementBatchPage side="AR" prefill={prefill} />;
}
