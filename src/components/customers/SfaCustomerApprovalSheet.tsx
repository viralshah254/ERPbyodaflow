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
  onApprove: (row: SfaCustomerApproval) => void;
  onReject: (row: SfaCustomerApproval) => void;
}) {
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);

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

  const locked = !canEdit || saving || busy;
  const created = row ? formatDocumentCreatedLabel(row.createdAt) : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 space-y-1 border-b px-6 py-4 text-left">
          <SheetTitle>{row?.name || "Customer"}</SheetTitle>
          <SheetDescription>
            Correct the phone, KRA PIN, and address before this customer joins the list.
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
              Approve
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
