"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KraTaxPinField } from "@/components/parties/KraTaxPinField";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CUSTOMER_KIND_OPTIONS,
  type CustomerKindId,
} from "@/lib/fmcg/sfa-customer";
import {
  createPartyApi,
  fetchNextCustomerCodeApi,
  fetchPartyByIdApi,
  updatePartyApi,
  type PartyPayload,
} from "@/lib/api/parties";
import { fetchPaymentTermsApi } from "@/lib/api/payment-terms";
import type { CustomerType } from "@/lib/types/masters";

const DRAFT_STORAGE_KEY = "erp.customer-create-draft.v1";

const GENERIC_CUSTOMER_TYPES: { value: CustomerType; label: string }[] = [
  { value: "RETAILER", label: "Retailer" },
  { value: "WHOLESALER", label: "Wholesaler" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "END_CUSTOMER", label: "End customer" },
];

type FormState = {
  kindId: CustomerKindId;
  customerType: CustomerType;
  name: string;
  tradingName: string;
  code: string;
  phone: string;
  email: string;
  contactPersonFirstName: string;
  contactPersonLastName: string;
  taxId: string;
  addressLine1: string;
  city: string;
  region: string;
  route: string;
  latitude: string;
  longitude: string;
  creditLimit: string;
  paymentTermsId: string;
  creditControlMode: "AMOUNT" | "DAYS" | "HYBRID";
};

const emptyForm = (kindId: CustomerKindId = "general-trade"): FormState => ({
  kindId,
  customerType: "RETAILER",
  name: "",
  tradingName: "",
  code: "",
  phone: "",
  email: "",
  contactPersonFirstName: "",
  contactPersonLastName: "",
  taxId: "",
  addressLine1: "",
  city: "",
  region: "",
  route: "",
  latitude: "",
  longitude: "",
  creditLimit: "",
  paymentTermsId: "",
  creditControlMode: "AMOUNT",
});

type DraftPayload = {
  step: number;
  form: FormState;
  fmcg: boolean;
  updatedAt: string;
};

function loadDraft(fmcg: boolean): DraftPayload | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPayload;
    if (!parsed?.form || typeof parsed.step !== "number") return null;
    if (parsed.fmcg !== fmcg) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(draft: DraftPayload) {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function FieldLabel({
  htmlFor,
  children,
  required,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex flex-wrap items-baseline gap-1.5">
      <span>{children}</span>
      {required ? <span className="text-xs font-medium text-destructive">Required</span> : null}
      {optional ? <span className="text-xs font-normal text-muted-foreground">Optional</span> : null}
    </Label>
  );
}

function CustomerStepper({
  step,
  steps,
}: {
  step: number;
  steps: readonly { id: string; label: string; short: string }[];
}) {
  const progress = ((step + 1) / steps.length) * 100;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          Step {step + 1} of {steps.length}
        </span>
        <span className="text-muted-foreground">{steps[step]?.label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-1">
        {steps.map((s, index) => (
          <div
            key={s.id}
            className={cn(
              "flex-1 truncate text-center text-[10px] sm:text-xs py-1 rounded-md transition-colors",
              index === step && "bg-primary/10 text-primary font-medium",
              index < step && "text-muted-foreground",
              index > step && "text-muted-foreground/50"
            )}
          >
            {s.short}
          </div>
        ))}
      </div>
    </div>
  );
}

export type CustomerFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fmcg: boolean;
  initialKindId?: CustomerKindId;
  /** Edit existing customer by id (single-page, no draft). */
  customerId?: string | null;
  onSuccess?: () => void;
};

