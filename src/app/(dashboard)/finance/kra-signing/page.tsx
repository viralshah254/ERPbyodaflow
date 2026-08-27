"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  LIST_TABLE_SURFACE_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { KraSigningBadge } from "@/components/kra/KraSigningBadge";
import {
  fetchIncotexMonitorApi,
  retryIncotexQueueApi,
  type IncotexMonitorRow,
  type IncotexMonitorStatusFilter,
} from "@/lib/api/incotex";
import { retryEtimsQueueApi, retryKraDocumentApi, retryKraQueueApi } from "@/lib/api/kra-integration";
import { formatMoney } from "@/lib/money";
import {
  docTypeLabel,
  canRetryKraSigning,
  kraRetryButtonLabel,
  type IncotexSignableDocType,
} from "@/lib/kra/kra-signing";
import { TablePagination } from "@/components/ui/table-pagination";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Not sent", value: "not_sent" },
  { label: "In queue", value: "pending" },
  { label: "Signed", value: "signed" },
  { label: "Declined", value: "failed" },
  { label: "Skipped", value: "skipped" },
];

const TYPE_OPTIONS = [
  { label: "All types", value: "all" },
  { label: "Invoices", value: "invoice" },
  { label: "Credit notes", value: "credit-note" },
  { label: "Debit notes", value: "debit-note" },
];

const PROVIDER_OPTIONS = [
  { label: "All providers", value: "all" },
  { label: "Incotex", value: "incotex" },
  { label: "eTIMS OSCU", value: "etims_oscu" },
];

