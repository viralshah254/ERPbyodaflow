"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createSfaSalesRep, fetchSfaSalesReps, type SfaSalesArea } from "@/lib/api/sfa-sales-reps";

/** What ERP keeps for a rep on an order or loader note. */
export type PickedSalesRep = { id: string; name: string; phone?: string; tillNumber?: string };

export function pickSalesRep(rep: PickedSalesRep): PickedSalesRep {
  return {
    id: rep.id,
    name: rep.name,
    ...(rep.phone ? { phone: rep.phone } : {}),
    ...(rep.tillNumber ? { tillNumber: rep.tillNumber } : {}),
  };
}

const repOption = (rep: PickedSalesRep & { areaName?: string; isActive?: boolean }): AsyncSearchableSelectOption => ({
  id: rep.id,
  label: rep.name,
  description: [rep.phone, rep.areaName].filter(Boolean).join(" · ") || undefined,
});

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Search by name or phone. Typed digits go to the phone field when adding. */
function prefillFrom(query: string) {
  const text = query.trim();
  return /^[+\d][\d\s-]{2,}$/.test(text) ? { name: "", phone: text } : { name: text, phone: "" };
}

function useSalesRepSearch(exclude: string[] = []) {
  const reps = React.useRef(new Map<string, PickedSalesRep>());
  const excluded = exclude.join("|");
  const loadOptions = React.useCallback(async (query: string) => {
    const { reps: rows } = await fetchSfaSalesReps(query);
    const skip = new Set(excluded ? excluded.split("|") : []);
    for (const rep of rows) reps.current.set(rep.id, pickSalesRep(rep));
    return rows.filter((rep) => !skip.has(rep.id)).map((rep) => repOption(rep));
  }, [excluded]);
  return { loadOptions, find: (id: string) => reps.current.get(id) };
}

export function AddSfaSalesRepSheet({
  open,
  onOpenChange,
  initialQuery = "",
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onCreated: (rep: PickedSalesRep) => void;
}) {
  const [form, setForm] = React.useState({ name: "", phone: "", email: "", tillNumber: "", regionName: "", areaName: "" });
  const [areas, setAreas] = React.useState<SfaSalesArea[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setForm({ ...prefillFrom(initialQuery), email: "", tillNumber: "", regionName: "", areaName: "" });
    let active = true;
    fetchSfaSalesReps().then((data) => { if (active) setAreas(data.areas); }).catch(() => undefined);
    return () => { active = false; };
  }, [open, initialQuery]);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "areaName" && !current.regionName) {
        const known = areas.find((area) => area.areaName.toLowerCase() === value.trim().toLowerCase());
        if (known) next.regionName = known.regionName;
      }
      return next;
    });
  };
  const ready = form.name.trim() && form.phone.trim() && form.regionName.trim() && form.areaName.trim();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    try {
      const rep = await createSfaSalesRep({
        name: form.name.trim(),
        phone: form.phone.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.tillNumber.trim() ? { tillNumber: form.tillNumber.trim() } : {}),
        regionName: form.regionName.trim(),
        areaName: form.areaName.trim(),
      });
      toast.success(rep.reused ? `${rep.name} is already a sales rep in SFA. Selected.` : `${rep.name} added to OdaFlow SFA.`);
      onCreated(pickSalesRep(rep));
      onOpenChange(false);
    } catch (error) {
      toast.error(errorText(error, "Could not add the sales rep to OdaFlow SFA."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <SheetHeader>
            <SheetTitle>Add sales rep</SheetTitle>
            <SheetDescription>
              The rep is created in OdaFlow SFA and can sign in to the SFA app with this phone number.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-1">
            <Label htmlFor="sfa-rep-name">Full name</Label>
            <Input id="sfa-rep-name" value={form.name} onChange={set("name")} autoComplete="off" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sfa-rep-phone">Phone</Label>
            <Input id="sfa-rep-phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="0712 345 678" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sfa-rep-email">Email (optional)</Label>
            <Input id="sfa-rep-email" type="email" value={form.email} onChange={set("email")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sfa-rep-till">M-Pesa till (optional)</Label>
            <Input id="sfa-rep-till" inputMode="numeric" value={form.tillNumber} onChange={set("tillNumber")} placeholder="123456" />
            <p className="text-xs text-muted-foreground">Prefills on sales orders when this rep is selected.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sfa-rep-area">Area</Label>
            <Input id="sfa-rep-area" list="sfa-rep-areas" value={form.areaName} onChange={set("areaName")} required />
            <datalist id="sfa-rep-areas">
              {areas.map((area) => <option key={`${area.regionName}|${area.areaName}`} value={area.areaName}>{area.regionName}</option>)}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sfa-rep-region">Region</Label>
            <Input id="sfa-rep-region" list="sfa-rep-regions" value={form.regionName} onChange={set("regionName")} required />
            <datalist id="sfa-rep-regions">
              {[...new Set(areas.map((area) => area.regionName))].map((region) => <option key={region} value={region} />)}
            </datalist>
            <p className="text-xs text-muted-foreground">SFA needs the area the rep covers and its region.</p>
          </div>
          <SheetFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={!ready || busy}>{busy ? "Adding…" : "Add to SFA"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function AddButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={onClick} disabled={disabled}
      aria-label="Add sales rep" title="Add a sales rep to OdaFlow SFA">
      <Icons.Plus className="h-4 w-4" />
    </Button>
  );
}

/** One rep. Used on route sales orders. */
export function SfaSalesRepSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: PickedSalesRep | null;
  onChange: (rep: PickedSalesRep | null) => void;
  disabled?: boolean;
}) {
  const { loadOptions, find } = useSalesRepSearch();
  const [adding, setAdding] = React.useState<string | null>(null);
  return (
    <div className="flex min-w-0 items-start gap-1.5">
      <div className="min-w-0 flex-1">
        <AsyncSearchableSelect
          id={id}
          value={value?.id ?? ""}
          selectedOption={value ? repOption(value) : null}
          onValueChange={(next) => onChange(next ? find(next) ?? null : null)}
          loadOptions={loadOptions}
          searchDebounceMs={250}
          allowClear
          disabled={disabled}
          placeholder="Select sales rep"
          searchPlaceholder="Search name or phone"
          emptyMessage="No SFA sales rep matches."
          onCreateNew={(query) => setAdding(query)}
          createNewLabel="Add sales rep to SFA"
          wrapLabels
          minDropdownWidth={300}
        />
      </div>
      <AddButton onClick={() => setAdding("")} disabled={disabled} />
      <AddSfaSalesRepSheet open={adding !== null} onOpenChange={(open) => { if (!open) setAdding(null); }}
        initialQuery={adding ?? ""} onCreated={onChange} />
    </div>
  );
}

/** Shows the saved rep and lets the user change or add one in place. */
export function EditableSalesRep({
  id,
  value,
  canEdit,
  emphasizeEmpty = false,
  onSave,
}: {
  id: string;
  value: PickedSalesRep | null;
  canEdit: boolean;
  /** Empty sales orders should be easy to spot. The field stays optional. */
  emphasizeEmpty?: boolean;
  onSave: (rep: PickedSalesRep | null) => Promise<void>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const label = value ? [value.name, value.phone].filter(Boolean).join(" · ") : "No sales rep yet";
  if (!editing) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className={value ? undefined : emphasizeEmpty ? "text-amber-800 dark:text-amber-200" : "text-muted-foreground"}>{label}</span>
        {canEdit && (
          <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setEditing(true)}>
            {value ? "Change" : "Add sales rep"}
          </Button>
        )}
      </span>
    );
  }
  return (
    <div className="w-full min-w-0 space-y-1">
      <SfaSalesRepSelect id={id} value={value} disabled={busy} onChange={(rep) => {
        setBusy(true);
        onSave(rep)
          .then(() => setEditing(false))
          .catch((error) => toast.error(errorText(error, "Could not save the sales rep.")))
          .finally(() => setBusy(false));
      }} />
      <Button type="button" variant="link" size="sm" className="h-auto p-0" disabled={busy} onClick={() => setEditing(false)}>
        Done
      </Button>
    </div>
  );
}

