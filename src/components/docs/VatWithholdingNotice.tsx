"use client";

import * as React from "react";
import { fetchPartyByIdApi } from "@/lib/api/parties";
import { formatMoney } from "@/lib/money";

const RATE = 0.02;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function VatWithholdingNotice({
  partyId,
  agent,
  gross,
  tax,
  currency = "KES",
}: {
  partyId?: string;
  /** When already known, skip the customer lookup. */
  agent?: boolean;
  gross: number;
  tax?: number;
  currency?: string;
}) {
  const [resolvedAgent, setResolvedAgent] = React.useState(agent === true);
  React.useEffect(() => {
    if (agent != null) {
      setResolvedAgent(agent);
      return;
    }
    if (!partyId) {
      setResolvedAgent(false);
      return;
    }
    let cancelled = false;
    void fetchPartyByIdApi(partyId)
      .then((party) => {
        if (!cancelled) setResolvedAgent(Boolean(party?.vatWithholding?.agent));
      })
      .catch(() => {
        if (!cancelled) setResolvedAgent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agent, partyId]);

  const vat = roundMoney(tax ?? 0);
  const invoiceGross = roundMoney(gross);
  if (!resolvedAgent || vat <= 0 || invoiceGross <= 0) return null;
  const taxable = roundMoney(Math.max(0, invoiceGross - vat));
  const withholding = roundMoney(taxable * RATE);
  if (withholding <= 0) return null;
  const expectedCash = roundMoney(invoiceGross - withholding);

  return (
    <div className="mt-4 max-w-sm rounded-md border px-3 py-2 text-sm">
      <p className="font-medium">Amount to pay</p>
      <dl className="mt-2 space-y-1">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Invoice total</dt>
          <dd className="tabular-nums">{formatMoney(invoiceGross, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">VAT included</dt>
          <dd className="tabular-nums">{formatMoney(vat, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">VAT withheld, 2% of {formatMoney(taxable, currency)}</dt>
          <dd className="tabular-nums">− {formatMoney(withholding, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t pt-1 font-medium">
          <dt>Customer pays</dt>
          <dd className="tabular-nums">{formatMoney(expectedCash, currency)}</dd>
        </div>
      </dl>
    </div>
  );
}
