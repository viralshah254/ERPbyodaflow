"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchKraCuRegisterApi,
  matchKraPurchasesApi,
  type KraCuRegister,
  type KraPurchaseMatchResult,
} from "@/lib/api/kra-cu";
import { downloadCsv } from "@/lib/export/csv";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

function CuCell({ value }: { value?: string }) {
  const text = value?.trim();
  if (!text) return <span className="text-muted-foreground">—</span>;
  return <span className="font-mono text-xs">{text}</span>;
}

export default function KraCuReportPage() {
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [register, setRegister] = React.useState<KraCuRegister | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [csvText, setCsvText] = React.useState("");
  const [matching, setMatching] = React.useState(false);
  const [match, setMatch] = React.useState<KraPurchaseMatchResult | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setRegister(
        await fetchKraCuRegisterApi({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        })
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load KRA CU numbers.");
      setRegister(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell>
      <PageHeader
        title="KRA CU numbers"
        description="Invoice number and KRA Control Unit number together, for sales and purchases."
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "KRA CU numbers" },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/finance/kra-signing">KRA signing monitor</Link>
          </Button>
        }
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Period</CardTitle>
            <CardDescription>
              Sales CU numbers come from KRA signing. Purchase CU numbers are typed on the supplier bill.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="kra-from">From</Label>
              <Input id="kra-from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kra-to">To</Label>
              <Input id="kra-to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </div>
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Sales</CardTitle>
              <CardDescription>
                {register ? `${register.sales.length} of ${register.salesTotal} sales documents` : "Invoices, credit notes, and debit notes"}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!register?.sales.length}
              onClick={() =>
                downloadCsv(
                  `kra-cu-sales-${new Date().toISOString().slice(0, 10)}.csv`,
                  (register?.sales ?? []).map((row) => ({
                    number: row.number,
                    cuInvoiceNumber: row.cuInvoiceNumber ?? "",
                    date: row.date ?? "",
                    customer: row.party ?? "",
                    total: row.total ?? "",
                    status: row.status ?? "",
                    type: row.typeKey,
                  }))
                )
              }
            >
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <RegisterTable
              rows={register?.sales ?? []}
              loading={loading}
              partyLabel="Customer"
              empty="No sales documents in this period."
              hrefFor={(id, typeKey) => `/docs/${typeKey}/${id}`}
              invoiceLabel="Invoice number"
              secondLabel="CU number"
              secondValue={(row) => row.cuInvoiceNumber}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Purchases</CardTitle>
              <CardDescription>
                {register
                  ? `${register.purchases.length} of ${register.purchaseTotal} supplier bills`
                  : "Supplier invoice number and CU number typed on the bill"}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!register?.purchases.length}
              onClick={() =>
                downloadCsv(
                  `kra-cu-purchases-${new Date().toISOString().slice(0, 10)}.csv`,
                  (register?.purchases ?? []).map((row) => ({
                    billNumber: row.number,
                    supplierInvoiceNumber: row.supplierInvoiceNumber ?? "",
                    supplierCuInvoiceNumber: row.supplierCuInvoiceNumber ?? "",
                    date: row.date ?? "",
                    supplier: row.party ?? "",
                    total: row.total ?? "",
                    status: row.status ?? "",
                  }))
                )
              }
            >
              Export
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill number</TableHead>
                  <TableHead>Supplier invoice no.</TableHead>
                  <TableHead>CU number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">Loading purchases…</TableCell>
                  </TableRow>
                ) : (register?.purchases.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">No supplier bills in this period.</TableCell>
                  </TableRow>
                ) : (
                  register?.purchases.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link href={`/docs/${row.typeKey}/${row.id}`} className="font-medium hover:underline">
                          {row.number}
                        </Link>
                      </TableCell>
                      <TableCell><CuCell value={row.supplierInvoiceNumber} /></TableCell>
                      <TableCell><CuCell value={row.supplierCuInvoiceNumber} /></TableCell>
                      <TableCell>{row.date ?? "—"}</TableCell>
                      <TableCell>{row.party ?? "—"}</TableCell>
                      <TableCell className="text-right">{row.total != null ? formatMoney(row.total, "KES") : "—"}</TableCell>
                      <TableCell>{row.status ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compare purchases with KRA</CardTitle>
            <CardDescription>
              Paste the purchase list from KRA, or upload the CSV. The first column, or a column named CU invoice number, is matched to the CU typed on each bill.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kra-csv">KRA purchase file</Label>
              <Textarea
                id="kra-csv"
                value={csvText}
                onChange={(event) => setCsvText(event.target.value)}
                rows={6}
                className="font-mono text-xs"
                placeholder={"CU invoice number,Supplier invoice number,Supplier,Amount,Date\n0090081320000142820,INV-14,Flour Mill,12000,2026-10-01"}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="max-w-sm"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setCsvText(await file.text());
                }}
              />
              <Button
                type="button"
                disabled={matching || !csvText.trim()}
                onClick={async () => {
                  setMatching(true);
                  try {
                    setMatch(await matchKraPurchasesApi(csvText));
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Could not compare the KRA file.");
                  } finally {
                    setMatching(false);
                  }
                }}
              >
                {matching ? "Comparing…" : "Compare"}
              </Button>
            </div>
            {match ? <MatchSummary match={match} /> : null}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function RegisterTable({
  rows,
  loading,
  partyLabel,
  empty,
  hrefFor,
  invoiceLabel,
  secondLabel,
  secondValue,
}: {
  rows: Array<{ id: string; typeKey: string; number: string; date?: string; party?: string; total?: number; status?: string; cuInvoiceNumber?: string }>;
  loading: boolean;
  partyLabel: string;
  empty: string;
  hrefFor: (id: string, typeKey: string) => string;
  invoiceLabel: string;
  secondLabel: string;
  secondValue: (row: { cuInvoiceNumber?: string }) => string | undefined;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{invoiceLabel}</TableHead>
          <TableHead>{secondLabel}</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>{partyLabel}</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-muted-foreground">Loading…</TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-muted-foreground">{empty}</TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <Link href={hrefFor(row.id, row.typeKey)} className="font-medium hover:underline">
                  {row.number}
                </Link>
              </TableCell>
              <TableCell><CuCell value={secondValue(row)} /></TableCell>
              <TableCell>{row.date ?? "—"}</TableCell>
              <TableCell>{row.party ?? "—"}</TableCell>
              <TableCell className="text-right">{row.total != null ? formatMoney(row.total, "KES") : "—"}</TableCell>
              <TableCell>{row.status ?? "—"}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function MatchSummary({ match }: { match: KraPurchaseMatchResult }) {
  return (
    <div className="space-y-4">
      {match.truncated ? (
        <p className="text-sm text-muted-foreground">
          The comparison used the latest supplier bills. Older bills were left out of this run.
        </p>
      ) : null}
      <p className="text-sm">
        {match.matched.length} matched · {match.erpOnly.length} on bills only · {match.kraOnly.length} in the KRA file only · {match.missingCu.length} bills missing a CU · {match.duplicates.length} duplicate CU
      </p>
      <MatchBlock
        title="Matched"
        rows={match.matched.map((row) => ({
          key: row.bill.id,
          href: `/docs/${row.bill.typeKey ?? "bill"}/${row.bill.id}`,
          left: row.bill.number,
          cu: row.bill.supplierCuInvoiceNumber,
          extra: row.kra.supplierInvoiceNumber || row.bill.supplierName,
        }))}
      />
      <MatchBlock
        title="On a bill, not in this KRA file"
        rows={match.erpOnly.map((bill) => ({
          key: bill.id,
          href: `/docs/${bill.typeKey ?? "bill"}/${bill.id}`,
          left: bill.number,
          cu: bill.supplierCuInvoiceNumber,
          extra: bill.supplierName,
        }))}
      />
      <MatchBlock
        title="In the KRA file, not on a bill"
        rows={match.kraOnly.map((row) => ({
          key: row.cuInvoiceNumber,
          left: row.supplierInvoiceNumber || "—",
          cu: row.cuInvoiceNumber,
          extra: row.supplierName,
        }))}
      />
      <MatchBlock
        title="Bills still missing a CU number"
        rows={match.missingCu.map((bill) => ({
          key: bill.id,
          href: `/docs/${bill.typeKey ?? "bill"}/${bill.id}`,
          left: bill.number,
          cu: "",
          extra: bill.supplierName,
        }))}
      />
    </div>
  );
}

function MatchBlock({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; href?: string; left: string; cu?: string; extra?: string }>;
}) {
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice / bill</TableHead>
            <TableHead>CU number</TableHead>
            <TableHead>Supplier</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.slice(0, 100).map((row) => (
            <TableRow key={row.key}>
              <TableCell>
                {row.href ? (
                  <Link href={row.href} className="font-medium hover:underline">{row.left}</Link>
                ) : (
                  row.left
                )}
              </TableCell>
              <TableCell><CuCell value={row.cu} /></TableCell>
              <TableCell>{row.extra ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length > 100 ? (
        <p className="mt-2 text-xs text-muted-foreground">Showing the first 100 of {rows.length}.</p>
      ) : null}
    </div>
  );
}
