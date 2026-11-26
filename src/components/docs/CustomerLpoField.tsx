"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

/** Customer's own purchase order number. Optional, and only editable before the invoice is posted. */
export function CustomerLpoField({
  value,
  editable,
  onSave,
}: {
  value: string;
  editable: boolean;
  onSave: (next: string) => Promise<void>;
}) {
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => setDraft(value), [value]);

  if (!editable) return <span>{value.trim() || "—"}</span>;

  return (
    <Input
      value={draft}
      aria-label="Customer L.P.O. number"
      placeholder="Optional"
      disabled={saving}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next === value.trim()) return;
        setSaving(true);
        void onSave(next).finally(() => setSaving(false));
      }}
    />
  );
}
