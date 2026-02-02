"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProducts } from "@/lib/data/products.repo";
import { listPackaging } from "@/lib/data/products.repo";
import { listProductPrices } from "@/lib/data/products.repo";

interface Check {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

function runChecks(): Check[] {
  const checks: Check[] = [];
  const products = typeof window !== "undefined" ? listProducts() : [];

  for (const p of products) {
    const baseUom = p.baseUom ?? p.unit;
    if (!baseUom) {
      checks.push({ id: `base-uom-${p.id}`, label: `Product ${p.sku} has baseUom`, ok: false, detail: "Missing" });
    } else {
      checks.push({ id: `base-uom-${p.id}`, label: `Product ${p.sku} has baseUom`, ok: true, detail: baseUom });
    }
  }

  for (const p of products) {
    const pack = listPackaging(p.id);
    for (const x of pack) {
      const valid = !!(x.unitsPer > 0 && x.baseUom);
      checks.push({
        id: `pack-${p.id}-${x.uom}`,
        label: `Packaging ${p.sku} / ${x.uom}`,
        ok: valid,
        detail: valid ? `1 ${x.uom} = ${x.unitsPer} ${x.baseUom}` : "Invalid conversion",
      });
    }
    if (pack.length === 0) {
      checks.push({ id: `pack-${p.id}-none`, label: `Packaging ${p.sku}`, ok: true, detail: "No packaging (optional)" });
    }
  }

  for (const p of products) {
    const prices = listProductPrices(p.id);
    for (const pp of prices) {
      const tiers = pp.tiers ?? [];
      let tierOk = true;
      for (const t of tiers) {
        if (t.minQty < 0 || (t.maxQty != null && t.maxQty < t.minQty)) tierOk = false;
      }
      checks.push({
        id: `tier-${p.id}-${pp.priceListId}`,
        label: `Price tiers ${p.sku} / ${pp.priceListId}`,
        ok: tierOk,
        detail: `${tiers.length} tier(s)`,
      });
    }
  }

  return checks;
}

export default function DataHealthPage() {
  const [checks, setChecks] = React.useState<Check[]>([]);

  React.useEffect(() => {
    setChecks(runChecks());
  }, []);

  const okCount = checks.filter((c) => c.ok).length;
  const failCount = checks.filter((c) => !c.ok).length;

  return (
    <PageShell>
      <PageHeader
        title="Data health"
        description="Products baseUom, packaging conversions, price tiers."
        breadcrumbs={[{ label: "Dev" }, { label: "Data health" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setChecks(runChecks())}>
              Re-run
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dev/route-check">Route check</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dev/action-audit">Action audit</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>Run in browser (uses repo + mocks).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <span><Badge variant="secondary">{okCount} OK</Badge></span>
              <span><Badge variant={failCount ? "destructive" : "secondary"}>{failCount} Fail</Badge></span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead>OK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.label}</TableCell>
                    <TableCell className="text-muted-foreground">{c.detail ?? "—"}</TableCell>
                    <TableCell>{c.ok ? <Badge variant="secondary">OK</Badge> : <Badge variant="destructive">Fail</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
