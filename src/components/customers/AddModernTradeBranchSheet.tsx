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
import { toast } from "sonner";
import { fetchPartiesApi } from "@/lib/api/parties";
import { createPartySiteApi } from "@/lib/api/party-sites";
import type { PartyRow } from "@/lib/types/masters";
import {
  LocationPickerField,
  type ResolvedLocation,
} from "@/components/location/LocationPickerField";
import { normalizeKenyaPhone, normalizeKenyaPhoneOptional } from "@/lib/phone";
import { Building2, Plus } from "lucide-react";

const BRANCH_DRAFT_KEY = "erp.modern-trade-branch-draft.v1";

type BranchDraft = {
  supermarketId: string;
  name: string;
  code: string;
  phone: string;
  address: string;
  city?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
  googlePlaceId?: string;
  updatedAt: string;
};

function loadDraft(): BranchDraft | null {
  try {
    const raw = window.localStorage.getItem(BRANCH_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BranchDraft;
  } catch {
    return null;
  }
}

function saveDraft(draft: BranchDraft) {
  try {
    window.localStorage.setItem(BRANCH_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(BRANCH_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export type AddModernTradeBranchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSupermarketId?: string | null;
  selectSupermarketId?: string | null;
  onSelectSupermarketConsumed?: () => void;
  onAddSupermarket: () => void;
  onSuccess?: () => void;
};

export function AddModernTradeBranchSheet({
  open,
  onOpenChange,
  initialSupermarketId = null,
  selectSupermarketId = null,
  onSelectSupermarketConsumed,
  onAddSupermarket,
  onSuccess,
}: AddModernTradeBranchSheetProps) {
  const [supermarkets, setSupermarkets] = React.useState<PartyRow[]>([]);
  const [loadingList, setLoadingList] = React.useState(false);
  const [supermarketId, setSupermarketId] = React.useState("");
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [location, setLocation] = React.useState<ResolvedLocation | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const hydratedRef = React.useRef(false);

  const loadSupermarkets = React.useCallback(async () => {
    setLoadingList(true);
    try {
      const items = await fetchPartiesApi({
        role: "customer",
        sfaSegment: "MODERN_TRADE_HQ",
        channel: "MODERN_TRADE",
        status: "ACTIVE",
      });
      setSupermarkets(items);
      return items;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load supermarkets");
      setSupermarkets([]);
      return [] as PartyRow[];
    } finally {
      setLoadingList(false);
    }
  }, []);

  const applyDraftFields = (draft: BranchDraft) => {
    setName(draft.name);
    setCode(draft.code);
    setPhone(draft.phone);
    if (draft.address || draft.latitude || draft.longitude || draft.googlePlaceId) {
      setLocation({
        formattedAddress: draft.address,
        line1: draft.address || undefined,
        city: draft.city,
        region: draft.region,
        latitude: draft.latitude ? Number(draft.latitude) : undefined,
        longitude: draft.longitude ? Number(draft.longitude) : undefined,
        placeId: draft.googlePlaceId,
      });
    } else {
      setLocation(null);
    }
  };

  React.useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }

    void loadSupermarkets().then((items) => {
      const draft = loadDraft();
      const preferred =
        selectSupermarketId || initialSupermarketId || draft?.supermarketId || "";

      if (draft && !selectSupermarketId && !initialSupermarketId) {
        applyDraftFields(draft);
      } else if (initialSupermarketId && !selectSupermarketId) {
        if (draft?.supermarketId === initialSupermarketId) {
          applyDraftFields(draft);
        } else {
          setName("");
          setCode("");
          setPhone("");
          setLocation(null);
        }
      }

      if (preferred && (items.some((p) => p.id === preferred) || selectSupermarketId)) {
        setSupermarketId(preferred);
      } else if (items.length === 1 && !preferred) {
        setSupermarketId(items[0].id);
      }

      if (selectSupermarketId) {
        onSelectSupermarketConsumed?.();
      }
      hydratedRef.current = true;
    });
  }, [
    open,
    initialSupermarketId,
    selectSupermarketId,
    loadSupermarkets,
    onSelectSupermarketConsumed,
  ]);

  React.useEffect(() => {
    if (!open || !hydratedRef.current) return;
    saveDraft({
      supermarketId,
      name,
      code,
      phone,
      address: location?.formattedAddress ?? location?.line1 ?? "",
      city: location?.city,
      region: location?.region,
      latitude: location?.latitude != null ? String(location.latitude) : undefined,
      longitude: location?.longitude != null ? String(location.longitude) : undefined,
      googlePlaceId: location?.placeId,
      updatedAt: new Date().toISOString(),
    });
  }, [open, supermarketId, name, code, phone, location]);

  const selected = supermarkets.find((s) => s.id === supermarketId);

  const handleSave = async () => {
    const next: Record<string, string> = {};
    if (!supermarketId) next.supermarketId = "Select a supermarket (chain HQ).";
    if (!name.trim()) next.name = "Branch name is required.";
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error(Object.values(next)[0]);
      return;
    }

    setSaving(true);
    try {
      const addressText = location?.formattedAddress?.trim() || location?.line1?.trim();
      await createPartySiteApi({
        partyId: supermarketId,
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
        siteType: "BRANCH",
        status: "ACTIVE",
      });
      clearDraft();
      toast.success(selected ? `Branch added under ${selected.name}` : "Branch added");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add branch");
    } finally {
      setSaving(false);
    }
  };

  const handleAddSupermarket = () => {
    onOpenChange(false);
    onAddSupermarket();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Add branch / outlet</SheetTitle>
          <SheetDescription>
            Choose the supermarket (chain HQ), then add this branch. Progress is saved if you pause to
            create a supermarket.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-2">
            <Label className="flex flex-wrap items-baseline gap-1.5">
              <span>Supermarket</span>
              <span className="text-xs font-medium text-destructive">Required</span>
            </Label>
            <Select
              value={supermarketId || undefined}
              onValueChange={(v) => {
                setSupermarketId(v);
                if (errors.supermarketId) setErrors((e) => ({ ...e, supermarketId: "" }));
              }}
              disabled={loadingList}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingList ? "Loading supermarkets…" : "Select supermarket"}
                />
              </SelectTrigger>
              <SelectContent>
                {supermarkets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {s.name}
                        {s.code ? (
                          <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                            {s.code}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.supermarketId ? (
              <p className="text-xs text-destructive">{errors.supermarketId}</p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleAddSupermarket}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add supermarket
            </Button>
            {supermarkets.length === 0 && !loadingList ? (
              <p className="text-xs text-muted-foreground">
                No supermarket chains yet. Add a supermarket first, then you&apos;ll return here to
                create its branch.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mt-branch-name" className="flex flex-wrap items-baseline gap-1.5">
              <span>Branch name</span>
              <span className="text-xs font-medium text-destructive">Required</span>
            </Label>
            <Input
              id="mt-branch-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((err) => ({ ...err, name: "" }));
              }}
              placeholder="e.g. Naivas Westlands"
              disabled={!supermarketId && supermarkets.length > 0}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mt-branch-code" className="flex flex-wrap items-baseline gap-1.5">
              <span>Branch code</span>
              <span className="text-xs font-normal text-muted-foreground">Optional</span>
            </Label>
            <Input
              id="mt-branch-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="For LPO / order matching"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mt-branch-phone" className="flex flex-wrap items-baseline gap-1.5">
              <span>Phone</span>
              <span className="text-xs font-normal text-muted-foreground">Optional</span>
            </Label>
            <Input
              id="mt-branch-phone"
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
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loadingList}>
            {saving ? "Saving…" : "Add branch"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
