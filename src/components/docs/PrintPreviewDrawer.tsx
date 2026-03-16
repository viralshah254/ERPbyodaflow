"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { downloadFile, downloadTextFile, isApiConfigured } from "@/lib/api/client";

export interface PrintPreviewDoc {
  type: string;
  id: string;
  title: string;
  date?: string;
  party?: string;
  total?: number;
  currency?: string;
  lines?: Array<{ description: string; qty?: number; amount?: number }>;
}

interface PrintPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: PrintPreviewDoc | null;
}

/** UI-only print preview: document header + lines + totals. */
export function PrintPreviewDrawer({
  open,
  onOpenChange,
  doc,
}: PrintPreviewDrawerProps) {
  const lines = doc?.lines ?? [
    { description: "Primary line item", qty: 1, amount: 10000 },
    { description: "Secondary line item", qty: 2, amount: 5000 },
  ];
  const total = doc?.total ?? 20000;
  const currency = doc?.currency ?? "KES";

  const handleDownloadPDF = () => {
    if (!doc) {
      toast.info("No document selected for download.");
      onOpenChange(false);
      return;
    }
    if (isApiConfigured()) {
      downloadFile(
        `/api/documents/${encodeURIComponent(doc.type)}/${encodeURIComponent(doc.id)}/pdf`,
        `${doc.type}-${doc.id}.pdf`,
        (msg) => toast.info(msg || "PDF not yet available.")
      );
      onOpenChange(false);
      return;
    }
    const preview = [
      `${doc.title}`,
      `Document: ${doc.type} ${doc.id}`,
      doc.date ? `Date: ${doc.date}` : "",
      doc.party ? `Party: ${doc.party}` : "",
      "",
      "Lines",
      ...lines.map((line) => `${line.description} | Qty: ${line.qty ?? "—"} | Amount: ${line.amount ?? "—"}`),
      "",
      `Total: ${total.toLocaleString()} ${currency}`,
    ]
      .filter(Boolean)
      .join("\n");
    downloadTextFile(`${doc.type}-${doc.id}-print-preview.txt`, preview);
    toast.success("Printable preview downloaded.");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Print preview</SheetTitle>
          <SheetDescription>
            {doc ? `${doc.type} ${doc.id}` : "Document"} — header, lines, totals, and printable export.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{doc?.title ?? "Document"}</p>
            {doc?.date && <p className="text-muted-foreground">Date: {doc.date}</p>}
            {doc?.party && <p className="text-muted-foreground">Party: {doc.party}</p>}
          </div>
          <div className="rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-16 text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.description}</TableCell>
                    <TableCell className="text-right">{l.qty ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {l.amount != null ? l.amount.toLocaleString() : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end text-sm font-medium">
            Total: {total.toLocaleString()} {currency}
          </div>
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownloadPDF}>
            <Icons.Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
