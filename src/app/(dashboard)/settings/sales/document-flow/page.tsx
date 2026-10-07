"use client";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";
import { isApiConfigured } from "@/lib/api/client";
import {
  fetchSalesDocumentFlowApi,
  updateSalesDocumentFlowApi,
  type SalesDocumentFlowMode,
  type SalesDocumentFlowSettings,
} from "@/lib/api/sales-document-flow";
import { toast } from "sonner";

const CLASSIC_STEPS = [
  "Sales order",
  "Delivery note",
  "Pick & pack",
  "Dispatch",
  "Signed delivery note",
  "Invoice",
];

const PICK_PACK_FIRST_STEPS = [
  "Sales order",
  "Pick & pack",
  "Invoice + delivery note",
  "Dispatch",
  "Proof of delivery",
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
    label: "Require successful KRA signing before dispatch",
    hint: "Dispatch stays blocked until the invoice is KRA signed.",
  },
  {
    key: "allowDispatchWhileKraSigningPending",
    label: "Allow dispatch while KRA signing is pending",
    hint: "A failed KRA signature still blocks dispatch when signing is required.",
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

export default function SalesDocumentFlowPage() {
  const templateId = useOrgContextStore((s) => s.templateId);
  const industryCategory = useOrgContextStore((s) => s.industryCategory);
  const fmcg = industryCategory === "FMCG" || (industryCategory !== "SEAFOOD" && isFmcgOrg(templateId));
  const [settings, setSettings] = React.useState<SalesDocumentFlowSettings>(DEFAULTS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!isApiConfigured() || !fmcg) {
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
  }, [fmcg]);

  const steps = settings.mode === "pick_pack_first" ? PICK_PACK_FIRST_STEPS : CLASSIC_STEPS;

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateSalesDocumentFlowApi(settings);
      setSettings({ ...DEFAULTS, ...updated });
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
    >
      {!fmcg ? (
        <Card>
          <CardHeader>
            <CardTitle>FMCG sales</CardTitle>
            <CardDescription>This setting is used by FMCG manufacturer and bakery organisations.</CardDescription>
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
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["classic", "Current flow", "Delivery note first, then pick & pack, then invoice after the signed note."],
                    ["pick_pack_first", "Pick & pack first", "Pick from the sales order, then invoice and delivery note, then proof of delivery."],
                  ] as Array<[SalesDocumentFlowMode, string, string]>
                ).map(([mode, label, hint]) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={loading}
                    onClick={() => setSettings((prev) => ({ ...prev, mode }))}
                    className={`rounded-lg border p-4 text-left transition ${
                      settings.mode === mode ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
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
              <Button onClick={() => void save()} disabled={loading || saving}>
                {saving ? "Saving…" : "Save document flow"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
