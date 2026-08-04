"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CoolcatchSupplierKind, PartyRole } from "@/lib/types/masters";
import { LocationPickerField, type ResolvedLocation } from "@/components/location/LocationPickerField";
import * as Icons from "lucide-react";

export type SupplierPaymentMethod = "BANK" | "MPESA" | "PAYBILL" | "TILL";

export type SupplierMasterFormValues = {
  coolcatchSupplierKind: CoolcatchSupplierKind;
  name: string;
  contactPersonFirstName: string;
  contactPersonLastName: string;
  email: string;
  phone: string;
  locationFormattedAddress: string;
  addressLine1: string;
  addressCity: string;
  addressRegion: string;
  addressCountry: string;
  latitude?: number;
  longitude?: number;
  paymentTermsId: string;
  defaultCurrency: string;
  taxId: string;
  supplierPaymentMethod: SupplierPaymentMethod;
  supplierBankName: string;
  supplierBankAccountName: string;
  supplierBankAccountNumber: string;
  supplierBankBranchName: string;
};

export const emptySupplierMasterForm = (defaultCurrency = "KES"): SupplierMasterFormValues => ({
  coolcatchSupplierKind: "FARM",
  name: "",
  contactPersonFirstName: "",
  contactPersonLastName: "",
  email: "",
  phone: "",
  locationFormattedAddress: "",
  addressLine1: "",
  addressCity: "",
  addressRegion: "",
  addressCountry: "",
  paymentTermsId: "",
  defaultCurrency,
  taxId: "",
  supplierPaymentMethod: "BANK",
  supplierBankName: "",
  supplierBankAccountName: "",
  supplierBankAccountNumber: "",
  supplierBankBranchName: "",
});

type SupplierMasterFormFieldsProps = {
  form: SupplierMasterFormValues;
  onChange: (next: SupplierMasterFormValues) => void;
  errors?: Record<string, string>;
  onClearError?: (key: string) => void;
  terms: Array<{ id: string; name: string }>;
  currencies: Array<{ id: string; code: string; name: string }>;
  pinCertFile: File | null;
  onPinCertFileChange: (file: File | null) => void;
  pinCertExistingUrl?: string | null;
  companyRegFile: File | null;
  onCompanyRegFileChange: (file: File | null) => void;
  companyRegExistingUrl?: string | null;
  /** When editing an existing supplier — enables View/Download on stored documents. */
  partyId?: string | null;
  showPaymentFields?: boolean;
};

