"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
  fetchDiscountPolicies,
  createDiscountPolicy,
  fetchCustomerDefaultPriceLists,
  fetchSupplierDefaultCostLists,
  fetchPriceListOptions,
  setCustomerDefaultPriceList,
  setSupplierDefaultCostList,
  type CustomerDefaultPriceListRow,
  type SupplierDefaultCostListRow,
} from "@/lib/api/pricing";
import { searchPartyLookupOptionsApi, type PartyLookupOption } from "@/lib/api/parties";
import type { DiscountPolicy } from "@/lib/products/pricing-types";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function PricingRulesPage() {
  const [policies, setPolicies] = React.useState<DiscountPolicy[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [addPolicyOpen, setAddPolicyOpen] = React.useState(false);
  const [configureOpen, setConfigureOpen] = React.useState(false);
  const [savingPolicy, setSavingPolicy] = React.useState(false);
  const [savingDefault, setSavingDefault] = React.useState(false);

  // Add policy form
  const [policyName, setPolicyName] = React.useState("");
  const [policyType, setPolicyType] = React.useState("volume");
  const [policyRequiresApproval, setPolicyRequiresApproval] = React.useState(false);
  const [policyStartDate, setPolicyStartDate] = React.useState("");
  const [policyEndDate, setPolicyEndDate] = React.useState("");

  // Configure customer default
  const [customerDefaults, setCustomerDefaults] = React.useState<CustomerDefaultPriceListRow[]>([]);
  const [configCustomerId, setConfigCustomerId] = React.useState("");
  const [selectedCustomerOption, setSelectedCustomerOption] = React.useState<PartyLookupOption | null>(null);
  const [configPriceListId, setConfigPriceListId] = React.useState("");
  const [priceListOptions, setPriceListOptions] = React.useState<Array<{ id: string; name: string }>>([]);

  // Configure supplier default cost list
  const [supplierCostDefaults, setSupplierCostDefaults] = React.useState<SupplierDefaultCostListRow[]>([]);
  const [configSupplierOpen, setConfigSupplierOpen] = React.useState(false);
  const [configSupplierId, setConfigSupplierId] = React.useState("");
  const [selectedSupplierOption, setSelectedSupplierOption] = React.useState<PartyLookupOption | null>(null);
  const [configCostListId, setConfigCostListId] = React.useState("");
  const [savingSupplierDefault, setSavingSupplierDefault] = React.useState(false);

  const loadPolicies = React.useCallback(() => {
    setLoading(true);
    fetchDiscountPolicies()
      .then(setPolicies)
      .catch((e) => toast.error(e?.message ?? "Failed to load policies"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  const loadCustomerDefaults = React.useCallback(() => {
    fetchCustomerDefaultPriceLists().then(setCustomerDefaults).catch(() => setCustomerDefaults([]));
  }, []);

  const loadSupplierCostDefaults = React.useCallback(() => {
    fetchSupplierDefaultCostLists().then(setSupplierCostDefaults).catch(() => setSupplierCostDefaults([]));
  }, []);

  React.useEffect(() => {
    if (!configureOpen) return;
    loadCustomerDefaults();
    fetchPriceListOptions()
      .then(setPriceListOptions)
      .catch(() => setPriceListOptions([]));
  }, [configureOpen, loadCustomerDefaults]);

  React.useEffect(() => {
    if (!configSupplierOpen) return;
    loadSupplierCostDefaults();
    fetchPriceListOptions()
      .then(setPriceListOptions)
      .catch(() => setPriceListOptions([]));
  }, [configSupplierOpen, loadSupplierCostDefaults]);

  const handleAddPolicy = async () => {
    if (!policyName.trim()) {
      toast.error("Enter policy name.");
      return;
    }
    setSavingPolicy(true);
    try {
      const created = await createDiscountPolicy({
        name: policyName.trim(),
        type: policyType,
        requiresApproval: policyRequiresApproval,
        startDate: policyStartDate || undefined,
        endDate: policyEndDate || undefined,
      });
      toast.success("Policy created.");
      setAddPolicyOpen(false);
      setPolicyName("");
      setPolicyType("volume");
      setPolicyRequiresApproval(false);
      setPolicyStartDate("");
      setPolicyEndDate("");
      loadPolicies();
    } catch (e) {
      const msg = (e as Error)?.message ?? "Create failed";
      toast.error(msg === "STUB" ? "Configure API to add policies." : msg);
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleSetCustomerDefault = async () => {
    if (!configCustomerId.trim() || !configPriceListId) {
      toast.error("Enter customer and select price list.");
      return;
    }
    setSavingDefault(true);
    try {
      await setCustomerDefaultPriceList(configCustomerId.trim(), configPriceListId);
      toast.success("Default price list set.");
      setConfigCustomerId("");
      setSelectedCustomerOption(null);
      setConfigPriceListId("");
      loadCustomerDefaults();
    } catch (e) {
      const msg = (e as Error)?.message ?? "Set failed";
      toast.error(msg === "STUB" ? "Configure API to set customer default price list." : msg);
    } finally {
      setSavingDefault(false);
    }
  };

  const handleSetSupplierCostList = async () => {
    if (!configSupplierId.trim() || !configCostListId) {
      toast.error("Enter supplier and select cost list.");
      return;
    }
    setSavingSupplierDefault(true);
    try {
      await setSupplierDefaultCostList(configSupplierId.trim(), configCostListId);
      toast.success("Default cost list set.");
      setConfigSupplierId("");
      setSelectedSupplierOption(null);
      setConfigCostListId("");
      loadSupplierCostDefaults();
    } catch (e) {
      const msg = (e as Error)?.message ?? "Set failed";
      toast.error(msg === "STUB" ? "Configure API to set supplier default cost list." : msg);
    } finally {
      setSavingSupplierDefault(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Pricing rules"
        description="Discount policies, validity, approval linkage. Link to approvals below."
        breadcrumbs={[{ label: "Pricing", href: "/pricing/overview" }, { label: "Rules" }]}
        sticky
        showCommandHint
        actions={
          <div className="flex gap-2">
            <Sheet open={addPolicyOpen} onOpenChange={setAddPolicyOpen}>
              <SheetTrigger asChild>
                <Button size="sm">
                  <Icons.Plus className="mr-2 h-4 w-4" />
                  Add policy
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Add discount policy</SheetTitle>
                  <SheetDescription>Volume, promo, or channel policy. Optionally require approval before apply.</SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-6">
                  <div className="grid gap-2">
                    <Label htmlFor="policyName">Name</Label>
                    <Input id="policyName" value={policyName} onChange={(e) => setPolicyName(e.target.value)} placeholder="e.g. Volume 10%" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="policyType">Type</Label>
                    <Select value={policyType} onValueChange={setPolicyType}>
                      <SelectTrigger id="policyType"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volume">volume</SelectItem>
                        <SelectItem value="promo">promo</SelectItem>
                        <SelectItem value="channel">channel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="policyApproval"
                      checked={policyRequiresApproval}
                      onChange={(e) => setPolicyRequiresApproval(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="policyApproval">Requires approval before apply</Label>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="policyStart">Validity start (optional)</Label>
                    <Input id="policyStart" type="date" value={policyStartDate} onChange={(e) => setPolicyStartDate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="policyEnd">Validity end (optional)</Label>
                    <Input id="policyEnd" type="date" value={policyEndDate} onChange={(e) => setPolicyEndDate(e.target.value)} />
                  </div>
                  <Button onClick={handleAddPolicy} disabled={savingPolicy}>
                    {savingPolicy ? "Saving…" : "Add policy"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Button variant="outline" size="sm" asChild>
              <Link href="/pricing/overview">Overview</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/approvals/inbox">Approvals</Link>
            </Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Discount policies</CardTitle>
            <CardDescription>Volume, promo, channel. Optional approval before apply. Data from API when configured.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-muted-foreground text-sm p-4">Loading…</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Validity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.type}</Badge>
                      </TableCell>
                      <TableCell>{p.requiresApproval ? "Required" : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.startDate && p.endDate ? `${p.startDate} – ${p.endDate}` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer default price list</CardTitle>
            <CardDescription>Assign default price list per customer. Configure below when API is set.</CardDescription>
          </CardHeader>
          <CardContent>
            <Sheet open={configureOpen} onOpenChange={setConfigureOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">Configure</Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Customer default price list</SheetTitle>
                  <SheetDescription>Set which price list is used by default per customer.</SheetDescription>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  <div className="grid gap-2">
                    <Label>Current assignments</Label>
                    {customerDefaults.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No assignments yet (or configure API).</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Price list</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerDefaults.map((r) => (
                            <TableRow key={r.customerId}>
                              <TableCell className="font-medium">{r.customerName ?? r.customerId}</TableCell>
                              <TableCell>{r.priceListName ?? r.priceListId}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                  <div className="border-t pt-4 space-y-4">
                    <Label>Set default</Label>
                    <div className="grid gap-2">
                      <Label htmlFor="configCustomerId" className="text-muted-foreground text-xs">Customer</Label>
                      <AsyncSearchableSelect
                        value={configCustomerId}
                        onValueChange={(value) => {
                          setConfigCustomerId(value);
                          if (!value) setSelectedCustomerOption(null);
                        }}
                        onOptionSelect={(option) => setSelectedCustomerOption(option)}
                        loadOptions={(query) =>
                          searchPartyLookupOptionsApi({
                            role: "customer",
                            status: "ACTIVE",
                            search: query,
                            limit: 20,
                          })
                        }
                        selectedOption={selectedCustomerOption}
                        placeholder="Select customer"
                        searchPlaceholder="Type name, code, phone, or email"
                        emptyMessage="No customers found."
                        recentStorageKey="lookup:recent-customers"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="configPriceList">Price list</Label>
                      <Select value={configPriceListId} onValueChange={setConfigPriceListId}>
                        <SelectTrigger id="configPriceList"><SelectValue placeholder="Select price list" /></SelectTrigger>
                        <SelectContent>
                          {priceListOptions.map((pl) => (
                            <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleSetCustomerDefault} disabled={savingDefault}>
                      {savingDefault ? "Saving…" : "Set default"}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Supplier default cost list</CardTitle>
            <CardDescription>Assign default cost list per supplier for purchase orders. Price lists can be used as cost lists.</CardDescription>
          </CardHeader>
          <CardContent>
            <Sheet open={configSupplierOpen} onOpenChange={setConfigSupplierOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">Configure</Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Supplier default cost list</SheetTitle>
                  <SheetDescription>Set which cost list is used by default per supplier on purchase orders.</SheetDescription>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  <div className="grid gap-2">
                    <Label>Current assignments</Label>
                    {supplierCostDefaults.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No assignments yet (or configure API).</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Cost list</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {supplierCostDefaults.map((r) => (
                            <TableRow key={r.supplierId}>
                              <TableCell className="font-medium">{r.supplierName ?? r.supplierId}</TableCell>
                              <TableCell>{r.costListName ?? r.costListId}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                  <div className="border-t pt-4 space-y-4">
                    <Label>Set default</Label>
                    <div className="grid gap-2">
                      <Label htmlFor="configSupplierId" className="text-muted-foreground text-xs">Supplier</Label>
                      <AsyncSearchableSelect
                        value={configSupplierId}
                        onValueChange={(value) => {
                          setConfigSupplierId(value);
                          if (!value) setSelectedSupplierOption(null);
                        }}
                        onOptionSelect={(option) => setSelectedSupplierOption(option)}
                        loadOptions={(query) =>
                          searchPartyLookupOptionsApi({
                            role: "supplier",
                            status: "ACTIVE",
                            search: query,
                            limit: 20,
                          })
                        }
                        selectedOption={selectedSupplierOption}
                        placeholder="Select supplier"
                        searchPlaceholder="Type name, code, phone, or email"
                        emptyMessage="No suppliers found."
                        recentStorageKey="lookup:recent-suppliers"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="configCostList">Cost list (price list)</Label>
                      <Select value={configCostListId} onValueChange={setConfigCostListId}>
                        <SelectTrigger id="configCostList"><SelectValue placeholder="Select cost list" /></SelectTrigger>
                        <SelectContent>
                          {priceListOptions.map((pl) => (
                            <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleSetSupplierCostList} disabled={savingSupplierDefault}>
                      {savingSupplierDefault ? "Saving…" : "Set default"}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
