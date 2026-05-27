"use client";

import * as React from "react";
import { Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignOutletPriceList } from "@/lib/api/cool-catch";
import { fetchPriceListsForUi } from "@/lib/api/pricing";
import { type PriceList } from "@/lib/products/pricing-types";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export function OutletPriceListAssignment({
  outletOrgId,
  assignedPriceListId,
  onAssigned,
}: {
  outletOrgId: string;
  assignedPriceListId?: string | null;
  onAssigned?: () => void;
}) {
  const [priceLists, setPriceLists] = React.useState<PriceList[]>([]);
  const [selected, setSelected] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchPriceListsForUi()
      .then((pls) => setPriceLists(pls))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (assignedPriceListId) setSelected(assignedPriceListId);
    else setSelected("");
  }, [assignedPriceListId]);

  const handleAssign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await assignOutletPriceList(outletOrgId, selected);
      toast.success("Price list assigned successfully");
      onAssigned?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not assign price list";
      const hint =
        /403|forbidden/i.test(msg) ? " You may need franchise.commission.read on your HQ user." : "";
      toast.error(msg + hint);
    } finally {
      setSaving(false);
    }
  };

  const chosenList = priceLists.find((pl) => pl.id === selected);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag size={16} />
          Assigned price list
        </CardTitle>
        <CardDescription>
          Customer channels (WhatsApp, POS) use published prices on this list. Assigning a zone
          master auto-creates a derived outlet list so overrides stay per franchise.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="h-10 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className="space-y-2">
              <Label>Price list</Label>
              <Select value={selected || "__none__"} onValueChange={(v) => setSelected(v === "__none__" ? "" : v)}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select a price list…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {priceLists.map((pl) => (
                    <SelectItem key={pl.id} value={pl.id}>
                      {pl.name}
                      {pl.parentName ? ` ← ${pl.parentName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {chosenList?.parentName && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-100">
                <p className="font-medium mb-1">Derived price list</p>
                <p>
                  Based on <strong>{chosenList.parentName}</strong>
                  {chosenList.markupType === "PERCENT"
                    ? ` with +${chosenList.markupValue}% markup`
                    : chosenList.markupValue
                      ? ` with +${formatMoney(chosenList.markupValue, "KES")} flat add-on`
                      : ""}
                  . Zone base prices cascade; outlet-specific overrides win.
                </p>
              </div>
            )}

            {selected && !chosenList?.parentName && (
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                Standalone or zone master — assigning a shared FRANCHISE master creates a derived
                outlet list automatically.
              </div>
            )}

            <Button onClick={() => void handleAssign()} disabled={saving || !selected}>
              {saving ? "Saving…" : "Save assignment"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
