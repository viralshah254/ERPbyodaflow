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
import { fetchPartiesApi, hidePartyInOrgApi } from "@/lib/api/parties";
import type { PartyRow } from "@/lib/types/masters";
import { CustomerHideConfirmDialog, type CustomerHideKind } from "@/components/customers/CustomerHideConfirmDialog";

type SupermarketBranchesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supermarket: PartyRow | null;
  onAddBranch: (supermarketId: string) => void;
  onEditBranch: (branchId: string, supermarket: PartyRow) => void;
  /** Bump when a branch was created outside this sheet so the list reloads. */
  refreshKey?: number;
  /** After a branch is hidden in this organisation. */
  onHidden?: () => void;
  /** After the supermarket HQ (and its branches) are hidden. */
  onHqHidden?: () => void;
};

/**
 * Lists modern-trade branch customers (Parties with parentPartyId = HQ).
 * Each branch is a full AR customer — add/edit uses the customer stepper.
 */
export function SupermarketBranchesSheet({
  open,
  onOpenChange,
  supermarket,
  onAddBranch,
  onEditBranch,
  refreshKey = 0,
  onHidden,
  onHqHidden,
}: SupermarketBranchesSheetProps) {
  const [branches, setBranches] = React.useState<PartyRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [hideTarget, setHideTarget] = React.useState<{
    id: string;
    name: string;
    kind: CustomerHideKind;
  } | null>(null);

  const loadBranches = React.useCallback(async () => {
    if (!supermarket?.id) {
      setBranches([]);
      return;
    }
    setLoading(true);
    try {
      const items = await fetchPartiesApi({
        role: "customer",
        parentPartyId: supermarket.id,
        sfaSegment: "MODERN_TRADE_BRANCH",
        status: "ACTIVE",
        limit: 100,
      });
      setBranches(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load branches");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [supermarket?.id]);

  React.useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    void loadBranches();
  }, [open, loadBranches, refreshKey]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => {
      const hay = [
        b.name,
        b.tradingName,
        b.code,
        b.phone,
        b.email,
        b.address?.line1,
        b.address?.city,
        b.address?.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [branches, search]);

  const confirmHide = async () => {
    if (!hideTarget) return;
    try {
      const result = await hidePartyInOrgApi(hideTarget.id);
      if (hideTarget.kind === "hq") {
        toast.success(
          result.branchCount > 0
            ? `Removed from this organisation, including ${result.branchCount} branch${result.branchCount === 1 ? "" : "es"}.`
            : "Supermarket removed from this organisation."
        );
        setHideTarget(null);
        onHqHidden?.();
        onOpenChange(false);
        return;
      }
      toast.success("Branch removed from this organisation.");
      setHideTarget(null);
      await loadBranches();
      onHidden?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove this customer.");
      throw err;
    }
  };

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
                Branch customers
                {supermarket?.code ? ` · ${supermarket.code}` : ""}
                {" — each can order and invoice like HQ"}
              </SheetDescription>
            </div>
            {supermarket ? (
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() =>
                    setHideTarget({ id: supermarket.id, name: supermarket.name, kind: "hq" })
                  }
                >
                  <Icons.Trash2 className="mr-1.5 h-4 w-4" />
                  Remove
                </Button>
                <Button
                  size="sm"
                  className="shrink-0"
                  onClick={() => onAddBranch(supermarket.id)}
                >
                  <Icons.Plus className="mr-1.5 h-4 w-4" />
                  Add branch
                </Button>
              </div>
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
                title={branches.length === 0 ? "No branches yet" : "No matching branches"}
                description={
                  branches.length === 0
                    ? "Add a branch as a full customer (credit, price tag, contact) under this supermarket."
                    : "Try a different search."
                }
                action={
                  branches.length === 0 && supermarket
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
                  <TableHead className="w-[96px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{branch.name}</p>
                        {branch.phone ? (
                          <p className="text-xs text-muted-foreground">{branch.phone}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {branch.code || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px]">
                      <span className="line-clamp-2">
                        {branch.address?.line1 || branch.address?.city || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Update ${branch.name}`}
                          onClick={() => {
                            if (supermarket) onEditBranch(branch.id, supermarket);
                          }}
                        >
                          <Icons.Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Remove ${branch.name} from this organisation`}
                          onClick={() =>
                            setHideTarget({ id: branch.id, name: branch.name, kind: "branch" })
                          }
                        >
                          <Icons.Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
      <CustomerHideConfirmDialog
        open={!!hideTarget}
        onOpenChange={(next) => {
          if (!next) setHideTarget(null);
        }}
        name={hideTarget?.name ?? ""}
        kind={hideTarget?.kind ?? "branch"}
        onConfirm={confirmHide}
      />
    </>
  );
}
