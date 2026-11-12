"use client";

import * as React from "react";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { apiRequest } from "@/lib/api/client";
import { PAYROLL_JOB_TITLE_GROUPS } from "@/lib/payroll/employee-form-options";
import { useAuthStore } from "@/stores/auth-store";

type TitleKind = "customer-designations" | "employee-job-titles";

const CONTACT_TITLES = ["Accounts Payable", "Buyer", "Finance Manager", "Owner", "Store Manager"];
const EMPLOYEE_TITLES = PAYROLL_JOB_TITLE_GROUPS.flatMap((group) => group.titles);

export function useBusinessTitles(kind: TitleKind) {
  const orgId = useAuthStore((state) => state.org?.orgId);
  const [catalogue, setCatalogue] = React.useState<{ orgId: string; items: string[] }>();
  const [loadError, setLoadError] = React.useState(false);
  const path = `/api/settings/${kind}`;
  const activeOrg = React.useRef(orgId);
  activeOrg.current = orgId;
  React.useEffect(() => {
    if (!orgId) return;
    let current = true;
    setLoadError(false);
    void apiRequest<{ items: string[] }>(path).then(({ items }) => {
      if (current) setCatalogue((previous) => ({
        orgId, items: [...items, ...(previous?.orgId === orgId ? previous.items : [])],
      }));
    }).catch(() => {
      if (current) setLoadError(true);
    });
    return () => { current = false; };
  }, [orgId, path]);

  const add = async (title: string) => {
    if (!orgId) throw new Error("Select a business before adding an option.");
    const { label } = await apiRequest<{ label: string }>(path, { method: "POST", body: { label: title } });
    if (activeOrg.current !== orgId) throw new Error("The business changed. Reopen the form to select a title.");
    setCatalogue((previous) => ({ orgId, items: [...(previous?.orgId === orgId ? previous.items : []), label] }));
    return label;
  };
  return {
    items: catalogue?.orgId === orgId ? catalogue?.items ?? [] : [],
    loading: Boolean(orgId && catalogue?.orgId !== orgId && !loadError),
    loadError,
    add,
  };
}

export function BusinessTitlePicker({
  id, kind, value, onChange, catalogue, disabled,
}: {
  id: string;
  kind: TitleKind;
  value: string;
  onChange: (value: string) => void;
  catalogue: ReturnType<typeof useBusinessTitles>;
  disabled?: boolean;
}) {
  const label = kind === "customer-designations" ? "designation" : "job title";
  const choices = kind === "customer-designations" ? CONTACT_TITLES : EMPLOYEE_TITLES;
  const titles = new Map<string, string>();
  for (const title of [value, ...catalogue.items, ...choices]) {
    const key = title.trim().replace(/\s+/g, " ").toLowerCase();
    if (key && !titles.has(key)) titles.set(key, title);
  }
  const options = [...titles.values()].sort((a, b) => a.localeCompare(b)).map((title) => ({ value: title, label: title }));
  return (
    <>
      <Combobox
        id={id}
        value={value || undefined}
        onChange={onChange}
        options={value ? [{ value: "", label: "Clear selection" }, ...options] : options}
        placeholder={`Select ${label}`}
        searchPlaceholder={`Search or add ${label}…`}
        createLabel={`Add ${label}`}
        createOnEnter={false}
        loading={catalogue.loading}
        disabled={disabled}
        onCreate={async (title) => {
          try {
            onChange(await catalogue.add(title));
          } catch (error) {
            toast.error(error instanceof Error ? error.message : `Could not add ${label}.`);
            return false;
          }
        }}
      />
      {catalogue.loadError && <p className="text-xs text-muted-foreground">Business options could not be loaded.</p>}
    </>
  );
}
