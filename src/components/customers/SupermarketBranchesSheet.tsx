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
import { fetchPartiesApi } from "@/lib/api/parties";
import type { PartyRow } from "@/lib/types/masters";

type SupermarketBranchesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supermarket: PartyRow | null;
  onAddBranch: (supermarketId: string) => void;
  onEditBranch: (branchId: string, supermarket: PartyRow) => void;
  /** Bump when a branch was created outside this sheet so the list reloads. */
  refreshKey?: number;
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
}: SupermarketBranchesSheetProps) {
  const [branches, setBranches] = React.useState<PartyRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");

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

  return (
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
                  <TableHead className="w-[72px] text-right">Edit</TableHead>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
