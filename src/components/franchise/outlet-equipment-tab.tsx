"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AddAssetSheet } from "@/components/assets/add-asset-sheet";
import { AssignAssetCustodySheet } from "@/components/assets/assign-asset-custody-sheet";
import { suggestNextFaCode } from "@/components/assets/asset-form-constants";
import {
  assignAssetCustodyApi,
  fetchAssetsApi,
  fetchOutletEquipmentApi,
} from "@/lib/api/assets";
import type { AssetRow } from "@/lib/types/assets";
import { formatMoney } from "@/lib/money";
import { can, Permissions } from "@/lib/permissions";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import { ArrowRightLeft, ExternalLink, Plus, RotateCcw } from "lucide-react";

export function OutletEquipmentTab({
  outletOrgId,
  outletName,
}: {
  outletOrgId: string;
  outletName?: string;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canWrite = can(user, Permissions.FINANCE_WRITE);

  const [rows, setRows] = React.useState<AssetRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addOpen, setAddOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [stockAssets, setStockAssets] = React.useState<AssetRow[]>([]);
  const [stockLoading, setStockLoading] = React.useState(false);
  const [stockSearch, setStockSearch] = React.useState("");
  const [selectedAsset, setSelectedAsset] = React.useState<AssetRow | null>(null);
  const [suggestedCode, setSuggestedCode] = React.useState("");
  const [returningId, setReturningId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchOutletEquipmentApi(outletOrgId);
      setRows(items);
    } catch {
      toast.error("Could not load equipment");
    } finally {
      setLoading(false);
    }
  }, [outletOrgId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadStock = React.useCallback(async () => {
    setStockLoading(true);
    try {
      const items = await fetchAssetsApi({ custodyType: "ORG_STOCK" });
      setStockAssets(items.filter((a) => a.status !== "DISPOSED"));
      setSuggestedCode(suggestNextFaCode(items));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load HQ stock assets");
    } finally {
      setStockLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!pickerOpen) return;
    void loadStock();
  }, [pickerOpen, loadStock]);

  const filteredStock = React.useMemo(() => {
    if (!stockSearch.trim()) return stockAssets;
    const q = stockSearch.trim().toLowerCase();
    return stockAssets.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.assetTag?.toLowerCase().includes(q) ?? false) ||
        (r.serialNumber?.toLowerCase().includes(q) ?? false)
    );
  }, [stockAssets, stockSearch]);

  const handleReturnToHq = async (asset: AssetRow) => {
    if (!window.confirm(`Return "${asset.name}" to HQ stock?`)) return;
    setReturningId(asset.id);
    try {
      await assignAssetCustodyApi(asset.id, {
        custodyType: "ORG_STOCK",
        effectiveFrom: new Date().toISOString().slice(0, 10),
        currency: "KES",
      });
      toast.success("Equipment returned to HQ stock.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Return failed");
    } finally {
      setReturningId(null);
    }
  };

  const columns = [
    { id: "code", header: "Code", accessor: (r: AssetRow) => <span className="font-medium">{r.code}</span> },
    { id: "name", header: "Name", accessor: (r: AssetRow) => r.name },
    { id: "category", header: "Category", accessor: (r: AssetRow) => r.category },
    {
      id: "nbv",
      header: "Book (net)",
      accessor: (r: AssetRow) =>
        formatMoney(Math.max(0, r.cost - (r.accumulatedDepreciation ?? 0)), "KES"),
    },
    {
      id: "tag",
      header: "Tag",
      accessor: (r: AssetRow) => (
        <span className="text-xs font-mono text-muted-foreground">{r.assetTag ?? r.serialNumber ?? "—"}</span>
      ),
    },
    ...(canWrite
      ? [
          {
            id: "actions",
            header: "",
            accessor: (r: AssetRow) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                disabled={returningId === r.id}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleReturnToHq(r);
                }}
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                {returningId === r.id ? "Returning…" : "Return to HQ"}
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Fixed assets assigned to this outlet for custody. Ownership stays with HQ; depreciation posts on the
          parent company books.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/assets/register">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Asset register
            </Link>
          </Button>
          {canWrite && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPickerOpen(true);
                  setStockSearch("");
                }}
              >
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                Assign equipment
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  void loadStock().then(() => setAddOpen(true));
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add equipment
              </Button>
            </>
          )}
        </div>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        onRowClick={(r) => router.push(`/assets/register/${r.id}`)}
        emptyMessage={loading ? "Loading equipment…" : "No HQ assets currently assigned to this outlet."}
      />

      <AddAssetSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        suggestedCode={suggestedCode}
        assignToOutletId={outletOrgId}
        assignToOutletName={outletName}
        onSuccess={load}
      />

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Assign equipment</SheetTitle>
            <SheetDescription>
              Pick an asset currently in HQ stock to assign to {outletName ?? "this outlet"}.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Input
              placeholder="Search code, name, tag…"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />
            {stockLoading ? (
              <p className="text-sm text-muted-foreground py-4">Loading HQ stock…</p>
            ) : filteredStock.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No assets in HQ stock. Add equipment or create assets in the asset register first.
              </p>
            ) : (
              <ul className="divide-y rounded-md border max-h-[60vh] overflow-y-auto">
                {filteredStock.map((asset) => (
                  <li key={asset.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setPickerOpen(false);
                        setAssignOpen(true);
                      }}
                    >
                      <p className="text-sm font-medium">
                        {asset.code} — {asset.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {asset.category} · {formatMoney(asset.cost, "KES")}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {selectedAsset && (
        <AssignAssetCustodySheet
          open={assignOpen}
          onOpenChange={(open) => {
            setAssignOpen(open);
            if (!open) setSelectedAsset(null);
          }}
          assetId={selectedAsset.id}
          assetLabel={`${selectedAsset.code} — ${selectedAsset.name}`}
          lockedOutletId={outletOrgId}
          lockedOutletName={outletName}
          defaultCustodyType="FRANCHISE_OUTLET"
          submitLabel="Assign to outlet"
          onSuccess={async () => {
            setSelectedAsset(null);
            await load();
          }}
        />
      )}
    </div>
  );
}
