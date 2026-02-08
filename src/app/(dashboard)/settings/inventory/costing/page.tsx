"use client";

import * as React from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCostingSettings } from "@/lib/mock/inventory/costing";
import { getMockLandedCostTemplates } from "@/lib/mock/inventory/landed-cost";
import { getMockCOARootFirst } from "@/lib/mock/coa";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const COSTING_METHODS = ["FIFO", "WEIGHTED_AVERAGE", "STANDARD_COST"] as const;

export default function InventoryCostingSettingsPage() {
  const [method, setMethod] = React.useState(getCostingSettings().method);
  const [valuationAccount, setValuationAccount] = React.useState(getCostingSettings().valuationAccountCode ?? "");
  const [templateSheetOpen, setTemplateSheetOpen] = React.useState(false);

  const coa = React.useMemo(() => getMockCOARootFirst(), []);
  const templates = React.useMemo(() => getMockLandedCostTemplates(), []);

  return (
    <PageShell>
      <PageHeader
        title="Inventory costing settings"
        description="Costing method, landed cost templates, valuation accounts"
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Inventory", href: "/settings/inventory/costing" },
          { label: "Costing" },
        ]}
        sticky
        showCommandHint
        actions={
          <ExplainThis prompt="Explain FIFO vs weighted average vs standard cost, and valuation account mapping." label="Explain costing settings" />
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Costing method</CardTitle>
            <CardDescription>Default method for inventory valuation. UI only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as (typeof COSTING_METHODS)[number])}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COSTING_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Valuation accounts</CardTitle>
              <CardDescription>Map to COA. Link inventory valuation to GL.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default inventory valuation account</Label>
              <Select value={valuationAccount} onValueChange={setValuationAccount}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select COA account" />
                </SelectTrigger>
                <SelectContent>
                  {coa.filter((r) => r.type === "Asset").map((r) => (
                    <SelectItem key={r.id} value={r.code}>{r.code} — {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Landed cost templates</CardTitle>
              <CardDescription>Freight, insurance, duty. Allocation basis (qty/value/weight).</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setTemplateSheetOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add template
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Allocation basis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.code}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell>{t.allocationBasis}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add landed cost template</SheetTitle>
            <SheetDescription>Stub. Freight, insurance, duty, etc.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input placeholder="e.g. FREIGHT" />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="e.g. Freight" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="freight">Freight</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="duty">Duty</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Allocation basis</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="qty">Quantity</SelectItem>
                  <SelectItem value="value">Value</SelectItem>
                  <SelectItem value="weight">Weight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setTemplateSheetOpen(false)}>Cancel</Button>
            <Button onClick={() => { setTemplateSheetOpen(false); toast.info("Save (stub). API pending."); }}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
