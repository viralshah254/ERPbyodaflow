"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { KraTaxPinField } from "@/components/parties/KraTaxPinField";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { formatDocumentCreatedLabel } from "@/lib/format/nairobi-datetime";
import {
  updateSfaCustomerApprovalApi,
  type SfaCustomerApproval,
} from "@/lib/api/sfa-customer-approvals";
import { fetchPartiesPageApi } from "@/lib/api/parties";
import type { PartyRow } from "@/lib/types/masters";

type Draft = {
  name: string;
  tradingName: string;
  contactName: string;
  phone: string;
  email: string;
  taxId: string;
  customerCode: string;
  line1: string;
  city: string;
  region: string;
  country: string;
};

function draftFromRow(row: SfaCustomerApproval): Draft {
  return {
    name: row.name ?? "",
    tradingName: row.tradingName ?? "",
    contactName: row.contactName ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    taxId: row.taxId ?? "",
    customerCode: row.customerCode ?? "",
    line1: row.address?.line1 ?? "",
    city: row.address?.city ?? "",
    region: row.address?.region ?? "",
    country: row.address?.country ?? "",
  };
}

export function SfaCustomerApprovalSheet({
  row,
  open,
  canEdit,
  busy,
  onOpenChange,
  onSaved,
  onApprove,
  onReject,
}: {
  row: SfaCustomerApproval | null;
  open: boolean;
  canEdit: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (row: SfaCustomerApproval) => void;
  onApprove: (row: SfaCustomerApproval, mergeIntoPartyId?: string) => void;
  onReject: (row: SfaCustomerApproval) => void;
}) {
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [mergeQuery, setMergeQuery] = React.useState("");
  const [mergeResults, setMergeResults] = React.useState<PartyRow[]>([]);
  const [mergeTarget, setMergeTarget] = React.useState<PartyRow | null>(null);
  const [searching, setSearching] = React.useState(false);

  React.useEffect(() => {
    setMergeQuery(row?.name ?? "");
    setMergeTarget(null);
    setMergeResults([]);
  }, [row?._id, row?.name]);

  React.useEffect(() => {
    if (!open || !canEdit) return;
    const term = mergeQuery.trim();
    if (term.length < 2) {
      setMergeResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void fetchPartiesPageApi({
        role: "customer",
        status: "ACTIVE",
        search: term,
        limit: 8,
      })
        .then((page) => {
          if (!cancelled) setMergeResults(page.items);
        })
        .catch(() => {
          if (!cancelled) setMergeResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canEdit, mergeQuery, open]);

  React.useEffect(() => {
    setDraft(row ? draftFromRow(row) : null);
  }, [row]);

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function dirty(): boolean {
    if (!row || !draft) return false;
    const current = draftFromRow(row);
    return (Object.keys(current) as Array<keyof Draft>).some((key) => current[key] !== draft[key]);
  }

  async function save(quiet = false): Promise<SfaCustomerApproval | null> {
    if (!row || !draft) return null;
    const name = draft.name.trim();
    if (!name) {
      toast.error("Customer name is required.");
      return null;
    }
    setSaving(true);
    try {
      const updated = await updateSfaCustomerApprovalApi(row._id, {
        name,
        tradingName: draft.tradingName.trim() || undefined,
        contactName: draft.contactName.trim() || undefined,
        phone: draft.phone.trim() || undefined,
        email: draft.email.trim() || undefined,
        taxId: draft.taxId.trim() || undefined,
        customerCode: draft.customerCode.trim() || undefined,
        address: {
          line1: draft.line1.trim() || undefined,
          city: draft.city.trim() || undefined,
          region: draft.region.trim() || undefined,
          country: draft.country.trim() || row.address?.country || undefined,
        },
      });
      if (!quiet) toast.success("Customer details saved.");
      onSaved(updated);
      return updated;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save customer details");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function approveWithEdits() {
    if (!row) return;
    if (canEdit && dirty()) {
      const updated = await save(true);
      if (!updated) return;
      onApprove(updated);
      return;
    }
    onApprove(row);
  }

  function mergeIntoExisting() {
    if (!row || !mergeTarget) return;
    onApprove(row, mergeTarget.id);
  }

  const locked = !canEdit || saving || busy;
  const created = row ? formatDocumentCreatedLabel(row.createdAt) : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
          <SheetTitle>{row?.name || "Customer"}</SheetTitle>
          <SheetDescription>
            Correct the details, then approve this as a new customer or merge it into a customer already on the list.
          </SheetDescription>
        </SheetHeader>

        {row && draft ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{created || "Created time unavailable"}</p>
              <p>
                Created by {row.createdByName || "unknown"}
                {row.createdByPhone ? ` · ${row.createdByPhone}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sfa-approval-name">Name</Label>
              <Input
                id="sfa-approval-name"
                value={draft.name}
                disabled={locked}
                onChange={(event) => setField("name", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sfa-approval-trading">Trading name</Label>
              <Input
                id="sfa-approval-trading"
                value={draft.tradingName}
                disabled={locked}
                onChange={(event) => setField("tradingName", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sfa-approval-contact">Contact name</Label>
              <Input
                id="sfa-approval-contact"
                value={draft.contactName}
                disabled={locked}
                onChange={(event) => setField("contactName", event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sfa-approval-phone">Phone</Label>
                <Input
                  id="sfa-approval-phone"
                  value={draft.phone}
                  disabled={locked}
                  inputMode="tel"
                  onChange={(event) => setField("phone", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sfa-approval-email">Email</Label>
                <Input
                  id="sfa-approval-email"
                  type="email"
                  value={draft.email}
                  disabled={locked}
                  onChange={(event) => setField("email", event.target.value)}
                />
              </div>
            </div>
            <KraTaxPinField
              label="KRA PIN"
              value={draft.taxId}
              disabled={locked}
              onChange={(taxId) => setField("taxId", taxId)}
            />
            <div className="space-y-2">
              <Label htmlFor="sfa-approval-code">Customer code</Label>
              <Input
                id="sfa-approval-code"
                value={draft.customerCode}
                disabled={locked}
                onChange={(event) => setField("customerCode", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sfa-approval-line1">Address</Label>
              <Input
                id="sfa-approval-line1"
                value={draft.line1}
                disabled={locked}
                onChange={(event) => setField("line1", event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sfa-approval-city">City</Label>
                <Input
                  id="sfa-approval-city"
                  value={draft.city}
                  disabled={locked}
                  onChange={(event) => setField("city", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sfa-approval-region">Region</Label>
                <Input
                  id="sfa-approval-region"
                  value={draft.region}
                  disabled={locked}
                  onChange={(event) => setField("region", event.target.value)}
                />
              </div>
            </div>
            {canEdit ? (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Already on the ERP list?</p>
                  <p className="text-sm text-muted-foreground">
                    Search for the real customer. Merging keeps that ERP name, links this outlet to it, and allows orders.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sfa-approval-merge">Find ERP customer</Label>
                  <Input
                    id="sfa-approval-merge"
                    value={mergeQuery}
                    disabled={locked}
                    placeholder="Name, phone, or code"
                    onChange={(event) => {
                      setMergeQuery(event.target.value);
                      setMergeTarget(null);
                    }}
                  />
                </div>
                {searching ? (
                  <p className="text-sm text-muted-foreground">Searching customers…</p>
                ) : mergeQuery.trim().length >= 2 && mergeResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active customer matches that search. Approve as a new customer, or try another name.
                  </p>
                ) : (
                  <ul className="max-h-48 space-y-1 overflow-y-auto">
                    {mergeResults.map((party) => {
                      const selected = mergeTarget?.id === party.id;
                      const meta = [party.code, party.phone, party.taxId].filter(Boolean).join(" · ");
                      return (
                        <li key={party.id}>
                          <button
                            type="button"
                            className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                              selected ? "border-primary bg-muted" : "hover:bg-muted"
                            }`}
                            onClick={() => setMergeTarget(party)}
                          >
                            <span className="font-medium">{party.name}</span>
                            {party.tradingName && party.tradingName !== party.name ? (
                              <span className="text-muted-foreground"> · {party.tradingName}</span>
                            ) : null}
                            {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!mergeTarget || locked}
                  onClick={mergeIntoExisting}
                >
                  {busy ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {mergeTarget ? `Merge into ${mergeTarget.name}` : "Merge into this customer"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <SheetFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!row || busy || saving}
              onClick={() => row && onReject(row)}
            >
              Reject
            </Button>
            <Button type="button" disabled={!row || busy || saving} onClick={() => void approveWithEdits()}>
              {busy ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Approve as new
            </Button>
          </div>
          <Button type="button" variant="secondary" disabled={locked || !row} onClick={() => void save()}>
            {saving ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
