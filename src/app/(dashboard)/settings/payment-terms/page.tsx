"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchPaymentTermsApi,
  createPaymentTermApi,
  updatePaymentTermApi,
  type PaymentTermRow,
} from "@/lib/api/payment-terms";
import { toast } from "sonner";
import * as Icons from "lucide-react";

const METHOD_LABELS: Record<PaymentTermRow["method"], string> = {
  IMMEDIATE: "Immediate",
  NET_DAYS: "Net days",
  EOM_PLUS_DAYS: "End of month + days",
};

export default function PaymentTermsPage() {
  const [terms, setTerms] = React.useState<PaymentTermRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PaymentTermRow | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchPaymentTermsApi();
      setTerms(items);
    } catch (e) {
      toast.error((e as Error).message ?? "Failed to load payment terms");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  const openAdd = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (row: PaymentTermRow) => { setEditing(row); setSheetOpen(true); };

  const handleSave = async (values: {
    code: string;
    name: string;
    method: PaymentTermRow["method"];
    days: number;
    graceDays: number;
    isActive: boolean;
  }) => {
    try {
      if (editing) {
        await updatePaymentTermApi(editing.id, {
          name: values.name,
          method: values.method,
          days: values.days,
          graceDays: values.graceDays,
          isActive: values.isActive,
        });
        toast.success("Payment term updated.");
      } else {
        await createPaymentTermApi({
          code: values.code,
          name: values.name,
          method: values.method,
          days: values.days,
          graceDays: values.graceDays,
        });
        toast.success("Payment term created.");
      }
      setSheetOpen(false);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message ?? "Save failed");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Payment terms"
        description="Define payment conditions assigned to customers and suppliers (e.g. Net 30, COD, EOM+15)."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Payment terms" },
        ]}
        sticky
        showCommandHint
        actions={
          <Button size="sm" onClick={openAdd}>
            <Icons.Plus className="mr-2 h-4 w-4" />
            Add payment term
          </Button>
        }
      />

      <div className="p-6">
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading…</p>
            ) : terms.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No payment terms yet. Add some to assign to customers and suppliers.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Grace days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell className="font-mono font-medium">{term.code}</TableCell>
                      <TableCell className="font-medium">{term.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{METHOD_LABELS[term.method] ?? term.method}</Badge>
                      </TableCell>
                      <TableCell>{term.method === "IMMEDIATE" ? "—" : (term.days ?? 0)}</TableCell>
                      <TableCell>{term.graceDays > 0 ? term.graceDays : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={term.isActive ? "secondary" : "outline"}>
                          {term.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(term)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {sheetOpen && (
        <PaymentTermSheet
          initial={editing}
          onSave={handleSave}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </PageShell>
  );
}

function PaymentTermSheet({
  initial,
  onSave,
  onClose,
}: {
  initial: PaymentTermRow | null;
  onSave: (v: { code: string; name: string; method: PaymentTermRow["method"]; days: number; graceDays: number; isActive: boolean }) => Promise<void>;
  onClose: () => void;
}) {
  const [code, setCode] = React.useState(initial?.code ?? "");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [method, setMethod] = React.useState<PaymentTermRow["method"]>(initial?.method ?? "NET_DAYS");
  const [days, setDays] = React.useState(String(initial?.days ?? 30));
  const [graceDays, setGraceDays] = React.useState(String(initial?.graceDays ?? 0));
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);
  const [saving, setSaving] = React.useState(false);

  const showDays = method !== "IMMEDIATE";

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) { toast.error("Code and name are required."); return; }
    const daysNum = showDays ? parseInt(days, 10) : 0;
    const graceNum = parseInt(graceDays, 10) || 0;
    if (showDays && (isNaN(daysNum) || daysNum < 0)) { toast.error("Days must be a non-negative number."); return; }
    setSaving(true);
    try {
      await onSave({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        method,
        days: daysNum,
        graceDays: graceNum,
        isActive,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{initial ? "Edit payment term" : "Add payment term"}</SheetTitle>
          <SheetDescription>
            Payment terms determine due dates on invoices and are used in AR ageing reports.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. NET30"
              disabled={!!initial}
            />
            {!!initial && (
              <p className="text-xs text-muted-foreground">Code cannot be changed after creation.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Net 30 days" />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentTermRow["method"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IMMEDIATE">Immediate (Cash/COD)</SelectItem>
                <SelectItem value="NET_DAYS">Net days (e.g. Net 30)</SelectItem>
                <SelectItem value="EOM_PLUS_DAYS">End of month + days (e.g. EOM+15)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showDays && (
            <div className="space-y-2">
              <Label>Days</Label>
              <Input
                type="number"
                min={0}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                {method === "NET_DAYS"
                  ? "Number of days from invoice date until due."
                  : "Days added after end-of-month to calculate due date."}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Grace days (optional)</Label>
            <Input
              type="number"
              min={0}
              value={graceDays}
              onChange={(e) => setGraceDays(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">Extra days before an overdue flag is raised.</p>
          </div>
          {!!initial && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="termActive"
                checked={isActive}
                onCheckedChange={(c) => setIsActive(c === true)}
              />
              <Label htmlFor="termActive">Active</Label>
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !code.trim() || !name.trim()}>
            {saving ? "Saving…" : initial ? "Update" : "Create"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
