"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createHubGroup, fetchDocumentHub } from "@/lib/api/document-hub";
import type { DocumentHubGroup } from "@/lib/types/document-hub";
import { toast } from "sonner";

export default function DocumentHubGroupsPage() {
  const [groups, setGroups] = React.useState<DocumentHubGroup[]>([]);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const next = await fetchDocumentHub();
    setGroups(next.groups ?? []);
  }, []);

  React.useEffect(() => {
    void load().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Could not load groups.");
    });
  }, [load]);

  const parents = groups.filter((group) => !group.parentKey);
  const childrenOf = (key: string) => groups.filter((group) => group.parentKey === key);

  return (
    <PageShell>
      <PageHeader
        title="Groups"
        description="Folders for documents that are not part of the file you are approving."
        breadcrumbs={[{ label: "Core", href: "/dashboard" }, { label: "Document Hub", href: "/documents/hub" }, { label: "Groups" }]}
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || saving) return;
            setSaving(true);
            void createHubGroup(name.trim())
              .then(async () => {
                setName("");
                toast.success("Group saved.");
                await load();
              })
              .catch((error) => {
                toast.error(error instanceof Error ? error.message : "The group was not saved.");
              })
              .finally(() => setSaving(false));
          }}
        >
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="New group or subgroup name" aria-label="New group or subgroup name" />
          <Button type="submit" disabled={!name.trim() || saving}>{saving ? "Saving…" : "Add"}</Button>
        </form>
        <div className="overflow-hidden rounded-xl border bg-card">
          {parents.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No groups yet.</p> : null}
          {parents.map((group) => (
            <section key={group._id} className="border-b px-4 py-4 last:border-b-0">
              <h2 className="text-sm font-medium">{group.name}</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {childrenOf(group.key).map((child) => (
                  <li key={child._id} className="border-l pl-3">{child.name}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
