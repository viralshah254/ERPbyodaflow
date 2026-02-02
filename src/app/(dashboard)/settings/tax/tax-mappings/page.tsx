"use client";

import * as React from "react";
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
import { Label } from "@/components/ui/label";
import {
  listTaxMappings,
  saveTaxMappings,
  listVatRates,
  listWhtCodes,
  getCoaAccountsForMapping,
} from "@/lib/data/tax.repo";
import type { TaxMapping } from "@/lib/mock/tax/kenya";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import * as Icons from "lucide-react";

const MAPPING_TYPES = [
  { value: "vat_output" as const, label: "VAT Output" },
  { value: "vat_input" as const, label: "VAT Input" },
  { value: "wht_payable" as const, label: "WHT Payable" },
];

export default function TaxMappingsPage() {
  const [mappings, setMappings] = React.useState<TaxMapping[]>([]);
  const [accounts, setAccounts] = React.useState<{ id: string; code: string; name: string }[]>([]);
  const [vatCodes, setVatCodes] = React.useState<string[]>([]);
  const [whtCodes, setWhtCodes] = React.useState<string[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    taxCode: "",
    mappingType: "vat_output" as TaxMapping["mappingType"],
    coaAccountId: "",
  });

  React.useEffect(() => {
    setMappings(listTaxMappings());
    const acc = getCoaAccountsForMapping();
    setAccounts(acc.map((a) => ({ id: a.id, code: a.code, name: a.name })));
    setVatCodes(listVatRates().map((r) => r.code));
    setWhtCodes(listWhtCodes().map((r) => r.code));
  }, []);

  const taxCodes = React.useMemo(() => [...new Set([...vatCodes, ...whtCodes])], [vatCodes, whtCodes]);
  const accountMap = React.useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const validateMapped = (m: TaxMapping) => {
    return accounts.some((a) => a.id === m.coaAccountId);
  };

  const handleAdd = () => {
    if (!form.taxCode || !form.coaAccountId) return;
    const acc = accountMap.get(form.coaAccountId);
    const newMap: TaxMapping = {
      id: `m${Date.now()}`,
      taxCode: form.taxCode,
      mappingType: form.mappingType,
      coaAccountId: form.coaAccountId,
      coaCode: acc?.code,
      coaName: acc?.name,
    };
    const next = [...mappings, newMap];
    saveTaxMappings(next);
    setMappings(next);
    setAddOpen(false);
    setForm({ taxCode: "", mappingType: "vat_output", coaAccountId: "" });
  };

  const removeMapping = (id: string) => {
    const next = mappings.filter((m) => m.id !== id);
    saveTaxMappings(next);
    setMappings(next);
  };

  return (
    <PageShell>
      <PageHeader
        title="Tax mappings"
        description="Link tax codes to COA accounts. VAT Output, VAT Input, WHT Payable."
        breadcrumbs={[
          { label: "Settings", href: "/settings/org" },
          { label: "Tax", href: "/settings/tax/kenya" },
          { label: "Tax mappings" },
        ]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <ExplainThis prompt="Explain tax mappings and COA links for VAT and WHT." label="Explain" />
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Icons.Plus className="mr-2 h-4 w-4" />
              Add mapping
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/tax/kenya">Kenya profile</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Mappings</CardTitle>
            <CardDescription>Validate that mapped accounts exist. VAT Output, VAT Input, WHT Payable.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tax code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>COA account</TableHead>
                  <TableHead>Valid</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => {
                  const valid = validateMapped(m);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.taxCode}</TableCell>
                      <TableCell>{MAPPING_TYPES.find((t) => t.value === m.mappingType)?.label ?? m.mappingType}</TableCell>
                      <TableCell>{m.coaCode ?? m.coaName ?? m.coaAccountId}</TableCell>
                      <TableCell>{valid ? "Yes" : "Missing"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeMapping(m.id)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add tax mapping</SheetTitle>
            <SheetDescription>Tax code, mapping type, COA account.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Tax code</Label>
              <Select value={form.taxCode} onValueChange={(v) => setForm((p) => ({ ...p, taxCode: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {taxCodes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mapping type</Label>
              <Select
                value={form.mappingType}
                onValueChange={(v) => setForm((p) => ({ ...p, mappingType: v as TaxMapping["mappingType"] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MAPPING_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>COA account</Label>
              <Select value={form.coaAccountId} onValueChange={(v) => setForm((p) => ({ ...p, coaAccountId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.taxCode || !form.coaAccountId}>Add</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
