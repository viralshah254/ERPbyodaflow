"use client";

import * as React from "react";
import Link from "next/link";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { RecipeHistory, RecipeRevision, RecipeRevisionChange, RecipeSnapshotItem } from "@/lib/api/manufacturing";
import { compareItems, describeChanges, scrapPercentOf, type ChangeTone, type NameLookup } from "@/lib/manufacturing/recipe-changes";
import { cn } from "@/lib/utils";

const TONE: Record<ChangeTone, { chip: string; sign: string }> = {
  added: { chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", sign: "+" },
  removed: { chip: "border-rose-500/30 bg-rose-500/10 text-rose-700 line-through decoration-rose-500/50 dark:text-rose-300", sign: "−" },
  changed: { chip: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200", sign: "~" },
};

const SOURCE: Record<RecipeRevision["source"], { label: string; icon: keyof typeof Icons }> = {
  CREATED: { label: "Created", icon: "Sparkles" },
  BASELINE: { label: "Starting point", icon: "Archive" },
  EDIT: { label: "Edited", icon: "Pencil" },
  RESTORE: { label: "Restored", icon: "RotateCcw" },
  APPLIED_DRAFT: { label: "Applied draft", icon: "GitMerge" },
};

export function namesFromHistory(history: Pick<RecipeHistory, "productNames" | "warehouseNames"> | null, fallback?: Record<string, string>): NameLookup {
  return {
    product: (id) => history?.productNames[id]?.name ?? fallback?.[id] ?? history?.productNames[id]?.sku ?? id,
    warehouse: (id) => history?.warehouseNames[id] ?? id,
  };
}

const CHANGE_CHIP_PILE_THRESHOLD = 20;

export function ChangeChips({
  changes,
  names,
  limit = 6,
  pileThreshold = CHANGE_CHIP_PILE_THRESHOLD,
  className,
}: {
  changes: RecipeRevisionChange[];
  names: NameLookup;
  limit?: number;
  /** Show an ellipsis on the overflow badge when the change count exceeds this. */
  pileThreshold?: number;
  className?: string;
}) {
  const described = describeChanges(changes, names);
  if (!described.length) return null;

  const shown = described.slice(0, limit);
  const hidden = described.length - shown.length;

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Changes">
      {shown.map((change, index) => (
        <li key={`${change.subject}-${index}`} className={cn("inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs", TONE[change.tone].chip)}>
          <span aria-hidden className="font-semibold">{TONE[change.tone].sign}</span>
          <span className="truncate font-medium">{change.subject}</span>
          {change.detail && <span className="truncate tabular-nums opacity-80 no-underline">{change.detail}</span>}
        </li>
      ))}
      {hidden > 0 && (
        <li
          className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-0.5 text-xs text-muted-foreground"
          aria-label={`${hidden} more changes — see full history`}
        >
          {described.length > pileThreshold ? <Icons.Ellipsis className="size-3.5 shrink-0" aria-hidden /> : null}
          <span>+{hidden} more</span>
        </li>
      )}
    </ul>
  );
}

const formatMoney = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatQty = (value?: number) => (value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 });

function dayLabel(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE d MMM yyyy");
}

function ItemCell({ item }: { item?: RecipeSnapshotItem }) {
  if (!item) return <span className="text-muted-foreground">—</span>;
  const scrap = scrapPercentOf(item);
  return (
    <span className="tabular-nums">
      {formatQty(item.quantity)} <span className="text-muted-foreground">{item.uom ?? "EA"}</span>
      {(scrap > 0 || item.unitCost != null) && (
        <span className="block text-[11px] text-muted-foreground">
          {[scrap > 0 ? `${scrap}% scrap` : "", item.unitCost != null ? `@ ${formatMoney(item.unitCost)}` : ""].filter(Boolean).join(" · ")}
        </span>
      )}
    </span>
  );
}

