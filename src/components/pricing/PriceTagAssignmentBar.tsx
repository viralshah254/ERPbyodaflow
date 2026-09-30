"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import {
  clearCustomerDefaultPriceList,
  fetchCustomerDefaultPriceLists,
  fetchOrgDefaultPriceListId,
  setCustomerDefaultPriceList,
  setOrgDefaultPriceListApi,
  type CustomerDefaultPriceListRow,
} from "@/lib/api/pricing";
import { searchPartyLookupOptionsApi } from "@/lib/api/parties";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export function PriceTagAssignmentBar({
  priceListId,
  tagName,
  isDefault,
  onDefaultChange,
  onAssignmentsChange,
}: {
  priceListId: string;
  tagName: string;
  isDefault: boolean;
  onDefaultChange: (priceListId: string) => void;
  onAssignmentsChange?: (rows: CustomerDefaultPriceListRow[]) => void;
}) {
  const [rows, setRows] = React.useState<CustomerDefaultPriceListRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingDefault, setSavingDefault] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);
  const [pickerKey, setPickerKey] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchCustomerDefaultPriceLists();
      setRows(items);
      onAssignmentsChange?.(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load customers on this tag.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [onAssignmentsChange]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onThisTag = rows.filter((row) => row.priceListId === priceListId && row.source !== "category");
  const inherited = rows.filter((row) => row.priceListId === priceListId && row.source === "category");

  const makeDefault = async () => {
    setSavingDefault(true);
    try {
      await setOrgDefaultPriceListApi(priceListId);
      onDefaultChange(priceListId);
      toast.success(`${tagName} is now the default. Customers without their own tag use these prices.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set the default tag.");
    } finally {
      setSavingDefault(false);
    }
  };

  const assignCustomer = async (customerId: string) => {
    if (!customerId) return;
    const existing = rows.find((row) => row.customerId === customerId && row.source !== "category");
    setAssigning(true);
    try {
      await setCustomerDefaultPriceList(customerId, priceListId);
      if (existing && existing.priceListId !== priceListId && existing.priceListName) {
        toast.success(`Moved to ${tagName} from ${existing.priceListName}.`);
      } else {
        toast.success(`This customer now uses ${tagName}.`);
      }
      setPickerKey((n) => n + 1);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign this customer.");
    } finally {
      setAssigning(false);
    }
  };

  const removeCustomer = async (row: CustomerDefaultPriceListRow) => {
    try {
      await clearCustomerDefaultPriceList(row.customerId);
      toast.success(
        isDefault
          ? `${row.customerName ?? "Customer"} now uses the default tag.`
          : `${row.customerName ?? "Customer"} no longer uses ${tagName}.`
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove this customer.");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">Who pays these prices</p>
          <p className="text-xs text-muted-foreground">
            {isDefault
              ? "This is the default tag. Customers with no tag of their own get these prices."
              : "Put a customer on this tag, or make it the default for everyone else."}
          </p>
        </div>
        {isDefault ? (
          <Badge className="shrink-0">Default tag</Badge>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={savingDefault}
            onClick={() => void makeDefault()}
          >
            {savingDefault ? (
              <Icons.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icons.Star className="mr-1.5 h-3.5 w-3.5" />
            )}
            Make this the default
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-foreground">Add a customer to {tagName}</p>
        <AsyncSearchableSelect
          key={pickerKey}
          value=""
          disabled={assigning}
          placeholder={assigning ? "Saving…" : "Search a customer by name"}
          searchPlaceholder="Type a customer name"
          emptyMessage="No customers found."
          loadOptions={async (query) => {
            const options = await searchPartyLookupOptionsApi({
              role: "customer",
              status: "ACTIVE",
              search: query,
              limit: 25,
            });
            return options.map((option) => ({
              id: option.id,
              label: option.label,
              description: option.description,
              badges: option.badges,
            }));
          }}
          onValueChange={(id) => {
            if (id) void assignCustomer(id);
          }}
        />
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading customers…</p>
      ) : onThisTag.length === 0 && inherited.length === 0 ? (
        <p className="text-xs text-muted-foreground">No customer is on this tag yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {onThisTag.map((row) => (
            <li key={row.customerId}>
              <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs">
                <span className="max-w-[14rem] truncate">{row.customerName ?? row.customerCode ?? "Customer"}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${row.customerName ?? "customer"} from ${tagName}`}
                  onClick={() => void removeCustomer(row)}
                >
                  <Icons.X className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
          {inherited.map((row) => (
            <li key={`cat-${row.customerId}`}>
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
                <span className="max-w-[14rem] truncate">{row.customerName ?? "Customer"}</span>
                <span>via group</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Loads the org default once so the tag list can badge it before the bar mounts. */
export function useOrgDefaultPriceListId(): [string | null, (id: string) => void] {
  const [id, setId] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    void fetchOrgDefaultPriceListId().then((next) => {
      if (!cancelled && next) setId(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return [id, setId];
}