export default function KraSigningMonitorPage() {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [providerFilter, setProviderFilter] = React.useState("all");
  const [rows, setRows] = React.useState<IncotexMonitorRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [pageOffset, setPageOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);
  const [retryingQueue, setRetryingQueue] = React.useState(false);

  const loadPage = React.useCallback(async (offset: number) => {
    setLoading(true);
    try {
      const result = await fetchIncotexMonitorApi({
        status: statusFilter as IncotexMonitorStatusFilter,
        typeKey: typeFilter as IncotexSignableDocType | "all",
        provider: providerFilter as "all" | "incotex" | "etims_oscu",
        limit: PAGE_SIZE,
        offset,
      });
      setRows(result.items);
      setTotal(result.total);
      setPageOffset(offset);
    } catch (e) {
      toast.error((e as Error).message || "Failed to load KRA signing monitor.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, providerFilter]);

  React.useEffect(() => {
    void loadPage(0);
  }, [loadPage]);

  const handleRetryRow = async (row: IncotexMonitorRow) => {
    setRetryingId(row.id);
    try {
      const { kraSigning } = await retryKraDocumentApi(row.typeKey, row.id);
      await loadPage(pageOffset);
      if (kraSigning.status === "signed") {
        toast.success(`${row.number} signed with KRA.`);
      } else if (kraSigning.status === "failed") {
        toast.error(kraSigning.errorMessage || `${row.number} declined again.`);
      } else {
        toast.message(`${row.number} queued for signing.`);
      }
    } catch (e) {
      toast.error((e as Error).message || "Retry failed.");
    } finally {
      setRetryingId(null);
    }
  };

  const handleRetryQueue = async () => {
    setRetryingQueue(true);
    try {
      const { retried } =
        providerFilter === "etims_oscu"
          ? await retryEtimsQueueApi()
          : providerFilter === "incotex"
            ? await retryIncotexQueueApi()
            : await retryKraQueueApi();
      await loadPage(pageOffset);
      toast.success(`Retried ${retried} declined document(s).`);
    } catch (e) {
      toast.error((e as Error).message || "Retry queue failed.");
    } finally {
      setRetryingQueue(false);
    }
  };

  const columns = React.useMemo(
    () => [
      {
        id: "type",
        header: "Type",
        accessor: (r: IncotexMonitorRow) => docTypeLabel(r.typeKey),
      },
      {
        id: "number",
        header: "Number",
        accessor: (r: IncotexMonitorRow) => <span className="font-medium">{r.number}</span>,
        sticky: true,
      },
      { id: "date", header: "Date", accessor: "date" as keyof IncotexMonitorRow },
      { id: "party", header: "Customer", accessor: "party" as keyof IncotexMonitorRow },
      {
        id: "total",
        header: "Total",
        accessor: (r: IncotexMonitorRow) =>
          r.total != null ? formatMoney(Number(r.total), r.currency ?? "KES") : "—",
      },
      {
        id: "documentStatus",
        header: "ERP status",
        accessor: (r: IncotexMonitorRow) => <StatusBadge status={r.documentStatus} />,
      },
      {
        id: "kraSigning",
        header: "KRA status",
        accessor: (r: IncotexMonitorRow) => (
          <KraSigningBadge
            kraSigning={r.kraSigning}
            documentStatus={r.documentStatus}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        accessor: (r: IncotexMonitorRow) =>
          canRetryKraSigning(r.kraSigning) ? (
            <Button
              size="sm"
              variant="outline"
              disabled={retryingId === r.id}
              onClick={(e) => {
                e.stopPropagation();
                void handleRetryRow(r);
              }}
            >
              {retryingId === r.id ? "Sending…" : kraRetryButtonLabel(r.kraSigning)}
            </Button>
          ) : null,
      },
    ],
    [retryingId]
  );

  const hasMore = pageOffset + rows.length < total;

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="KRA signing monitor"
        description="Track invoices, credit notes, and debit notes sent to KRA — Incotex for existing clients, eTIMS OSCU for tenants who connected directly."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "KRA signing" }]}
        sticky
        actions={
          <Button variant="outline" disabled={retryingQueue || loading} onClick={() => void handleRetryQueue()}>
            <Icons.RefreshCw className={`mr-2 h-4 w-4 ${retryingQueue ? "animate-spin" : ""}`} />
            Retry all declined
          </Button>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <DataTableToolbar
          className="shrink-0"
          filters={[
            {
              id: "status",
              label: "KRA status",
              options: STATUS_OPTIONS,
              value: statusFilter,
              onChange: setStatusFilter,
            },
            {
              id: "type",
              label: "Document type",
              options: TYPE_OPTIONS,
              value: typeFilter,
              onChange: setTypeFilter,
            },
            {
              id: "provider",
              label: "Provider",
              options: PROVIDER_OPTIONS,
              value: providerFilter,
              onChange: setProviderFilter,
            },
          ]}
          actions={
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadPage(pageOffset)}
            >
              <Icons.RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />
        <div className={LIST_TABLE_SURFACE_CLASS}>
          <DataTable<IncotexMonitorRow>
            data={rows}
            columns={columns}
            scrollMode="fill"
            maxVisibleRows={PAGE_SIZE}
            className="min-h-0 flex-1 border-0"
            onRowClick={(row) => router.push(`/docs/${row.typeKey}/${row.id}`)}
            emptyMessage={loading ? "Loading…" : "No KRA signing records match these filters."}
          />
        </div>
        <TablePagination
          className="shrink-0"
          pageOffset={pageOffset}
          pageSize={PAGE_SIZE}
          itemCount={rows.length}
          hasMore={hasMore}
          loading={loading}
          onPrevious={() => {
            if (pageOffset <= 0 || loading) return;
            void loadPage(Math.max(0, pageOffset - PAGE_SIZE));
          }}
          onNext={() => {
            if (!hasMore || loading) return;
            void loadPage(pageOffset + PAGE_SIZE);
          }}
          entityLabel="records"
        />
        <p className="text-xs text-muted-foreground px-1">
          Open a row to view full decline details and fix the underlying document. Share error messages with support when retry keeps failing.
        </p>
      </div>
    </PageShell>
  );
}
