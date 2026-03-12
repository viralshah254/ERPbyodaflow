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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          { label: "Settings", href: "/settings/org" },
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
                      <Select
                        value={draft[row.key] ?? "__fallback__"}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            [row.key]: value === "__fallback__" ? null : value,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Use fallback" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__fallback__">Use fallback</SelectItem>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {row.fallback.code} - {row.fallback.name} ({row.fallback.type})
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
