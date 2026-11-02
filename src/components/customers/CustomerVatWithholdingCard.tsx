"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updatePartyApi, type PartyDetail } from "@/lib/api/parties";
import { toast } from "sonner";

function kraPinReady(taxId: string | undefined): boolean {
  const pin = String(taxId ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();
  return /^[A-Z][0-9]{9}[A-Z]$/.test(pin);
}

function appointedFrom(row: PartyDetail["vatWithholding"]): string {
  if (!row?.agent) return "";
  if (row.source === "MANUAL") return "Set on this customer.";
  if (row.source === "KRA_CERTIFICATE" || row.matchMethod) return "Appointed from the KRA withholding report.";
  return "";
}

export function CustomerVatWithholdingCard(props: {
  party: PartyDetail;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const { party, canEdit, onSaved } = props;
  const [saving, setSaving] = React.useState(false);
  const agent = Boolean(party.vatWithholding?.agent);
  const pinReady = kraPinReady(party.taxId);
  const origin = appointedFrom(party.vatWithholding);

  const save = async (next: boolean) => {
    setSaving(true);
    try {
      const updated = await updatePartyApi(party.id, { vatWithholding: { agent: next } });
      if (Boolean(updated.vatWithholding?.agent) !== next) {
        toast.error("VAT withholding was not saved.");
        return;
      }
      toast.success(next ? "VAT withholding is on for this customer." : "VAT withholding is off for this customer.");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save VAT withholding.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">VAT withholding</CardTitle>
        <CardDescription>
          New invoices stay at the gross amount. This customer is expected to pay the invoice minus 2% of the taxable value. A KRA certificate confirms the withheld amount later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="customer-vat-withholding" className="text-sm font-medium">
            Withhold VAT on this customer’s invoices
          </Label>
          <Switch
            id="customer-vat-withholding"
            checked={agent}
            disabled={!canEdit || saving || (!agent && !pinReady)}
            onCheckedChange={(checked) => void save(checked)}
          />
        </div>
        {agent && origin ? <p className="text-sm text-muted-foreground">{origin}</p> : null}
        {!pinReady ? (
          <p className="text-sm text-muted-foreground">Add a KRA PIN on this customer before turning withholding on.</p>
        ) : null}
        {!canEdit ? (
          <p className="text-sm text-muted-foreground">Saving this setting needs sales or finance access.</p>
        ) : null}
        <p className="text-sm">
          <Link href="/settings/tax/vat-withholding" className="underline underline-offset-4">
            Company withholding register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
