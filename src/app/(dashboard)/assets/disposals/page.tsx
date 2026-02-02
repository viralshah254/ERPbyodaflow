"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMockDisposals, type DisposalRow } from "@/lib/mock/assets/disposals";
import { getMockAssets } from "@/lib/mock/assets/register";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

export default function DisposalsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [wizardStep, setWizardStep] = React.useState(1);
  const [wizardForm, setWizardForm] = React.useState({
    assetId: "",
    disposalDate: "",
    salePrice: 0,
    reason: "",
  });

  const rows = React.useMemo(() => getMockDisposals(), []);
  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.assetCode.toLowerCase().includes(q) ||
        r.assetName.toLowerCase().includes(q)
    );
  }, [rows, search]);
  const assets = React.useMemo(() => getMockAssets().filter((a) => a.status === "ACTIVE"), []);

  const openWizard = () => {
    setWizardForm({
      assetId: assets[0]?.id ?? "",
      disposalDate: new Date().toISOString().slice(0, 10),
      salePrice: 0,
      reason: "",
    });
    setWizardStep(1);
    setWizardOpen(true);
  };

  const selectedAsset = assets.find((a) => a.id === wizardForm.assetId);
  const bookValue = selectedAsset ? selectedAsset.cost - selectedAsset.salvage : 0;
  const gainLoss = wizardForm.salePrice - bookValue;

  const columns = React.useMemo(
    () => [
      { id: "assetCode", header: "Asset", accessor: (r: DisposalRow) => <span className="font-medium">{r.assetCode} — {r.assetName}</span>, sticky: true },
      { id: "disposalDate", header: "Date", accessor: "disposalDate" as keyof DisposalRow },
      { id: "salePrice", header: "Sale price", accessor: (r: DisposalRow) => formatMoney(r.salePrice, "KES") },
      { id: "bookValue", header: "Book value", accessor: (r: DisposalRow) => formatMoney(r.bookValue, "KES") },
      {
        id: "gainLoss",
        header: "Gain / Loss",
        accessor: (r: DisposalRow) => (
          <span className={r.gainLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}>
            {r.gainLoss >= 0 ? "+" : ""}{formatMoney(r.gainLoss, "KES")}
          </span>
        ),
      },
      { id: "status", header: "Status", accessor: (r: DisposalRow) => <Badge variant={r.status === "POSTED" ? "secondary" : "outline"}>{r.status}</Badge> },
    ],
    []
  );

  return (
    <PageShell>
      <PageHeader
        title="Disposals"
        description="Disposal wizard, gain/loss preview"
        breadcrumbs={[
          { label: "Assets", href: "/assets/overview" },
          { label: "Disposals" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain asset disposal and gain/loss accounting." label="Explain disposals" />
            <Button size="sm" onClick={openWizard}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              New disposal
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-4">
        <DataTableToolbar
          searchPlaceholder="Search by asset..."
          searchValue={search}
          onSearchChange={setSearch}
          onExport={() => window.alert("Export (stub)")}
        />
        <Card>
          <CardHeader>
            <CardTitle>Disposals</CardTitle>
            <CardDescription>Sale price, date, reason. Preview gain/loss (mock).</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable<DisposalRow>
              data={filtered}
              columns={columns}
              emptyMessage="No disposals."
            />
          </CardContent>
        </Card>
      </div>

      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Disposal wizard</SheetTitle>
            <SheetDescription>Step {wizardStep} of 2. Stub.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {wizardStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Asset</Label>
                  <Select value={wizardForm.assetId} onValueChange={(v) => setWizardForm((p) => ({ ...p, assetId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Disposal date</Label>
                  <Input type="date" value={wizardForm.disposalDate} onChange={(e) => setWizardForm((p) => ({ ...p, disposalDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Sale price</Label>
                  <Input type="number" value={wizardForm.salePrice || ""} onChange={(e) => setWizardForm((p) => ({ ...p, salePrice: Number(e.target.value) || 0 }))} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input value={wizardForm.reason} onChange={(e) => setWizardForm((p) => ({ ...p, reason: e.target.value }))} placeholder="e.g. Replaced" />
                </div>
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-muted-foreground">Preview</p>
                  <p>Book value: {formatMoney(bookValue, "KES")}</p>
                  <p className={gainLoss >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                    Gain/Loss: {gainLoss >= 0 ? "+" : ""}{formatMoney(gainLoss, "KES")}
                  </p>
                </div>
              </>
            )}
            {wizardStep === 2 && (
              <div className="text-sm text-muted-foreground">
                Review and post (stub). Would create journal entries.
              </div>
            )}
          </div>
          <SheetFooter className="mt-6">
            {wizardStep === 1 ? (
              <>
                <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
                <Button onClick={() => setWizardStep(2)}>Next</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setWizardStep(1)}>Back</Button>
                <Button onClick={() => { setWizardOpen(false); window.alert("Post disposal (stub)."); }}>Post</Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
