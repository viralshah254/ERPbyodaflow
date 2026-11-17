"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { isApiConfigured } from "@/lib/api/client";
import {
  fetchSalesDocumentFlowApi,
  resolveSalesLineItemLayout,
  updateSalesDocumentFlowApi,
  type SalesDocumentFlowMode,
  type SalesDocumentFlowSettings,
  type SalesLineItemLayout,
} from "@/lib/api/sales-document-flow";
import { toast } from "sonner";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { forgetCachedOperatingProfile } from "@/lib/fmcg/operating-profile";

const CLASSIC_STEPS = [
  "Sales order",
  "Delivery note",
  "Pick & pack",
  "Dispatch",
  "Signed delivery note",
  "Invoice",
];

const LINE_ITEM_LAYOUTS = {
  picker: { label: "UI 1 · Product picker", hint: "Find and add products with the existing picker." },
  line_by_line: { label: "UI 2 · Line by line", hint: "Choose a product, enter its quantity, and press Enter to start the next line." },
  catalogue: { label: "UI 3 · Full catalogue", hint: "Search the catalogue and enter quantities directly. Only products with a positive quantity are included." },
} satisfies Record<SalesLineItemLayout, { label: string; hint: string }>;

const PICK_PACK_FIRST_STEPS = [
  "Sales order",
  "Pick & pack",
  "Invoice + delivery note",
  "Dispatch",
  "Proof of delivery",
];

const ROUTE_DISPATCH_STEPS = [
  "Approved sales orders by delivery route",
  "Loading note on one truck",
  "Confirm load from DISPATCH",
  "Finance settles shorts if needed",
  "Invoice and delivery note for the loaded quantity",
  "Truck left",
];

const OPTIONS: Array<{ key: keyof SalesDocumentFlowSettings; label: string; hint: string }> = [
  {
    key: "requireSalesOrderApprovalBeforePicking",
    label: "Require sales order approval before picking",
    hint: "Warehouse can start pick & pack only after the order is approved.",
  },
  {
    key: "requirePickPackCompletionBeforeInvoice",
    label: "Require pick & pack completion before invoice",
    hint: "Invoice and delivery note wait until the order is packed.",
  },
  {
    key: "generateInvoiceAndDeliveryNoteTogether",
    label: "Generate invoice and delivery note together",
    hint: "One action creates both documents from the packed quantities.",
  },
  {
    key: "requireSuccessfulKraSigningBeforeDispatch",
    label: "Hold dispatch when KRA rejects the invoice",
    hint: "A missing invoice or a KRA rejection keeps the load in the warehouse. If KRA cannot be reached, the load can leave and the invoice is signed when KRA answers.",
  },
  {
    key: "allowDispatchWhileKraSigningPending",
    label: "Allow dispatch while KRA signing is pending",
    hint: "A rejected invoice still stays in the warehouse when the hold above is on.",
  },
  {
    key: "enableQrProofOfDelivery",
    label: "Enable QR proof of delivery",
    hint: "Each delivery note carries a unique QR code that opens a receiver page.",
  },
  {
    key: "allowCustomerSignature",
    label: "Allow customer signature",
    hint: "The receiver can sign on the phone.",
  },
  {
    key: "allowDeliveryNotePhotoUpload",
    label: "Allow delivery note photo upload",
    hint: "The receiver can photograph the signed or stamped delivery note.",
  },
  {
    key: "allowInternalPodUpload",
    label: "Allow internal / manual POD upload",
    hint: "ERP users can upload a signed delivery note brought back by the driver.",
  },
  {
    key: "requirePodBeforeOrderComplete",
    label: "Require POD before marking the order complete",
    hint: "The order stays open until receipt is confirmed.",
  },
  {
    key: "allowPartialDeliveries",
    label: "Allow partial deliveries",
    hint: "Invoice the packed quantity when it is short of the order.",
  },
  {
    key: "allowPartialReceipt",
    label: "Allow partial receipt and discrepancies",
    hint: "The receiver can report a short delivery, a discrepancy, or a rejection.",
  },
  {
    key: "sendPodNotification",
    label: "Send POD notification to relevant ERP users",
    hint: "Notify the sales team when a receipt is recorded.",
  },
];

