"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KraSigningBadge } from "@/components/kra/KraSigningBadge";
import { retryIncotexDocumentApi } from "@/lib/api/incotex";
import {
  docTypeLabel,
  isIncotexSignableDocType,
  canRetryKraSigning,
  kraRetryButtonLabel,
  type IncotexSignableDocType,
  type KraSigningRecord,
} from "@/lib/kra/kra-signing";
import { toast } from "sonner";
import * as Icons from "lucide-react";

type KraSigningPanelProps = {
  typeKey: string;
  documentId: string;
  documentStatus?: string;
  kraSigning?: KraSigningRecord | null;
  onUpdated?: (kraSigning: KraSigningRecord) => void;
  canRetry?: boolean;
};

export function KraSigningPanel({
  typeKey,
  documentId,
  documentStatus,
  kraSigning,
  onUpdated,
  canRetry = false,
}: KraSigningPanelProps) {
  const [retrying, setRetrying] = React.useState(false);

  if (!isIncotexSignableDocType(typeKey)) return null;
  if (String(documentStatus ?? "").toUpperCase() !== "POSTED") return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const { kraSigning: next } = await retryIncotexDocumentApi(
        typeKey as IncotexSignableDocType,
        documentId
      );
      onUpdated?.(next);
      if (next.status === "signed") {
        toast.success("KRA signing succeeded.");
      } else if (next.status === "pending") {
        toast.message("Document queued for KRA signing.");
      } else if (next.status === "failed") {
        toast.error(next.errorMessage || "KRA signing declined.");
      } else {
        toast.success("Retry submitted.");
      }
    } catch (e) {
      toast.error((e as Error).message || "Retry failed.");
    } finally {
      setRetrying(false);
    }
  };

  const showRetry = canRetry && canRetryKraSigning(kraSigning);
  const retryLabel = kraRetryButtonLabel(kraSigning);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icons.ShieldCheck className="h-4 w-4" />
          KRA / Incotex
        </CardTitle>
        <CardDescription>
          {docTypeLabel(typeKey)} transmission status to KRA via Incotex.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground mb-1">Signing status</p>
            <KraSigningBadge kraSigning={kraSigning} documentStatus={documentStatus} />
          </div>
          {showRetry ? (
            <Button size="sm" variant="outline" disabled={retrying} onClick={() => void handleRetry()}>
              {retrying ? "Sending…" : retryLabel}
            </Button>
          ) : null}
        </div>

        {kraSigning?.status === "signed" ? (
          <dl className="grid gap-2 border-t pt-3">
            {kraSigning.cuInvoiceNumber ? (
              <div>
                <dt className="text-muted-foreground">CU invoice number</dt>
                <dd className="font-mono">{kraSigning.cuInvoiceNumber}</dd>
              </div>
            ) : null}
            {kraSigning.cuSerialNumber ? (
              <div>
                <dt className="text-muted-foreground">CU serial</dt>
                <dd className="font-mono">{kraSigning.cuSerialNumber}</dd>
              </div>
            ) : null}
            {kraSigning.signedAt ? (
              <div>
                <dt className="text-muted-foreground">Signed at</dt>
                <dd>{new Date(kraSigning.signedAt).toLocaleString()}</dd>
              </div>
            ) : null}
            {kraSigning.verifyUrl ? (
              <div>
                <dt className="text-muted-foreground">Verify on KRA</dt>
                <dd>
                  <Link
                    href={kraSigning.verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline break-all"
                  >
                    Open verification link
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {kraSigning?.status === "failed" && kraSigning.errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="font-medium text-destructive mb-1">Decline reason</p>
            <p className="text-sm whitespace-pre-wrap break-words">{kraSigning.errorMessage}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Fix the document or pricing totals, then retry. Share this message with support if the issue persists.
            </p>
          </div>
        ) : null}

        {kraSigning?.status === "pending" ? (
          <p className="text-muted-foreground text-sm border-t pt-3">
            Waiting in the signing queue. Refresh this page in a moment, or use Retry if it stays queued.
          </p>
        ) : null}

        {!kraSigning ? (
          <p className="text-muted-foreground text-sm border-t pt-3">
            No KRA signing record yet — the document was likely posted before Incotex was enabled, or signing did not run.
            Use <strong>{retryLabel}</strong> to submit it now.
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground border-t pt-3">
          Monitor all queued and declined documents on{" "}
          <Link href="/finance/kra-signing" className="text-primary underline-offset-4 hover:underline">
            KRA signing monitor
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
