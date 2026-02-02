"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getMockCOARootFirst, type CoaRow, type CoaRowWithDepth, type CoaAccountType, type NormalBalance } from "@/lib/mock/coa";
import * as Icons from "lucide-react";

const ACCOUNT_TYPES: CoaAccountType[] = ["Asset", "Liability", "Equity", "Income", "Expense"];
const NORMAL_BALANCES: NormalBalance[] = ["Dr", "Cr"];

export default function ChartOfAccountsPage() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CoaRow | null>(null);
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    type: "Asset" as CoaAccountType,
    normalBalance: "Dr" as NormalBalance,
    isControlAccount: false,
    isActive: true,
  });

  const rows = React.useMemo(() => getMockCOARootFirst(), []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      type: "Asset",
      normalBalance: "Dr",
      isControlAccount: false,
      isActive: true,
    });
    setDrawerOpen(true);
  };

  const openEdit = (row: CoaRow) => {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      type: row.type,
      normalBalance: row.normalBalance,
      isControlAccount: row.isControlAccount,
      isActive: row.isActive,
    });
    setDrawerOpen(true);
  };

  const handleImport = () => {
    window.alert("Import COA (stub): API pending.");
  };

  return (
    <PageShell>
      <PageHeader
        title="Chart of Accounts"
        description="Tree structure: code, name, type, normal balance"
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Financial", href: "/settings/financial/currencies" },
          { label: "Chart of Accounts" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleImport}>
              <Icons.Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add account
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>
              Parent/child hierarchy. Control accounts roll up detail.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Normal</TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEdit(r)}
                  >
                    <TableCell>
                      <span
                        className="font-medium"
                        style={{ paddingLeft: `${r.depth * 16}px` }}
                      >
                        {r.code}
                      </span>
                    </TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{r.normalBalance}</TableCell>
                    <TableCell>{r.isControlAccount ? "Yes" : "—"}</TableCell>
                    <TableCell>{r.isActive ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(r);
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit account" : "Add account"}</SheetTitle>
            <SheetDescription>
              Code, name, type, normal balance. Control and active toggles.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="e.g. 1130"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Account name"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((p) => ({ ...p, type: v as CoaAccountType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Normal balance</Label>
              <Select
                value={form.normalBalance}
                onValueChange={(v) => setForm((p) => ({ ...p, normalBalance: v as NormalBalance }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NORMAL_BALANCES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="control"
                checked={form.isControlAccount}
                onCheckedChange={(c) =>
                  setForm((p) => ({ ...p, isControlAccount: c === true }))
                }
              />
              <Label htmlFor="control">Control account</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="active"
                checked={form.isActive}
                onCheckedChange={(c) =>
                  setForm((p) => ({ ...p, isActive: c !== false }))
                }
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDrawerOpen(false)}>
              {editing ? "Save" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
