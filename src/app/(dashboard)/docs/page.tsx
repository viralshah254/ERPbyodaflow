"use client";

import * as React from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/terminology";
import type { TerminologyKey } from "@/config/industryTemplates/types";
import { useTerminology } from "@/stores/orgContextStore";
import { useAuthStore } from "@/stores/auth-store";
import { useHasPermission, useCanWriteDocType, canWriteDocType } from "@/lib/rbac/use-write-guard";
import { fetchDocumentListPageApi } from "@/lib/api/documents";
import type { DocTypeKey } from "@/config/documents";
import type { DocListRow } from "@/lib/types/documents";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

type Tile = {
  type: DocTypeKey;
  labelKey: TerminologyKey;
  icon: keyof typeof Icons;
  purpose: string;
  read: string[];
  /** Pull a few rows for the recent feed, not only the count. */
  recent?: boolean;
};

const SELL: Tile[] = [
  {
    type: "quote",
    labelKey: "quote",
    icon: "FileText",
    purpose: "Price and terms before the customer commits.",
    read: ["sales.orders.read", "sales.read"],
    recent: true,
  },
  {
    type: "sales-order",
    labelKey: "salesOrder",
    icon: "ShoppingCart",
    purpose: "Confirmed demand, ready to pick and deliver.",
    read: ["sales.orders.read", "sales.read"],
    recent: true,
  },
  {
    type: "delivery-note",
    labelKey: "deliveryNote",
    icon: "Truck",
    purpose: "Goods leaving the warehouse, through to proof of delivery.",
    read: ["sales.deliveries.read", "sales.read"],
    recent: true,
  },
  {
    type: "invoice",
    labelKey: "invoice",
    icon: "Receipt",
    purpose: "What the customer owes, including tax.",
    read: ["sales.invoices.read", "finance.read"],
    recent: true,
  },
];

const BUY: Tile[] = [
  {
    type: "purchase-order",
    labelKey: "purchaseOrder",
    icon: "ClipboardList",
    purpose: "Materials and finished goods you have committed to buy.",
    read: ["purchasing.orders.read", "purchase.read"],
    recent: true,
  },
  {
    type: "grn",
    labelKey: "goodsReceipt",
    icon: "PackageCheck",
    purpose: "Stock received against a purchase, ready to put away.",
    read: ["purchasing.grn.read", "purchase.read"],
    recent: true,
  },
  {
    type: "bill",
    labelKey: "bill",
    icon: "FileText",
    purpose: "Supplier invoices to match to the receipt and pay.",
    read: ["purchasing.bills.read", "purchase.read"],
    recent: true,
  },
];

const ADJUST: Tile[] = [
  {
    type: "credit-note",
    labelKey: "creditNote",
    icon: "RotateCcw",
    purpose: "Returns, shortages, and price corrections for customers.",
    read: ["sales.returns.read"],
  },
  {
    type: "debit-note",
    labelKey: "debitNote",
    icon: "BadgePlus",
    purpose: "Extra charges raised after the customer invoice.",
    read: ["sales.returns.read"],
  },
  {
    type: "purchase-credit-note",
    labelKey: "purchaseCreditNote",
    icon: "RotateCcw",
    purpose: "Credits received from suppliers.",
    read: ["purchasing.bills.read"],
  },
  {
    type: "purchase-debit-note",
    labelKey: "purchaseDebitNote",
    icon: "BadgePlus",
    purpose: "Amounts charged back to suppliers.",
    read: ["purchasing.returns.read"],
  },
  {
    type: "journal",
    labelKey: "journalEntry",
    icon: "FileEdit",
    purpose: "Manual ledger entries that still keep a paper trail.",
    read: ["finance.journals.read", "finance.read"],
  },
];

const ATTENTION: Array<{
  id: string;
  type: DocTypeKey;
  status: string;
  label: string;
  read: string[];
}> = [
  {
    id: "so-pending",
    type: "sales-order",
    status: "PENDING_APPROVAL",
    label: "Orders waiting approval",
    read: ["sales.orders.read", "sales.read"],
  },
  {
    id: "dn-transit",
    type: "delivery-note",
    status: "IN_TRANSIT",
    label: "Deliveries on the road",
    read: ["sales.deliveries.read", "sales.read"],
  },
  {
    id: "inv-draft",
    type: "invoice",
    status: "DRAFT",
    label: "Invoices still in draft",
    read: ["sales.invoices.read", "finance.read"],
  },
  {
    id: "po-pending",
    type: "purchase-order",
    status: "PENDING_APPROVAL",
    label: "Purchases waiting approval",
    read: ["purchasing.orders.read", "purchase.read"],
  },
  {
    id: "grn-draft",
    type: "grn",
    status: "DRAFT",
    label: "Receipts not posted",
    read: ["purchasing.grn.read", "purchase.read"],
  },
];

