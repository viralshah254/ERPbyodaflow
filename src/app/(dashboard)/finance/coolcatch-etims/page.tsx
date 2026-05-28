"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { issueEtimsReceipt, retryEtimsQueue } from "@/lib/api/coolcatch-gap";
import { toast } from "sonner";

export default function CoolcatchEtimsPage() {
  const [sourceType, setSourceType] = React.useState<"invoice" | "sales-order">("invoice");
  const [sourceDocumentId, setSourceDocumentId] = React.useState("");
  const [receiptType, setReceiptType] = React.useState<"GENERIC" | "ETIMS">("ETIMS");
  const [issuing, setIssuing] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<{
    fiscalReceiptNumber?: string;
    fiscalPin?: string;
    qrPayload?: string;
  } | null>(null);

  const handleIssue = async () => {
    const id = sourceDocumentId.trim();
    if (!id) {
      toast.error("Enter a sales order or invoice document id.");
      return;
    }
    setIssuing(true);
    setLastResult(null);
    try {
      const result = await issueEtimsReceipt({
        sourceType,
        sourceDocumentId: id,
        receiptType,
      });
      setLastResult(result);
      toast.success(
        result.fiscalReceiptNumber
          ? `Fiscal receipt ${result.fiscalReceiptNumber}`
          : "Receipt issued."
      );
    } catch (e) {
      toast.error((e as Error).message || "eTIMS issue failed.");
    } finally {
      setIssuing(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const { retried } = await retryEtimsQueue();
      toast.success(`Retried ${retried} queued receipt(s).`);
    } catch (e) {
      toast.error((e as Error).message || "Retry queue failed.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="CoolCatch eTIMS"
        description="Issue fiscal receipts and retry failed KRA transmissions."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "eTIMS" }]}
        sticky
      />
      <div className="p-6 space-y-6 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Issue receipt</CardTitle>
            <CardDescription>
              Franchise POS and institutional invoices. Production requires{" "}
              <code className="text-xs">ETIMS_API_URL</code> and{" "}
              <code className="text-xs">ETIMS_API_KEY</code> on the API (stub when unset).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Source type</Label>
              <Select
                value={sourceType}
                onValueChange={(v) => setSourceType(v as "invoice" | "sales-order")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="sales-order">Sales order</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-id">Document id</Label>
              <Input
                id="doc-id"
                value={sourceDocumentId}
                onChange={(e) => setSourceDocumentId(e.target.value)}
                placeholder="Paste document id"
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt type</Label>
              <Select
                value={receiptType}
                onValueChange={(v) => setReceiptType(v as "GENERIC" | "ETIMS")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETIMS">eTIMS (KRA)</SelectItem>
                  <SelectItem value="GENERIC">Generic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void handleIssue()} disabled={issuing}>
              {issuing ? "Issuing…" : "Issue receipt"}
            </Button>
            {lastResult ? (
              <div className="rounded-md border p-3 text-sm space-y-1">
                {lastResult.fiscalReceiptNumber ? (
                  <p>
                    <span className="text-muted-foreground">Fiscal #:</span>{" "}
                    {lastResult.fiscalReceiptNumber}
                  </p>
                ) : null}
                {lastResult.fiscalPin ? (
                  <p>
                    <span className="text-muted-foreground">PIN:</span> {lastResult.fiscalPin}
                  </p>
                ) : null}
                {lastResult.qrPayload ? (
                  <p className="break-all text-xs">{lastResult.qrPayload}</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retry queue</CardTitle>
            <CardDescription>Process queued receipts after KRA API timeouts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void handleRetry()} disabled={retrying}>
              {retrying ? "Retrying…" : "Retry queued receipts"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
