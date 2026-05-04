"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchFranchiseInboundOrderDetail,
  acceptInboundOrder,
  type FranchiseInboundOrderDetail,
} from "@/lib/api/cool-catch";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function FranchiseInboundOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const outletOrgId = decodeURIComponent(params.outletOrgId as string);
  const prId = decodeURIComponent(params.prId as string);
  const [doc, setDoc] = React.useState<FranchiseInboundOrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [accepting, setAccepting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchFranchiseInboundOrderDetail(outletOrgId, prId);
      setDoc(d);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load purchase request.");
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [outletOrgId, prId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleAccept = async () => {
    if (!doc) return;
    setAccepting(true);
    try {
      const result = await acceptInboundOrder(outletOrgId, prId);
      toast.success(`Sales order ${result.soNumber} created for ${result.outletName}.`);
      router.push(`/docs/sales-order/${result.soId}`);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to accept order.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div className="p-6 flex items-center gap-2 text-muted-foreground text-sm">
          <Icons.Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Loading purchase request…
        </div>
      </PageShell>
    );
  }

  if (!doc) {
    return (
      <PageShell>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">Purchase request not found.</p>
          <Button variant="outline" asChild>
            <Link href="/sales/orders">Back to Sales Orders</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const canAccept = doc.status !== "CONVERTED" && doc.status !== "CANCELLED";

  return (
    <PageShell>
      <PageHeader
        title={`${doc.number}`}
        description={`${doc.outletName} — inbound franchise order`}
        breadcrumbs={[
          { label: "Sales", href: "/sales/overview" },
          { label: "Sales Orders", href: "/sales/orders" },
          { label: doc.number },
        ]}
        sticky
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/sales/orders">
                <Icons.ArrowLeft className="h-4 w-4 mr-2" />
                Back to list
              </Link>
            </Button>
            {canAccept ? (
              <Button onClick={() => void handleAccept()} disabled={accepting}>
                {accepting ? (
                  <>
                    <Icons.Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting…
                  </>
                ) : (
                  <>
                    <Icons.CheckCircle className="h-4 w-4 mr-2" />
                    Accept → sales order
                  </>
                )}
              </Button>
            ) : doc.status === "CONVERTED" ? (
              <span className="text-sm text-muted-foreground">Already converted at HQ.</span>
            ) : null}
          </div>
        }
      />
      <div className="p-6 space-y-6 max-w-5xl">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex flex-wrap items-center gap-2">
              Summary
              <StatusBadge status={doc.status} />
            </CardTitle>
            <CardDescription>Purchase request on outlet org (HQ read-only).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <div className="text-muted-foreground">Outlet</div>
              <div className="font-medium">{doc.outletName}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Date</div>
              <div className="font-medium">{doc.date ?? "—"}</div>
            </div>
            {doc.supplierName ? (
              <div>
                <div className="text-muted-foreground">Supplier</div>
                <div className="font-medium">{doc.supplierName}</div>
              </div>
            ) : null}
            <div>
              <div className="text-muted-foreground">Total</div>
              <div className="font-medium">{formatMoney(doc.total, doc.currency, { decimals: 0 })}</div>
            </div>
          </CardContent>
        </Card>

        {doc.notes ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{doc.notes}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lines</CardTitle>
            <CardDescription>{doc.lines.length} line(s)</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[28%]">Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price ({doc.currency})</TableHead>
                  <TableHead className="text-right">Amount ({doc.currency})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doc.lines.map((line, idx) => (
                  <TableRow key={`${line.productId ?? "line"}-${idx}`}>
                    <TableCell>
                      <span className="font-medium">{line.productName ?? line.description ?? "—"}</span>
                      {line.description && line.description !== line.productName ? (
                        <span className="block text-xs text-muted-foreground">{line.description}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{line.sku ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.quantity}
                      {line.unit ? (
                        <span className="text-muted-foreground text-xs ml-1">{line.unit}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(line.unitPrice, doc.currency, { decimals: 0 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(line.amount, doc.currency, { decimals: 0 })}
                    </TableCell>
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
