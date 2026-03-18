"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { LiveCurrencyConverterCard } from "@/components/operational/LiveCurrencyConverterCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchCashWeightAuditLines,
  fetchCashWeightExceptions,
  fetchCashDisbursements,
  createCashDisbursement,
  reconcileCashWeightAudit,
  buildCashWeightAudit,
  exportCashWeightAuditCsv,
  assignCashWeightException,
  investigateCashWeightException,
  approveCashWeightException,
  resolveCashWeightException,
} from "@/lib/api/cool-catch";
import { fetchPurchaseOrders, fetchPurchaseOrderById } from "@/lib/api/purchasing";
import type { PurchasingDocRow } from "@/lib/types/purchasing";
import type { CashWeightAuditLineRow, CashDisbursementRow } from "@/lib/mock/purchasing/cash-weight-audit";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type NotesMode = "investigate" | "resolve";

const WORKFLOW_STEPS = [
  { step: "1", label: "Create Purchase Order", detail: "Purchasing → Purchase Order → New", href: "/purchasing/orders" },
  { step: "2", label: "Pay at farm gate", detail: "Record disbursement → select PO → enter amount & paid weight (kg)", action: true },
  { step: "3", label: "Receive stock → create GRN", detail: "Inventory → Goods Receipts → create from PO, enter received weight (kg)", href: "/inventory/receipts" },
  { step: "4", label: "Audit lines auto-built", detail: "PO quantity vs paid weight vs received weight compared automatically" },
  { step: "5", label: "Reconcile any variances", detail: "Exception queue below → Assign → Investigate → Approve → Resolve" },
];

