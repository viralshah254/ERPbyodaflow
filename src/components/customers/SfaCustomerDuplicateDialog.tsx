"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPartiesPageApi } from "@/lib/api/parties";
import type { DuplicateCustomerMatch, DuplicateMatchReason } from "@/lib/api/sfa-customer-approvals";
import type { PartyRow } from "@/lib/types/masters";

const REASON_LABEL: Record<DuplicateMatchReason, string> = {
  kra_pin: "Same KRA PIN",
  phone: "Same phone",
  code: "Same customer code",
  email: "Same email",
  exact_name: "Same name",
  similar_name: "Similar name",
};

function hasStrongMatch(matches: DuplicateCustomerMatch[]): boolean {
  return matches.some((match) =>
    match.reasons.some((reason) => reason !== "similar_name" && reason !== "exact_name")
  );
}

export function SfaCustomerDuplicateDialog({
  customerName,
  matches,
  open,
  busy,
  onOpenChange,
  onMerge,
  onCreateNew,
}: {
  customerName: string;
  matches: DuplicateCustomerMatch[];
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onMerge: (partyId: string, partyName: string) => void;
  onCreateNew: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [extra, setExtra] = React.useState<PartyRow[]>([]);

  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setExtra([]);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const term = search.trim();
    if (term.length < 2) {
      setExtra([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void fetchPartiesPageApi({ role: "customer", status: "ACTIVE", search: term, limit: 6 })
        .then((page) => {
          if (!cancelled) setExtra(page.items);
        })
        .catch(() => {
          if (!cancelled) setExtra([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, search]);

  const known = new Set(matches.map((match) => match.partyId));
  const extraOnly = extra.filter((party) => !known.has(party.id));
  const strong = hasStrongMatch(matches);
  const description = strong
    ? `The KRA PIN, phone, code, or email on ${customerName} is already on a customer. Merge into that customer, or create a new one.`
    : `KRA PIN and phone did not match. These names look like ${customerName}. Choose one to merge, or create a new customer.`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-lg border bg-background p-6 shadow-lg">
          <div className="space-y-1">
            <Dialog.Title className="text-lg font-semibold">This customer may already exist</Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">{description}</Dialog.Description>
          </div>

          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {matches.map((match) => (
              <li key={match.partyId} className="rounded-md border px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{match.name || "Unnamed customer"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[match.code, match.phone, match.taxId].filter(Boolean).join(" · ") || "No code, phone, or KRA PIN"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {match.reasons.map((reason) => REASON_LABEL[reason]).join(" · ")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => onMerge(match.partyId, match.name || "The existing customer")}
                  >
                    Merge
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-2 border-t pt-3">
            <label htmlFor="sfa-duplicate-search" className="text-sm font-medium">
              The right customer is not listed
            </label>
            <Input
              id="sfa-duplicate-search"
              value={search}
              placeholder="Search by name, phone, or code"
              onChange={(event) => setSearch(event.target.value)}
            />
            {searching ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
            {extraOnly.length > 0 ? (
              <ul className="max-h-36 space-y-1 overflow-y-auto">
                {extraOnly.map((party) => (
                  <li key={party.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{party.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[party.code, party.phone, party.taxId].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onMerge(party.id, party.name)}>
                      Merge
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={onCreateNew}>
              Create new
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
