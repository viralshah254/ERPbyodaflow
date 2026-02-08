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
import { formatMoney } from "@/lib/money";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function DepreciationPage() {
  const router = useRouter();
  const [period, setPeriod] = React.useState("2025-01");

  const preview = React.useMemo(() => getMockDepreciationPreview(period), [period]);

  const handlePost = () => {
    toast.info("Post depreciation (stub). Creates journal and redirects to review.");
    router.push("/docs/journal/new");
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
            <Button size="sm" onClick={handlePost}>
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
            <CardDescription>Journal lines (mock). Post → draft JE then review.</CardDescription>
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
      </div>
    </PageShell>
  );
}
