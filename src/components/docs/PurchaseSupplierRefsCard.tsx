"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { patchDocumentApi } from "@/lib/api/documents";
import type { DocTypeKey } from "@/config/documents/types";
import { toast } from "sonner";

type PurchaseSupplierRefsCardProps = {
  documentId: string;
  type: DocTypeKey;
  supplierInvoiceNumber?: string;
  supplierCuInvoiceNumber?: string;
  canWrite: boolean;
  onSaved: () => Promise<void> | void;
};

export function PurchaseSupplierRefsCard({
  documentId,
  type,
  supplierInvoiceNumber,
  supplierCuInvoiceNumber,
  canWrite,
  onSaved,
}: PurchaseSupplierRefsCardProps) {
  const [invoiceNo, setInvoiceNo] = React.useState(supplierInvoiceNumber ?? "");
  const [cuNo, setCuNo] = React.useState(supplierCuInvoiceNumber ?? "");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setInvoiceNo(supplierInvoiceNumber ?? "");
    setCuNo(supplierCuInvoiceNumber ?? "");
  }, [documentId, supplierInvoiceNumber, supplierCuInvoiceNumber]);

  const dirty =
    invoiceNo.trim() !== (supplierInvoiceNumber ?? "").trim() ||
    cuNo.trim() !== (supplierCuInvoiceNumber ?? "").trim();

  return (
    <div className="mt-4 pt-4 border-t space-y-3 max-w-3xl">
      <div>
        <p className="text-sm font-medium">Supplier tax invoice</p>
        <p className="text-xs text-muted-foreground">
          Type both numbers from the supplier’s tax invoice. The CU number is the KRA Control Unit number. Purchase match compares that CU against the KRA purchase file.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplier-invoice-number">Supplier invoice no.</Label>
          <Input
            id="supplier-invoice-number"
            value={invoiceNo}
            onChange={(event) => setInvoiceNo(event.target.value)}
            disabled={!canWrite || saving}
            className="font-mono"
            placeholder="Invoice number on their invoice"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier-cu-number">Supplier CU number</Label>
          <Input
            id="supplier-cu-number"
            value={cuNo}
            onChange={(event) => setCuNo(event.target.value)}
            disabled={!canWrite || saving}
            className="font-mono"
            placeholder="CU number on their invoice"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {canWrite ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!dirty || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await patchDocumentApi(type, documentId, {
                  supplierInvoiceNumber: invoiceNo.trim(),
                  supplierCuInvoiceNumber: cuNo.trim(),
                });
                await onSaved();
                toast.success("Supplier invoice numbers saved.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save supplier invoice numbers.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : "Save supplier numbers"}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/reports/kra-cu">Compare with KRA</Link>
        </Button>
      </div>
    </div>
  );
}
