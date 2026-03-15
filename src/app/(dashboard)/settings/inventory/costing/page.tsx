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
import { fetchFinanceAccountsApi } from "@/lib/api/finance";
import {
  createLandedCostTemplate,
  fetchLandedCostTemplates,
  type LandedCostTemplateRow,
} from "@/lib/api/landed-cost";
import {
  fetchInventoryCostingSettingsApi,
  saveInventoryCostingSettingsApi,
} from "@/lib/api/inventory-settings";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const COSTING_METHODS = ["FIFO", "WEIGHTED_AVERAGE", "STANDARD_COST"] as const;

export default function InventoryCostingSettingsPage() {
  const [method, setMethod] = React.useState<(typeof COSTING_METHODS)[number]>("FIFO");
  const [valuationAccount, setValuationAccount] = React.useState("");
  const [templateSheetOpen, setTemplateSheetOpen] = React.useState(false);
  const [templates, setTemplates] = React.useState<LandedCostTemplateRow[]>([]);
  const [accounts, setAccounts] = React.useState<Array<{ id: string; code: string; name: string; type: string }>>([]);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [templateForm, setTemplateForm] = React.useState({
    name: "",
    type: "freight" as LandedCostTemplateRow["type"],
    allocationBasis: "qty" as LandedCostTemplateRow["allocationBasis"],
  });

  const reload = React.useCallback(async () => {
    const [settings, templateItems, accountItems] = await Promise.all([
      fetchInventoryCostingSettingsApi(),
      fetchLandedCostTemplates(),
      fetchFinanceAccountsApi(),
    ]);
    setMethod(settings.method);
    setValuationAccount(settings.valuationAccountCode ?? "");
    setTemplates(templateItems);
    setAccounts(accountItems);
  }, []);

  React.useEffect(() => {
    void reload().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Failed to load inventory costing settings.");
    });
  }, [reload]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await saveInventoryCostingSettingsApi({
        method,
        valuationAccountCode: valuationAccount || undefined,
      });
      toast.success("Inventory costing settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save costing settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    try {
      await createLandedCostTemplate({
        name: templateForm.name.trim(),
        type: templateForm.type,
        allocationBasis: templateForm.allocationBasis,
      });
      setTemplateForm({ name: "", type: "freight", allocationBasis: "qty" });
      setTemplateSheetOpen(false);
      await reload();
      toast.success("Landed cost template created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create landed cost template.");
    }
  };

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
            <CardDescription>Default method for inventory valuation and live costing runs.</CardDescription>
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
            <Button onClick={() => void handleSaveSettings()} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save settings"}
            </Button>
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
                  {accounts.filter((r) => r.type === "ASSET" || r.type === "Asset").map((r) => (
                    <SelectItem key={r.id} value={r.code}>{r.code} — {r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => void handleSaveSettings()} disabled={savingSettings}>
              Save valuation account
            </Button>
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
            <SheetDescription>Create a live landed cost template.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                placeholder="Auto-generated from name"
                value={templateForm.name ? templateForm.name.toUpperCase().replace(/\s+/g, "-") : ""}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Freight"
                value={templateForm.name}
                onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={templateForm.type} onValueChange={(value) => setTemplateForm((current) => ({ ...current, type: value as LandedCostTemplateRow["type"] }))}>
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
              <Select value={templateForm.allocationBasis} onValueChange={(value) => setTemplateForm((current) => ({ ...current, allocationBasis: value as LandedCostTemplateRow["allocationBasis"] }))}>
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
            <Button onClick={() => void handleCreateTemplate()}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