const DEFAULTS: SalesDocumentFlowSettings = {
  mode: "classic",
  requireSalesOrderApprovalBeforePicking: true,
  requirePickPackCompletionBeforeInvoice: true,
  generateInvoiceAndDeliveryNoteTogether: true,
  requireSuccessfulKraSigningBeforeDispatch: false,
  allowDispatchWhileKraSigningPending: true,
  enableQrProofOfDelivery: true,
  allowCustomerSignature: true,
  allowDeliveryNotePhotoUpload: true,
  allowInternalPodUpload: true,
  requirePodBeforeOrderComplete: false,
  allowPartialDeliveries: true,
  allowPartialReceipt: true,
  sendPodNotification: true,
  prefillSalesOrderFinishedGoods: false,
  productionRecording: "planned",
  finishedGoodsSalesUnit: "product_pack",
  approveNewFieldCustomers: false,
  vanSalesBook: true,
};

function FlowSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-3 text-sm">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function ChoiceRow(props: {
  label: string;
  hint: string;
  value: string;
  disabled?: boolean;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{props.label}</Label>
      <p className="text-sm text-muted-foreground">{props.hint}</p>
      <div className="flex flex-wrap gap-2">
        {props.options.map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={props.value === value ? "default" : "outline"}
            disabled={props.disabled}
            onClick={() => props.onChange(value)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SwitchRow(props: { id: string; label: string; hint: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor={props.id}>{props.label}</Label>
        <p className="text-sm text-muted-foreground">{props.hint}</p>
      </div>
      <Switch id={props.id} checked={props.checked} disabled={props.disabled} onCheckedChange={props.onChange} />
    </div>
  );
}

export default function SalesDocumentFlowPage() {
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const fmcg = industryCategory === "FMCG" || (industryCategory !== "SEAFOOD" && isFmcgOrg(templateId));
  const [stores, setStores] = React.useState<Array<{ id: string; label: string }>>([]);
  const [settings, setSettings] = React.useState<SalesDocumentFlowSettings>(DEFAULTS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchSalesDocumentFlowApi()
      .then((data) => {
        if (!cancelled) setSettings({ ...DEFAULTS, ...data });
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load the sales document flow.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!fmcg || !isApiConfigured()) return;
    let current = true;
    void fetchWarehouseOptions()
      .then((rows) => { if (current) setStores(rows.map((row) => ({ id: row.id, label: row.label }))); })
      .catch(() => { if (current) toast.error("Could not load stores for the dispatch store list."); });
    return () => { current = false; };
  }, [fmcg]);

  const routeMode = settings.mode === "route_dispatch" || settings.mode === "joy_dispatch";
  const lineItemLayout = resolveSalesLineItemLayout(settings);
  const steps =
    settings.mode === "pick_pack_first"
      ? PICK_PACK_FIRST_STEPS
      : routeMode
        ? ROUTE_DISPATCH_STEPS
        : CLASSIC_STEPS;

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateSalesDocumentFlowApi(settings);
      setSettings({ ...DEFAULTS, ...updated });
      forgetCachedOperatingProfile();
      toast.success("Sales document flow saved.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title="Document flow"
      description="Choose how approved sales orders move through the warehouse, the invoice, and proof of delivery."
      actions={
        <Button onClick={() => void save()} disabled={loading || saving}>
          {saving ? "Saving…" : "Save document flow"}
        </Button>
      }
    >
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales order and invoice lines</CardTitle>
          <CardDescription>
            Choose how your organisation enters products on sales orders and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="max-w-md space-y-2">
            <Label htmlFor="lineItemLayout">Line entry layout</Label>
            <Select
              value={lineItemLayout}
              disabled={loading || saving}
              onValueChange={(value: SalesLineItemLayout) => setSettings((prev) => ({ ...prev, lineItemLayout: value }))}
            >
              <SelectTrigger id="lineItemLayout" aria-describedby="lineItemLayoutHint"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(LINE_ITEM_LAYOUTS).map(([value, layout]) => (
                  <SelectItem key={value} value={value}>{layout.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="lineItemLayoutHint" className="text-sm text-muted-foreground">{LINE_ITEM_LAYOUTS[lineItemLayout].hint}</p>
          </div>
        </CardContent>
      </Card>
      {!fmcg ? (
        <Card>
          <CardHeader>
            <CardTitle>FMCG sales</CardTitle>
            <CardDescription>The document flow below is used by FMCG manufacturer and bakery organisations.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales document flow</CardTitle>
              <CardDescription>
                The current flow stays in place until you choose Pick & pack first. Options below apply to that flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["classic", "Current flow", "Delivery note first, then pick & pack, then invoice after the signed note."],
                    ["pick_pack_first", "Pick & pack first", "Pick from the sales order, then invoice and delivery note, then proof of delivery."],
                    ["route_dispatch", "Route dispatch", "Group orders by delivery route, load one truck from the dispatch store, invoice the loaded quantity, then mark the truck as left. Driver returns draft a credit note."],
                  ] as Array<[SalesDocumentFlowMode, string, string]>
                )
                  .map(([mode, label, hint]) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={loading}
                    onClick={() => setSettings((prev) => ({ ...prev, mode }))}
                    className={`rounded-lg border p-4 text-left transition ${
                      settings.mode === mode || (mode === "route_dispatch" && routeMode) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <p className="font-medium">{label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
                  </button>
                ))}
              </div>
              <FlowSteps steps={steps} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How this organisation operates</CardTitle>
              <CardDescription>Choices that change screens across sales, dispatch and production. Each organisation sets its own.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {routeMode ? (
                <div className="space-y-2">
                  <Label htmlFor="dispatchWarehouseId">Dispatch store</Label>
                  <p className="text-sm text-muted-foreground">Route trucks are loaded from this store. If empty, the store coded DISPATCH is used.</p>
                  <select
                    id="dispatchWarehouseId"
                    className="h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm"
                    value={settings.dispatchWarehouseId ?? ""}
                    disabled={loading}
                    onChange={(e) => setSettings((prev) => ({ ...prev, dispatchWarehouseId: e.target.value || undefined }))}
                  >
                    <option value="">Store coded DISPATCH</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>{store.label}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <ChoiceRow
                label="Production recording"
                hint="Planned production runs plan → work order → issue → complete. Record output starts from what was produced and posts the frozen recipe."
                value={settings.productionRecording ?? "planned"}
                disabled={loading}
                options={[["planned", "Planned production"], ["record_output", "Record output"]]}
                onChange={(value) => setSettings((prev) => ({ ...prev, productionRecording: value as "planned" | "record_output" }))}
              />
              <ChoiceRow
                label="Finished-goods sales unit"
                hint="Use each product's own pack setup, or read the pack size from the product name (e.g. 'ROLLS 6 PCS' sells as a pack)."
                value={settings.finishedGoodsSalesUnit ?? "product_pack"}
                disabled={loading}
                options={[["product_pack", "Each product's pack"], ["pack_size_in_name", "Pack size in product name"]]}
                onChange={(value) => setSettings((prev) => ({ ...prev, finishedGoodsSalesUnit: value as "product_pack" | "pack_size_in_name" }))}
              />
              <SwitchRow
                id="approveNewFieldCustomers"
                label="Approve new customers from field reps"
                hint="Customers created in the field app wait in Customer approvals until someone accepts them."
                checked={settings.approveNewFieldCustomers === true}
                disabled={loading}
                onChange={(checked) => setSettings((prev) => ({ ...prev, approveNewFieldCustomers: checked }))}
              />
              <SwitchRow
                id="vanSalesBook"
                label="Keep a van-sales customer book"
                hint="Shows the Van sales tab in the customer directory."
                checked={settings.vanSalesBook !== false}
                disabled={loading}
                onChange={(checked) => setSettings((prev) => ({ ...prev, vanSalesBook: checked }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Flow options</CardTitle>
              <CardDescription>These rules run when Pick & pack first is the selected flow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {OPTIONS.map((option) => (
                <div key={option.key} className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor={option.key}>{option.label}</Label>
                    <p className="text-sm text-muted-foreground">{option.hint}</p>
                  </div>
                  <Switch
                    id={option.key}
                    checked={Boolean(settings[option.key])}
                    disabled={loading}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, [option.key]: checked }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </PageLayout>
  );
}
