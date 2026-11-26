"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchEligibleCreditInvoicesApi } from "@/lib/api/documents";
import {
  creditInvoiceCover,
  formatCreditInvoiceDate,
  type CreditInvoiceChoice,
} from "@/lib/docs/credit-note-invoices";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

const PAGE_SIZE = 12;

export function CreditNoteInvoicePicker({
  customerId,
  creditDate,
  currency,
  selected,
  onChange,
  excludeCreditNoteId,
}: {
  customerId?: string;
  creditDate?: string;
  currency: string;
  selected: CreditInvoiceChoice[];
  onChange: (next: CreditInvoiceChoice[]) => void;
  excludeCreditNoteId?: string;
}) {
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<CreditInvoiceChoice[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [error, setError] = React.useState("");
  const requestRef = React.useRef(0);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = React.useCallback(
    async (nextCursor: string | null, append: boolean) => {
      if (!customerId || !creditDate) {
        setItems([]);
        setCursor(null);
        setHasMore(false);
        setError("");
        return;
      }
      const request = ++requestRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");
      try {
        const page = await fetchEligibleCreditInvoicesApi({
          customerId,
          date: creditDate,
          search: query || undefined,
          cursor: nextCursor,
          limit: PAGE_SIZE,
          excludeCreditNoteId,
        });
        if (request !== requestRef.current) return;
        setItems((prev) => {
          const rows = append ? [...prev, ...page.items] : page.items;
          const seen = new Set<string>();
          return rows.filter((row) => {
            if (seen.has(row.id)) return false;
            seen.add(row.id);
            return true;
          });
        });
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (err) {
        if (request !== requestRef.current) return;
        if (!append) setItems([]);
        setHasMore(false);
        setError(err instanceof Error ? err.message : "Invoices could not load.");
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [creditDate, customerId, excludeCreditNoteId, query]
  );

  React.useEffect(() => {
    void load(null, false);
  }, [load]);

  const selectedIds = React.useMemo(() => new Set(selected.map((row) => row.id)), [selected]);
  const cover = creditInvoiceCover(selected);
  const ready = Boolean(customerId && creditDate);

  const toggle = (row: CreditInvoiceChoice) => {
    if (row.remaining <= 0.009) return;
    if (selectedIds.has(row.id)) onChange(selected.filter((item) => item.id !== row.id));
    else onChange([...selected, row]);
  };

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-4" aria-labelledby="credit-invoice-cover-label">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Label id="credit-invoice-cover-label">
            Invoices <span className="text-destructive">*</span>
          </Label>
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Any posted invoice for this customer in the 30 days up to this date. Pick one or several. The goods on this credit note cannot total more than those invoices.
          </p>
        </div>
        {selected.length > 0 && (
          <p className="text-sm font-medium tabular-nums">
            Cover {formatMoney(cover, selected[0]?.currency || currency)}
          </p>
        )}
      </div>

      {!customerId ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          Choose the customer first. Then you can pick their invoices.
        </p>
      ) : !creditDate ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          Set the credit note date to see invoices from the 30 days up to that date.
        </p>
      ) : (
        <>
          <div className="relative">
            <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice number"
              aria-label="Search invoices"
              className="pl-9"
              disabled={!ready}
            />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="inline-flex max-w-full items-center gap-2 rounded-full border bg-background px-2.5 py-1 text-left text-xs hover:bg-muted"
                  onClick={() => onChange(selected.filter((item) => item.id !== row.id))}
                >
                  <span className="font-medium">{row.number}</span>
                  <span className="text-muted-foreground">{formatCreditInvoiceDate(row.date)}</span>
                  <span className="tabular-nums">
                    {row.remaining + 0.009 < row.total
                      ? `${formatMoney(row.remaining, row.currency)} left`
                      : formatMoney(row.total, row.currency)}
                  </span>
                  <Icons.X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="sr-only">Remove {row.number}</span>
                </button>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-md border bg-background">
            {loading && items.length === 0 ? (
              <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
                <Icons.Loader2 className="h-4 w-4 animate-spin" />
                Loading invoices…
              </p>
            ) : error && items.length === 0 ? (
              <div className="space-y-2 px-3 py-6">
                <p className="text-sm text-destructive">{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void load(null, false)}>
                  Try again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                {query
                  ? `No invoice number matches “${query}” in these 30 days.`
                  : "No posted invoices for this customer in the 30 days up to this date."}
              </p>
            ) : (
              <ul className="max-h-80 divide-y overflow-y-auto" aria-label="Customer invoices, highest amount first">
                {items.map((row) => {
                  const on = selectedIds.has(row.id);
                  const blocked = row.remaining <= 0.009;
                  const partial = row.remaining + 0.009 < row.total;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        disabled={blocked}
                        aria-pressed={on}
                        onClick={() => toggle(row)}
                        className={cn(
                          "grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-left text-sm",
                          blocked ? "cursor-not-allowed opacity-60" : "hover:bg-muted/60",
                          on && "bg-primary/10"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded border",
                            on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                          )}
                          aria-hidden
                        >
                          {on ? <Icons.Check className="h-3.5 w-3.5" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{row.number}</span>
                          <span className="block text-xs text-muted-foreground">{formatCreditInvoiceDate(row.date)}</span>
                        </span>
                        <span className="text-right">
                          <span className="block font-medium tabular-nums">{formatMoney(row.total, row.currency)}</span>
                          {blocked ? (
                            <span className="block text-xs text-muted-foreground">Fully credited</span>
                          ) : partial ? (
                            <span className="block text-xs tabular-nums text-muted-foreground">
                              {formatMoney(row.remaining, row.currency)} left
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {hasMore && (
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={loadingMore}
                  onClick={() => void load(cursor, true)}
                >
                  {loadingMore ? "Loading…" : "Show more invoices"}
                </Button>
              </div>
            )}
            {!loading && !hasMore && items.length > 0 && (
              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                Those are the invoices in these 30 days, highest amount first.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