/** Several reps. Used on route loader notes. */
export function SfaSalesRepsField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: PickedSalesRep[];
  onChange: (reps: PickedSalesRep[]) => void;
  disabled?: boolean;
}) {
  const { loadOptions, find } = useSalesRepSearch(value.map((rep) => rep.id));
  const [adding, setAdding] = React.useState<string | null>(null);
  const add = (rep: PickedSalesRep | undefined) => {
    if (rep && !value.some((row) => row.id === rep.id)) onChange([...value, rep]);
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Chosen sales reps">
          {value.map((rep) => (
            <li key={rep.id} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 py-0.5 pl-2.5 pr-1 text-xs">
              <span className="font-medium">{rep.name}</span>
              {rep.phone && <span className="text-muted-foreground">{rep.phone}</span>}
              <button type="button" className="rounded-full p-0.5 hover:bg-muted disabled:opacity-50" disabled={disabled}
                onClick={() => onChange(value.filter((row) => row.id !== rep.id))} aria-label={`Remove ${rep.name}`}>
                <Icons.X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <AsyncSearchableSelect
            id={id}
            value=""
            onValueChange={(next) => add(find(next))}
            loadOptions={loadOptions}
            reloadToken={value.length}
            searchDebounceMs={250}
            disabled={disabled}
            placeholder={value.length ? "Add another sales rep" : "Select sales reps"}
            searchPlaceholder="Search name or phone"
            emptyMessage="No SFA sales rep matches."
            onCreateNew={(query) => setAdding(query)}
            createNewLabel="Add sales rep to SFA"
            wrapLabels
            minDropdownWidth={300}
          />
        </div>
        <AddButton onClick={() => setAdding("")} disabled={disabled} />
      </div>
      <AddSfaSalesRepSheet open={adding !== null} onOpenChange={(open) => { if (!open) setAdding(null); }}
        initialQuery={adding ?? ""} onCreated={add} />
    </div>
  );
}
