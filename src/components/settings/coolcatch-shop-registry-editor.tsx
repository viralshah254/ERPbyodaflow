"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GripVertical, Loader2, MapPin, Phone, Plus, RefreshCw, Star, Store, Trash2, X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CoolcatchShopRowDto } from "@/lib/api/coolcatch-bot-integration";
import { fetchCoolcatchBotOutletCandidatesApi } from "@/lib/api/coolcatch-bot-integration";
import { candidatesToShopRows, moveShopRow } from "@/lib/coolcatch/shop-registry";

type Props = {
  shops: CoolcatchShopRowDto[];
  onChange: (shops: CoolcatchShopRowDto[]) => void;
  disabled?: boolean;
  loading?: boolean;
};

export function CoolcatchShopRegistryEditor({ shops, onChange, disabled, loading }: Props) {
  const [candidatesLoading, setCandidatesLoading] = React.useState(false);
  const [confirmRefreshOpen, setConfirmRefreshOpen] = React.useState(false);
  const [pendingCandidates, setPendingCandidates] = React.useState<Awaited<ReturnType<typeof fetchCoolcatchBotOutletCandidatesApi>>["items"] | null>(null);

  const updateRow = (index: number, patch: Partial<CoolcatchShopRowDto>) => {
    onChange(shops.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(shops.filter((_, i) => i !== index));
  };

  const addRow = () => {
    onChange([
      ...shops,
      { erp_shop_id: "", location: "", wa_phone_e164: "", outlet_org_id: "" },
    ]);
  };

  const applyCandidates = (items: Awaited<ReturnType<typeof fetchCoolcatchBotOutletCandidatesApi>>["items"]) => {
    onChange(candidatesToShopRows(items, shops));
    const missingPhone = items.filter((c) => !c.suggestedWaPhoneE164).length;
    toast.success(
      missingPhone > 0
        ? `Loaded ${items.length} outlets. Enter WhatsApp numbers for ${missingPhone} that are missing.`
        : `Loaded ${items.length} outlets from franchise network.`
    );
  };

  const loadFromFranchise = async () => {
    setCandidatesLoading(true);
    try {
      const { items } = await fetchCoolcatchBotOutletCandidatesApi();
      if (!items.length) {
        toast.error("No active franchise outlets found. Add outlets under Franchise first.");
        return;
      }
      if (shops.length > 0) {
        setPendingCandidates(items);
        setConfirmRefreshOpen(true);
        return;
      }
      applyCandidates(items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load franchise outlets.");
    } finally {
      setCandidatesLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading outlets…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {shops.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-8 text-center">
          <Store className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No outlets connected yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Import your franchise outlets to connect them to the WhatsApp bot.
          </p>
          <Button
            type="button"
            size="sm"
            disabled={disabled || candidatesLoading}
            onClick={() => void loadFromFranchise()}
          >
            {candidatesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Import from franchise network
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || candidatesLoading}
              onClick={() => void loadFromFranchise()}
            >
              {candidatesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh from franchise
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add manually
            </Button>
          </div>

          <div className="grid gap-3">
            {shops.map((row, index) => (
              <div
                key={`${row.outlet_org_id || "new"}-${index}`}
                className={
                  "group relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm" +
                  (index === 0 ? " ring-1 ring-primary/20" : "")
                }
              >
                {index === 0 && (
                  <span className="absolute -top-2.5 left-3 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star className="h-3 w-3" /> First outlet
                  </span>
                )}

                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 pt-1 opacity-0 group-hover:opacity-60 transition-opacity">
                    <button
                      type="button"
                      className="p-0.5 hover:text-foreground disabled:opacity-30"
                      disabled={disabled || index === 0}
                      onClick={() => onChange(moveShopRow(shops, index, -1))}
                    >
                      <GripVertical className="h-4 w-4 rotate-0" />
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Shop code</Label>
                      <Input
                        value={row.erp_shop_id}
                        onChange={(e) => updateRow(index, { erp_shop_id: e.target.value })}
                        disabled={disabled}
                        placeholder="F0002"
                        className="font-mono text-sm h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        <MapPin className="inline h-3 w-3 mr-1" />
                        Location name
                      </Label>
                      <Input
                        value={row.location}
                        onChange={(e) => updateRow(index, { location: e.target.value })}
                        disabled={disabled}
                        placeholder="Kitengela"
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        <Phone className="inline h-3 w-3 mr-1" />
                        WhatsApp number
                      </Label>
                      <Input
                        value={row.wa_phone_e164}
                        onChange={(e) => updateRow(index, { wa_phone_e164: e.target.value })}
                        disabled={disabled}
                        placeholder="+254719631276"
                        className="font-mono text-sm h-9"
                      />
                      {row.wa_phone_e164 && !row.wa_phone_e164.trim().startsWith("+") && (
                        <p className="text-[10px] text-destructive mt-0.5">Must start with + (e.g. +254…)</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Outlet ID</Label>
                      <p className="font-mono text-[11px] text-muted-foreground break-all leading-relaxed pt-1.5">
                        {row.outlet_org_id ? row.outlet_org_id : <span className="italic">Not linked</span>}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={disabled}
                    onClick={() => removeRow(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Outlets loaded from{" "}
        <Link href="/franchise/network/outlets" className="underline">
          Franchise → Outlets
        </Link>
        . The WhatsApp number must match the number used for orders at each outlet. All outlets share the
        same product list — prices are loaded per outlet.
      </p>

      <ConfirmDialog
        open={confirmRefreshOpen}
        onOpenChange={(open) => {
          setConfirmRefreshOpen(open);
          if (!open) setPendingCandidates(null);
        }}
        title="Refresh outlet list?"
        description={`This will update the registry with ${pendingCandidates?.length ?? 0} outlet(s) from your franchise network. WhatsApp numbers you already entered are kept when the outlet matches.`}
        confirmLabel="Refresh outlets"
        onConfirm={() => {
          if (pendingCandidates) applyCandidates(pendingCandidates);
          setPendingCandidates(null);
        }}
      />
    </div>
  );
}
