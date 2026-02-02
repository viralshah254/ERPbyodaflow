"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMockAssetById } from "@/lib/mock/assets/register";
import { formatMoney } from "@/lib/money";
import * as Icons from "lucide-react";

export default function AssetDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const asset = React.useMemo(() => getMockAssetById(id), [id]);

  if (!asset) {
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
        title={`${asset.code} — ${asset.name}`}
        description={`${asset.category} · ${asset.status}`}
        breadcrumbs={[
          { label: "Assets", href: "/assets/overview" },
          { label: "Register", href: "/assets/register" },
          { label: asset.code },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            {asset.status === "ACTIVE" && (
              <Button size="sm" asChild>
                <Link href="/assets/disposals">Dispose</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/assets/register">Back to list</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>Cost, salvage, useful life, depreciation method.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><span className="text-muted-foreground">Category:</span> {asset.category}</p>
            <p><span className="text-muted-foreground">Acquisition date:</span> {asset.acquisitionDate}</p>
            <p><span className="text-muted-foreground">Cost:</span> {formatMoney(asset.cost, "KES")}</p>
            <p><span className="text-muted-foreground">Salvage:</span> {formatMoney(asset.salvage, "KES")}</p>
            <p><span className="text-muted-foreground">Useful life:</span> {asset.usefulLifeYears} years</p>
            <p><span className="text-muted-foreground">Depreciation:</span> {asset.depreciationMethod.replace("_", "-")}</p>
            {asset.linkedVendorId && <p><span className="text-muted-foreground">Linked vendor:</span> {asset.linkedVendorId} (stub)</p>}
            {asset.linkedInvoiceId && <p><span className="text-muted-foreground">Linked invoice:</span> {asset.linkedInvoiceId} (stub)</p>}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
