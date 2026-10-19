"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  clearCustomerDefaultPriceList,
  fetchCustomerDefaultPriceLists,
  fetchOrgDefaultPriceListId,
  setCustomerDefaultPriceList,
  setOrgDefaultPriceListApi,
  type CustomerDefaultPriceListRow,
} from "@/lib/api/pricing";
import { searchPartyLookupOptionsApi, type PartyLookupOption } from "@/lib/api/parties";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export function useCustomerPriceAssignments() {
  const [rows, setRows] = React.useState<CustomerDefaultPriceListRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const items = await fetchCustomerDefaultPriceLists();
      setRows(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load customers on this tag.");
      setRows([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, reload };
}

export function PriceTagCustomersPanel({
  priceListId,
  tagName,
  isDefault,
  rows,
  loading,
  onDefaultChange,
  onAssignmentsChange,
}: {
  priceListId: string;
  tagName: string;
  isDefault: boolean;
  rows: CustomerDefaultPriceListRow[];
  loading: boolean;
  onDefaultChange: (priceListId: string) => void;
  onAssignmentsChange: () => void;
}) {
  const [savingDefault, setSavingDefault] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [assignedQuery, setAssignedQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    setAssignedQuery("");
    setSelected(new Set());
  }, [priceListId]);

  const onThisTag = React.useMemo(
    () => rows.filter((row) => row.priceListId === priceListId && row.source !== "category"),
    [rows, priceListId]
  );
  const inherited = React.useMemo(
    () => rows.filter((row) => row.priceListId === priceListId && row.source === "category"),
    [rows, priceListId]
  );

  const makeDefault = async () => {
    setSavingDefault(true);
    try {
      const saved = await setOrgDefaultPriceListApi(priceListId);
      onDefaultChange(priceListId);
      const sfa = saved.sfaSync;
      if (sfa?.attempted && sfa.pushed > 0) {
        toast.success(
          `${tagName} is now the default. SFA catalog prices now use this tag (${sfa.pushed} product${sfa.pushed === 1 ? "" : "s"}).`
        );
      } else if (sfa?.attempted && sfa.reason) {
        toast.success(`${tagName} is now the default. SFA was not updated: ${sfa.reason}`);
      } else {
        toast.success(`${tagName} is now the default. Customers without their own tag use these prices.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set the default tag.");
    } finally {
      setSavingDefault(false);
    }
  };

  const assignCustomers = async (customerIds: string[]) => {
    if (customerIds.length === 0) return false;
    setAssigning(true);
    try {
      const failed = await runInChunks(customerIds, (id) => setCustomerDefaultPriceList(id, priceListId));
      const added = customerIds.length - failed;
      if (added > 0) {
        toast.success(added === 1 ? `1 customer added to ${tagName}.` : `${added} customers added to ${tagName}.`);
        onAssignmentsChange();
      }
      if (failed > 0) {
        toast.error(failed === 1 ? "1 customer could not be added." : `${failed} customers could not be added.`);
      }
      return added > 0;
    } finally {
      setAssigning(false);
    }
  };

  const removeSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setRemoving(true);
    try {
      const failedIds: string[] = [];
      await runInChunks(ids, async (id) => {
        try {
          await clearCustomerDefaultPriceList(id);
        } catch (e) {
          failedIds.push(id);
          throw e;
        }
      });
      const removed = ids.length - failedIds.length;
      if (removed > 0) {
        toast.success(
          isDefault
            ? removed === 1
              ? "1 customer now uses the default tag."
              : `${removed} customers now use the default tag.`
            : removed === 1
              ? `1 customer removed from ${tagName}.`
              : `${removed} customers removed from ${tagName}.`
        );
        onAssignmentsChange();
      }
      if (failedIds.length > 0) {
        toast.error(
          failedIds.length === 1 ? "1 customer could not be removed." : `${failedIds.length} customers could not be removed.`
        );
      }
      setSelected(new Set(failedIds));
    } finally {
      setRemoving(false);
    }
  };

  const assignedIds = React.useMemo(
    () => new Set(onThisTag.map((row) => row.customerId)),
    [onThisTag]
  );

  const filteredAssigned = React.useMemo(() => {
    const q = assignedQuery.trim().toLowerCase();
    if (!q) return onThisTag;
    return onThisTag.filter((row) => {
      const name = (row.customerName ?? "").toLowerCase();
      const code = (row.customerCode ?? "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [assignedQuery, onThisTag]);

  const visibleIds = filteredAssigned.map((row) => row.customerId);
  const allVisible = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisible = visibleIds.some((id) => selected.has(id));

  const toggleVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisible) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <div className="relative min-w-0 flex-1">
            <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={assignedQuery}
              onChange={(e) => setAssignedQuery(e.target.value)}
              placeholder="Search"
              className="h-9 pl-8"
              aria-label="Search customers"
            />
          </div>
          <AddCustomersMenu
            assignedIds={assignedIds}
            busy={assigning}
            onAdd={(ids) => assignCustomers(ids)}
          />
          {isDefault ? (
            <Badge variant="secondary" className="shrink-0">
              Default
            </Badge>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="shrink-0"
              disabled={savingDefault}
              onClick={() => void makeDefault()}
            >
              {savingDefault ? (
                <Icons.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icons.Star className="mr-1.5 h-3.5 w-3.5" />
              )}
              Default
            </Button>
          )}
        </div>

        <div className="flex h-10 items-center gap-3 border-b bg-muted/30 px-3">
          <Checkbox
            checked={allVisible ? true : someVisible ? "indeterminate" : false}
            disabled={loading || removing || visibleIds.length === 0}
            onCheckedChange={() => toggleVisible()}
            aria-label="Select all"
          />
          {selected.size > 0 ? (
            <>
              <span className="text-sm tabular-nums">{selected.size} selected</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive hover:text-destructive"
                disabled={removing}
                onClick={() => void removeSelected()}
              >
                {removing ? (
                  <Icons.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icons.Trash2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Remove
              </Button>
            </>
          ) : (
            <span className="text-sm tabular-nums text-muted-foreground">{onThisTag.length}</span>
          )}
        </div>

        {loading ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">Loading</p>
        ) : onThisTag.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">No customers</p>
        ) : filteredAssigned.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">No results</p>
        ) : (
          <ul className="max-h-[min(58vh,560px)] overflow-y-auto">
            {filteredAssigned.map((row) => {
              const name = row.customerName ?? row.customerCode ?? "Customer";
              const checked = selected.has(row.customerId);
              return (
                <li key={row.customerId} className="border-b last:border-b-0">
                  <div
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={name}
                    tabIndex={0}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40",
                      checked && "bg-primary/5"
                    )}
                    onClick={() => toggleOne(row.customerId)}
                    onKeyDown={(event) => {
                      if (event.key === " " || event.key === "Enter") {
                        event.preventDefault();
                        toggleOne(row.customerId);
                      }
                    }}
                  >
                    <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none mt-0.5" />
                    <span className="min-w-0 flex-1 break-words text-sm leading-5">{name}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {inherited.length > 0 ? (
        <details className="rounded-xl border bg-card px-3 py-2.5">
          <summary className="cursor-pointer text-sm">
            Via group
            <span className="ml-2 tabular-nums text-muted-foreground">{inherited.length}</span>
          </summary>
          <ul className="mt-2 max-h-48 divide-y overflow-y-auto rounded-lg border">
            {inherited.map((row) => (
              <li key={`cat-${row.customerId}`} className="px-3 py-2 text-sm leading-5 break-words">
                {row.customerName ?? "Customer"}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function AddCustomersMenu({
  assignedIds,
  busy,
  onAdd,
}: {
  assignedIds: Set<string>;
  busy: boolean;
  onAdd: (customerIds: string[]) => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [options, setOptions] = React.useState<PartyLookupOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void searchPartyLookupOptionsApi({
      role: "customer",
      status: "ACTIVE",
      search: debounced,
      limit: 40,
    })
      .then((items) => {
        if (!cancelled) setOptions(items.filter((item) => !assignedIds.has(item.id)));
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debounced, assignedIds]);

  const allShown = options.length > 0 && options.every((option) => picked.has(option.id));
  const someShown = options.some((option) => picked.has(option.id));

  const toggleShown = () => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (allShown) {
        for (const option of options) next.delete(option.id);
      } else {
        for (const option of options) next.add(option.id);
      }
      return next;
    });
  };

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setDebounced("");
          setPicked(new Set());
          setOptions([]);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" size="sm" disabled={busy} className="shrink-0">
          {busy ? <Icons.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Icons.Plus className="mr-1.5 h-3.5 w-3.5" />}
          Add
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="border-b p-2">
          <div className="relative">
            <Icons.Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-9 pl-8"
              aria-label="Search customers to add"
              autoFocus
            />
          </div>
        </div>
        <div className="flex h-9 items-center gap-3 border-b px-3">
          <Checkbox
            checked={allShown ? true : someShown ? "indeterminate" : false}
            disabled={loading || options.length === 0}
            onCheckedChange={() => toggleShown()}
            aria-label="Select all shown"
          />
          <span className="text-xs tabular-nums text-muted-foreground">
            {picked.size > 0 ? `${picked.size} selected` : options.length}
          </span>
        </div>
        <ul className="max-h-72 overflow-y-auto">
          {loading ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">Loading</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">No results</li>
          ) : (
            options.map((option) => {
              const checked = picked.has(option.id);
              return (
                <li key={option.id} className="border-b last:border-b-0">
                  <div
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={option.label}
                    tabIndex={0}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-muted/40",
                      checked && "bg-primary/5"
                    )}
                    onClick={() => togglePick(option.id)}
                    onKeyDown={(event) => {
                      if (event.key === " " || event.key === "Enter") {
                        event.preventDefault();
                        togglePick(option.id);
                      }
                    }}
                  >
                    <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm leading-5">{option.label}</span>
                      {option.description ? (
                        <span className="mt-0.5 block break-words text-xs leading-4 text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </li>
              );
            })
          )}
        </ul>
        <div className="flex justify-end border-t p-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || picked.size === 0}
            onClick={() => {
              const ids = [...picked];
              void onAdd(ids).then((added) => {
                if (!added) return;
                setOpen(false);
                setQuery("");
                setDebounced("");
                setPicked(new Set());
                setOptions([]);
              });
            }}
          >
            Add{picked.size > 0 ? ` ${picked.size}` : ""}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

async function runInChunks(ids: string[], task: (id: string) => Promise<void>, size = 8): Promise<number> {
  let failed = 0;
  for (let index = 0; index < ids.length; index += size) {
    const slice = ids.slice(index, index + size);
    const results = await Promise.allSettled(slice.map((id) => task(id)));
    failed += results.filter((result) => result.status === "rejected").length;
  }
  return failed;
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
