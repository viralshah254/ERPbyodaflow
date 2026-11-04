"use client";
import { StatementTableSearch, StatementTableHeader, useStatementTable } from "@/components/finance/statement-table-controls";
import { Table as InteractiveTable } from "@/components/ui/table";

import { useAuthStore } from "@/stores/auth-store";
import { FinancialStatementExport } from "@/components/reports/FinancialStatementExport";

import * as React from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { StatementPeriodStatus } from "@/components/finance/statement-period-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchFinancePeriodsApi,
  fetchFinancialStatementApi,
  fetchFinancialStatementDrilldownApi,
  formatFinancePeriodLoadError,
  type FinancePeriod,
  type FinanceStatementSection,
  type FinanceStatementDrilldownItem,
} from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import { useBaseCurrency } from "@/lib/org/useBaseCurrency";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

type DrilldownState = { sectionKey: string; accountId?: string; label: string };

export default function BalanceSheetPage() {
  const scopeKey = useAuthStore((state) => `${state.org?.orgId}:${state.user?.userId}:${state.permissions.join(",")}`);
  const configuredCurrency = useBaseCurrency();
  const [currency, setCurrency] = React.useState("");
  const [periods, setPeriods] = React.useState<FinancePeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = React.useState(true);
  const [periodsError, setPeriodsError] = React.useState<string | null>(null);
  const [periodId, setPeriodId] = React.useState("");
  const [statement, setStatement] = React.useState<Awaited<ReturnType<typeof fetchFinancialStatementApi>> | null>(null);
  const statementTable = useStatementTable(statement?.sections ?? []);
  const baseCurrency = statement?.currency ?? configuredCurrency;
  const [statementLoading, setStatementLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(["assets", "liabilities", "equity"]));
  const [drilldown, setDrilldown] = React.useState<DrilldownState | null>(null);
  const [drilldownItems, setDrilldownItems] = React.useState<FinanceStatementDrilldownItem[]>([]);
  const [drilldownLoading, setDrilldownLoading] = React.useState(false);

  React.useEffect(() => {
    let current = true;
    setPeriods([]); setStatement(null); setPeriodId("");
    setPeriodsLoading(true);
    setPeriodsError(null);
    fetchFinancePeriodsApi()
      .then((items) => {
        if (!current) return;
        setPeriods(items);
        setPeriodId(items.find((item) => item.status === "OPEN")?.id ?? items[0]?.id ?? "");
      })
      .catch((error) => {
        if (!current) return;
        const msg = formatFinancePeriodLoadError(error);
        setPeriodsError(msg);
        toast.error(msg);
      })
      .finally(() => { if (current) setPeriodsLoading(false); });
    return () => { current = false; };
  }, [scopeKey]);

  React.useEffect(() => {
    if (!periodId || (currency && !/^[A-Z]{3}$/.test(currency))) {
      setStatement(null);
      setStatementLoading(false);
      return;
    }
    setStatement(null);
    setStatementLoading(true);
    setDrilldown(null);
    setDrilldownItems([]);
    let current = true;
    fetchFinancialStatementApi("balance-sheet", periodId, currency)
      .then((data) => { if (current) setStatement(data); })
      .catch((error) => {
        if (!current) return;
        setStatement(null);
        toast.error((error as Error).message || "Failed to load balance sheet.");
      })
      .finally(() => { if (current) setStatementLoading(false); });
    return () => { current = false; };
  }, [periodId, currency, scopeKey]);

  React.useEffect(() => {
    if (!drilldown || !periodId) return;
    setDrilldownLoading(true);
    setDrilldownItems([]);
    let current = true;
    fetchFinancialStatementDrilldownApi("balance-sheet", drilldown.sectionKey, periodId, drilldown.accountId, currency)
      .then((items) => { if (current) setDrilldownItems(items); })
      .catch((error) => { if (current) toast.error((error as Error).message || "Failed to load drilldown."); })
      .finally(() => { if (current) setDrilldownLoading(false); });
    return () => { current = false; };
  }, [drilldown, periodId, currency, scopeKey]);

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function openDrilldown(sectionKey: string, label: string, accountId?: string) {
    setDrilldown({ sectionKey, accountId, label });
  }

  const periodsEmptyOk = !periodsLoading && !periodsError && periods.length === 0;
  const canPickPeriod = !periodsLoading && !periodsError && periods.length > 0;
  const showSelectPeriodHint = canPickPeriod && !periodId;

  const selectedPeriod = periods.find((p) => p.id === periodId);
  const isBalanced = statement?.summary?.isBalanced as boolean | undefined;

  return (
    <PageLayout
      title="Balance Sheet"
      description="Assets, liabilities, and equity as of the selected period end"
      actions={
<FinancialStatementExport completeExports={!!statement?.exportFormats?.includes("pdf")} type="balance-sheet" periodId={periodId} currency={currency} disabled={!statement || statementLoading} />
      }
    >
      <div className="flex items-center gap-3 print:hidden"><label htmlFor="statement-report-currency" className="text-sm font-medium">Currency</label><input id="statement-report-currency" className="h-10 w-44 rounded-md border bg-background px-3 text-sm" maxLength={3} placeholder="Auto (single currency)" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} /></div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Balance Sheet</CardTitle>
              {selectedPeriod && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  As of {new Date(selectedPeriod.endDate).toLocaleDateString()} &middot; cumulative through period end
                </p>
              )}
            </div>
            <Select value={periodId} onValueChange={setPeriodId} disabled={!canPickPeriod}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.fiscalYear} · P{period.periodNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <StatementPeriodStatus
            loading={periodsLoading}
            errorMessage={periodsError}
            periodsEmpty={periodsEmptyOk}
          />

          {/* Balance check banner */}
          {statement && isBalanced === false && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              <Icons.AlertTriangle className="h-4 w-4 shrink-0" />
              Balance sheet does not balance. Check for unposted journals or unmapped accounts.
            </div>
          )}
          {statement && isBalanced === true && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Icons.CheckCircle className="h-4 w-4 shrink-0" />
              Assets = Liabilities + Equity
            </div>
          )}

          {statementLoading && (
            <p className="py-4 text-sm text-muted-foreground">Loading balance sheet…</p>
          )}
          {!statementLoading && canPickPeriod && periodId && !statement && (
            <p className="py-4 text-sm text-destructive">Could not load the balance sheet.</p>
          )}
          {showSelectPeriodHint && (
            <p className="py-4 text-sm text-muted-foreground">Select a period above to generate the balance sheet.</p>
          )}

          {statement && (
            <div className="overflow-hidden rounded-md border">
              <StatementTableSearch table={statementTable} />
              <InteractiveTable searchable={false} sortable={false} className="w-full text-sm">
                <StatementTableHeader table={statementTable} />
                <tbody>
                  {statementTable.sections.map((section, idx) => (
                    <SectionRows
                      key={section.key}
                      section={section}
                      currency={baseCurrency}
                      isExpanded={!!statementTable.query || expanded.has(section.key)}
                      onToggleExpand={() => toggleExpanded(section.key)}
                      onDrillSection={() => openDrilldown(section.key, section.label)}
                      onDrillAccount={(accountId, name) => openDrilldown(section.key, name, accountId)}
                      activeDrilldown={drilldown}
                      isLast={idx === statement.sections.length - 1}
                    />
                  ))}
                </tbody>
              </InteractiveTable>
            </div>
          )}

          {/* Drilldown panel */}
          {drilldown && (
            <div className="mt-4 rounded-md border bg-muted/30">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <p className="text-sm font-medium">
                  Transactions — {drilldown.label}
                  {drilldown.sectionKey === "assets" || drilldown.sectionKey === "liabilities" || drilldown.sectionKey === "equity"
                    ? " (cumulative through period end)"
                    : ""}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setDrilldown(null); setDrilldownItems([]); }}
                >
                  <Icons.X className="h-4 w-4" />
                </Button>
              </div>
              {drilldownLoading && (
                <p className="px-4 py-3 text-sm text-muted-foreground">Loading…</p>
              )}
              {!drilldownLoading && drilldownItems.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">No posted transactions for this selection.</p>
              )}
              {!drilldownLoading && drilldownItems.length > 0 && (
                <InteractiveTable className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50 text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                      <th className="px-4 py-2 text-left font-medium">Document</th>
                      <th className="px-4 py-2 text-left font-medium">Account</th>
                      <th className="px-4 py-2 text-right font-medium">Debit</th>
                      <th className="px-4 py-2 text-right font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldownItems.map((item) => (
                      <tr key={item.postingLineId} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-1.5 tabular-nums" data-sort-value={item.postingDate}>
                          {new Date(item.postingDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-1.5">{item.documentNumber ?? item.sourceNumber}</td>
                        <td className="px-4 py-1.5 text-muted-foreground">
                          {item.accountCode ? `${item.accountCode} · ` : ""}{item.accountName ?? "—"}
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums" data-sort-value={(item.debit > 0) ? (item.debit) : null}>
                          {item.debit > 0 ? formatMoney(item.debit, baseCurrency) : ""}
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums" data-sort-value={(item.credit > 0) ? (item.credit) : null}>
                          {item.credit > 0 ? formatMoney(item.credit, baseCurrency) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </InteractiveTable>
              )}
            </div>
          )}

          {/* Methodological notes */}
          {(statement?.notes ?? []).length > 0 && (
            <div className="mt-4 space-y-1">
              {statement!.notes!.map((note, i) => (
                <p key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Icons.Info className="mt-0.5 h-3 w-3 shrink-0" />
                  {note}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}

function SectionRows({
  section,
  currency,
  isExpanded,
  onToggleExpand,
  onDrillSection,
  onDrillAccount,
  activeDrilldown,
  isLast,
}: {
  section: FinanceStatementSection;
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDrillSection: () => void;
  onDrillAccount: (accountId: string, name: string) => void;
  activeDrilldown: DrilldownState | null;
  isLast: boolean;
}) {
  const hasLines = section.lines.length > 0;
  const isSectionActive = activeDrilldown?.sectionKey === section.key && !activeDrilldown.accountId;

  return (
    <>
      <tr
        className={cn(
          "border-b transition-colors hover:bg-muted/20",
          isLast && !isExpanded && "border-b-0",
          isSectionActive && "bg-blue-50 dark:bg-blue-950/20"
        )}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasLines ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className="text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? (
                  <Icons.ChevronDown className="h-4 w-4" />
                ) : (
                  <Icons.ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <span className="font-medium">{section.label}</span>
            {hasLines && (
              <span className="text-xs text-muted-foreground">({section.lines.length} accounts)</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right" data-sort-value={section.amount}>
          <button
            type="button"
            onClick={onDrillSection}
            className={cn(
              "tabular-nums font-mono font-medium hover:underline",
              section.amount < 0 && "text-destructive"
            )}
            title="Click to see transactions"
          >
            {formatMoney(section.amount, currency)}
          </button>
        </td>
      </tr>
      {hasLines && isExpanded &&
        section.lines.map((line) => {
          const isAccountActive = activeDrilldown?.accountId === line.accountId;
          const isSynthetic = line.accountId === "_retained_earnings";
          return (
            <tr
              key={line.accountId}
              className={cn(
                "border-b last:border-b text-xs",
                isSynthetic ? "bg-muted/50 italic text-muted-foreground" : "hover:bg-muted/20",
                isAccountActive && "bg-blue-50 dark:bg-blue-950/20"
              )}
            >
              <td className="py-2 pl-10 pr-4 text-muted-foreground">
                <span className="font-mono text-[11px] text-muted-foreground/70 mr-2">{line.code}</span>
                {line.name}
              </td>
              <td className="py-2 px-4 text-right">
                {isSynthetic ? (
                  <span className={cn("tabular-nums font-mono", line.amount < 0 && "text-destructive")}>
                    {formatMoney(line.amount, currency)}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onDrillAccount(line.accountId, `${line.code} · ${line.name}`)}
                    className={cn(
                      "tabular-nums font-mono hover:underline",
                      line.amount < 0 && "text-destructive"
                    )}
                    title="Click to see transactions for this account"
                  >
                    {formatMoney(line.amount, currency)}
                  </button>
                )}
              </td>
            </tr>
          );
        })}
    </>
  );
}
