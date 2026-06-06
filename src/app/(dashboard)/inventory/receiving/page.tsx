"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProcurementVariancePanel } from "@/components/operational/ProcurementVariancePanel";
import { fetchCashWeightAuditLinesPage } from "@/lib/api/cool-catch";
import { toast } from "sonner";

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type ReceivingQueueRow = {
  id: string;
  poNumber: string;
  poId: string | null;
  grnId: string | null;
  sku: string;
  productName: string;
  expectedWeightKg: number;
  paidWeightKg: number | null;
  receivedWeightKg: number | null;
  status: "PENDING" | "VARIANCE" | "MATCHED";
};

export default function InventoryReceivingQueuePage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<ReceivingQueueRow[]>([]);
  const [totals, setTotals] = React.useState({ orderedQty: 0, paidWeightKg: 0, receivedWeightKg: 0 });
  const [pageOffset, setPageOffset] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [fetching, setFetching] = React.useState(false);
  const hasLoadedOnce = React.useRef(false);

  const loadPage = React.useCallback(
    async (offset: number) => {
      const isFirstLoad = !hasLoadedOnce.current;
      if (isFirstLoad) setInitialLoading(true);
      else setFetching(true);
      try {
        const page = await fetchCashWeightAuditLinesPage({
          limit: pageSize,
          cursor: String(offset),
        });
        setRows(
          page.items.map((d) => ({
            id: d.id,
            poNumber: d.poNumber,
            poId: d.poId ?? null,
            grnId: d.grnId ?? null,
            sku: d.sku,
            productName: d.productName,
            expectedWeightKg: d.orderedQty,
            paidWeightKg: d.paidWeightKg,
            receivedWeightKg: d.receivedWeightKg,
            status: d.status,
          }))
        );
        setTotals(page.totals);
        setPageOffset(page.offset);
        setTotalCount(page.total);
        setHasMore(page.hasMore);
        hasLoadedOnce.current = true;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load receiving queue.");
      } finally {
        setInitialLoading(false);
        setFetching(false);
      }
    },
    [pageSize]
  );

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const columns = [
    { id: "po", header: "PO", accessor: (r: ReceivingQueueRow) => r.poNumber, sticky: true },
    {
      id: "sku",
      header: "SKU",
      accessor: (r: ReceivingQueueRow) => (
        <div>
          <div className="font-medium">{r.sku}</div>
          <div className="text-xs text-muted-foreground">{r.productName}</div>
        </div>
      ),
    },
    { id: "expected", header: "Expected kg", accessor: (r: ReceivingQueueRow) => r.expectedWeightKg },
    { id: "paid", header: "Paid kg", accessor: (r: ReceivingQueueRow) => r.paidWeightKg ?? "\u2014" },
    { id: "received", header: "Received kg", accessor: (r: ReceivingQueueRow) => r.receivedWeightKg ?? "\u2014" },
    {
      id: "status",
      header: "Status",
      accessor: (r: ReceivingQueueRow) => (
        <Badge variant={r.status === "VARIANCE" ? "destructive" : r.status === "MATCHED" ? "default" : "secondary"}>
          {r.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      accessor: (r: ReceivingQueueRow) => (
        <div className="flex gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          {r.grnId && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/inventory/receipts/${r.grnId}`}>Open GRN</Link>
            </Button>
          )}
          {r.poId && (
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/purchasing/cash-weight-audit?poId=${r.poId}`}>Audit</Link>
            </Button>
          )}
        </div>
      ),
    },
  ];

  const loading = initialLoading || fetching;

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Receiving Queue"
        description="Queue of inbound lines awaiting weigh-in or variance resolution."
        breadcrumbs={[{ label: "Inventory", href: "/inventory/receipts" }, { label: "Receiving Queue" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/purchasing/cash-weight-audit">Cash-to-Weight Audit</Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/receipts">Open GRN List</Link>
            </Button>
          </div>
        }
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="mb-6">
          <ProcurementVariancePanel
            poWeightKg={totals.orderedQty}
            paidWeightKg={totals.paidWeightKg}
            receivedWeightKg={totals.receivedWeightKg}
          />
        </div>
        <div className="relative flex min-h-0 flex-col rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Inbound receiving queue</h3>
            <p className="text-xs text-muted-foreground">Rows marked as variance should be reviewed before posting final receipt.</p>
          </div>
          {initialLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading receiving queue\u2026</div>
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              onRowClick={(row) =>
                row.grnId
                  ? router.push(`/inventory/receipts/${row.grnId}`)
                  : router.push("/inventory/receipts")
              }
              emptyMessage="No receiving queue rows."
              scrollMode="natural"
              size="comfortable"
            />
          )}
        </div>
        <TablePagination
          className="mt-4"
          pageOffset={pageOffset}
          pageSize={pageSize}
          itemCount={rows.length}
          totalCount={totalCount || undefined}
          hasMore={hasMore}
          loading={loading}
          onPrevious={() => {
            if (pageOffset <= 0 || loading) return;
            void loadPage(Math.max(0, pageOffset - pageSize));
          }}
          onNext={() => {
            if (!hasMore || loading) return;
            void loadPage(pageOffset + pageSize);
          }}
          entityLabel="rows"
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageOffset(0);
          }}
        />
      </div>
    </PageShell>
  );
}
