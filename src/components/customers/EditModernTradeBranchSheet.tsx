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
import { toast } from "sonner";
import {
  updatePartySiteApi,
  type PartySiteRow,
} from "@/lib/api/party-sites";
import {
  LocationPickerField,
  type ResolvedLocation,
} from "@/components/location/LocationPickerField";
import { normalizeKenyaPhone, normalizeKenyaPhoneOptional } from "@/lib/phone";

type EditModernTradeBranchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: PartySiteRow | null;
  supermarketName?: string;
  onSuccess?: () => void;
};

export function EditModernTradeBranchSheet({
  open,
  onOpenChange,
  site,
  supermarketName,
  onSuccess,
}: EditModernTradeBranchSheetProps) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [location, setLocation] = React.useState<ResolvedLocation | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open || !site) return;
    setName(site.name ?? "");
    setCode(site.code ?? "");
    setPhone(site.phone ?? "");
    setError("");
    const line = site.address?.line1?.trim();
    if (line || site.latitude != null || site.longitude != null || site.googlePlaceId) {
      setLocation({
        formattedAddress: line ?? "",
        line1: line,
        city: site.address?.city,
        region: site.address?.region,
        country: site.address?.country,
        postalCode: site.address?.postalCode,
        latitude: site.latitude,
        longitude: site.longitude,
        placeId: site.googlePlaceId,
      });
    } else {
      setLocation(null);
    }
  }, [open, site]);

  const handleSave = async () => {
    if (!site) return;
    if (!name.trim()) {
      setError("Branch name is required.");
      toast.error("Branch name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const addressText = location?.formattedAddress?.trim() || location?.line1?.trim();
      await updatePartySiteApi(site.id, {
        name: name.trim(),
        code: code.trim() || undefined,
        phone: normalizeKenyaPhoneOptional(phone),
        address: addressText
          ? {
              line1: addressText,
              city: location?.city,
              region: location?.region,
              country: location?.country,
              postalCode: location?.postalCode,
            }
          : undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
        googlePlaceId: location?.placeId,
      });
      toast.success("Branch updated");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update branch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Update branch</SheetTitle>
          <SheetDescription>
            {supermarketName
              ? `Edit outlet under ${supermarketName}.`
              : "Edit this branch / outlet."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="edit-branch-name" className="flex flex-wrap items-baseline gap-1.5">
              <span>Branch name</span>
              <span className="text-xs font-medium text-destructive">Required</span>
            </Label>
            <Input
              id="edit-branch-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-branch-code" className="flex flex-wrap items-baseline gap-1.5">
              <span>Branch code</span>
              <span className="text-xs font-normal text-muted-foreground">Optional</span>
            </Label>
            <Input
              id="edit-branch-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="For LPO / order matching"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-branch-phone" className="flex flex-wrap items-baseline gap-1.5">
              <span>Phone</span>
              <span className="text-xs font-normal text-muted-foreground">Optional</span>
            </Label>
            <Input
              id="edit-branch-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => {
                if (!phone.trim()) return;
                setPhone(normalizeKenyaPhone(phone));
              }}
              placeholder="07… or 254…"
            />
          </div>

          <LocationPickerField optional value={location} onChange={setLocation} />
        </div>

        <SheetFooter className="px-6 py-4 border-t shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || !site}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
