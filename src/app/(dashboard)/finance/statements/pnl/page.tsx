"use client";

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

// Sections that are computed totals (no account lines to expand)
const TOTAL_SECTIONS = new Set(["gross-profit", "net-income"]);

type DrilldownState = { sectionKey: string; accountId?: string; label: string };

export default function ProfitAndLossPage() {
  const baseCurrency = useBaseCurrency();
  const [periods, setPeriods] = React.useState<FinancePeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = React.useState(true);
  const [periodsError, setPeriodsError] = React.useState<string | null>(null);
  const [periodId, setPeriodId] = React.useState("");
  const [statement, setStatement] = React.useState<Awaited<ReturnType<typeof fetchFinancialStatementApi>> | null>(null);
  const [statementLoading, setStatementLoading] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(["revenue", "expense"]));
  const [drilldown, setDrilldown] = React.useState<DrilldownState | null>(null);
  const [drilldownItems, setDrilldownItems] = React.useState<FinanceStatementDrilldownItem[]>([]);
  const [drilldownLoading, setDrilldownLoading] = React.useState(false);

  React.useEffect(() => {
    setPeriodsLoading(true);
    setPeriodsError(null);
    fetchFinancePeriodsApi()
      .then((items) => {
        setPeriods(items);
        setPeriodId(items.find((item) => item.status === "OPEN")?.id ?? items[0]?.id ?? "");
      })
      .catch((error) => {
        const msg = formatFinancePeriodLoadError(error);
        setPeriodsError(msg);
        toast.error(msg);
      })
      .finally(() => setPeriodsLoading(false));
  }, []);

  React.useEffect(() => {
    if (!periodId) {
      setStatement(null);
      setStatementLoading(false);
      return;
    }
    setStatement(null);
    setStatementLoading(true);
    setDrilldown(null);
    setDrilldownItems([]);
    fetchFinancialStatementApi("pnl", periodId)
      .then(setStatement)
      .catch((error) => {
        setStatement(null);
        toast.error((error as Error).message || "Failed to load P&L.");
      })
      .finally(() => setStatementLoading(false));
  }, [periodId]);

  React.useEffect(() => {
    if (!drilldown || !periodId) return;
    setDrilldownLoading(true);
    setDrilldownItems([]);
    fetchFinancialStatementDrilldownApi("pnl", drilldown.sectionKey, periodId, drilldown.accountId)
      .then(setDrilldownItems)
      .catch((error) => toast.error((error as Error).message || "Failed to load drilldown."))
      .finally(() => setDrilldownLoading(false));
  }, [drilldown, periodId]);

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
  const hasData = !!statement && statement.sections.some((s) => s.amount !== 0);

  const selectedPeriod = periods.find((p) => p.id === periodId);

  return (
    <PageLayout
      title="Profit & Loss Statement"
      description="Income statement for the selected period"
      actions={
        <Button variant="outline">
          <Icons.Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Profit & Loss</CardTitle>
              {selectedPeriod && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {selectedPeriod.fiscalYear} · Period {selectedPeriod.periodNumber} &middot;{" "}
                  {new Date(selectedPeriod.startDate).toLocaleDateString()} –{" "}
                  {new Date(selectedPeriod.endDate).toLocaleDateString()}
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

          {statementLoading && (
            <p className="py-4 text-sm text-muted-foreground">Loading P&amp;L statement…</p>
          )}
          {!statementLoading && canPickPeriod && periodId && !statement && (
            <p className="py-4 text-sm text-destructive">Could not load the P&amp;L statement.</p>
          )}
          {showSelectPeriodHint && (
            <p className="py-4 text-sm text-muted-foreground">Select a period above to generate the statement.</p>
          )}

          {statement && (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <tbody>
                  {statement.sections.map((section, idx) => (
                    <SectionRows
                      key={section.key}
                      section={section}
                      currency={baseCurrency}
                      isExpanded={expanded.has(section.key)}
                      onToggleExpand={() => toggleExpanded(section.key)}
                      onDrillSection={() => openDrilldown(section.key, section.label)}
                      onDrillAccount={(accountId, name) => openDrilldown(section.key, name, accountId)}
                      activeDrilldown={drilldown}
                      isTotal={TOTAL_SECTIONS.has(section.key)}
                      isLast={idx === statement.sections.length - 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Drilldown panel */}
          {drilldown && (
            <div className="mt-4 rounded-md border bg-muted/30">
              <div className="flex items-center justify-between border-b px-4 py-2">
                <p className="text-sm font-medium">
                  Transactions — {drilldown.label}
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
                <table className="w-full text-xs">
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
                        <td className="px-4 py-1.5 tabular-nums">
                          {new Date(item.postingDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-1.5">{item.documentNumber ?? item.sourceNumber}</td>
                        <td className="px-4 py-1.5 text-muted-foreground">
                          {item.accountCode ? `${item.accountCode} · ` : ""}{item.accountName ?? "—"}
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums">
                          {item.debit > 0 ? formatMoney(item.debit, baseCurrency) : ""}
                        </td>
                        <td className="px-4 py-1.5 text-right tabular-nums">
                          {item.credit > 0 ? formatMoney(item.credit, baseCurrency) : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Methodological footnote */}
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
          {!hasData && !statementLoading && statement && (
            <p className="mt-2 text-sm text-muted-foreground">
              No posted activity for this period. Post revenue or expense transactions and they will appear here.
            </p>
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
  isTotal,
  isLast,
}: {
  section: FinanceStatementSection;
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDrillSection: () => void;
  onDrillAccount: (accountId: string, name: string) => void;
  activeDrilldown: DrilldownState | null;
  isTotal: boolean;
  isLast: boolean;
}) {
  const hasLines = section.lines.length > 0;
  const isSectionActive = activeDrilldown?.sectionKey === section.key && !activeDrilldown.accountId;

  return (
    <>
      <tr
        className={cn(
          "border-b transition-colors",
          isTotal ? "bg-muted/40 font-semibold" : "hover:bg-muted/20",
          isLast && !isExpanded && "border-b-0",
          isSectionActive && "bg-blue-50 dark:bg-blue-950/20"
        )}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {hasLines && !isTotal ? (
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
            <span className={cn(isTotal ? "font-semibold" : "font-medium")}>{section.label}</span>
            {hasLines && (
              <span className="text-xs text-muted-foreground">({section.lines.length} accounts)</span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={onDrillSection}
            className={cn(
              "tabular-nums font-mono hover:underline",
              isTotal && "font-semibold",
              section.amount < 0 && "text-destructive"
            )}
            title="Click to see transactions"
          >
            {formatMoney(section.amount, currency)}
          </button>
        </td>
      </tr>
      {hasLines && isExpanded && !isTotal &&
        section.lines.map((line) => {
          const isAccountActive = activeDrilldown?.accountId === line.accountId;
          return (
            <tr
              key={line.accountId}
              className={cn(
                "border-b last:border-b text-xs hover:bg-muted/20",
                isAccountActive && "bg-blue-50 dark:bg-blue-950/20"
              )}
            >
              <td className="py-2 pl-10 pr-4 text-muted-foreground">
                <span className="font-mono text-[11px] text-muted-foreground/70 mr-2">{line.code}</span>
                {line.name}
              </td>
              <td className="py-2 px-4 text-right">
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
              </td>
            </tr>
          );
        })}
    </>
  );
}
