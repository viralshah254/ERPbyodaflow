"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMockDepreciationPreview } from "@/lib/mock/assets/depreciation";
import { listDepreciationRuns } from "@/lib/data/depreciation.repo";
import { formatMoney } from "@/lib/money";
import { runDepreciation } from "@/lib/api/stub-endpoints";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function DepreciationPage() {
  const router = useRouter();
  const [period, setPeriod] = React.useState("2025-01");
  const [posting, setPosting] = React.useState(false);
  const [runs, setRuns] = React.useState(() => listDepreciationRuns());

  const preview = React.useMemo(() => getMockDepreciationPreview(period), [period]);

  const handlePost = async () => {
    setPosting(true);
    try {
      await runDepreciation({ period });
      setRuns(listDepreciationRuns());
      toast.success("Depreciation run completed.");
      router.push("/docs/journal/new");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Depreciation run"
        description="Select period, preview entries, post"
        breadcrumbs={[
          { label: "Assets", href: "/assets/overview" },
          { label: "Depreciation" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex items-center gap-2">
            <ExplainThis prompt="Explain depreciation run and journal posting." label="Explain depreciation" />
            <Button size="sm" disabled={posting} onClick={handlePost}>
              <Icons.FileEdit className="mr-2 h-4 w-4" />
              Post depreciation
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/assets/overview">Overview</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Period</Label>
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-36"
            />
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Preview entries</CardTitle>
            <CardDescription>Journal lines prepared for depreciation posting and journal review.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">{line.accountCode} — {line.accountName}</TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right">{line.debit > 0 ? formatMoney(line.debit, "KES") : "—"}</TableCell>
                    <TableCell className="text-right">{line.credit > 0 ? formatMoney(line.credit, "KES") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t px-4 py-2 flex justify-end">
              <span className="text-sm font-medium">Total depreciation: {formatMoney(preview.totalDepreciation, "KES")}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent depreciation runs</CardTitle>
            <CardDescription>Latest posted periods and totals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {runs.length === 0 ? (
              <p className="text-muted-foreground">No depreciation runs posted yet.</p>
            ) : (
              runs.slice(0, 5).map((run) => (
                <p key={run.id} className="text-muted-foreground">
                  {run.period} · {formatMoney(run.totalDepreciation, "KES")} · {new Date(run.createdAt).toLocaleString()}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
