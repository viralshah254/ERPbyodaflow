"use client";

import * as React from "react";
import { Folder, FolderPlus, FileText, Landmark, Receipt, Shield, ShoppingCart, Store, Wallet, Warehouse, Files, Banknote } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHubGroup, fetchDocumentHub } from "@/lib/api/document-hub";
import type { DocumentHubGroup } from "@/lib/types/document-hub";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DRAWER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  banking: Landmark,
  compliance: Shield,
  expenses: Receipt,
  general: Files,
  inventory: Warehouse,
  purchases: ShoppingCart,
  sales: Store,
  receipts: Wallet,
  payments: Banknote,
};

function DrawerIcon({ groupKey, className }: { groupKey: string; className?: string }) {
  const Icon = DRAWER_ICONS[groupKey] ?? Folder;
  return <Icon className={className} />;
}

export default function DocumentHubGroupsPage() {
  const [groups, setGroups] = React.useState<DocumentHubGroup[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [name, setName] = React.useState("");
  const [parentKey, setParentKey] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const next = await fetchDocumentHub();
    setGroups(next.groups ?? []);
    setLoaded(true);
  }, []);

  React.useEffect(() => {
    void load().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Could not load groups.");
    });
  }, [load]);

  const parents = groups.filter((group) => !group.parentKey);
  const childrenOf = React.useCallback(
    (key: string) => groups.filter((group) => group.parentKey === key),
    [groups],
  );

  const needle = query.trim().toLowerCase();
  const visible = parents
    .map((parent) => {
      const children = childrenOf(parent.key);
      if (!needle) return { parent, children };
      const parentHit = parent.name.toLowerCase().includes(needle);
      const matched = children.filter((child) => child.name.toLowerCase().includes(needle));
      if (parentHit) return { parent, children };
      if (matched.length) return { parent, children: matched };
      return null;
    })
    .filter((row): row is { parent: DocumentHubGroup; children: DocumentHubGroup[] } => row != null);

  return (
    <PageShell>
      <PageHeader
        title="Groups"
        description="Drawers and document types. The classification list on a file is this same set of folders."
        breadcrumbs={[{ label: "Core", href: "/dashboard" }, { label: "Document Hub", href: "/documents/hub" }, { label: "Groups" }]}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
        <form
          className="rounded-xl border bg-card p-4 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || saving) return;
            setSaving(true);
            void createHubGroup(name.trim(), parentKey || undefined)
              .then(async () => {
                setName("");
                setParentKey("");
                toast.success("Folder saved. It now appears when you classify a file.");
                await load();
              })
              .catch((error) => {
                toast.error(error instanceof Error ? error.message : "The folder was not saved.");
              })
              .finally(() => setSaving(false));
          }}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FolderPlus className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight">Add a folder</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">
                A heading is a drawer. A line under it is a document type you can pick on a file. Adding a folder does not change files you have already classified.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
            <label className="block text-sm font-medium">
              Folder name
              <Input
                className="mt-1.5 h-11"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="For example, Site permits"
              />
            </label>
            <label className="block text-sm font-medium">
              Place it in
              <select
                className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 text-sm"
                value={parentKey}
                onChange={(event) => setParentKey(event.target.value)}
              >
                <option value="">On its own</option>
                {parents.map((parent) => (
                  <option key={parent._id} value={parent.key}>{parent.name}</option>
                ))}
              </select>
            </label>
            <Button type="submit" className="h-11" disabled={!name.trim() || saving}>
              {saving ? "Saving…" : "Add folder"}
            </Button>
          </div>
        </form>

        <label className="block text-sm font-medium">
          Find a folder
          <Input
            className="mt-1.5 h-11 max-w-md"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Supplier invoices, banking, fuel"
          />
        </label>

        {!loaded ? (
          <p className="text-[15px] text-muted-foreground">Loading folders…</p>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-[15px] leading-relaxed text-muted-foreground">
            {needle ? "No folder matches that search." : "No folders yet. Add one above, then pick it when you classify a file."}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visible.map(({ parent, children }) => (
              <section key={parent._id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <header className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary ring-1 ring-border">
                    <DrawerIcon groupKey={parent.key} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold tracking-tight">{parent.name}</h2>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {children.length === 0 ? "Drawer" : children.length === 1 ? "1 document type" : `${children.length} document types`}
                      {!parent.system ? " · Yours" : ""}
                    </p>
                  </div>
                </header>
                {children.length === 0 ? (
                  <p className="px-4 py-4 text-sm leading-relaxed text-muted-foreground">
                    Nothing filed under this drawer yet. Add a folder and place it in {parent.name}.
                  </p>
                ) : (
                  <ul>
                    {children.map((child) => (
                      <li key={child._id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[15px]">{child.name}</span>
                        {!child.system ? (
                          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground")}>
                            Yours
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
