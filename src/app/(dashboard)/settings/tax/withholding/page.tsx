"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { createWithholdingCodeApi, fetchWithholdingCodesApi } from "@/lib/api/settings-tax";
import { downloadWhtCertificateApi } from "@/lib/api/reports";
import type { KenyaWhtCode } from "@/lib/types/tax-kenya";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function WithholdingTaxPage() {
  const [codes, setCodes] = React.useState<KenyaWhtCode[]>([]);
  const [form, setForm] = React.useState({ code: "", name: "", rate: 0 });

  const reload = React.useCallback(async () => {
    const items = await fetchWithholdingCodesApi();
    setCodes(items);
  }, []);

  React.useEffect(() => {
    void reload().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load withholding tax codes.");
    });
  }, [reload]);

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required.");
      return;
    }
    try {
      await createWithholdingCodeApi({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        rate: form.rate,
      });
      setForm({ code: "", name: "", rate: 0 });
      await reload();
      toast.success("Withholding tax code created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save withholding tax code.");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Withholding tax"
        description="WHT codes. Apply on supplier bills (AP), payments (Treasury)."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Tax", href: "/settings/tax/kenya" },
          { label: "Withholding" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadWhtCertificateApi(undefined, (msg) => toast.error(msg))
              }
            >
              <Icons.FileDown className="mr-2 h-4 w-4" />
              WHT certificate
            </Button>
            <ExplainThis prompt="Explain WHT in Kenya. When to apply on AP and payments." label="Explain" />
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/tax/kenya">Kenya profile</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create WHT code</CardTitle>
            <CardDescription>Add withholding tax codes to the live tax configuration.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="wht-code">Code</Label>
              <Input
                id="wht-code"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="e.g. WHT-5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wht-name">Name</Label>
              <Input
                id="wht-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Professional fees"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wht-rate">Rate %</Label>
              <Input
                id="wht-rate"
                type="number"
                value={form.rate}
                onChange={(e) => setForm((p) => ({ ...p, rate: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="md:col-span-3">
              <Button onClick={() => void handleSave()}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                Add WHT code
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>WHT codes</CardTitle>
            <CardDescription>Live withholding tax codes available for AP and treasury flows.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Rate %</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.rate}</TableCell>
                    <TableCell className="text-muted-foreground">Live</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
