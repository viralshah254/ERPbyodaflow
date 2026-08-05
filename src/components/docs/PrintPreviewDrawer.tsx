"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { downloadFile, downloadProgressLabel, fetchApiBinary, isApiConfigured } from "@/lib/api/client";
import { documentExportFileName } from "@/lib/documents/export-filename";
import { resolveSalesUomQty } from "@/lib/documents/sales-uom-qty";

export interface PrintPreviewDoc {
  type: string;
  id: string;
  title: string;
  number?: string;
  date?: string;
  dueDate?: string;
  party?: string;
  partyEmail?: string;
  reference?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  /** Document-level discount amount (money), when offered. */
  discount?: number;
  currency?: string;
  lines?: Array<{
    description: string;
    qty?: number;
    uom?: string;
    unitPrice?: number;
    /** Line discount percent when offered. */
    discount?: number;
    amount?: number;
    tax?: number;
  }>;
  orgName?: string;
  orgAddress?: string;
  orgTaxId?: string;
  notes?: string;
}

interface PrintPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: PrintPreviewDoc | null;
}

/** @deprecated Use resolveSalesUomQty — kept for call-site compatibility. */
export function resolvePrintLineQty(line: {
  qty?: number;
  uom?: string;
  unitPrice?: number;
  amount?: number;
  tax?: number;
}): number {
  return resolveSalesUomQty(line);
}

function pdfApiPath(doc: PrintPreviewDoc): string {
  return `/api/documents/${encodeURIComponent(doc.type)}/${encodeURIComponent(doc.id)}/pdf`;
}

function pdfFileName(doc: PrintPreviewDoc): string {
  return documentExportFileName({
    type: doc.type,
    number: doc.number,
    partyName: doc.party && doc.party !== "—" ? doc.party : undefined,
    ext: "pdf",
  });
}

/**
 * Preview + print use the backend PDFKit file (same as Download PDF).
 * Client only fetches bytes and displays them — it does not generate the PDF.
 */
export function PrintPreviewDrawer({
  open,
  onOpenChange,
  doc,
}: PrintPreviewDrawerProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const blobUrlRef = React.useRef<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = React.useState<Blob | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [pdfDownloading, setPdfDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const revokeBlobUrl = React.useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (!open || !doc) {
      revokeBlobUrl();
      setPdfUrl(null);
      setPdfBlob(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!isApiConfigured()) {
      setError("API not configured — cannot load PDF preview.");
      setPdfUrl(null);
      setPdfBlob(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    revokeBlobUrl();
    setPdfUrl(null);
    setPdfBlob(null);

    void (async () => {
      try {
        const blob = await fetchApiBinary(pdfApiPath(doc));
        if (cancelled) return;
        if (!blob || blob.size === 0) {
          setError("Could not load PDF from server.");
          setLoading(false);
          return;
        }
        const typed =
          blob.type && blob.type.includes("pdf")
            ? blob
            : new Blob([blob], { type: "application/pdf" });
        const url = URL.createObjectURL(typed);
        blobUrlRef.current = url;
        setPdfBlob(typed);
        setPdfUrl(url);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load PDF.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, doc?.type, doc?.id, reloadKey, revokeBlobUrl]);

  React.useEffect(() => () => revokeBlobUrl(), [revokeBlobUrl]);

  const handleDownloadPDF = async () => {
    if (!doc || pdfDownloading) {
      if (!doc) toast.info("No document selected for download.");
      return;
    }
    if (pdfBlob && pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = pdfFileName(doc);
      a.click();
      toast.success("PDF downloaded.");
      return;
    }
    if (!isApiConfigured()) {
      toast.info("PDF download requires API connection.");
      return;
    }

    const toastId = toast.loading("Preparing PDF…");
    setPdfDownloading(true);
    try {
      const ok = await downloadFile(
        pdfApiPath(doc),
        pdfFileName(doc),
        (msg) => toast.error(msg || "PDF not yet available.", { id: toastId }),
        (update) => toast.loading(downloadProgressLabel(update), { id: toastId })
      );
      if (ok) toast.success("PDF downloaded.", { id: toastId });
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleDownloadExcel = () => {
    if (!doc) {
      toast.info("No document selected for download.");
      return;
    }
    if (isApiConfigured()) {
      void downloadFile(
        `/api/documents/${encodeURIComponent(doc.type)}/${encodeURIComponent(doc.id)}/xlsx`,
        documentExportFileName({
          type: doc.type,
          number: doc.number,
          partyName: doc.party && doc.party !== "—" ? doc.party : undefined,
          ext: "xlsx",
        }),
        (msg) => toast.info(msg || "Excel export not yet available.")
      );
      return;
    }
    toast.info("Excel download requires API connection.");
  };

  const handlePrint = () => {
    if (!pdfUrl) {
      toast.info(error || "PDF is still loading.");
      return;
    }

    const frame = iframeRef.current;
    try {
      if (frame?.contentWindow) {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        return;
      }
    } catch {
      /* PDF plugin may block print on the iframe */
    }

    const w = window.open(pdfUrl, "_blank");
    if (!w) {
      toast.info("Allow pop-ups to print, or use Download PDF.");
      return;
    }
    const tryPrint = () => {
      try {
        w.focus();
        w.print();
      } catch {
        /* user can print from the opened tab */
      }
    };
    w.addEventListener("load", () => setTimeout(tryPrint, 300));
    setTimeout(tryPrint, 600);
  };

  const canPrint = Boolean(doc) && !loading && Boolean(pdfUrl);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Icons.FileText className="h-4 w-4" />
            Print Preview
          </SheetTitle>
          {doc && (
            <p className="text-xs text-muted-foreground">
              {doc.title} · {doc.type} #{doc.number ?? doc.id}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4 min-h-0">
          {!doc ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No document selected
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
              <Icons.Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Loading PDF from server…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
              <Icons.AlertCircle className="h-6 w-6 text-rose-500" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
                Retry
              </Button>
            </div>
          ) : pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              title="Document PDF Preview"
              className="w-full rounded border bg-white"
              style={{ minHeight: "700px", height: "100%" }}
            />
          ) : null}
        </div>

        <SheetFooter className="px-6 py-4 border-t gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={!canPrint}>
            <Icons.Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadExcel} disabled={!doc}>
            <Icons.Sheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={() => void handleDownloadPDF()} disabled={!doc || loading || pdfDownloading}>
            {pdfDownloading ? (
              <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.Download className="mr-2 h-4 w-4" />
            )}
            {pdfDownloading ? "Downloading…" : "PDF"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