export function SupplierMasterFormFields({
  form,
  onChange,
  errors = {},
  onClearError,
  terms,
  currencies,
  pinCertFile,
  onPinCertFileChange,
  pinCertExistingUrl,
  companyRegFile,
  onCompanyRegFileChange,
  companyRegExistingUrl,
  partyId,
  showPaymentFields = true,
}: SupplierMasterFormFieldsProps) {
  const pinCertInputRef = React.useRef<HTMLInputElement>(null);
  const companyRegInputRef = React.useRef<HTMLInputElement>(null);
  const isFarm = form.coolcatchSupplierKind === "FARM";
  const [docBusy, setDocBusy] = React.useState<"pin-view" | "pin-dl" | "reg-view" | "reg-dl" | null>(null);

  const openPinView = async () => {
    if (!partyId) return;
    setDocBusy("pin-view");
    try {
      const { viewPartyPinCertificateApi } = await import("@/lib/api/parties");
      await viewPartyPinCertificateApi(partyId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open KRA PIN certificate.");
    } finally {
      setDocBusy(null);
    }
  };

  const downloadPin = async () => {
    if (!partyId) return;
    setDocBusy("pin-dl");
    try {
      const { downloadPartyPinCertificateApi } = await import("@/lib/api/parties");
      await downloadPartyPinCertificateApi(partyId, (msg) => alert(msg));
    } finally {
      setDocBusy(null);
    }
  };

  const openRegView = async () => {
    if (!partyId) return;
    setDocBusy("reg-view");
    try {
      const { viewPartyCompanyRegistrationApi } = await import("@/lib/api/parties");
      await viewPartyCompanyRegistrationApi(partyId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not open company registration.");
    } finally {
      setDocBusy(null);
    }
  };

  const downloadReg = async () => {
    if (!partyId) return;
    setDocBusy("reg-dl");
    try {
      const { downloadPartyCompanyRegistrationApi } = await import("@/lib/api/parties");
      await downloadPartyCompanyRegistrationApi(partyId, (msg) => alert(msg));
    } finally {
      setDocBusy(null);
    }
  };

  const locationValue: ResolvedLocation | null = form.locationFormattedAddress
    ? {
        formattedAddress: form.locationFormattedAddress,
        line1: form.addressLine1 || form.locationFormattedAddress,
        city: form.addressCity || undefined,
        region: form.addressRegion || undefined,
        country: form.addressCountry || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
      }
    : null;

  const patch = (partial: Partial<SupplierMasterFormValues>) => {
    onChange({ ...form, ...partial });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Supplier kind</Label>
        <div className="grid grid-cols-2 gap-2">
          {(["FARM", "BROKER"] as const).map((kind) => (
            <Button
              key={kind}
              type="button"
              variant={form.coolcatchSupplierKind === kind ? "default" : "outline"}
              onClick={() => patch({ coolcatchSupplierKind: kind })}
            >
              {kind === "FARM" ? "Farm" : "Broker / wholesaler"}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          {isFarm ? "Farm name" : "Company name"} <span className="text-destructive">*</span>
        </Label>
        <Input
          value={form.name}
          onChange={(e) => {
            patch({ name: e.target.value });
            onClearError?.("name");
          }}
          placeholder={isFarm ? "e.g. Lakeview Tilapia Farm" : "e.g. Coastline Traders Ltd"}
        />
        {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>
            Contact first name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.contactPersonFirstName}
            onChange={(e) => {
              patch({ contactPersonFirstName: e.target.value });
              onClearError?.("contactPersonFirstName");
            }}
          />
          {errors.contactPersonFirstName ? (
            <p className="text-xs text-destructive">{errors.contactPersonFirstName}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>
            Contact last name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={form.contactPersonLastName}
            onChange={(e) => {
              patch({ contactPersonLastName: e.target.value });
              onClearError?.("contactPersonLastName");
            }}
          />
          {errors.contactPersonLastName ? (
            <p className="text-xs text-destructive">{errors.contactPersonLastName}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>
          Email{" "}
          <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => {
            patch({ email: e.target.value });
            onClearError?.("email");
          }}
        />
        {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
      </div>

      <div className="space-y-2">
        <Label>
          Contact number <span className="text-destructive">*</span>
        </Label>
        <Input
          type="tel"
          value={form.phone}
          onChange={(e) => {
            patch({ phone: e.target.value });
            onClearError?.("phone");
          }}
          placeholder="e.g. +254712345678"
        />
        {errors.phone ? <p className="text-xs text-destructive">{errors.phone}</p> : null}
      </div>

      <LocationPickerField
        label="Location"
        value={locationValue}
        error={errors.addressCity}
        onChange={(next) => {
          if (!next) {
            patch({
              locationFormattedAddress: "",
              addressLine1: "",
              addressCity: "",
              addressRegion: "",
              addressCountry: "",
              latitude: undefined,
              longitude: undefined,
            });
          } else {
            patch({
              locationFormattedAddress: next.formattedAddress,
              addressLine1: next.line1 ?? next.formattedAddress,
              addressCity: next.city ?? "",
              addressRegion: next.region ?? "",
              addressCountry: next.country ?? "",
              latitude: next.latitude,
              longitude: next.longitude,
            });
          }
          onClearError?.("addressCity");
        }}
      />

      <div className="space-y-2">
        <Label>
          KRA PIN <span className="text-destructive">*</span>
        </Label>
        <Input
          value={form.taxId}
          onChange={(e) => {
            patch({ taxId: e.target.value });
            onClearError?.("taxId");
          }}
          placeholder="e.g. P051234567X"
          autoComplete="off"
        />
        {errors.taxId ? <p className="text-xs text-destructive">{errors.taxId}</p> : null}
      </div>

      {showPaymentFields ? (
        <>
          <div className="space-y-2">
            <Label>Payment terms</Label>
            <Select
              value={form.paymentTermsId || "__none__"}
              onValueChange={(value) =>
                patch({ paymentTermsId: value === "__none__" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment term" />
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
            <Label>Currency preference</Label>
            <Select
              value={
                form.defaultCurrency && currencies.some((c) => c.code === form.defaultCurrency)
                  ? form.defaultCurrency
                  : (currencies[0]?.code ?? form.defaultCurrency ?? "")
              }
              onValueChange={(value) => {
                patch({ defaultCurrency: value });
                onClearError?.("defaultCurrency");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.id} value={c.code}>
                    {c.code} {c.name && c.name !== c.code ? `- ${c.name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.defaultCurrency ? (
              <p className="text-xs text-destructive">{errors.defaultCurrency}</p>
            ) : null}
          </div>
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">Payment details</p>
            <p className="text-xs text-muted-foreground">
              How this supplier receives payments (bank, M-Pesa, paybill, or till). Optional but
              recommended for AP.
            </p>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    ["BANK", "Bank"],
                    ["MPESA", "M-Pesa"],
                    ["PAYBILL", "Paybill"],
                    ["TILL", "Till"],
                  ] as const
                ).map(([method, label]) => (
                  <Button
                    key={method}
                    type="button"
                    variant={form.supplierPaymentMethod === method ? "default" : "outline"}
                    onClick={() => patch({ supplierPaymentMethod: method })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            {form.supplierPaymentMethod === "BANK" ? (
              <div className="space-y-2">
                <Label>
                  Bank name{" "}
                  <span className="text-muted-foreground text-xs">(recommended)</span>
                </Label>
                <Input
                  value={form.supplierBankName}
                  onChange={(e) => {
                    patch({ supplierBankName: e.target.value });
                    onClearError?.("supplierBankName");
                  }}
                  placeholder="e.g. KCB, Equity Bank"
                />
                {errors.supplierBankName ? (
                  <p className="text-xs text-destructive">{errors.supplierBankName}</p>
                ) : null}
              </div>
            ) : null}
            {form.supplierPaymentMethod !== "MPESA" ? (
              <div className="space-y-2">
                <Label>
                  Beneficiary name{" "}
                  <span className="text-muted-foreground text-xs">(recommended)</span>
                </Label>
                <Input
                  value={form.supplierBankAccountName}
                  onChange={(e) => {
                    patch({ supplierBankAccountName: e.target.value });
                    onClearError?.("supplierBankAccountName");
                  }}
                  placeholder="e.g. Lakeview Tilapia Farm"
                />
                {errors.supplierBankAccountName ? (
                  <p className="text-xs text-destructive">{errors.supplierBankAccountName}</p>
                ) : null}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>
                {form.supplierPaymentMethod === "MPESA"
                  ? "M-Pesa phone number"
                  : form.supplierPaymentMethod === "PAYBILL"
                    ? "Paybill number"
                    : form.supplierPaymentMethod === "TILL"
                      ? "Till number"
                      : "Account number"}{" "}
                <span className="text-muted-foreground text-xs">(recommended)</span>
              </Label>
              <Input
                value={form.supplierBankAccountNumber}
                onChange={(e) => {
                  patch({ supplierBankAccountNumber: e.target.value });
                  onClearError?.("supplierBankAccountNumber");
                }}
                placeholder={
                  form.supplierPaymentMethod === "MPESA"
                    ? "e.g. 0712345678"
                    : form.supplierPaymentMethod === "PAYBILL"
                      ? "e.g. 522522"
                      : form.supplierPaymentMethod === "TILL"
                        ? "e.g. 123456"
                        : "e.g. 0123456789"
                }
                type={form.supplierPaymentMethod === "MPESA" ? "tel" : "text"}
                autoComplete="off"
              />
              {errors.supplierBankAccountNumber ? (
                <p className="text-xs text-destructive">{errors.supplierBankAccountNumber}</p>
              ) : null}
            </div>
            {form.supplierPaymentMethod !== "TILL" && form.supplierPaymentMethod !== "MPESA" ? (
              <div className="space-y-2">
                <Label>
                  {form.supplierPaymentMethod === "PAYBILL" ? "Account no." : "Branch name"}{" "}
                  <span className="text-muted-foreground text-xs">
                    {form.supplierPaymentMethod === "PAYBILL" ? "(optional)" : "(recommended)"}
                  </span>
                </Label>
                <Input
                  value={form.supplierBankBranchName}
                  onChange={(e) => {
                    patch({ supplierBankBranchName: e.target.value });
                    onClearError?.("supplierBankBranchName");
                  }}
                  placeholder={
                    form.supplierPaymentMethod === "PAYBILL"
                      ? "If required by paybill"
                      : "e.g. Nairobi Main"
                  }
                />
                {errors.supplierBankBranchName ? (
                  <p className="text-xs text-destructive">{errors.supplierBankBranchName}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <Label>
          KRA PIN certificate{" "}
          <span className="text-muted-foreground text-xs">(optional, PDF or image)</span>
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => pinCertInputRef.current?.click()}
            className="shrink-0"
          >
            <Icons.Paperclip className="h-4 w-4 mr-1.5" />
            {pinCertFile ? "Change file" : "Attach file"}
          </Button>
          {pinCertFile ? (
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{pinCertFile.name}</span>
          ) : null}
          {!pinCertFile && pinCertExistingUrl ? (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Icons.CheckCircle2 className="h-3 w-3" /> Certificate on file
            </span>
          ) : null}
          {partyId && pinCertExistingUrl ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={docBusy != null}
                onClick={() => void openPinView()}
              >
                <Icons.Eye className="h-4 w-4 mr-1" />
                {docBusy === "pin-view" ? "Opening…" : "View"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={docBusy != null}
                onClick={() => void downloadPin()}
              >
                <Icons.Download className="h-4 w-4 mr-1" />
                {docBusy === "pin-dl" ? "…" : "Download"}
              </Button>
            </>
          ) : null}
        </div>
        <input
          ref={pinCertInputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            onPinCertFileChange(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>

      <div className="space-y-2">
        <Label>
          Company registration{" "}
          <span className="text-muted-foreground text-xs">(optional, PDF or image)</span>
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => companyRegInputRef.current?.click()}
            className="shrink-0"
          >
            <Icons.Paperclip className="h-4 w-4 mr-1.5" />
            {companyRegFile ? "Change file" : "Attach file"}
          </Button>
          {companyRegFile ? (
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{companyRegFile.name}</span>
          ) : null}
          {!companyRegFile && companyRegExistingUrl ? (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Icons.CheckCircle2 className="h-3 w-3" /> Document on file
            </span>
          ) : null}
          {partyId && companyRegExistingUrl ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={docBusy != null}
                onClick={() => void openRegView()}
              >
                <Icons.Eye className="h-4 w-4 mr-1" />
                {docBusy === "reg-view" ? "Opening…" : "View"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                disabled={docBusy != null}
                onClick={() => void downloadReg()}
              >
                <Icons.Download className="h-4 w-4 mr-1" />
                {docBusy === "reg-dl" ? "…" : "Download"}
              </Button>
            </>
          ) : null}
        </div>
        <input
          ref={companyRegInputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            onCompanyRegFileChange(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export function locationFieldsFromParty(party: {
  address?: {
    line1?: string;
    city?: string;
    region?: string;
    country?: string;
  };
  lastKnownLatitude?: number;
  lastKnownLongitude?: number;
}) {
  const formatted =
    party.address?.line1?.trim() ||
    [party.address?.city, party.address?.region, party.address?.country].filter(Boolean).join(", ");
  return {
    locationFormattedAddress: formatted ?? "",
    addressLine1: party.address?.line1 ?? "",
    addressCity: party.address?.city ?? "",
    addressRegion: party.address?.region ?? "",
    addressCountry: party.address?.country ?? "",
    latitude: party.lastKnownLatitude,
    longitude: party.lastKnownLongitude,
  };
}

export function isValidKenyanPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return false;
  return /^(?:254[17]\d{8}|0[17]\d{8}|[17]\d{8})$/.test(digits);
}

export function validateSupplierMasterForm(form: SupplierMasterFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.contactPersonFirstName.trim()) errors.contactPersonFirstName = "First name is required.";
  if (!form.contactPersonLastName.trim()) errors.contactPersonLastName = "Last name is required.";
  const email = form.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.phone.trim()) errors.phone = "Contact number is required.";
  if (!form.taxId.trim()) errors.taxId = "KRA PIN is required.";
  if (
    form.supplierPaymentMethod === "MPESA" &&
    form.supplierBankAccountNumber.trim() &&
    !isValidKenyanPhone(form.supplierBankAccountNumber)
  ) {
    errors.supplierBankAccountNumber =
      "Enter a valid Kenyan mobile number (e.g. 0712 345 678 or +254 712 345 678).";
  }
  const currency = form.defaultCurrency.trim().toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) {
    errors.defaultCurrency = "Currency must be a 3-letter code (e.g. KES).";
  }
  return errors;
}

export function supplierMasterFormToPayload(form: SupplierMasterFormValues) {
  const address =
    form.locationFormattedAddress.trim() ||
    form.addressCity.trim() ||
    form.addressRegion.trim() ||
    form.addressLine1.trim()
      ? {
          line1: form.addressLine1.trim() || form.locationFormattedAddress.trim() || undefined,
          city: form.addressCity.trim() || undefined,
          region: form.addressRegion.trim() || undefined,
          country: form.addressCountry.trim() || undefined,
        }
      : undefined;

  const email = form.email.trim();
  const method = form.supplierPaymentMethod;
  const bankName = form.supplierBankName.trim();
  const accountName = form.supplierBankAccountName.trim();
  const accountNumber = form.supplierBankAccountNumber.trim();
  const branchName = form.supplierBankBranchName.trim();
  const hasPaymentDetails = bankName || accountName || accountNumber || branchName;

  return {
    name: form.name.trim(),
    roles: ["supplier"] as PartyRole[],
    coolcatchSupplierKind: form.coolcatchSupplierKind,
    contactPersonFirstName: form.contactPersonFirstName.trim(),
    contactPersonLastName: form.contactPersonLastName.trim(),
    ...(email ? { email } : {}),
    phone: form.phone.trim(),
    paymentTermsId: form.paymentTermsId || undefined,
    defaultCurrency: form.defaultCurrency.trim().toUpperCase() || undefined,
    taxId: form.taxId.trim(),
    ...(hasPaymentDetails ? { supplierPaymentMethod: method } : {}),
    ...(method === "BANK" && bankName ? { supplierBankName: bankName } : {}),
    ...(method !== "MPESA" && accountName ? { supplierBankAccountName: accountName } : {}),
    ...(accountNumber ? { supplierBankAccountNumber: accountNumber } : {}),
    ...(method !== "TILL" && method !== "MPESA" && branchName
      ? { supplierBankBranchName: branchName }
      : {}),
    address,
    lastKnownLatitude: form.latitude,
    lastKnownLongitude: form.longitude,
    supplierType: form.coolcatchSupplierKind === "FARM" ? ("RAW_MATERIAL" as const) : ("OTHER" as const),
    status: "ACTIVE" as const,
  };
}