export function CustomerFormSheet({
  open,
  onOpenChange,
  fmcg,
  initialKindId,
  customerId = null,
  onSuccess,
}: CustomerFormSheetProps) {
  const editing = Boolean(customerId);

  const createSteps = React.useMemo(
    () =>
      [
        { id: "type", label: "Customer type", short: "Type" },
        { id: "identity", label: "Identity & contact", short: "Identity" },
        { id: "location", label: "Location", short: "Location" },
        { id: "credit", label: "Credit & billing", short: "Credit" },
        { id: "review", label: "Review & create", short: "Review" },
      ] as const,
    []
  );

  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(() => emptyForm(initialKindId ?? "general-trade"));
  const [stepErrors, setStepErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [terms, setTerms] = React.useState<Array<{ id: string; name: string }>>([]);
  const [nextCodePreview, setNextCodePreview] = React.useState("");
  const [draftRestored, setDraftRestored] = React.useState(false);
  const hydratedRef = React.useRef(false);

  const kind = CUSTOMER_KIND_OPTIONS.find((k) => k.id === form.kindId) ?? CUSTOMER_KIND_OPTIONS[1];
  const showRouteAndGeo = !fmcg || form.kindId !== "modern-trade";

  React.useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }

    void fetchPaymentTermsApi()
      .then((items) => setTerms(items.map((t) => ({ id: t.id, name: t.name }))))
      .catch(() => setTerms([]));

    if (customerId) {
      setDraftRestored(false);
      setStep(0);
      setStepErrors({});
      setLoading(true);
      void fetchPartyByIdApi(customerId)
        .then((party) => {
          if (!party) return;
          const matchedKind =
            CUSTOMER_KIND_OPTIONS.find((k) => k.sfaSegment === party.sfaSegment)?.id ??
            (party.channel === "MODERN_TRADE" ? "modern-trade" : "general-trade");
          setForm({
            kindId: matchedKind,
            customerType: party.customerType ?? "RETAILER",
            name: party.name ?? "",
            tradingName: party.tradingName ?? "",
            code: party.code ?? "",
            phone: party.phone ?? "",
            email: party.email ?? "",
            contactPersonFirstName: party.contactPersonFirstName ?? "",
            contactPersonLastName: party.contactPersonLastName ?? "",
            taxId: party.taxId ?? "",
            addressLine1: party.address?.line1 ?? "",
            city: party.address?.city ?? "",
            region: party.address?.region ?? "",
            route: party.route ?? "",
            latitude:
              party.latitude != null
                ? String(party.latitude)
                : party.lastKnownLatitude != null
                  ? String(party.lastKnownLatitude)
                  : "",
            longitude:
              party.longitude != null
                ? String(party.longitude)
                : party.lastKnownLongitude != null
                  ? String(party.lastKnownLongitude)
                  : "",
            creditLimit:
              party.creditLimitAmount != null && Number.isFinite(party.creditLimitAmount)
                ? String(party.creditLimitAmount)
                : "",
            paymentTermsId: party.paymentTermsId ?? "",
            creditControlMode: party.creditControlMode ?? "AMOUNT",
          });
        })
        .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load customer"))
        .finally(() => {
          setLoading(false);
          hydratedRef.current = true;
        });
      return;
    }

    const draft = loadDraft(fmcg);
    if (draft) {
      setForm(draft.form);
      setStep(Math.min(Math.max(draft.step, 0), createSteps.length - 1));
      setDraftRestored(true);
    } else {
      const kindId = initialKindId ?? "general-trade";
      const kindOpt = CUSTOMER_KIND_OPTIONS.find((k) => k.id === kindId);
      setForm({
        ...emptyForm(kindId),
        customerType: kindOpt?.customerType ?? "RETAILER",
      });
      setStep(0);
      setDraftRestored(false);
    }
    setStepErrors({});
    setNextCodePreview("");
    void fetchNextCustomerCodeApi()
      .then((code) => setNextCodePreview(code))
      .catch(() => setNextCodePreview(""));
    hydratedRef.current = true;
  }, [open, customerId, initialKindId, fmcg, createSteps.length]);

  React.useEffect(() => {
    if (!open || editing || !hydratedRef.current) return;
    saveDraft({ step, form, fmcg, updatedAt: new Date().toISOString() });
  }, [open, editing, step, form, fmcg]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (stepErrors[key]) setStepErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleKindChange = (kindId: CustomerKindId) => {
    const kindOpt = CUSTOMER_KIND_OPTIONS.find((k) => k.id === kindId);
    setForm((prev) => ({
      ...prev,
      kindId,
      customerType: kindOpt?.customerType ?? prev.customerType,
    }));
    if (stepErrors.kindId) setStepErrors((prev) => ({ ...prev, kindId: "" }));
  };

  const validateStep = (index: number): boolean => {
    const next: Record<string, string> = {};
    if (index === 0) {
      if (fmcg && !form.kindId) next.kindId = "Select a customer type to continue.";
      if (!fmcg && !form.customerType) next.customerType = "Select a customer type to continue.";
    }
    if (index === 1) {
      if (!form.name.trim()) next.name = "Name is required.";
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        next.email = "Enter a valid email address.";
      }
    }
    if (index === 2) {
      if (form.latitude.trim() && !Number.isFinite(Number(form.latitude))) {
        next.latitude = "Latitude must be a number.";
      }
      if (form.longitude.trim() && !Number.isFinite(Number(form.longitude))) {
        next.longitude = "Longitude must be a number.";
      }
    }
    if (index === 3) {
      if (form.creditLimit.trim()) {
        const n = Number(form.creditLimit);
        if (!Number.isFinite(n) || n < 0) next.creditLimit = "Credit limit must be zero or greater.";
      }
    }
    setStepErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.values(next)[0];
      toast.error(first);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, createSteps.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const buildPayload = (): PartyPayload => {
    const payload: PartyPayload = {
      name: form.name.trim(),
      roles: ["customer"],
      tradingName: form.tradingName.trim() || undefined,
      code: form.code.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      contactPersonFirstName: form.contactPersonFirstName.trim() || undefined,
      contactPersonLastName: form.contactPersonLastName.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
      address: {
        line1: form.addressLine1.trim() || undefined,
        city: form.city.trim() || undefined,
        region: form.region.trim() || undefined,
      },
      route: form.route.trim() || undefined,
      latitude: form.latitude.trim() ? Number(form.latitude) : undefined,
      longitude: form.longitude.trim() ? Number(form.longitude) : undefined,
      creditLimit: form.creditLimit.trim() ? Number(form.creditLimit) : undefined,
      creditLimitAmount: form.creditLimit.trim() ? Number(form.creditLimit) : undefined,
      paymentTermsId: form.paymentTermsId || undefined,
      creditControlMode: form.creditControlMode,
      status: "ACTIVE",
      customerType: fmcg ? kind.customerType : form.customerType,
    };
    if (fmcg) {
      payload.sfaSegment = kind.sfaSegment;
      payload.channel = kind.channel;
    }
    return payload;
  };

  const handleSave = async () => {
    if (!editing) {
      for (let i = 0; i < createSteps.length - 1; i++) {
        if (!validateStep(i)) {
          setStep(i);
          return;
        }
      }
    } else if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editing && customerId) {
        await updatePartyApi(customerId, payload);
        toast.success("Customer updated");
      } else {
        await createPartyApi(payload);
        clearDraft();
        toast.success(
          fmcg && form.kindId === "modern-trade"
            ? "Customer created. Add branches from the customer list when ready."
            : "Customer created"
        );
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const discardDraft = () => {
    clearDraft();
    const kindId = initialKindId ?? "general-trade";
    const kindOpt = CUSTOMER_KIND_OPTIONS.find((k) => k.id === kindId);
    setForm({
      ...emptyForm(kindId),
      customerType: kindOpt?.customerType ?? "RETAILER",
    });
    setStep(0);
    setStepErrors({});
    setDraftRestored(false);
    toast.message("Draft discarded");
  };

  const termName = form.paymentTermsId
    ? terms.find((t) => t.id === form.paymentTermsId)?.name ?? "Selected"
    : "None";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0 space-y-3">
          <div>
            <SheetTitle>{editing ? "Edit customer" : "New customer"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Update this customer’s details. Credit limit changes for existing customers are also available under Finance."
                : "Complete each step. Your progress is saved automatically if you close or refresh."}
            </SheetDescription>
          </div>
          {!editing ? <CustomerStepper step={step} steps={createSteps} /> : null}
          {!editing && draftRestored ? (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Draft restored from this device</span>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={discardDraft}>
                Discard
              </Button>
            </div>
          ) : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
          ) : editing ? (
            <EditAllFields
              fmcg={fmcg}
              form={form}
              kind={kind}
              showRouteAndGeo={showRouteAndGeo}
              stepErrors={stepErrors}
              setField={setField}
            />
          ) : (
            <>
              {step === 0 ? (
                <div className="space-y-3">
                  <FieldLabel required>Customer type</FieldLabel>
                  {fmcg ? (
                    <div className="grid gap-2">
                      {CUSTOMER_KIND_OPTIONS.map((option) => {
                        const selected = form.kindId === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => handleKindChange(option.id)}
                            className={cn(
                              "rounded-lg border px-3 py-2.5 text-left transition-colors",
                              selected
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <Select
                      value={form.customerType}
                      onValueChange={(v) => setField("customerType", v as CustomerType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GENERIC_CUSTOMER_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {stepErrors.kindId || stepErrors.customerType ? (
                    <p className="text-xs text-destructive">
                      {stepErrors.kindId || stepErrors.customerType}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="cust-name" required>
                      {form.kindId === "modern-trade" ? "Company / chain name" : "Name"}
                    </FieldLabel>
                    <Input
                      id="cust-name"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      placeholder={
                        form.kindId === "modern-trade" ? "e.g. Naivas Limited" : "Customer name"
                      }
                      autoFocus
                    />
                    {stepErrors.name ? <p className="text-xs text-destructive">{stepErrors.name}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="cust-trading" optional>
                      Trading name
                    </FieldLabel>
                    <Input
                      id="cust-trading"
                      value={form.tradingName}
                      onChange={(e) => setField("tradingName", e.target.value)}
                      placeholder="Shop-front name if different"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="cust-code" optional>
                        Code
                      </FieldLabel>
                      <Input
                        id="cust-code"
                        value={form.code}
                        onChange={(e) => setField("code", e.target.value)}
                        placeholder={nextCodePreview ? `Auto: ${nextCodePreview}` : "Auto: 001"}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank to auto-assign{" "}
                        <span className="font-mono font-medium text-foreground">
                          {nextCodePreview || "001"}
                        </span>
                        .
                      </p>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="cust-phone" optional>
                        Phone
                      </FieldLabel>
                      <Input
                        id="cust-phone"
                        value={form.phone}
                        onChange={(e) => setField("phone", e.target.value)}
                        placeholder="07…"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="cust-email" optional>
                      Email
                    </FieldLabel>
                    <Input
                      id="cust-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="email@example.com"
                    />
                    {stepErrors.email ? <p className="text-xs text-destructive">{stepErrors.email}</p> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="cust-contact-first" optional>
                        Contact first name
                      </FieldLabel>
                      <Input
                        id="cust-contact-first"
                        value={form.contactPersonFirstName}
                        onChange={(e) => setField("contactPersonFirstName", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="cust-contact-last" optional>
                        Contact last name
                      </FieldLabel>
                      <Input
                        id="cust-contact-last"
                        value={form.contactPersonLastName}
                        onChange={(e) => setField("contactPersonLastName", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel optional>KRA PIN</FieldLabel>
                    <KraTaxPinField value={form.taxId} onChange={(taxId) => setField("taxId", taxId)} />
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="cust-addr" optional>
                      Address
                    </FieldLabel>
                    <Input
                      id="cust-addr"
                      value={form.addressLine1}
                      onChange={(e) => setField("addressLine1", e.target.value)}
                      placeholder="Street / building"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="cust-city" optional>
                        City / town
                      </FieldLabel>
                      <Input
                        id="cust-city"
                        value={form.city}
                        onChange={(e) => setField("city", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor="cust-region" optional>
                        Region / county
                      </FieldLabel>
                      <Input
                        id="cust-region"
                        value={form.region}
                        onChange={(e) => setField("region", e.target.value)}
                      />
                    </div>
                  </div>
                  {showRouteAndGeo ? (
                    <>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="cust-route" optional>
                          Sales route
                        </FieldLabel>
                        <Input
                          id="cust-route"
                          value={form.route}
                          onChange={(e) => setField("route", e.target.value)}
                          placeholder="e.g. ATHIRIVER"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <FieldLabel htmlFor="cust-lat" optional>
                            Latitude
                          </FieldLabel>
                          <Input
                            id="cust-lat"
                            value={form.latitude}
                            onChange={(e) => setField("latitude", e.target.value)}
                          />
                          {stepErrors.latitude ? (
                            <p className="text-xs text-destructive">{stepErrors.latitude}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor="cust-lng" optional>
                            Longitude
                          </FieldLabel>
                          <Input
                            id="cust-lng"
                            value={form.longitude}
                            onChange={(e) => setField("longitude", e.target.value)}
                          />
                          {stepErrors.longitude ? (
                            <p className="text-xs text-destructive">{stepErrors.longitude}</p>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground rounded-md border bg-muted/20 px-3 py-2">
                      After creating this chain, use <span className="font-medium">Add branch</span> on
                      the customer list for each outlet.
                    </p>
                  )}
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    All fields on this step are optional. You can set credit now, or leave blank — Finance
                    can raise limits later on this customer.
                  </p>
                  <div className="space-y-2">
                    <FieldLabel optional>Credit limit</FieldLabel>
                    <Input
                      type="number"
                      placeholder="Leave blank for cash / no limit"
                      value={form.creditLimit}
                      onChange={(e) => setField("creditLimit", e.target.value)}
                    />
                    {stepErrors.creditLimit ? (
                      <p className="text-xs text-destructive">{stepErrors.creditLimit}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <FieldLabel optional>Payment terms</FieldLabel>
                    <Select
                      value={form.paymentTermsId || "__none__"}
                      onValueChange={(v) => setField("paymentTermsId", v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {terms.map((term) => (
                          <SelectItem key={term.id} value={term.id}>
                            {term.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel optional>Credit control</FieldLabel>
                    <Select
                      value={form.creditControlMode}
                      onValueChange={(v) =>
                        setField("creditControlMode", v as "AMOUNT" | "DAYS" | "HYBRID")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AMOUNT">Amount</SelectItem>
                        <SelectItem value="DAYS">Days</SelectItem>
                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-3 rounded-lg border p-4 text-sm">
                  <p className="font-medium">Review before creating</p>
                  <dl className="space-y-2 text-muted-foreground">
                    <div className="flex justify-between gap-3">
                      <dt>Type</dt>
                      <dd className="text-foreground font-medium text-right">
                        {fmcg ? kind.label : form.customerType.replace(/_/g, " ")}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Name</dt>
                      <dd className="text-foreground font-medium text-right">{form.name.trim() || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Code</dt>
                      <dd className="text-foreground font-mono text-right">
                        {form.code.trim() || nextCodePreview || "Auto"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Phone</dt>
                      <dd className="text-foreground text-right">{form.phone.trim() || "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Credit limit</dt>
                      <dd className="text-foreground text-right">
                        {form.creditLimit.trim() || "Not set"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Payment terms</dt>
                      <dd className="text-foreground text-right">{termName}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t shrink-0 gap-2 sm:justify-between">
          {editing ? (
            <>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => (step === 0 ? onOpenChange(false) : goBack())}
                disabled={saving}
              >
                {step === 0 ? "Cancel" : "Back"}
              </Button>
              {step < createSteps.length - 1 ? (
                <Button type="button" onClick={goNext} disabled={saving || loading}>
                  Continue
                </Button>
              ) : (
                <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
                  {saving ? "Creating…" : "Create customer"}
                </Button>
              )}
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Compact edit mode — identity fields (credit raises live under Finance). */
function EditAllFields({
  fmcg,
  form,
  kind,
  showRouteAndGeo,
  stepErrors,
  setField,
}: {
  fmcg: boolean;
  form: FormState;
  kind: (typeof CUSTOMER_KIND_OPTIONS)[number];
  showRouteAndGeo: boolean;
  stepErrors: Record<string, string>;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      {fmcg ? (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Type · </span>
          <span className="font-medium">{kind.label}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <FieldLabel required>Customer type</FieldLabel>
          <Select
            value={form.customerType}
            onValueChange={(v) => setField("customerType", v as CustomerType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GENERIC_CUSTOMER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <FieldLabel htmlFor="edit-name" required>
          Name
        </FieldLabel>
        <Input id="edit-name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
        {stepErrors.name ? <p className="text-xs text-destructive">{stepErrors.name}</p> : null}
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="edit-trading" optional>
          Trading name
        </FieldLabel>
        <Input
          id="edit-trading"
          value={form.tradingName}
          onChange={(e) => setField("tradingName", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <FieldLabel htmlFor="edit-code" optional>
            Code
          </FieldLabel>
          <Input id="edit-code" value={form.code} onChange={(e) => setField("code", e.target.value)} />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="edit-phone" optional>
            Phone
          </FieldLabel>
          <Input id="edit-phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="edit-email" optional>
          Email
        </FieldLabel>
        <Input
          id="edit-email"
          type="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <FieldLabel optional>KRA PIN</FieldLabel>
        <KraTaxPinField value={form.taxId} onChange={(taxId) => setField("taxId", taxId)} />
      </div>
      <div className="space-y-2">
        <FieldLabel htmlFor="edit-addr" optional>
          Address
        </FieldLabel>
        <Input
          id="edit-addr"
          value={form.addressLine1}
          onChange={(e) => setField("addressLine1", e.target.value)}
        />
      </div>
      {showRouteAndGeo ? (
        <div className="space-y-2">
          <FieldLabel htmlFor="edit-route" optional>
            Sales route
          </FieldLabel>
          <Input id="edit-route" value={form.route} onChange={(e) => setField("route", e.target.value)} />
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground rounded-md border bg-muted/20 px-3 py-2">
        To raise or change credit limits, use <span className="font-medium">Finance → Customer credit</span>.
      </p>
    </div>
  );
}
