"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { fetchProductsPageApi } from "@/lib/api/products";
import {
  fetchFranchiseeProductEconomicsApi,
  putFranchiseeProductEconomicsApi,
} from "@/lib/api/cool-catch";

type Row = {
  productId: string;
  sku: string;
  name: string;
  base: string;
  commission: string;
};

export function FranchiseProductEconomicsSection(props: {
  franchiseeRegistryId: string | undefined;
  /** Child org id for PATCH body when linking franchisee registry (shown when unlinked). */
  outletOrgId?: string;
}) {
  const { franchiseeRegistryId, outletOrgId } = props;
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!franchiseeRegistryId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [econ, products] = await Promise.all([
          fetchFranchiseeProductEconomicsApi(franchiseeRegistryId),
          fetchProductsPageApi({ limit: 100, sellable: true, includeStock: false }),
        ]);
        if (cancelled) return;
        const econMap = new Map(econ.map((e) => [e.productId, e]));
        setRows(
          products.items.map((p) => {
            const e = econMap.get(p.id);
            return {
              productId: p.id,
              sku: p.sku ?? p.id,
              name: p.name,
              base: e != null ? String(e.supplyBasePrice) : "",
              commission: e != null ? String(e.commissionPerUnit) : "",
            };
          })
        );
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Could not load product economics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [franchiseeRegistryId]);

  const updateRow = (productId: string, field: "base" | "commission", value: string) => {
    setRows((prev) => prev.map((r) => (r.productId === productId ? { ...r, [field]: value } : r)));
  };

  const onSave = async () => {
    if (!franchiseeRegistryId) return;
    setSaving(true);
    try {
      const items = rows.map((r) => ({
        productId: r.productId,
        supplyBasePrice: Number.parseFloat(r.base) || 0,
        commissionPerUnit: Number.parseFloat(r.commission) || 0,
      }));
      await putFranchiseeProductEconomicsApi(franchiseeRegistryId, items);
      toast.success("Product economics saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!franchiseeRegistryId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product commission (supply base + contract commission)</CardTitle>
          <CardDescription>
            This outlet is not linked to an HQ franchisee registry record yet. Use{" "}
            <Link href="/franchise/royalties" className="text-primary underline underline-offset-2">
              Franchise → Royalty billing
            </Link>{" "}
            (HQ org) to see franchisee names/codes, then link via{" "}
            <code className="rounded bg-muted px-1 text-xs">PATCH /api/franchise/franchisees/&lt;id&gt;</code> with{" "}
            <code className="rounded bg-muted px-1 text-xs break-all">
              {outletOrgId ? `{"outletOrgId":"${outletOrgId}"}` : '{"outletOrgId":"<this-outlet-org-uuid>"}'}
            </code>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Product commission</CardTitle>
          <CardDescription>
            Supply base and contract commission per SKU (KES). Default retail = base + commission; anything above that is extra
            margin for the outlet.
          </CardDescription>
        </div>
        <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving || loading}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading products…</div>
        ) : (
          <div className="max-h-[420px] overflow-auto border-t">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10 border-b">
                <tr className="text-left text-muted-foreground">
                  <th className="p-3 font-medium">SKU</th>
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium w-28">Base</th>
                  <th className="p-3 font-medium w-28">Commission</th>
                  <th className="p-3 font-medium w-32">Guide retail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const b = Number.parseFloat(r.base) || 0;
                  const c = Number.parseFloat(r.commission) || 0;
                  const guide = b + c;
                  return (
                    <tr key={r.productId} className="border-b border-border/60">
                      <td className="p-3 font-mono text-xs">{r.sku}</td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-2">
                        <Input
                          className="h-8"
                          inputMode="decimal"
                          value={r.base}
                          onChange={(e) => updateRow(r.productId, "base", e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          className="h-8"
                          inputMode="decimal"
                          value={r.commission}
                          onChange={(e) => updateRow(r.productId, "commission", e.target.value)}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-3 text-muted-foreground">{guide > 0 ? formatMoney(guide, "KES") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
