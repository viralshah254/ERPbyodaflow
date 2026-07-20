"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { fetchApprovalQueue, type ApprovalQueueRow } from "@/lib/api/pricing-engine";
import { fetchPriceListsApi } from "@/lib/api/pricing";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { isSeafoodOrg } from "@/config/industry";
import { useOrgContextStore } from "@/stores/orgContextStore";

export default function DailyPricingReviewPage() {
  const router = useRouter();
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const seafood = isSeafoodOrg(templateId, industryCategory);

  React.useEffect(() => {
    if (!seafood) router.replace("/pricing/workspace/lists");
  }, [seafood, router]);

  const [rows, setRows] = React.useState<ApprovalQueueRow[]>([]);
  const [listNames, setListNames] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!seafood || !isApiConfigured()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [queue, lists] = await Promise.all([
        fetchApprovalQueue({ status: "OPEN" }),
        fetchPriceListsApi().catch(() => []),
      ]);
      setRows(queue);
      const m: Record<string, string> = {};
      for (const l of lists) m[l.id] = l.name;
      setListNames(m);
    } catch (e) {
      toast.error((e as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [seafood]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (!seafood) return null;

  return (
    <PageShell>
      <PageHeader
        title="Approvals"
        description="Open items from the smart pricing-engine queue (needs attention before publish)."
        breadcrumbs={[
          { label: "Pricing", href: "/pricing/workspace/overview" },
          { label: "Approvals" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <Icons.RefreshCw className={loading ? "h-4 w-4 mr-1.5 animate-spin" : "h-4 w-4 mr-1.5"} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/workspace/lists">Price lists</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6">
        {!isApiConfigured() ? (
          <p className="text-sm text-muted-foreground">
            Configure <code>NEXT_PUBLIC_API_URL</code> to load the approval queue.
          </p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open approvals</CardTitle>
              <CardDescription>Resolve in each price list: generate suggestions, approve, publish.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>List</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Old</TableHead>
                    <TableHead>Suggested</TableHead>
                    <TableHead>Final cost/kg</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-44"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-sm text-muted-foreground">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-sm text-muted-foreground">
                        Queue is empty. Run the engine generate on a price list or wait for nightly drift thresholds.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-sm">{listNames[r.priceListId] ?? r.priceListId}</TableCell>
                        <TableCell className="font-mono text-xs">{r.productId}</TableCell>
                        <TableCell className="text-sm tabular-nums">{r.oldPrice ?? "—"}</TableCell>
                        <TableCell className="text-sm tabular-nums font-medium">{r.suggestedPrice ?? "—"}</TableCell>
                        <TableCell className="text-sm tabular-nums">{r.finalCostPerKg ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/pricing/price-lists/${r.priceListId}`}>Open list</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
