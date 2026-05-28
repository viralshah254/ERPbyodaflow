"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssignAssetCustodySheet } from "@/components/assets/assign-asset-custody-sheet";
import { fetchAssetAssignmentsApi, fetchAssetByIdApi } from "@/lib/api/assets";
import type { AssetAssignmentRow, AssetRow } from "@/lib/types/assets";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function AssetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [asset, setAsset] = React.useState<AssetRow | null>(null);
  const [assignments, setAssignments] = React.useState<AssetAssignmentRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [assignOpen, setAssignOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [item, history] = await Promise.all([fetchAssetByIdApi(id), fetchAssetAssignmentsApi(id)]);
      setAsset(item);
      setAssignments(history);
    } catch (error) {
      toast.error((error as Error).message);
      setAsset(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const nbv =
    asset != null
      ? Math.max(0, asset.cost - (asset.accumulatedDepreciation ?? 0) - (asset.salvage ?? 0))
      : 0;

  if (!asset && !isLoading) {
    return (
      <PageShell>
        <PageHeader title="Not found" breadcrumbs={[{ label: "Assets", href: "/assets/overview" }, { label: "Register", href: "/assets/register" }, { label: id }]} />
        <div className="p-6">
          <p className="text-muted-foreground">Asset not found.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/assets/register">Back to list</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title={asset ? `${asset.code} — ${asset.name}` : "Loading asset..."}
        description={asset ? `${asset.category} · ${asset.status.replace(/_/g, " ")}` : "Fetching live asset details"}
        breadcrumbs={[
          { label: "Assets", href: "/assets/overview" },
          { label: "Register", href: "/assets/register" },
          { label: asset?.code ?? id },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {asset && asset.status !== "DISPOSED" && (
              <>
                <Button size="sm" variant="secondary" onClick={() => setAssignOpen(true)}>
                  <Icons.ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer custody
                </Button>
                <Button size="sm" asChild>
                  <Link href="/assets/disposals">Dispose</Link>
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/assets/register">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {!asset ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">Loading live asset details...</CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
                <CardDescription>Financial master — cost, life, depreciation, identifiers.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><span className="text-muted-foreground">Category:</span> {asset.category}</p>
                {asset.branchId && <p><span className="text-muted-foreground">Branch:</span> {asset.branchId}</p>}
                {(asset.serialNumber || asset.assetTag || asset.model) && (
                  <p>
                    <span className="text-muted-foreground">Identifiers:</span>{" "}
                    {[asset.assetTag, asset.serialNumber, asset.model].filter(Boolean).join(" · ")}
                  </p>
                )}
                {asset.inServiceDate && (
                  <p><span className="text-muted-foreground">In-service:</span> {asset.inServiceDate}</p>
                )}
                <p><span className="text-muted-foreground">Acquisition date:</span> {asset.acquisitionDate}</p>
                <p><span className="text-muted-foreground">Cost:</span> {formatMoney(asset.cost, "KES")}</p>
                <p><span className="text-muted-foreground">Salvage:</span> {formatMoney(asset.salvage, "KES")}</p>
                <p>
                  <span className="text-muted-foreground">Accumulated depreciation:</span>{" "}
                  {formatMoney(asset.accumulatedDepreciation ?? 0, "KES")}
                </p>
                <p><span className="text-muted-foreground">Net book (incl. salvage floor):</span> {formatMoney(nbv, "KES")}</p>
                <p><span className="text-muted-foreground">Useful life:</span> {asset.usefulLifeYears} years</p>
                {asset.usefulLifeMonths != null && (
                  <p><span className="text-muted-foreground">Useful life months:</span> {asset.usefulLifeMonths}</p>
                )}
                <p>
                  <span className="text-muted-foreground">Depreciation:</span>{" "}
                  {asset.depreciationMethod.replace(/_/g, " ")}
                  {asset.depreciationMethod === "REDUCING_BALANCE" && asset.depreciationRatePct != null
                    ? ` (${asset.depreciationRatePct}% p.a.)`
                    : ""}
                </p>
                <p>
                  <span className="text-muted-foreground">Current custody:</span>{" "}
                  {asset.currentCustodyType?.replace(/_/g, " ") ?? "—"}
                  {asset.custodySince ? ` since ${asset.custodySince}` : ""}
                </p>
                {asset.custodianOutletName && (
                  <p><span className="text-muted-foreground">Outlet:</span> {asset.custodianOutletName}</p>
                )}
                {asset.custodianEmployeeName && (
                  <p><span className="text-muted-foreground">Employee:</span> {asset.custodianEmployeeName}</p>
                )}
                {asset.linkedVendorId && <p><span className="text-muted-foreground">Linked vendor:</span> {asset.linkedVendorId}</p>}
                {asset.linkedInvoiceId && <p><span className="text-muted-foreground">Linked invoice:</span> {asset.linkedInvoiceId}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Custody timeline</CardTitle>
                <CardDescription>Append-only assignment history (who held the asset, and franchise commercial terms per handover).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {assignments.length === 0 ? (
                  <p className="text-muted-foreground">No assignments recorded.</p>
                ) : (
                  <ul className="space-y-3">
                    {assignments.map((row) => (
                      <li key={row.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap justify-between gap-2">
                          <span className="font-medium">{row.custodyType.replace(/_/g, " ")}</span>
                          <span className="text-xs text-muted-foreground">
                            {row.effectiveFrom}
                            {row.effectiveTo ? ` → ${row.effectiveTo}` : " → open"}
                          </span>
                        </div>
                        {(row.monthlyEquipmentFee != null || row.securityDepositAmount != null) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {row.monthlyEquipmentFee != null && <>Fee {formatMoney(row.monthlyEquipmentFee, row.currency ?? "KES")}/mo · </>}
                            {row.securityDepositAmount != null && <>Deposit {formatMoney(row.securityDepositAmount, row.currency ?? "KES")}</>}
                          </p>
                        )}
                        {row.notes && <p className="text-xs mt-1">{row.notes}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {asset && (
        <AssignAssetCustodySheet
          open={assignOpen}
          onOpenChange={setAssignOpen}
          assetId={asset.id}
          assetLabel={`${asset.code} — ${asset.name}`}
          onSuccess={load}
        />
      )}
    </PageShell>
  );
}
