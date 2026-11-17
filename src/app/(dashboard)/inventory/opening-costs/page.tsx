"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import {
  fetchCompanyOpeningCosts,
  saveCompanyOpeningCost,
  type OpeningCostRow,
} from "@/lib/api/company-opening-costs";
import { useHasPermission } from "@/lib/rbac/use-write-guard";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 300;

type Draft = { cost: string; evidence: string };

export default function OpeningCostsPage() {
  const searchParams = useSearchParams();
  const pinned = searchParams.get("products") ?? "";
  const canSave = useHasPermission("finance.write", "finance.close.write", "admin.settings");
  const [rows, setRows] = React.useState<OpeningCostRow[]>([]);
  const [applies, setApplies] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id = window.setTimeout(() => setSearchQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const load = React.useCallback(async (nextOffset: number) => {
    setLoading(true);
    try {
      const page = await fetchCompanyOpeningCosts({
        limit: PAGE_SIZE,
        offset: nextOffset,
        search: searchQuery || undefined,
        products: pinned || undefined,
      });
      setApplies(page.applies);
      setRows(page.rows);
      setOffset(page.offset);
      setTotal(page.total);
      setHasMore(page.hasMore);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load opening costs.");
    } finally {
      setLoading(false);
    }
  }, [pinned, searchQuery]);

  React.useEffect(() => {
    void load(0);
  }, [load]);

  const save = async (row: OpeningCostRow) => {
    const draft = drafts[row.productId] ?? { cost: "", evidence: "" };
    const unitCost = Number(draft.cost);
    setSavingId(row.productId);
    try {
      const saved = await saveCompanyOpeningCost({ productId: row.productId, unitCost, evidence: draft.evidence });
      setRows((current) => current.map((item) => (item.productId === row.productId ? { ...item, ...saved, onHand: item.onHand } : item)));
      toast.success(`Opening cost saved for ${row.code || row.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the opening cost.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Opening costs"
        description="Record the company opening cost for products that already have stock. This is the cost finance reviews before a load can be invoiced."
        breadcrumbs={[{ label: "Inventory", href: "/inventory/costing" }, { label: "Opening costs" }]}
        sticky
        showCommandHint
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Products that need a company opening cost</CardTitle>
            <CardDescription className="max-w-3xl">
              Search by product code or name. Inventory valuation only shows the last costing snapshot.{" "}
              <Link href="/inventory/valuation" className="font-medium text-foreground underline underline-offset-2">
                Open valuation
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!applies ? (
              <p className="text-sm text-muted-foreground">
                This organisation uses a warehouse cost. A company opening cost is not recorded here.
              </p>
            ) : (
              <>
                <Input
                  type="search"
                  aria-label="Search opening costs"
                  placeholder="Product code or name"
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    setOffset(0);
                  }}
                  className="max-w-sm"
                />
                {!canSave ? (
                  <p className="text-sm text-muted-foreground">You can review these products. Saving an opening cost needs finance access.</p>
                ) : null}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[46rem] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Code</th>
                        <th className="px-2 py-2 font-medium">Product</th>
                        <th className="px-2 py-2 text-right font-medium">On hand</th>
                        <th className="px-2 py-2 font-medium">Opening cost</th>
                        <th className="px-2 py-2 font-medium">Review reference</th>
                        <th className="px-2 py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const draft = drafts[row.productId] ?? { cost: "", evidence: "" };
                        const saving = savingId === row.productId;
                        return (
                          <tr key={row.productId} className="border-b align-top">
                            <td className="px-2 py-3 font-mono">{row.code || "\u2014"}</td>
                            <td className="px-2 py-3">
                              <div>{row.name}</div>
                              {row.sku && row.sku !== row.code ? (
                                <div className="text-xs text-muted-foreground">{row.sku}</div>
                              ) : null}
                            </td>
                            <td className="px-2 py-3 text-right tabular-nums">{row.onHand.toLocaleString()}</td>
                            <td className="px-2 py-3">
                              {row.missing ? (
                                <Input
                                  aria-label={`Opening cost for ${row.code || row.name}`}
                                  inputMode="decimal"
                                  value={draft.cost}
                                  disabled={!canSave || saving}
                                  onChange={(event) => setDrafts((current) => ({ ...current, [row.productId]: { ...draft, cost: event.target.value } }))}
                                  className="w-32"
                                />
                              ) : (
                                <span className="tabular-nums">{formatMoney(row.unitCost ?? 0, row.currency || "KES")}</span>
                              )}
                            </td>
                            <td className="px-2 py-3">
                              {row.missing ? (
                                <Input
                                  aria-label={`Review reference for ${row.code || row.name}`}
                                  value={draft.evidence}
                                  disabled={!canSave || saving}
                                  placeholder="Finance review reference"
                                  onChange={(event) => setDrafts((current) => ({ ...current, [row.productId]: { ...draft, evidence: event.target.value } }))}
                                />
                              ) : (
                                <span className="text-muted-foreground">{row.evidence || "Recorded"}</span>
                              )}
                            </td>
                            <td className="px-2 py-3 text-right">
                              {row.missing && canSave ? (
                                <Button size="sm" disabled={saving || !draft.cost.trim() || draft.evidence.trim().length < 3} onClick={() => void save(row)}>
                                  {saving ? "Saving\u2026" : "Save"}
                                </Button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                      {!loading && rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-2 py-8 text-center text-muted-foreground">
                            {searchQuery ? `No products match \u201c${searchQuery}\u201d.` : "Every product with stock already has a company opening cost."}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  pageOffset={offset}
                  pageSize={PAGE_SIZE}
                  itemCount={rows.length}
                  totalCount={total}
                  hasMore={hasMore}
                  loading={loading}
                  entityLabel="products"
                  onPrevious={() => void load(Math.max(0, offset - PAGE_SIZE))}
                  onNext={() => void load(offset + PAGE_SIZE)}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
