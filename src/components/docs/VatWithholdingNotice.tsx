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
    <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <p className="font-medium">VAT withholding agent</p>
      <p className="mt-1 text-muted-foreground">
        The invoice stays {formatMoney(invoiceGross, currency)}. KRA withholding is 2% of the taxable value (
        {formatMoney(taxable, currency)}), so {formatMoney(withholding, currency)} is expected to be withheld. The customer
        should pay {formatMoney(expectedCash, currency)}. That amount stays on the invoice until a KRA certificate is
        matched.
      </p>
    </div>
  );
}
