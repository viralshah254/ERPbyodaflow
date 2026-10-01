"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchPaymentTermsApi } from "@/lib/api/payment-terms";
import { fetchPartyByIdApi, updatePartyApi, type PartyDetail } from "@/lib/api/parties";
import { paymentTermDisplayName } from "@/lib/fmcg/payment-class";
import { creditModeUses } from "@/lib/customers/format-credit-limit";
import { useCanWriteFinance, useCanWriteSales } from "@/lib/rbac/use-write-guard";
import { toast } from "sonner";

export function CustomerCreditTab(props: { partyId: string; onSaved?: () => void }) {
  const canWriteFinance = useCanWriteFinance();
  const canWriteSales = useCanWriteSales();
  const canEdit = canWriteFinance || canWriteSales;
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [party, setParty] = React.useState<PartyDetail | null>(null);
  const [terms, setTerms] = React.useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [creditLimit, setCreditLimit] = React.useState("");
  const [paymentTermsId, setPaymentTermsId] = React.useState("");
  const [creditControlMode, setCreditControlMode] = React.useState<"AMOUNT" | "DAYS" | "HYBRID">("AMOUNT");
  const [onHold, setOnHold] = React.useState(false);
  const [sageDcLink, setSageDcLink] = React.useState("");
  const [arApGroup, setArApGroup] = React.useState("");
  const [maxAge, setMaxAge] = React.useState("");
  const [daysCap, setDaysCap] = React.useState("");
  const [warningPct, setWarningPct] = React.useState("");

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const [detail, termRows] = await Promise.all([
        fetchPartyByIdApi(props.partyId),
        fetchPaymentTermsApi().catch(() => []),
      ]);
      setParty(detail);
      setTerms(termRows.map((term) => ({ id: term.id, name: term.name, code: term.code })));
      if (detail) {
        const limit = detail.creditLimitAmount ?? detail.creditLimit;
        setCreditLimit(limit != null && Number.isFinite(limit) ? String(limit) : "");
        setPaymentTermsId(detail.paymentTermsId ?? "");
        setCreditControlMode(detail.creditControlMode ?? "AMOUNT");
        setOnHold(Boolean(detail.onHold));
        setSageDcLink(detail.sageDcLink != null ? String(detail.sageDcLink) : "");
        setArApGroup(detail.arApGroup ?? "");
        setMaxAge(detail.maxOutstandingInvoiceAgeDays != null ? String(detail.maxOutstandingInvoiceAgeDays) : "");
        setDaysCap(detail.perInvoiceDaysToPayCap != null ? String(detail.perInvoiceDaysToPayCap) : "");
        setWarningPct(detail.creditWarningThresholdPct != null ? String(detail.creditWarningThresholdPct) : "");
      }
    } catch (error) {
      toast.error((error as Error).message || "Failed to load credit settings");
    } finally {
      setLoading(false);
    }
  }, [props.partyId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const save = async () => {
    if (!party) return;
    const { amount: usesAmount, days: usesDays } = creditModeUses(creditControlMode);
    if (usesAmount && creditLimit.trim()) {
      const value = Number(creditLimit);
      if (!Number.isFinite(value) || value < 0) {
        toast.error("Credit limit must be a non-negative number.");
        return;
      }
    }
    if (usesDays && maxAge.trim()) {
      const value = Number(maxAge);
      if (!Number.isInteger(value) || value < 0) {
        toast.error("Credit days must be a whole number, zero or greater.");
        return;
      }
    }
    if (usesDays && daysCap.trim()) {
      const value = Number(daysCap);
      if (!Number.isInteger(value) || value < 0) {
        toast.error("Per-invoice days cap must be a whole number, zero or greater.");
        return;
      }
    }
    setSaving(true);
    try {
      const amountValue = usesAmount && creditLimit.trim() ? Number(creditLimit) : null;
      const ageValue = usesDays && maxAge.trim() ? Number(maxAge) : null;
      const capValue = usesDays && daysCap.trim() ? Number(daysCap) : null;
      await updatePartyApi(props.partyId, {
        name: party.name,
        roles: party.roles?.length ? party.roles : ["customer"],
        creditLimit: amountValue,
        creditLimitAmount: amountValue,
        paymentTermsId: paymentTermsId || undefined,
        creditControlMode,
        onHold,
        sageDcLink: sageDcLink.trim() ? Number(sageDcLink) : undefined,
        arApGroup: (arApGroup || undefined) as PartyDetail["arApGroup"],
        maxOutstandingInvoiceAgeDays: ageValue,
        perInvoiceDaysToPayCap: capValue,
        creditWarningThresholdPct: warningPct.trim() ? Number(warningPct) : undefined,
      });
      toast.success("Credit settings saved.");
      props.onSaved?.();
      await reload();
    } catch (error) {
      toast.error((error as Error).message || "Failed to save credit settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading credit settings…</p>;
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label>Credit control</Label>
        <Select
          value={creditControlMode}
          onValueChange={(v) => setCreditControlMode(v as "AMOUNT" | "DAYS" | "HYBRID")}
          disabled={!canEdit}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AMOUNT">Cash amount</SelectItem>
            <SelectItem value="DAYS">Days</SelectItem>
            <SelectItem value="HYBRID">Cash amount + days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {creditModeUses(creditControlMode).amount ? (
        <div className="space-y-2">
          <Label>Cash credit limit</Label>
          <Input
            type="number"
            min={0}
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            disabled={!canEdit}
            placeholder="Leave blank for no cash limit"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label>Cash or credit</Label>
        <Select value={paymentTermsId || "__none__"} onValueChange={(v) => setPaymentTermsId(v === "__none__" ? "" : v)} disabled={!canEdit}>
          <SelectTrigger>
            <SelectValue placeholder="Select terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {terms.map((term) => (
              <SelectItem key={term.id} value={term.id}>
                {paymentTermDisplayName(term)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>On hold</Label>
        <Select value={onHold ? "yes" : "no"} onValueChange={(v) => setOnHold(v === "yes")} disabled={!canEdit}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">No — can invoice</SelectItem>
            <SelectItem value="yes">Yes — block new invoices</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Sage customer ID</Label>
          <Input value={sageDcLink} onChange={(e) => setSageDcLink(e.target.value.replace(/[^\d]/g, ""))} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Account group</Label>
          <Select value={arApGroup || "__none__"} onValueChange={(v) => setArApGroup(v === "__none__" ? "" : v)} disabled={!canEdit}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              <SelectItem value="CASH">Cash</SelectItem>
              <SelectItem value="CREDIT">Credit</SelectItem>
              <SelectItem value="SALES">Sales</SelectItem>
              <SelectItem value="BAD_DEBT">Bad debt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {creditModeUses(creditControlMode).days ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Credit days</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              disabled={!canEdit}
              placeholder="Unpaid invoice age"
            />
          </div>
          <div className="space-y-2">
            <Label>Per-invoice days cap</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={daysCap}
              onChange={(e) => setDaysCap(e.target.value)}
              disabled={!canEdit}
              placeholder="Terms on this invoice"
            />
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label>Warning threshold (%)</Label>
        <Input type="number" value={warningPct} onChange={(e) => setWarningPct(e.target.value)} disabled={!canEdit} />
      </div>
      {canEdit ? (
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save credit"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">You can view credit settings but cannot edit them.</p>
      )}
    </div>
  );
}