const ALL_TILES = [...SELL, ...BUY, ...ADJUST];

function canRead(permissions: string[], required: string[]): boolean {
  if (permissions.includes("*")) return true;
  return required.some((permission) => permissions.includes(permission));
}

function formatCount(value: number | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-KE").format(value);
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

type RecentRow = DocListRow & { type: DocTypeKey };

function NewMenuItem({ type, label }: { type: DocTypeKey; label: string }) {
  const canWrite = useCanWriteDocType(type);
  if (!canWrite) return null;
  return (
    <DropdownMenuItem asChild>
      <Link href={`/docs/${type}/new`}>{label}</Link>
    </DropdownMenuItem>
  );
}

function DocTileCard({
  tile,
  label,
  count,
  loaded,
  step,
}: {
  tile: Tile;
  label: string;
  count: number | undefined;
  loaded: boolean;
  step?: number;
}) {
  const canWrite = useCanWriteDocType(tile.type);
  const Icon = (Icons[tile.icon] || Icons.FileText) as React.ComponentType<{ className?: string }>;
  return (
    <article className="flex h-full flex-col rounded-xl border bg-card shadow-sm transition-colors hover:border-primary/40">
      <Link href={`/docs/${tile.type}`} className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-right">
            {step != null ? (
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Step {step}
              </p>
            ) : null}
            <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight">
              {loaded ? formatCount(count) : <span className="inline-block h-7 w-10 animate-pulse rounded bg-muted" />}
            </p>
          </div>
        </div>
        <h3 className="mt-3 text-sm font-semibold">{label}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tile.purpose}</p>
      </Link>
      <div className="flex items-center justify-between border-t px-4 py-2 text-xs">
        <Link href={`/docs/${tile.type}`} className="font-medium text-primary hover:underline">
          Open list
        </Link>
        {canWrite ? (
          <Link href={`/docs/${tile.type}/new`} className="text-muted-foreground hover:text-foreground">
            New
          </Link>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}

export default function DocumentCenterHubPage() {
  const terminology = useTerminology();
  const permissions = useAuthStore((s) => s.permissions);
  const canWriteAny = useHasPermission(
    "sales.write",
    "purchase.write",
    "finance.write",
    "finance.ar.write",
    "finance.gl.write",
    "admin.settings",
  );
  const permissionKey = permissions.join("\u0001");

  const visibleSell = SELL.filter((tile) => canRead(permissions, tile.read));
  const visibleBuy = BUY.filter((tile) => canRead(permissions, tile.read));
  const visibleAdjust = ADJUST.filter((tile) => canRead(permissions, tile.read));
  const visibleAttention = ATTENTION.filter((item) => canRead(permissions, item.read));

  const [totals, setTotals] = React.useState<Partial<Record<DocTypeKey, number>>>({});
  const [attention, setAttention] = React.useState<Record<string, number>>({});
  const [recent, setRecent] = React.useState<RecentRow[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  const labelFor = React.useCallback(
    (key: TerminologyKey) => t(key, terminology),
    [terminology],
  );

  React.useEffect(() => {
    const perms = permissionKey ? permissionKey.split("\u0001") : [];
    const tiles = ALL_TILES.filter((tile) => canRead(perms, tile.read));
    const watches = ATTENTION.filter((item) => canRead(perms, item.read));
    if (tiles.length === 0 && watches.length === 0) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    setLoaded(false);

    async function load() {
      const [tileResults, watchResults] = await Promise.all([
        Promise.all(
          tiles.map(async (tile) => {
            try {
              const page = await fetchDocumentListPageApi(tile.type, { limit: tile.recent ? 6 : 1 });
              return { tile, page };
            } catch {
              return { tile, page: null };
            }
          }),
        ),
        Promise.all(
          watches.map(async (item) => {
            try {
              const page = await fetchDocumentListPageApi(item.type, { limit: 1, status: item.status });
              return { id: item.id, total: page.total };
            } catch {
              return { id: item.id, total: undefined };
            }
          }),
        ),
      ]);
      if (cancelled) return;

      const nextTotals: Partial<Record<DocTypeKey, number>> = {};
      const nextRecent: RecentRow[] = [];
      for (const result of tileResults) {
        if (!result.page) continue;
        if (typeof result.page.total === "number") nextTotals[result.tile.type] = result.page.total;
        if (result.tile.recent) {
          for (const row of result.page.items) {
            nextRecent.push({ ...row, type: result.tile.type });
          }
        }
      }
      nextRecent.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

      const nextAttention: Record<string, number> = {};
      for (const result of watchResults) {
        if (typeof result.total === "number") nextAttention[result.id] = result.total;
      }
      setTotals(nextTotals);
      setRecent(nextRecent.slice(0, 8));
      setAttention(nextAttention);
      setLoaded(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [permissionKey]);

  const createGroups: Array<{ label: string; tiles: Tile[] }> = [
    { label: "Sell", tiles: visibleSell },
    { label: "Buy", tiles: visibleBuy },
    { label: "Adjust", tiles: visibleAdjust },
  ];

  return (
    <PageLayout
      title="Document Center"
      description="The commercial paper trail: sell, receive, invoice, and correct."
      actions={
        canWriteAny ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Icons.Plus className="mr-2 h-4 w-4" />
                New document
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {createGroups
                .map((group) => ({
                  ...group,
                  tiles: group.tiles.filter((tile) => canWriteDocType(permissions, tile.type)),
                }))
                .filter((group) => group.tiles.length > 0)
                .map((group, index) => (
                  <React.Fragment key={group.label}>
                    {index > 0 ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                    {group.tiles.map((tile) => (
                      <NewMenuItem key={tile.type} type={tile.type} label={labelFor(tile.labelKey)} />
                    ))}
                  </React.Fragment>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6 pb-6">
        {visibleAttention.length > 0 ? (
          <section aria-label="Needs attention" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {visibleAttention.map((item) => {
              const count = attention[item.id];
              const hot = loaded && (count ?? 0) > 0;
              return (
                <Link
                  key={item.id}
                  href={`/docs/${item.type}?status=${item.status}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted/50",
                    hot && "border-amber-500/40",
                  )}
                >
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={cn("font-semibold tabular-nums", hot && "text-amber-700 dark:text-amber-300")}>
                    {loaded ? formatCount(count) : "·"}
                  </span>
                </Link>
              );
            })}
          </section>
        ) : null}

        <div data-tour-step="doc-type-list" data-tutorial-hint="doc-type-list" className="flex flex-col gap-6">
          {visibleSell.length > 0 ? (
            <section>
              <header className="mb-3">
                <h2 className="text-sm font-semibold">Sell</h2>
                <p className="text-xs text-muted-foreground">From the first price through to the tax invoice.</p>
              </header>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {visibleSell.map((tile, index) => (
                  <DocTileCard
                    key={tile.type}
                    tile={tile}
                    label={labelFor(tile.labelKey)}
                    count={totals[tile.type]}
                    loaded={loaded}
                    step={index + 1}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {visibleBuy.length > 0 ? (
            <section>
              <header className="mb-3">
                <h2 className="text-sm font-semibold">Buy</h2>
                <p className="text-xs text-muted-foreground">From the purchase commitment to the supplier bill.</p>
              </header>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleBuy.map((tile, index) => (
                  <DocTileCard
                    key={tile.type}
                    tile={tile}
                    label={labelFor(tile.labelKey)}
                    count={totals[tile.type]}
                    loaded={loaded}
                    step={index + 1}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {visibleAdjust.length > 0 ? (
            <section>
              <header className="mb-3">
                <h2 className="text-sm font-semibold">Corrections and the ledger</h2>
                <p className="text-xs text-muted-foreground">
                  Credits, extra charges, and journals that keep the books honest.
                </p>
              </header>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleAdjust.map((tile) => (
                  <DocTileCard
                    key={tile.type}
                    tile={tile}
                    label={labelFor(tile.labelKey)}
                    count={totals[tile.type]}
                    loaded={loaded}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border bg-card">
            <header className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Recent</h2>
              <Icons.Clock className="h-4 w-4 text-muted-foreground" />
            </header>
            {!loaded ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">
                No documents yet. Start with a customer order or a purchase order.
              </p>
            ) : (
              <ul className="divide-y">
                {recent.map((row) => {
                  const tile = ALL_TILES.find((item) => item.type === row.type);
                  return (
                    <li key={`${row.type}-${row.id}`}>
                      <Link
                        href={`/docs/${row.type}/${row.id}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                            {tile ? labelFor(tile.labelKey) : row.type}
                          </p>
                          <p className="truncate font-medium">{row.number || "Draft"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.party || "No party"} · {shortDate(row.date)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={row.status} />
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {row.total != null
                              ? formatMoney(Number(row.total), row.currency ?? "KES", {
                                  decimals: Number(row.total) % 1 === 0 ? 0 : 2,
                                })
                              : ""}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  );
}
