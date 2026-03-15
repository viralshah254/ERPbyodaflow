"use client";

import * as React from "react";
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
import { createAssetDisposalApi, fetchAssetDisposalsApi } from "@/lib/api/asset-disposals";
import { fetchAssetsApi } from "@/lib/api/assets";
import { postDisposalJournalApi } from "@/lib/api/assets-lifecycle";
import type { DisposalRow } from "@/lib/mock/assets/disposals";
import type { AssetRow } from "@/lib/mock/assets/register";
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function DisposalsPage() {
  const [search, setSearch] = React.useState("");
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [postingId, setPostingId] = React.useState<string | null>(null);
  const [wizardStep, setWizardStep] = React.useState(1);
  const [rows, setRows] = React.useState<DisposalRow[]>([]);
  const [assets, setAssets] = React.useState<AssetRow[]>([]);
  const [wizardForm, setWizardForm] = React.useState({
    assetId: "",
    disposalDate: "",
    salePrice: 0,
    reason: "",
  });

  const reload = React.useCallback(async () => {
    const [disposalItems, assetItems] = await Promise.all([
      fetchAssetDisposalsApi(),
      fetchAssetsApi(),
    ]);
    setRows(disposalItems);
    setAssets(assetItems.filter((asset) => asset.status === "ACTIVE"));
  }, []);

  React.useEffect(() => {
    void reload().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load disposals.");
    });
  }, [reload]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.assetCode.toLowerCase().includes(q) ||
        r.assetName.toLowerCase().includes(q)
    );
  }, [rows, search]);

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
      {
        id: "actions",
        header: "Actions",
        accessor: (r: DisposalRow) =>
          r.status === "DRAFT" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={postingId === r.id}
              onClick={() => {
                void (async () => {
                  try {
                    setPostingId(r.id);
                    const result = await postDisposalJournalApi(r.id);
                    await reload();
                    toast.success(`Disposal posted. Journal ${result.journalId}.`);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to post disposal journal.");
                  } finally {
                    setPostingId(null);
                  }
                })();
              }}
            >
              Post journal
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{r.journalId ? `Journal ${r.journalId}` : "Posted"}</span>
          ),
      },
    ],
    [postingId, reload]
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
        />
        <Card>
          <CardHeader>
            <CardTitle>Disposals</CardTitle>
            <CardDescription>Sale price, date, reason, and live gain/loss preview.</CardDescription>
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
            <SheetDescription>Step {wizardStep} of 2. Record a live asset disposal.</SheetDescription>
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
                Review the disposal before posting it to the asset register.
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
                <Button
                  onClick={() => {
                    void (async () => {
                      try {
                        await createAssetDisposalApi({
                          assetId: wizardForm.assetId,
                          disposalDate: wizardForm.disposalDate,
                          proceeds: wizardForm.salePrice,
                          reason: wizardForm.reason || undefined,
                        });
                        setWizardOpen(false);
                        await reload();
                        toast.success("Asset disposal recorded.");
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Failed to record disposal.");
                      }
                    })();
                  }}
                >
                  Post
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
