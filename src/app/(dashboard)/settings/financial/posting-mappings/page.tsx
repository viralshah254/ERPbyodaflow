"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import {
  fetchPostingMappingsApi,
  savePostingMappingsApi,
  type PostingMappingKey,
} from "@/lib/api/finance";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PostingMappingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof fetchPostingMappingsApi>>["items"]>([]);
  const [accounts, setAccounts] = React.useState<Awaited<ReturnType<typeof fetchPostingMappingsApi>>["accounts"]>([]);
  const [draft, setDraft] = React.useState<Partial<Record<PostingMappingKey, string | null>>>({});

  const refresh = React.useCallback(async () => {
    const payload = await fetchPostingMappingsApi();
    setRows(payload.items);
    setAccounts(payload.accounts);
    setDraft(
      Object.fromEntries(payload.items.map((item) => [item.key, item.accountId])) as Partial<
        Record<PostingMappingKey, string | null>
      >
    );
  }, []);

  React.useEffect(() => {
    setLoading(true);
    refresh()
      .catch((error) => toast.error((error as Error).message || "Failed to load posting mappings."))
      .finally(() => setLoading(false));
  }, [refresh]);

  const accountOption = React.useCallback((id: string | null | undefined): AsyncSearchableSelectOption | null => {
    if (!id) return null;
    const account = accounts.find((row) => row.id === id);
    if (!account) return { id, label: "Selected account" };
    const type = account.type ? account.type.charAt(0) + account.type.slice(1).toLowerCase() : "";
    return { id: account.id, label: `${account.code} · ${account.name}`, description: type || undefined };
  }, [accounts]);

  const loadAccountOptions = React.useCallback(async (query: string): Promise<AsyncSearchableSelectOption[]> => {
    const q = query.trim().toLowerCase();
    return accounts
      .filter((account) => !q || `${account.code} ${account.name} ${account.type}`.toLowerCase().includes(q))
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
      .slice(0, 40)
      .map((account) => accountOption(account.id)!)
      .filter(Boolean);
  }, [accounts, accountOption]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await savePostingMappingsApi(draft);
      await refresh();
      toast.success("Posting mappings saved.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to save posting mappings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Posting mappings"
        description="Choose which ledger accounts operational postings use before finance statements read the journals."
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Financial", href: "/settings/financial" },
          { label: "Posting mappings" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis
              prompt="Explain operational posting mappings and how they affect invoices, bills, GRNs, receipts, and payments."
              label="Explain"
            />
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/financial/chart-of-accounts">Chart of accounts</Link>
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving || loading}>
              <Icons.Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save mappings"}
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Operational to GL mapping</CardTitle>
            <CardDescription>
              Each mapping overrides the fallback account used by automatic posting. Leave blank to keep the system fallback.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posting role</TableHead>
                  <TableHead>Mapped account</TableHead>
                  <TableHead>Fallback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>
                      <AsyncSearchableSelect
                        value={draft[row.key] ?? ""}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            [row.key]: value || null,
                          }))
                        }
                        loadOptions={loadAccountOptions}
                        selectedOption={accountOption(draft[row.key])}
                        allowClear
                        searchDebounceMs={0}
                        showSelectedDescription
                        placeholder="Use the chart fallback"
                        searchPlaceholder="Code or account name"
                        emptyMessage="No account matches."
                      />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const live = accounts.find((account) => account.code === row.fallback.code);
                        if (!live) {
                          return `${row.fallback.code} - ${row.fallback.name} (${row.fallback.type}). That code is not on this chart.`;
                        }
                        if (live.type !== row.fallback.type || live.name !== row.fallback.name) {
                          return `${live.code} - ${live.name} (${live.type}) is on this chart. The template expected ${row.fallback.name} (${row.fallback.type}). Choose the account before posting uses it.`;
                        }
                        return `${live.code} - ${live.name} (${live.type})`;
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {loading ? <p className="px-4 py-4 text-sm text-muted-foreground">Loading mappings...</p> : null}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
