"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_TABLE_SURFACE_CLASS } from "@/components/layout/page-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
import type { DocTypeKey } from "@/config/documents/types";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

type PartyDocumentsKind = "customer" | "supplier";

const CUSTOMER_TYPES: Array<{ type: DocTypeKey; label: string }> = [
  { type: "invoice", label: "Invoice" },
  { type: "sales-order", label: "Sales order" },
  { type: "delivery-note", label: "Delivery note" },
  { type: "credit-note", label: "Credit note" },
  { type: "debit-note", label: "Debit note" },
];

const SUPPLIER_TYPES: Array<{ type: DocTypeKey; label: string }> = [
  { type: "bill", label: "Bill" },
  { type: "purchase-order", label: "Purchase order" },
  { type: "grn", label: "GRN" },
  { type: "purchase-credit-note", label: "Purchase credit note" },
  { type: "purchase-debit-note", label: "Purchase debit note" },
];

type CombinedDoc = {
  id: string;
  type: DocTypeKey;
  typeLabel: string;
  number: string;
  date: string;
  status: string;
  total?: number;
  currency?: string;
};

export function PartyDocumentsPanel(props: { kind: PartyDocumentsKind; partyId: string }) {
  const [rows, setRows] = React.useState<CombinedDoc[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    const types = props.kind === "customer" ? CUSTOMER_TYPES : SUPPLIER_TYPES;
    setLoading(true);
    Promise.all(
      types.map((entry) =>
        fetchDocumentListPageApi(entry.type, { partyId: props.partyId, limit: 25 })
          .then((page) =>
            page.items.map((item) => ({
              id: item.id,
              type: entry.type,
              typeLabel: entry.label,
              number: item.number,
              date: item.date,
              status: item.status,
              total: item.total,
              currency: item.currency,
            }))
          )
          .catch(() => [] as CombinedDoc[])
      )
    )
      .then((pages) => {
        if (cancelled) return;
        const merged = pages.flat().sort((a, b) => String(b.date).localeCompare(String(a.date)));
        setRows(merged);
      })
      .catch((error) => {
        if (!cancelled) toast.error((error as Error).message || "Failed to load documents");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [props.kind, props.partyId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading documents…</p>;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="Files"
        title="No documents for this party"
        description="Sales orders, invoices, bills, and receipts linked to this record will appear here."
      />
    );
  }

  return (
    <div className={LIST_TABLE_SURFACE_CLASS}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.type}-${row.id}`}>
              <TableCell>{row.date}</TableCell>
              <TableCell>
                <Badge variant="outline">{row.typeLabel}</Badge>
              </TableCell>
              <TableCell>
                <Link href={`/docs/${row.type}/${row.id}`} className="hover:underline">
                  {row.number}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="text-right">
                {row.total != null ? formatMoney(row.total, row.currency ?? "KES") : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