export default function CashWeightAuditPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [view, setView] = React.useState<"audit" | "disbursements">("audit");
  const [auditLines, setAuditLines] = React.useState<CashWeightAuditLineRow[]>([]);
  const [exceptions, setExceptions] = React.useState<CashWeightAuditLineRow[]>([]);
  const [disbursements, setDisbursements] = React.useState<CashDisbursementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reconcilingId, setReconcilingId] = React.useState<string | null>(null);

  // Disbursement form state
  const [disbursementOpen, setDisbursementOpen] = React.useState(false);
  const [disbPoId, setDisbPoId] = React.useState("");
  const [disbAmount, setDisbAmount] = React.useState("");
  const [disbCurrency, setDisbCurrency] = React.useState("KES");
  const [disbPaidAt, setDisbPaidAt] = React.useState("");
  const [disbReference, setDisbReference] = React.useState("");
  const [disbPaidWeightKg, setDisbPaidWeightKg] = React.useState("");
  const [disbLineWeights, setDisbLineWeights] = React.useState<Record<string, string>>({});
  const [poLines, setPoLines] = React.useState<Array<{ poLineId: string; sku: string; productName: string }>>([]);
  const [savingDisb, setSavingDisb] = React.useState(false);
  const [purchaseOrders, setPurchaseOrders] = React.useState<PurchasingDocRow[]>([]);

  // Notes sheet state (replaces window.prompt)
  const [notesSheetOpen, setNotesSheetOpen] = React.useState(false);
  const [notesTarget, setNotesTarget] = React.useState<{ lineId: string; mode: NotesMode; current: string } | null>(null);
  const [notesValue, setNotesValue] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchCashWeightAuditLines(statusFilter ? { status: statusFilter } : undefined).then(setAuditLines),
      fetchCashDisbursements().then(setDisbursements),
      fetchCashWeightExceptions().then(setExceptions),
    ])
      .then(() => setLoading(false))
      .catch((e) => {
        setLoading(false);
        toast.error(e?.message ?? "Failed to load data");
      });
  }, [statusFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Load PO list for the picker
  React.useEffect(() => {
    fetchPurchaseOrders()
      .then(setPurchaseOrders)
      .catch(() => setPurchaseOrders([]));
  }, []);

  // When a PO is selected, fetch its lines for per-line weight entry
  React.useEffect(() => {
    if (!disbPoId.trim()) {
      setPoLines([]);
      setDisbLineWeights({});
      return;
    }
    let cancelled = false;
    fetchPurchaseOrderById(disbPoId.trim())
      .then((po) => {
        if (cancelled || !po?.lines?.length) return;
        const lines = po.lines.map((l, i) => ({
          poLineId: `${po.id}:${i}`,
          sku: l.sku ?? `LINE-${i + 1}`,
          productName: l.productName ?? `Line ${i + 1}`,
        }));
        setPoLines(lines);
        setDisbLineWeights((prev) => {
          const next = { ...prev };
          lines.forEach((l) => {
            if (next[l.poLineId] === undefined) next[l.poLineId] = "";
          });
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setPoLines([]);
      });
    return () => {
      cancelled = true;
    };
  }, [disbPoId]);

  const handleReconcile = async (line: CashWeightAuditLineRow) => {
    if (line.status === "MATCHED") return;
    setReconcilingId(line.id);
    try {
      await reconcileCashWeightAudit({
        auditLineId: line.id,
        paidWeightKg: line.paidWeightKg ?? undefined,
        receivedWeightKg: line.receivedWeightKg ?? undefined,
      });
      toast.success("Reconciled.");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Reconcile failed");
    } finally {
      setReconcilingId(null);
    }
  };

  const handleRecordDisbursement = async () => {
    if (!disbPoId.trim() || !disbAmount || !disbPaidAt) {
      toast.error("Purchase order, amount and paid date are required.");
      return;
    }
    const amount = parseFloat(disbAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const lines =
      poLines.length > 1
        ? poLines
            .map((l) => {
              const w = disbLineWeights[l.poLineId];
              const kg = w ? parseFloat(w) : undefined;
              return kg != null && !Number.isNaN(kg) && kg > 0 ? { poLineId: l.poLineId, paidWeightKg: kg } : null;
            })
            .filter((x): x is { poLineId: string; paidWeightKg: number } => x != null)
        : undefined;
    const paidWeightKg = poLines.length <= 1 && disbPaidWeightKg ? parseFloat(disbPaidWeightKg) : undefined;
    if (poLines.length > 1 && (!lines?.length || lines.length < poLines.length)) {
      toast.error("Enter paid weight (kg) for each product line.");
      return;
    }
    setSavingDisb(true);
    try {
      await createCashDisbursement({
        poId: disbPoId.trim(),
        amount,
        currency: disbCurrency,
        paidAt: disbPaidAt,
        reference: disbReference.trim() || undefined,
        paidWeightKg,
        lines,
      });
      // Auto-build audit lines for this PO so the user never has to do it manually
      try {
        const built = await buildCashWeightAudit({ poId: disbPoId.trim() });
        if (built.built > 0) {
          toast.success(`Disbursement recorded. ${built.built} audit line(s) created automatically.`);
        } else {
          toast.success("Disbursement recorded. Audit lines will appear once a GRN is linked.");
        }
      } catch {
        toast.success("Disbursement recorded.");
      }
      setDisbursementOpen(false);
      setDisbPoId("");
      setDisbAmount("");
      setDisbPaidAt("");
      setDisbReference("");
      setDisbPaidWeightKg("");
      setDisbLineWeights({});
      setPoLines([]);
      await load();
    } catch (e) {
      const msg = (e as Error)?.message ?? "Record failed";
      toast.error(msg === "STUB" ? "Configure API to record disbursements." : msg);
    } finally {
      setSavingDisb(false);
    }
  };

  const openNotesSheet = (lineId: string, mode: NotesMode, current: string) => {
    setNotesTarget({ lineId, mode, current });
    setNotesValue(current);
    setNotesSheetOpen(true);
  };

  const handleSubmitNotes = async () => {
    if (!notesTarget) return;
    setSavingNotes(true);
    try {
      if (notesTarget.mode === "investigate") {
        await investigateCashWeightException(notesTarget.lineId, notesValue);
        toast.success("Investigation notes saved.");
      } else {
        await resolveCashWeightException(notesTarget.lineId, notesValue);
        toast.success("Exception resolved.");
      }
      setNotesSheetOpen(false);
      setNotesTarget(null);
      setNotesValue("");
      await load();
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const selectedPo = purchaseOrders.find((p) => p.id === disbPoId);

  const auditColumns = [
    { id: "po", header: "PO", accessor: (r: CashWeightAuditLineRow) => <span className="font-medium">{r.poNumber ?? "—"}</span>, sticky: true },
    { id: "sku", header: "SKU", accessor: (r: CashWeightAuditLineRow) => r.sku ?? "—" },
    { id: "product", header: "Product", accessor: (r: CashWeightAuditLineRow) => r.productName ?? "—" },
    { id: "ordered", header: "Ordered qty", accessor: (r: CashWeightAuditLineRow) => r.orderedQty ?? "—" },
    { id: "paidKg", header: "Paid weight (kg)", accessor: (r: CashWeightAuditLineRow) => r.paidWeightKg ?? "—" },
    { id: "receivedKg", header: "Received weight (kg)", accessor: (r: CashWeightAuditLineRow) => r.receivedWeightKg ?? "—" },
    {
      id: "variance",
      header: "Variance (kg)",
      accessor: (r: CashWeightAuditLineRow) =>
        r.varianceKg != null ? (r.varianceKg >= 0 ? `+${r.varianceKg}` : r.varianceKg) : "—",
    },
    {
      id: "status",
      header: "Status",
      accessor: (r: CashWeightAuditLineRow) => (
        <Badge variant={r.status === "MATCHED" ? "default" : r.status === "VARIANCE" ? "destructive" : "secondary"}>
          {r.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      accessor: (r: CashWeightAuditLineRow) =>
        r.status !== "MATCHED" ? (
          <Button size="sm" variant="ghost" disabled={reconcilingId === r.id} onClick={() => handleReconcile(r)}>
            {reconcilingId === r.id ? "Reconciling…" : "Reconcile"}
          </Button>
        ) : null,
    },
  ];

  const exceptionColumns = [
    { id: "po", header: "PO", accessor: (r: CashWeightAuditLineRow) => r.poNumber ?? "—", sticky: true },
    { id: "sku", header: "SKU", accessor: (r: CashWeightAuditLineRow) => r.sku ?? "—" },
    { id: "variance", header: "Variance (kg)", accessor: (r: CashWeightAuditLineRow) => r.varianceKg ?? "—" },
    { id: "assignee", header: "Assigned to", accessor: (r: CashWeightAuditLineRow) => r.assignedToUserId ?? "Unassigned" },
    {
      id: "status",
      header: "Status",
      accessor: (r: CashWeightAuditLineRow) => (
        <Badge
          variant={
            r.exceptionStatus === "OPEN"
              ? "destructive"
              : r.exceptionStatus === "RESOLVED"
              ? "default"
              : "secondary"
          }
        >
          {r.exceptionStatus ?? "OPEN"}
        </Badge>
      ),
    },
    {
      id: "sla",
      header: "SLA age",
      accessor: (r: CashWeightAuditLineRow) => (
        <span className={r.slaOverdue ? "text-red-600 font-medium" : ""}>
          {r.slaAgeHours ?? 0}h{r.slaOverdue ? " (overdue)" : ""}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      accessor: (r: CashWeightAuditLineRow) => (
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await assignCashWeightException(r.id);
              await load();
            }}
          >
            Assign
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openNotesSheet(r.id, "investigate", r.investigationNotes ?? "")}
          >
            Investigate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await approveCashWeightException(r.id);
              await load();
            }}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openNotesSheet(r.id, "resolve", r.resolutionNotes ?? "")}
          >
            Resolve
          </Button>
        </div>
      ),
    },
  ];

  const disbursementColumns = [
    {
      id: "reference",
      header: "Reference",
      accessor: (r: CashDisbursementRow) => <span className="font-medium">{r.reference ?? "—"}</span>,
      sticky: true,
    },
    { id: "po", header: "PO", accessor: (r: CashDisbursementRow) => r.poNumber ?? "—" },
    { id: "amount", header: "Amount", accessor: (r: CashDisbursementRow) => formatMoney(r.amount, r.currency) },
    { id: "paidAt", header: "Paid at", accessor: (r: CashDisbursementRow) => r.paidAt ?? "—" },
    {
      id: "status",
      header: "Status",
      accessor: (r: CashDisbursementRow) => (
        <Badge variant={r.status === "RECONCILED" ? "default" : "secondary"}>{r.status}</Badge>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Cash-to-Weight Audit"
        description="Three-way match: Purchase Order → Cash disbursement → Actual weight received"
        breadcrumbs={[
          { label: "Purchasing", href: "/purchasing/orders" },
          { label: "Cash-to-Weight Audit" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Sheet open={disbursementOpen} onOpenChange={setDisbursementOpen}>
              <SheetTrigger asChild>
                <Button size="sm">
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Record disbursement
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Record cash disbursement</SheetTitle>
                  <SheetDescription>
                    Farm-gate CoD payment. Select the PO, enter what you paid and the weight paid for. Audit lines are created automatically.
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-6">
                  {/* PO picker — shows PO number + supplier + total */}
                  <div className="grid gap-2">
                    <Label>Purchase order</Label>
                    <Select value={disbPoId} onValueChange={setDisbPoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a purchase order…" />
                      </SelectTrigger>
                      <SelectContent>
                        {purchaseOrders.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No purchase orders found.</div>
                        ) : (
                          purchaseOrders.map((po) => (
                            <SelectItem key={po.id} value={po.id}>
                              {po.number}
                              {po.party ? ` — ${po.party}` : ""}
                              {po.total ? ` — ${formatMoney(po.total, "KES")}` : ""}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {selectedPo && (
                      <p className="text-xs text-muted-foreground">
                        {selectedPo.date} · Status: {selectedPo.status}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="disbAmount">Amount paid</Label>
                      <Input
                        id="disbAmount"
                        type="number"
                        step="0.01"
                        value={disbAmount}
                        onChange={(e) => setDisbAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="disbCurrency">Currency</Label>
                      <Select value={disbCurrency} onValueChange={setDisbCurrency}>
                        <SelectTrigger id="disbCurrency"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KES">KES</SelectItem>
                          <SelectItem value="UGX">UGX</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="disbPaidAt">Date paid</Label>
                    <Input
                      id="disbPaidAt"
                      type="date"
                      value={disbPaidAt}
                      onChange={(e) => setDisbPaidAt(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="disbReference">Reference / receipt no. (optional)</Label>
                    <Input
                      id="disbReference"
                      value={disbReference}
                      onChange={(e) => setDisbReference(e.target.value)}
                      placeholder="e.g. RCT-001"
                    />
                  </div>

                  {/* Weight entry: single field for single-line POs, per-line for multi-line */}
                  {poLines.length <= 1 ? (
                    <div className="grid gap-2">
                      <Label htmlFor="disbPaidWeightKg">
                        Paid weight (kg){" "}
                        <span className="font-normal text-muted-foreground">— what you weighed at farm gate</span>
                      </Label>
                      <Input
                        id="disbPaidWeightKg"
                        type="number"
                        step="0.01"
                        value={disbPaidWeightKg}
                        onChange={(e) => setDisbPaidWeightKg(e.target.value)}
                        placeholder="e.g. 120.5"
                      />
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label>Paid weight per product (kg)</Label>
                      <p className="text-xs text-muted-foreground">Enter the weight you paid for at farm gate for each line.</p>
                      {poLines.map((l) => (
                        <div key={l.poLineId} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{l.productName}</p>
                            <p className="text-xs text-muted-foreground">{l.sku}</p>
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="kg"
                            className="w-28"
                            value={disbLineWeights[l.poLineId] ?? ""}
                            onChange={(e) =>
                              setDisbLineWeights((prev) => ({ ...prev, [l.poLineId]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={() => setDisbursementOpen(false)} disabled={savingDisb}>
                    Cancel
                  </Button>
                  <Button onClick={handleRecordDisbursement} disabled={savingDisb}>
                    {savingDisb ? "Saving…" : "Save disbursement"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ap/three-way-match">Standard 3-way match</Link>
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">

        {/* Workflow guide — replaces vague banner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How it works — CoD procurement flow</CardTitle>
            <CardDescription>Follow these 5 steps every time you source from a farm gate supplier.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 sm:grid-cols-5">
              {WORKFLOW_STEPS.map(({ step, label, detail, href, action }) => (
                <li key={step} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {step}
                    </span>
                    {href ? (
                      <Link href={href} className="text-sm font-medium hover:underline">
                        {label}
                      </Link>
                    ) : action ? (
                      <button
                        className="text-sm font-medium hover:underline text-left"
                        onClick={() => setDisbursementOpen(true)}
                      >
                        {label}
                      </button>
                    ) : (
                      <span className="text-sm font-medium">{label}</span>
                    )}
                  </div>
                  <p className="pl-8 text-xs text-muted-foreground">{detail}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <ProcurementVariancePanel
            poWeightKg={auditLines.reduce((a, r) => a + (Number(r.orderedQty) || 0), 0)}
            paidWeightKg={auditLines.reduce((a, r) => a + (r.paidWeightKg ?? 0), 0)}
            receivedWeightKg={auditLines.reduce((a, r) => a + (r.receivedWeightKg ?? 0), 0)}
          />
          <LiveCurrencyConverterCard />
        </div>

        {/* Exception queue */}
        <Card>
          <CardHeader>
            <CardTitle>Exception queue — step 5</CardTitle>
            <CardDescription>
              Variances flagged here. Assign to an investigator, add notes, approve, then resolve.
              Each step is tracked with SLA aging.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable data={exceptions} columns={exceptionColumns} emptyMessage="No open exceptions — all matched." />
          </CardContent>
        </Card>

        <div className="flex gap-2 border-b">
          <Button variant={view === "audit" ? "secondary" : "ghost"} size="sm" onClick={() => setView("audit")}>
            Audit lines
          </Button>
          <Button variant={view === "disbursements" ? "secondary" : "ghost"} size="sm" onClick={() => setView("disbursements")}>
            Cash disbursements
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : (
          <>
            {view === "audit" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Procurement audit trail</CardTitle>
                    <CardDescription>
                      PO line → Cash disbursement → GRN received weight. Variances indicate transit shrinkage or grading differences.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportCashWeightAuditCsv(undefined, (msg) => toast.error(msg))}
                    >
                      <Icons.Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Select value={statusFilter || "ALL"} onValueChange={(v) => setStatusFilter(v === "ALL" ? "" : v)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All</SelectItem>
                        <SelectItem value="MATCHED">Matched</SelectItem>
                        <SelectItem value="VARIANCE">Variance</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable data={auditLines} columns={auditColumns} emptyMessage="No audit lines yet. Record a disbursement and create a GRN to start." />
                </CardContent>
              </Card>
            )}

            {view === "disbursements" && (
              <Card>
                <CardHeader>
                  <CardTitle>Cash disbursements</CardTitle>
                  <CardDescription>Farm-gate CoD payments linked to POs. Audit lines are created automatically when a GRN is linked.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable data={disbursements} columns={disbursementColumns} emptyMessage="No disbursements yet." />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Notes sheet — used for both Investigate and Resolve actions */}
      <Sheet open={notesSheetOpen} onOpenChange={setNotesSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {notesTarget?.mode === "investigate" ? "Investigation notes" : "Resolution notes"}
            </SheetTitle>
            <SheetDescription>
              {notesTarget?.mode === "investigate"
                ? "Describe what was found during investigation (e.g. driver error, transit damage, grading issue)."
                : "Describe how this variance was resolved and whether it was approved for write-off."}
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <Textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Add notes…"
              rows={6}
            />
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNotesSheetOpen(false);
                setNotesTarget(null);
                setNotesValue("");
              }}
              disabled={savingNotes}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitNotes} disabled={savingNotes || !notesValue.trim()}>
              {savingNotes ? "Saving…" : notesTarget?.mode === "investigate" ? "Save notes" : "Mark resolved"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
