"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell, LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, LIST_TABLE_SURFACE_CLASS } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { fetchCrmAccountsApi, type CrmAccountRow } from "@/lib/api/crm";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function CRMAccountsPage() {
  const [search, setSearch] = React.useState("");
  const [rows, setRows] = React.useState<CrmAccountRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchCrmAccountsApi(query));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load accounts.";
      setError(message);
      setRows([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      void refresh(search);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [refresh, search]);

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Accounts"
        description="Customers already on the party register."
        breadcrumbs={[{ label: "CRM", href: "/crm" }, { label: "Accounts" }]}
        actions={
          <Button asChild>
            <Link href="/master/parties">
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add account
            </Link>
          </Button>
        }
      />
      <div className={LIST_PAGE_BODY_CLASS}>
        <div className="mb-3 max-w-sm shrink-0">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name"
            aria-label="Search accounts"
          />
        </div>
        {error ? (
          <EmptyState icon="AlertCircle" title="Accounts could not be loaded" description={error} />
        ) : !loading && rows.length === 0 ? (
          <EmptyState
            icon="Building2"
            title={search.trim() ? "No matching accounts" : "No accounts"}
            description="Customer parties from Masters show up here."
          />
        ) : (
          <div className={LIST_TABLE_SURFACE_CLASS}>
            <DataTable
              data={rows}
              emptyMessage={loading ? "Loading accounts…" : "No accounts"}
              columns={[
                { id: "name", header: "Name", accessor: "name" },
                { id: "code", header: "Code", accessor: (row) => row.code || "—" },
                { id: "phone", header: "Phone", accessor: (row) => row.phone || "—" },
                { id: "email", header: "Email", accessor: (row) => row.email || "—" },
                { id: "status", header: "Status", accessor: (row) => row.onHold ? "On hold" : (row.status || "—") },
              ]}
            />
          </div>
        )}
      </div>
    </PageShell>
  );
}
