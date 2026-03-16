"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useCopilotStore } from "@/stores/copilot-store";
import {
  createThreeWayMatchApi,
  fetchMatchableBillsApi,
  fetchMatchableGoodsReceiptsApi,
  fetchMatchablePurchaseOrdersApi,
} from "@/lib/api/ap-match";
import type { MatchableDocumentRow, ThreeWayMatchDecision } from "@/lib/types/ap-match";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type LineId = string;

export default function ThreeWayMatchPage() {
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const [selectedPO, setSelectedPO] = React.useState<LineId | null>(null);
  const [selectedGRN, setSelectedGRN] = React.useState<LineId | null>(null);
  const [selectedBill, setSelectedBill] = React.useState<LineId | null>(null);
  const [poRows, setPoRows] = React.useState<MatchableDocumentRow[]>([]);
  const [grnRows, setGrnRows] = React.useState<MatchableDocumentRow[]>([]);
  const [billRows, setBillRows] = React.useState<MatchableDocumentRow[]>([]);
  const [decisions, setDecisions] = React.useState<ThreeWayMatchDecision[]>([]);
  const [matching, setMatching] = React.useState(false);

  const reload = React.useCallback(async () => {
    const [po, grn, bill] = await Promise.all([
      fetchMatchablePurchaseOrdersApi(),
      fetchMatchableGoodsReceiptsApi(),
      fetchMatchableBillsApi(),
    ]);
    setPoRows(po);
    setGrnRows(grn);
    setBillRows(bill);
  }, []);

  React.useEffect(() => {
    void reload().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load 3-way match data.");
    });
  }, [reload]);

  const handleMatchSelected = async () => {
    if (!selectedPO || !selectedGRN || !selectedBill) {
      toast.info("Select one PO, one GRN, and one Bill document.");
      return;
    }
    setMatching(true);
    try {
      const decision = await createThreeWayMatchApi({
        poId: selectedPO,
        grnId: selectedGRN,
        billId: selectedBill,
      });
      setDecisions((prev) => [decision, ...prev]);
      toast.success(
        decision.status === "MATCHED"
          ? "Documents matched within tolerance."
          : "Documents matched but blocked for variance review."
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create match.");
    } finally {
      setMatching(false);
    }
  };

  const explainThreeWay = () => {
    openWithPrompt("Explain: 3-way match between PO, GRN, and Bill. When do we have mismatches?");
  };

  const askWhyMismatch = () => {
    const ctx = [
      selectedPO,
      selectedGRN,
      selectedBill,
    ].join(", ");
    openWithPrompt(
      `Why might we have a mismatch (qty or price) for these lines? ${ctx || "Select lines first."}`
    );
  };

  const mismatchSkus: string[] = [];

  return (
    <PageShell>
      <PageHeader
        title="3-way match"
        description="Match PO, GRN, and Bill lines. Resolve qty/price mismatches."
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "AP", href: "/ap/bills" },
          { label: "3-way match" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={explainThreeWay}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Explain: 3-way match
            </Button>
            <Button variant="outline" size="sm" onClick={askWhyMismatch}>
              Ask Copilot: why mismatch?
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/docs/bill/new">Create Bill from PO</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        {mismatchSkus.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Icons.AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Mismatch: qty or price differs across PO / GRN / Bill
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-200">
                      SKUs: {mismatchSkus.join(", ")}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={askWhyMismatch}>
                  Ask Copilot
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>PO lines</CardTitle>
              <CardDescription>Purchase orders (live)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPO === row.id}
                            onCheckedChange={() => setSelectedPO((prev) => (prev === row.id ? null : row.id))}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.number}</TableCell>
                        <TableCell>{row.date?.slice(0, 10)}</TableCell>
                        <TableCell>{formatMoney(row.total ?? 0, "KES")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GRN lines</CardTitle>
              <CardDescription>Goods receipts (live)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Number</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grnRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedGRN === row.id}
                            onCheckedChange={() => setSelectedGRN((prev) => (prev === row.id ? null : row.id))}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.number}</TableCell>
                        <TableCell>{row.date?.slice(0, 10)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bill lines</CardTitle>
              <CardDescription>Supplier bills (live)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[320px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedBill === row.id}
                            onCheckedChange={() => setSelectedBill((prev) => (prev === row.id ? null : row.id))}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.number}</TableCell>
                        <TableCell>{row.date?.slice(0, 10)}</TableCell>
                        <TableCell>{formatMoney(row.total ?? 0, "KES")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Match &amp; actions</CardTitle>
            <CardDescription>
              Select lines in each column, then create a match decision with quantity and price tolerance review.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Button
              variant="default"
              size="sm"
              disabled={matching || !selectedPO || !selectedGRN || !selectedBill}
              onClick={handleMatchSelected}
            >
              Match selected
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedPO ? 1 : 0} PO · {selectedGRN ? 1 : 0} GRN · {selectedBill ? 1 : 0} Bill selected
            </span>
          </CardContent>
        </Card>
        {decisions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent decisions</CardTitle>
              <CardDescription>Most recent three-way match outcomes and tolerance reasons.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {decisions.slice(0, 5).map((decision) => (
                <div key={decision.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{decision.status}</p>
                  <p className="text-muted-foreground">{decision.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    PO {decision.poId} · GRN {decision.grnId} · Bill {decision.billId} · {new Date(decision.matchedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
