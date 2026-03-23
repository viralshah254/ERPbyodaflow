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
  deleteLandedCostTemplate,
  fetchLandedCostTemplates,
  updateLandedCostTemplate,
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

/** Matches backend `LandedCostTemplate` / PATCH enum (see erp_odaflow_backend landed-cost + model). */
const LANDED_COST_TEMPLATE_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "freight", label: "Freight" },
  { value: "duty", label: "Import duty" },
  { value: "permit", label: "Permits / licences" },
  { value: "border", label: "Border / customs" },
  { value: "inbound_freight", label: "Inbound freight" },
  { value: "outbound_freight", label: "Outbound freight" },
  { value: "storage", label: "Cold storage" },
];

function slugFromName(name: string) {
  return name.trim() ? name.toUpperCase().replace(/\s+/g, "-") : "";
}

export default function InventoryCostingSettingsPage() {
  const [method, setMethod] = React.useState<(typeof COSTING_METHODS)[number]>("FIFO");
  const [valuationAccount, setValuationAccount] = React.useState("");
  const [templateSheetOpen, setTemplateSheetOpen] = React.useState(false);
  const [editingTemplateId, setEditingTemplateId] = React.useState<string | null>(null);
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

  const resetTemplateForm = () => {
    setTemplateForm({ name: "", type: "freight", allocationBasis: "qty" });
    setEditingTemplateId(null);
  };

  const openAddTemplateSheet = () => {
    resetTemplateForm();
    setTemplateSheetOpen(true);
  };

  const openEditTemplateSheet = (t: LandedCostTemplateRow) => {
    const allowed = new Set(LANDED_COST_TEMPLATE_TYPE_OPTIONS.map((o) => o.value));
    const type = allowed.has(t.type) ? t.type : "freight";
    setTemplateForm({
      name: t.name,
      type: type as LandedCostTemplateRow["type"],
      allocationBasis: (t.allocationBasis ?? "qty") as LandedCostTemplateRow["allocationBasis"],
    });
    setEditingTemplateId(t.id);
    setTemplateSheetOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error("Template name is required.");
      return;
    }
    try {
      if (editingTemplateId) {
        await updateLandedCostTemplate(editingTemplateId, {
          name: templateForm.name.trim(),
          type: templateForm.type,
          allocationBasis: templateForm.allocationBasis,
        });
        toast.success("Landed cost template updated.");
      } else {
        await createLandedCostTemplate({
          name: templateForm.name.trim(),
          type: templateForm.type,
          allocationBasis: templateForm.allocationBasis,
        });
        toast.success("Landed cost template created.");
      }
      resetTemplateForm();
      setTemplateSheetOpen(false);
      await reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save landed cost template."
      );
    }
  };

  const handleDeleteTemplate = async (t: LandedCostTemplateRow) => {
    const ok = window.confirm(
      `Delete template “${t.name}”? This cannot be undone. Templates used on a saved landed cost allocation cannot be deleted.`
    );
    if (!ok) return;
    try {
      await deleteLandedCostTemplate(t.id);
      toast.success("Template deleted.");
      if (editingTemplateId === t.id) {
        resetTemplateForm();
        setTemplateSheetOpen(false);
      }
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete template.");
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
            <Button size="sm" variant="outline" onClick={() => openAddTemplateSheet()}>
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
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.code || slugFromName(t.name)}</TableCell>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell>{t.allocationBasis ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditTemplateSheet(t)}
                          aria-label={`Edit ${t.name}`}
                        >
                          <Icons.Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => void handleDeleteTemplate(t)}
                          aria-label={`Delete ${t.name}`}
                        >
                          <Icons.Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={templateSheetOpen}
        onOpenChange={(open) => {
          setTemplateSheetOpen(open);
          if (!open) resetTemplateForm();
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingTemplateId ? "Edit landed cost template" : "Add landed cost template"}</SheetTitle>
            <SheetDescription>
              {editingTemplateId
                ? "Update name, type, or allocation basis."
                : "Create a landed cost template for the wizard and allocations."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                placeholder="Auto-generated from name"
                value={slugFromName(templateForm.name)}
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
                  {LANDED_COST_TEMPLATE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
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
            <Button onClick={() => void handleSaveTemplate()}>{editingTemplateId ? "Save changes" : "Create"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
