"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import {
  createThreeWayMatchApi,
  fetchExistingMatchesApi,
  fetchMatchableBillsApi,
  fetchMatchableGoodsReceiptsApi,
  fetchMatchablePurchaseOrdersApi,
  unmatchApi,
} from "@/lib/api/ap-match";
import type { MatchableDocumentRow, ThreeWayMatchDecision } from "@/lib/types/ap-match";
import { formatMoney } from "@/lib/money";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type LineId = string;

export default function ThreeWayMatchPage() {
  const copilotEnabled = useCopilotFeatureEnabled();
  const openWithPrompt = useCopilotStore((s) => s.openDrawerWithPrompt);
  const permissions = useAuthStore((s) => s.permissions);
  const isPlatformOperator = useAuthStore((s) => s.isPlatformOperator);
  const canWrite = isPlatformOperator || permissions.includes("finance.write") || permissions.includes("*");

  const [selectedPO, setSelectedPO] = React.useState<LineId | null>(null);
  const [selectedGRN, setSelectedGRN] = React.useState<LineId | null>(null);
  const [selectedBill, setSelectedBill] = React.useState<LineId | null>(null);
  const [poRows, setPoRows] = React.useState<MatchableDocumentRow[]>([]);
  const [grnRows, setGrnRows] = React.useState<MatchableDocumentRow[]>([]);
  const [billRows, setBillRows] = React.useState<MatchableDocumentRow[]>([]);
  const [decisions, setDecisions] = React.useState<ThreeWayMatchDecision[]>([]);
  const [matching, setMatching] = React.useState(false);
  const [unmatching, setUnmatching] = React.useState<string | null>(null);

  // Derive sets of already-matched document IDs for row highlighting
  const matchedPoIds = React.useMemo(() => new Set(decisions.map((d) => d.poId).filter(Boolean)), [decisions]);
  const matchedGrnIds = React.useMemo(() => new Set(decisions.map((d) => d.grnId).filter(Boolean)), [decisions]);
  const matchedBillIds = React.useMemo(() => new Set(decisions.map((d) => d.billId).filter(Boolean)), [decisions]);

  const reload = React.useCallback(async () => {
    const [po, grn, bill, existing] = await Promise.all([
      fetchMatchablePurchaseOrdersApi(),
      fetchMatchableGoodsReceiptsApi(),
      fetchMatchableBillsApi(),
      fetchExistingMatchesApi().catch(() => [] as ThreeWayMatchDecision[]),
    ]);
    setPoRows(po);
    setGrnRows(grn);
    setBillRows(bill);
    setDecisions(existing);
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
      // Reload from DB so matched rows are persisted and reflect correctly
      await reload();
      setSelectedPO(null);
      setSelectedGRN(null);
      setSelectedBill(null);
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

  const handleUnmatch = async (billId: string) => {
    setUnmatching(billId);
    try {
      await unmatchApi(billId);
      await reload();
      toast.success("Match removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove match.");
    } finally {
      setUnmatching(null);
    }
  };

  const explainThreeWay = () => {
    openWithPrompt("Explain: 3-way match between PO, GRN, and Bill. When do we have mismatches?");
  };

  const askWhyMismatch = () => {
    const ctx = [selectedPO, selectedGRN, selectedBill].join(", ");
    openWithPrompt(
      `Why might we have a mismatch (qty or price) for these lines? ${ctx || "Select lines first."}`
    );
  };

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
            {copilotEnabled ? (
              <>
                <Button variant="outline" size="sm" onClick={explainThreeWay}>
                  <Icons.Sparkles className="mr-2 h-4 w-4" />
                  Explain: 3-way match
                </Button>
                <Button variant="outline" size="sm" onClick={askWhyMismatch}>
                  Ask Copilot: why mismatch?
                </Button>
              </>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/docs/bill/new">Create Bill from PO</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* PO lines */}
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
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poRows.map((row) => {
                      const isMatched = matchedPoIds.has(row.id);
                      const isSelected = selectedPO === row.id;
                      return (
                        <TableRow
                          key={row.id}
                          className={isMatched ? "opacity-60" : isSelected ? "bg-muted/50" : undefined}
                          onClick={() => !isMatched && setSelectedPO((prev) => (prev === row.id ? null : row.id))}
                          style={isMatched ? undefined : { cursor: "pointer" }}
                        >
                          <TableCell>
                            {isMatched ? (
                              <Icons.CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => setSelectedPO((prev) => (prev === row.id ? null : row.id))}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.number}
                            {isMatched && <Badge variant="secondary" className="ml-2 text-xs">Matched</Badge>}
                          </TableCell>
                          <TableCell>{row.date?.slice(0, 10)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(row.total ?? 0, row.currency ?? "KES")}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {row.totalWeightKg != null ? `${row.totalWeightKg.toLocaleString()} kg` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* GRN lines */}
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
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Recv. weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grnRows.map((row) => {
                      const isMatched = matchedGrnIds.has(row.id);
                      const isSelected = selectedGRN === row.id;
                      return (
                        <TableRow
                          key={row.id}
                          className={isMatched ? "opacity-60" : isSelected ? "bg-muted/50" : undefined}
                          onClick={() => !isMatched && setSelectedGRN((prev) => (prev === row.id ? null : row.id))}
                          style={isMatched ? undefined : { cursor: "pointer" }}
                        >
                          <TableCell>
                            {isMatched ? (
                              <Icons.CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => setSelectedGRN((prev) => (prev === row.id ? null : row.id))}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.number}
                            {isMatched && <Badge variant="secondary" className="ml-2 text-xs">Matched</Badge>}
                          </TableCell>
                          <TableCell>{row.date?.slice(0, 10)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.total != null ? formatMoney(row.total, row.currency ?? "KES") : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {row.totalWeightKg != null ? `${row.totalWeightKg.toLocaleString()} kg` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Bill lines */}
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
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billRows.map((row) => {
                      const isMatched = matchedBillIds.has(row.id);
                      const isSelected = selectedBill === row.id;
                      return (
                        <TableRow
                          key={row.id}
                          className={isMatched ? "opacity-60" : isSelected ? "bg-muted/50" : undefined}
                          onClick={() => !isMatched && setSelectedBill((prev) => (prev === row.id ? null : row.id))}
                          style={isMatched ? undefined : { cursor: "pointer" }}
                        >
                          <TableCell>
                            {isMatched ? (
                              <Icons.CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => setSelectedBill((prev) => (prev === row.id ? null : row.id))}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.number}
                            {isMatched && <Badge variant="secondary" className="ml-2 text-xs">Matched</Badge>}
                          </TableCell>
                          <TableCell>{row.date?.slice(0, 10)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(row.total ?? 0, row.currency ?? "KES")}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {row.totalWeightKg != null ? `${row.totalWeightKg.toLocaleString()} kg` : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
              Select one unmatched document from each column, then confirm the match.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Button
              variant="default"
              size="sm"
              disabled={matching || !selectedPO || !selectedGRN || !selectedBill}
              onClick={handleMatchSelected}
            >
              {matching ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Match selected
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedPO ? 1 : 0} PO · {selectedGRN ? 1 : 0} GRN · {selectedBill ? 1 : 0} Bill selected
            </span>
            {copilotEnabled ? (
              <Button variant="ghost" size="sm" onClick={askWhyMismatch} className="ml-auto">
                Ask Copilot: why mismatch?
              </Button>
            ) : null}
          </CardContent>
        </Card>

        {/* Persistent match record */}
        <Card>
          <CardHeader>
            <CardTitle>Match records</CardTitle>
            <CardDescription>
              All confirmed three-way matches.
              {!canWrite && " Contact an admin to remove a match."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {decisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {decisions.map((decision) => (
                  <div key={decision.id} className="flex items-start justify-between gap-4 rounded border p-3 text-sm">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Icons.CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="font-medium">
                          {decision.poNumber ?? decision.poId} · {decision.grnNumber ?? decision.grnId} · {decision.billNumber ?? decision.billId}
                        </span>
                        <Badge variant="secondary" className="text-xs">MATCHED</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground pl-6">
                        {new Date(decision.matchedAt).toLocaleString()}
                        {decision.qtyVariance != null && ` · Qty variance: ${decision.qtyVariance}`}
                        {decision.amountVariance != null && ` · Amt variance: ${decision.amountVariance}`}
                      </p>
                    </div>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive"
                        disabled={unmatching === decision.billId}
                        onClick={() => handleUnmatch(decision.billId)}
                      >
                        {unmatching === decision.billId
                          ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Icons.Unlink className="h-3.5 w-3.5" />
                        }
                        <span className="ml-1.5">Unmatch</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
