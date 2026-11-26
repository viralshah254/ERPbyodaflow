"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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
  const [saved, setSaved] = React.useState(Boolean(value.trim()));
  React.useEffect(() => {
    setDraft(value);
    setSaved(Boolean(value.trim()));
  }, [value]);

  const dirty = draft.trim() !== value.trim();

  async function save() {
    const next = draft.trim();
    if (saving || next === value.trim()) return;
    setSaving(true);
    try {
      await onSave(next);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!editable) return <span>{value.trim() || "—"}</span>;

  return (
    <div className="w-full min-w-0 space-y-1">
      <Input
        value={draft}
        aria-label="Customer L.P.O. number"
        placeholder="Optional"
        disabled={saving}
        onChange={(event) => {
          setDraft(event.target.value);
          setSaved(false);
        }}
        onBlur={() => {
          void save();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          void save();
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto p-0"
          disabled={saving || !dirty}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            void save();
          }}
        >
          {saving ? "Saving…" : "Done"}
        </Button>
        {saved && !dirty ? <span className="text-xs text-muted-foreground">Saved</span> : null}
      </div>
    </div>
  );
}
