"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { fetchPartySitesApi, type PartySiteRow } from "@/lib/api/party-sites";
import type { PartyRow } from "@/lib/types/masters";
import { EditModernTradeBranchSheet } from "@/components/customers/EditModernTradeBranchSheet";

type SupermarketBranchesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supermarket: PartyRow | null;
  onAddBranch: (supermarketId: string) => void;
  /** Bump when a branch was created outside this sheet so the list reloads. */
  refreshKey?: number;
};

export function SupermarketBranchesSheet({
  open,
  onOpenChange,
  supermarket,
  onAddBranch,
  refreshKey = 0,
}: SupermarketBranchesSheetProps) {
  const [sites, setSites] = React.useState<PartySiteRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [editSite, setEditSite] = React.useState<PartySiteRow | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [listTick, setListTick] = React.useState(0);

  const loadSites = React.useCallback(async () => {
    if (!supermarket?.id) {
      setSites([]);
      return;
    }
    setLoading(true);
    try {
      const { items } = await fetchPartySitesApi({ partyId: supermarket.id });
      setSites(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load branches");
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, [supermarket?.id]);

  React.useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    void loadSites();
  }, [open, loadSites, refreshKey, listTick]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) => {
      const hay = [
        s.name,
        s.code,
        s.phone,
        s.email,
        s.address?.line1,
        s.address?.city,
        s.address?.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sites, search]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0 space-y-3">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="min-w-0 space-y-1">
                <SheetTitle className="truncate">
                  {supermarket?.name ?? "Branches"}
                </SheetTitle>
                <SheetDescription>
                  Branches / outlets
                  {supermarket?.code ? ` · ${supermarket.code}` : ""}
                </SheetDescription>
              </div>
              {supermarket ? (
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => onAddBranch(supermarket.id)}
                >
                  <Icons.Plus className="mr-1.5 h-4 w-4" />
                  Add branch
                </Button>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mt-branch-search">Search branches</Label>
              <Input
                id="mt-branch-search"
                placeholder="Name, code, address, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Loading branches…</p>
            ) : filtered.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon="GitBranch"
                  title={sites.length === 0 ? "No branches yet" : "No matching branches"}
                  description={
                    sites.length === 0
                      ? "Add the first outlet for this supermarket."
                      : "Try a different search."
                  }
                  action={
                    sites.length === 0 && supermarket
                      ? {
                          label: "Add branch",
                          onClick: () => onAddBranch(supermarket.id),
                        }
                      : undefined
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-[72px] text-right">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{site.name}</p>
                          {site.phone ? (
                            <p className="text-xs text-muted-foreground">{site.phone}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {site.code || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px]">
                        <span className="line-clamp-2">
                          {site.address?.line1 || site.address?.city || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Update ${site.name}`}
                          onClick={() => {
                            setEditSite(site);
                            setEditOpen(true);
                          }}
                        >
                          <Icons.Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <EditModernTradeBranchSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        site={editSite}
        supermarketName={supermarket?.name}
        onSuccess={() => setListTick((n) => n + 1)}
      />
    </>
  );
}