function VersionRecipe({ revision, names }: { revision: RecipeRevision; names: NameLookup }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span>Makes {formatQty(revision.snapshot.quantity ?? 1)} {revision.snapshot.uom ?? "EA"}</span>
        <span>{revision.snapshot.items.length} ingredients</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {revision.snapshot.items.map((item, index) => (
            <tr key={`${item.productId}-${index}`} className="border-b last:border-0">
              <td className="px-3 py-2">{names.product(item.productId)}{item.isOptional && <span className="ml-2 text-xs text-muted-foreground">optional</span>}</td>
              <td className="px-3 py-2 text-right"><ItemCell item={item} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const STATUS_STYLE = {
  same: "",
  added: "bg-emerald-500/5",
  removed: "bg-rose-500/5",
  changed: "bg-amber-500/5",
} as const;

function VersionCompare({ revision, current, names }: { revision: RecipeRevision; current: RecipeRevision; names: NameLookup }) {
  const rows = compareItems(revision.snapshot.items, current.snapshot.items);
  const differences = rows.filter((row) => row.status !== "same").length;
  const batchChanged = (revision.snapshot.quantity ?? 1) !== (current.snapshot.quantity ?? 1) || (revision.snapshot.uom ?? "EA") !== (current.snapshot.uom ?? "EA");
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span>{differences ? `${differences} ingredient${differences === 1 ? "" : "s"} differ from the current recipe` : "Same ingredients as the current recipe"}</span>
        {batchChanged && <span>Batch {formatQty(revision.snapshot.quantity)} {revision.snapshot.uom} → {formatQty(current.snapshot.quantity)} {current.snapshot.uom}</span>}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Ingredient</th>
            <th className="px-3 py-2 text-right font-medium">Version {revision.revisionNo}</th>
            <th className="px-3 py-2 text-right font-medium">Current (v{current.revisionNo})</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.productId}-${index}`} className={cn("border-b last:border-0", STATUS_STYLE[row.status])}>
              <td className="px-3 py-2">
                <span className="flex items-center gap-2">
                  {row.status !== "same" && <span className={cn("size-1.5 shrink-0 rounded-full", row.status === "added" ? "bg-emerald-500" : row.status === "removed" ? "bg-rose-500" : "bg-amber-500")} aria-hidden />}
                  {names.product(row.productId)}
                  {row.status === "added" && <span className="text-[11px] text-emerald-700 dark:text-emerald-300">added since</span>}
                  {row.status === "removed" && <span className="text-[11px] text-rose-700 dark:text-rose-300">removed since</span>}
                </span>
              </td>
              <td className="px-3 py-2 text-right"><ItemCell item={row.left} /></td>
              <td className="px-3 py-2 text-right"><ItemCell item={row.right} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CostLine({ revision, previous }: { revision: RecipeRevision; previous?: RecipeRevision }) {
  if (revision.batchCost == null) return null;
  const delta = previous?.batchCost != null && previous.batchCost > 0 ? (revision.batchCost - previous.batchCost) / previous.batchCost : null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
      <span>Batch cost <span className="font-medium tabular-nums text-foreground">{formatMoney(revision.batchCost)}</span></span>
      {delta != null && Math.abs(delta) >= 0.0005 && (
        <span className={cn("inline-flex items-center gap-0.5 tabular-nums", delta > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
          {delta > 0 ? <Icons.TrendingUp className="size-3" /> : <Icons.TrendingDown className="size-3" />}
          {delta > 0 ? "+" : ""}{(delta * 100).toFixed(1)}%
        </span>
      )}
      {revision.unpricedLines > 0 && <span>· {revision.unpricedLines} unpriced</span>}
    </p>
  );
}

function TimelineEntry({
  revision, previous, current, names, canRestore, busy, onRestore,
}: {
  revision: RecipeRevision; previous?: RecipeRevision; current?: RecipeRevision; names: NameLookup;
  canRestore: boolean; busy: boolean; onRestore: (revision: RecipeRevision) => void;
}) {
  const [panel, setPanel] = React.useState<"none" | "recipe" | "compare">("none");
  const source = SOURCE[revision.source];
  const Icon = (Icons[source.icon] ?? Icons.Circle) as React.ComponentType<{ className?: string }>;
  const at = new Date(revision.effectiveFrom);
  const validDate = !Number.isNaN(at.getTime()) && at.getTime() > 0;
  return (
    <li className="group relative pb-5 pl-10 last:pb-0">
      <span className="absolute bottom-0 left-[15px] top-9 w-px bg-border group-last:hidden" aria-hidden />
      <span
        className={cn(
          "absolute left-0 top-1 grid size-8 place-items-center rounded-full border bg-card text-muted-foreground shadow-sm",
          revision.isCurrent && "border-primary bg-primary text-primary-foreground ring-4 ring-primary/15"
        )}
        aria-hidden
      >
        <Icon className="size-3.5" />
      </span>
      <article className={cn("rounded-xl border bg-card p-4 transition-colors", revision.isCurrent ? "border-primary/40 shadow-sm" : "hover:border-foreground/20")}>
        <header className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="flex flex-wrap items-center gap-2 font-semibold">
              Version {revision.revisionNo}
              {revision.isCurrent && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">In use</span>}
              <span className="text-xs font-normal text-muted-foreground">{source.label}{revision.restoredFromRevisionNo ? ` from version ${revision.restoredFromRevisionNo}` : ""}</span>
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {revision.changedByName ?? (revision.source === "BASELINE" ? "Existing recipe" : "Someone")}
              {validDate && <> · <time dateTime={at.toISOString()} title={format(at, "PPpp")}>{format(at, "HH:mm")}</time></>}
            </p>
          </div>
          <CostLine revision={revision} previous={previous} />
        </header>
        {revision.note && <p className="mt-3 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">{revision.note}</p>}
        {revision.changes.length > 0 ? (
          <ChangeChips className="mt-3" changes={revision.changes} names={names} />
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">{revision.snapshot.items.length} ingredients, makes {formatQty(revision.snapshot.quantity)} {revision.snapshot.uom}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Button type="button" size="sm" variant={panel === "recipe" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setPanel(panel === "recipe" ? "none" : "recipe")}>
            <Icons.ListChecks className="mr-1 size-3.5" />View recipe
          </Button>
          {!revision.isCurrent && current && (
            <Button type="button" size="sm" variant={panel === "compare" ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setPanel(panel === "compare" ? "none" : "compare")}>
              <Icons.Columns2 className="mr-1 size-3.5" />Compare with current
            </Button>
          )}
          {!revision.isCurrent && canRestore && (
            <Button type="button" size="sm" variant="outline" className="ml-auto h-7 px-2.5 text-xs" disabled={busy} onClick={() => onRestore(revision)}>
              <Icons.RotateCcw className="mr-1 size-3.5" />Restore this version
            </Button>
          )}
        </div>
        {panel === "recipe" && <div className="mt-3"><VersionRecipe revision={revision} names={names} /></div>}
        {panel === "compare" && current && <div className="mt-3"><VersionCompare revision={revision} current={current} names={names} /></div>}
      </article>
    </li>
  );
}

export function RecipeHistorySheet({
  open, onOpenChange, title, history, loading, error, canRestore, busy, onRestore, onMakeCurrent, onRetry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  history: RecipeHistory | null;
  loading: boolean;
  error?: string;
  canRestore: boolean;
  busy: boolean;
  onRestore: (revisionNo: number) => Promise<void>;
  onMakeCurrent?: (recordId: string) => Promise<void>;
  onRetry: () => void;
}) {
  const [confirm, setConfirm] = React.useState<RecipeRevision | null>(null);
  const [confirmRecord, setConfirmRecord] = React.useState<RecipeHistory["otherRecords"][number] | null>(null);
  const names = React.useMemo(() => namesFromHistory(history), [history]);
  const revisions = React.useMemo(() => history?.revisions ?? [], [history]);
  const current = revisions.find((revision) => revision.isCurrent);
  const groups = React.useMemo(() => {
    const byDay: Array<{ label: string; items: RecipeRevision[] }> = [];
    for (const revision of revisions) {
      const date = new Date(revision.effectiveFrom);
      const label = Number.isNaN(date.getTime()) || date.getTime() <= 0 ? "Before version history" : dayLabel(date);
      const last = byDay[byDay.length - 1];
      if (last?.label === label) last.items.push(revision);
      else byDay.push({ label, items: [revision] });
    }
    return byDay;
  }, [revisions]);
  const earlier = (history?.otherRecords ?? []).filter((record) => !record.pendingDraft && !record.isActive);
  const newest = revisions[0];
  const newestDate = newest ? new Date(newest.effectiveFrom) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:w-[min(760px,100vw)] sm:max-w-[760px]">
        <SheetHeader className="space-y-1 border-b px-6 py-5 text-left">
          <SheetTitle className="flex items-center gap-2"><Icons.History className="size-5 text-primary" />Version history</SheetTitle>
          <SheetDescription>
            {title}. Every save is kept. Batches already made keep the recipe they were made with.
          </SheetDescription>
          {history && revisions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 text-xs">
              <span className="rounded-full border bg-muted/40 px-2.5 py-1">{revisions.length} version{revisions.length === 1 ? "" : "s"}</span>
              {newestDate && newestDate.getTime() > 0 && (
                <span className="rounded-full border bg-muted/40 px-2.5 py-1">Last change {formatDistanceToNow(newestDate, { addSuffix: true })}{newest?.changedByName ? ` by ${newest.changedByName}` : ""}</span>
              )}
            </div>
          )}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {loading && !history ? (
            <div className="space-y-3" role="status" aria-label="Loading history">
              {[0, 1, 2].map((key) => <div key={key} className="h-28 animate-pulse rounded-xl bg-muted/50" />)}
            </div>
          ) : error ? (
            <div role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm">
              <p>{error}</p>
              <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>Try again</Button>
            </div>
          ) : (
            <>
              {history && !history.historyStarted && (
                <p className="mb-5 flex gap-2 rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                  <Icons.Info className="mt-0.5 size-4 shrink-0" />
                  This is the recipe as it stands today. History starts with the next change you save; each save after that appears here.
                </p>
              )}
              <div className="space-y-6">
                {groups.map((group) => (
                  <section key={group.label}>
                    <h3 className="sticky top-0 z-10 -mx-1 mb-3 bg-background/95 px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">{group.label}</h3>
                    <ol className="space-y-0">
                      {group.items.map((revision) => {
                        const index = revisions.indexOf(revision);
                        return (
                          <TimelineEntry
                            key={revision.id}
                            revision={revision}
                            previous={revisions[index + 1]}
                            current={current}
                            names={names}
                            canRestore={canRestore && Boolean(history?.historyStarted)}
                            busy={busy}
                            onRestore={setConfirm}
                          />
                        );
                      })}
                    </ol>
                  </section>
                ))}
              </div>
              {earlier.length > 0 && (
                <section className="mt-8 border-t pt-5">
                  <h3 className="text-sm font-semibold">Earlier copies</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Before version history, each change was saved as a separate copy of the recipe. They are kept here for reference.</p>
                  <ul className="mt-3 divide-y rounded-xl border">
                    {earlier.map((record) => (
                      <li key={record.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                        <Icons.FileClock className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{record.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[record.code, record.version ? `version ${record.version}` : "", `${record.componentCount} ingredients`, record.updatedAt ? format(new Date(record.updatedAt), "d MMM yyyy") : ""].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs"><Link href={`/manufacturing/boms/${encodeURIComponent(record.id)}`}>Open</Link></Button>
                        {canRestore && onMakeCurrent && (
                          <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" disabled={busy} onClick={() => setConfirmRecord(record)}>
                            <Icons.RotateCcw className="mr-1 size-3.5" />Use this copy
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </SheetContent>
      <ConfirmDialog
        open={confirm != null}
        onOpenChange={(value) => { if (!value) setConfirm(null); }}
        title={confirm ? `Restore version ${confirm.revisionNo}?` : "Restore version"}
        description={confirm ? `Its ingredients and batch size become the recipe production uses, saved as version ${(history?.revisions[0]?.revisionNo ?? 0) + 1}. Nothing is deleted: the versions in between stay in this history, and batches already made are not affected.` : undefined}
        confirmLabel="Restore"
        onConfirm={() => {
          if (!confirm) return;
          void onRestore(confirm.revisionNo).finally(() => setConfirm(null));
        }}
      />
      <ConfirmDialog
        open={confirmRecord != null}
        onOpenChange={(value) => { if (!value) setConfirmRecord(null); }}
        title="Use this earlier copy?"
        description={confirmRecord ? `The ingredients from ${confirmRecord.code ?? confirmRecord.name} are saved onto the live recipe as a new version. Nothing is deleted and batches already made are not affected.` : undefined}
        confirmLabel="Use this copy"
        onConfirm={() => { if (confirmRecord && onMakeCurrent) void onMakeCurrent(confirmRecord.id); }}
      />
    </Sheet>
  );
}
