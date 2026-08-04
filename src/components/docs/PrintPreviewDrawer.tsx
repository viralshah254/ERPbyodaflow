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
import { downloadFile, isApiConfigured } from "@/lib/api/client";

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
  currency?: string;
  lines?: Array<{
    description: string;
    qty?: number;
    uom?: string;
    unitPrice?: number;
    discount?: number;
    amount?: number;
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

function buildPreviewHtml(doc: PrintPreviewDoc): string {
  const currency = doc.currency ?? "KES";
  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtNum = (n: number) =>
    n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const typeLabel =
    ({
      invoice: "TAX INVOICE",
      "credit-note": "CREDIT NOTE",
      "debit-note": "DEBIT NOTE",
      "sales-order": "SALES ORDER",
      "purchase-order": "PURCHASE ORDER",
      "delivery-note": "DELIVERY NOTE",
      quotation: "QUOTATION",
    } as Record<string, string>)[doc.type] ??
    doc.type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const lines = doc.lines ?? [];
  const total = doc.total ?? 0;
  const subtotal = doc.subtotal ?? total;
  const tax = doc.tax ?? 0;
  const hasAnyDiscount = lines.some((l) => (l.discount ?? 0) > 0);
  const totalQty = lines.reduce((s, l) => s + (l.qty ?? 0), 0);
  const docNumber = doc.number ?? doc.id;

  const lineRows = lines
    .map(
      (l, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#F5F7FA"}">
      <td style="padding:7px 8px;border-bottom:1px solid #D8DEE6;color:#555">${i + 1}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #D8DEE6">${l.description || "—"}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #D8DEE6;text-align:right">${l.qty != null ? l.qty.toLocaleString("en-KE") : "—"}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #D8DEE6;text-align:right">${l.uom ?? "—"}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #D8DEE6;text-align:right">${l.unitPrice != null ? fmtNum(l.unitPrice) : "—"}</td>
      ${hasAnyDiscount ? `<td style="padding:7px 8px;border-bottom:1px solid #D8DEE6;text-align:right">${l.discount ? `${l.discount}%` : "—"}</td>` : ""}
      <td style="padding:7px 8px;border-bottom:1px solid #D8DEE6;text-align:right;font-weight:700">${l.amount != null ? fmtNum(l.amount) : "—"}</td>
    </tr>`
    )
    .join("");

  const discountHeader = hasAnyDiscount ? "<th>Disc%</th>" : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 24px; }
    .header { background: #1E3A5F; color: white; padding: 16px 20px 12px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-accent { height: 4px; background: #2E6DA4; border-radius: 0 0 6px 6px; margin-bottom: 16px; }
    .org-name { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .org-sub { font-size: 10px; opacity: 0.85; }
    .doc-type { font-size: 15px; font-weight: 700; text-align: right; }
    .doc-meta { font-size: 10px; text-align: right; opacity: 0.9; margin-top: 4px; }
    .parties { display: flex; justify-content: space-between; gap: 16px; margin: 0 0 12px; }
    .bill-to { flex: 1; background: #E8EFF7; border: 1px solid #D8DEE6; border-left: 3px solid #2E6DA4; border-radius: 4px; padding: 10px 12px; }
    .bill-label { font-size: 9px; font-weight: 700; color: #1E3A5F; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .bill-name { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
    .bill-detail { font-size: 10px; color: #666; }
    .ref-box { border: 1.5px solid #1E3A5F; border-radius: 4px; padding: 10px 14px; min-width: 140px; align-self: flex-start; }
    .ref-label { font-size: 9px; color: #1E3A5F; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .ref-val { font-size: 12px; font-weight: 600; margin-top: 2px; }
    .summary-strip { font-size: 10px; color: #555; font-weight: 600; margin-bottom: 10px; }
    .facts { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 14px; }
    .fact { background: #F5F7FA; border: 1px solid #D8DEE6; border-radius: 4px; padding: 8px 10px; }
    .fact-label { font-size: 8px; font-weight: 700; color: #555; text-transform: uppercase; margin-bottom: 3px; }
    .fact-value { font-size: 11px; font-weight: 700; color: #111; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    thead tr { background: #1E3A5F; color: white; }
    th { padding: 8px; text-align: right; font-size: 10px; font-weight: 600; }
    th:nth-child(2) { text-align: left; }
    th:first-child { text-align: left; }
    .totals { display: flex; justify-content: flex-end; margin-top: 6px; }
    .totals-inner { width: 250px; }
    .total-row { display: flex; justify-content: space-between; padding: 4px 8px; font-size: 11px; color: #555; }
    .total-final { background: #1E3A5F; color: white; padding: 8px 10px; border-radius: 4px; display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; margin-top: 6px; }
    .footer { margin-top: 24px; border-top: 1px solid #ddd; padding-top: 10px; color: #888; font-size: 9px; text-align: center; }
    .notes { margin-top: 12px; font-size: 10px; color: #555; background: #E8EFF7; padding: 8px 10px; border-radius: 4px; border-left: 3px solid #2E6DA4; }
    @media print {
      body { padding: 10px; }
      .header, thead tr, .total-final, .header-accent { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="org-name">${doc.orgName ?? "OdaFlow ERP"}</div>
      <div class="org-sub">${doc.orgAddress ?? ""}</div>
      ${doc.orgTaxId ? `<div class="org-sub">KRA PIN: ${doc.orgTaxId}</div>` : ""}
    </div>
    <div>
      <div class="doc-type">${typeLabel}</div>
      <div class="doc-meta">No: ${docNumber}</div>
      ${doc.date ? `<div class="doc-meta">Date: ${doc.date}</div>` : ""}
      ${doc.dueDate ? `<div class="doc-meta">Due: ${doc.dueDate}</div>` : ""}
    </div>
  </div>
  <div class="header-accent"></div>
  <div class="facts">
    <div class="fact"><div class="fact-label">Document</div><div class="fact-value">${docNumber}</div></div>
    <div class="fact"><div class="fact-label">Customer</div><div class="fact-value">${doc.party ?? "—"}</div></div>
    <div class="fact"><div class="fact-label">Total</div><div class="fact-value">${fmt(total)}</div></div>
  </div>
  <div class="parties">
    <div class="bill-to">
      <div class="bill-label">Bill To</div>
      <div class="bill-name">${doc.party ?? "—"}</div>
      ${doc.partyEmail ? `<div class="bill-detail">${doc.partyEmail}</div>` : ""}
    </div>
    ${
      doc.reference
        ? `<div class="ref-box">
        <div class="ref-label">Reference</div>
        <div class="ref-val">${doc.reference}</div>
      </div>`
        : ""
    }
  </div>
  <div class="summary-strip">${lines.length} item${lines.length === 1 ? "" : "s"} · Qty ${totalQty.toLocaleString("en-KE")} · ${currency}</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:left">#</th>
        <th style="text-align:left">Description</th>
        <th>Qty</th>
        <th>UOM</th>
        <th>Unit Price</th>
        ${discountHeader}
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${lines.length === 0 ? `<tr><td colspan="${hasAnyDiscount ? 7 : 6}" style="padding:12px;text-align:center;color:#999">No line items</td></tr>` : lineRows}
    </tbody>
  </table>
  <div class="totals">
    <div class="totals-inner">
      <div class="total-row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
      ${tax > 0 ? `<div class="total-row"><span>Tax</span><span>${fmt(tax)}</span></div>` : ""}
      <div class="total-final"><span>TOTAL</span><span>${fmt(total)}</span></div>
    </div>
  </div>
  ${doc.notes ? `<div class="notes"><strong>Notes:</strong> ${doc.notes}</div>` : ""}
  <div class="footer">Generated by OdaFlow ERP · ${new Date().toLocaleDateString()}</div>
</body>
</html>`;
}

/** Styled HTML print preview inside an iframe, matching the professional PDF layout. */
export function PrintPreviewDrawer({
  open,
  onOpenChange,
  doc,
}: PrintPreviewDrawerProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const handleDownloadPDF = () => {
    if (!doc) {
      toast.info("No document selected for download.");
      onOpenChange(false);
      return;
    }
    if (isApiConfigured()) {
      downloadFile(
        `/api/documents/${encodeURIComponent(doc.type)}/${encodeURIComponent(doc.id)}/pdf`,
        `${doc.type}-${doc.number ?? doc.id}.pdf`,
        (msg) => toast.info(msg || "PDF not yet available.")
      );
      onOpenChange(false);
      return;
    }
    toast.info("PDF download requires API connection.");
  };

  const handleDownloadExcel = () => {
    if (!doc) {
      toast.info("No document selected for download.");
      onOpenChange(false);
      return;
    }
    if (isApiConfigured()) {
      downloadFile(
        `/api/documents/${encodeURIComponent(doc.type)}/${encodeURIComponent(doc.id)}/xlsx`,
        `${doc.type}-${doc.number ?? doc.id}.xlsx`,
        (msg) => toast.info(msg || "Excel export not yet available.")
      );
      onOpenChange(false);
      return;
    }
    toast.info("Excel download requires API connection.");
  };

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  const htmlContent = doc ? buildPreviewHtml(doc) : "";

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

        <div className="flex-1 overflow-auto p-4">
          {doc ? (
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              title="Document Preview"
              className="w-full rounded border bg-white"
              style={{ minHeight: "700px", height: "100%" }}
              sandbox="allow-same-origin allow-modals allow-scripts"
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No document selected
            </div>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={!doc}>
            <Icons.Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadExcel} disabled={!doc}>
            <Icons.Sheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={handleDownloadPDF} disabled={!doc}>
            <Icons.Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
