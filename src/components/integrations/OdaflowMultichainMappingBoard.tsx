"use client";

import * as React from "react";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  confirmMultichainLinkApi,
  fetchMultichainPreviewApi,
  importMultichainBranchesApi,
  type MultichainPreviewParty,
  type MultichainPreviewRow,
  type MultichainPreviewStatus,
} from "@/lib/api/odaflow-integration";

const STATUS_LABEL: Record<MultichainPreviewStatus, string> = {
  mapped: "Mapped",
  suggested: "Suggested",
  ambiguous: "Ambiguous",
  unmatched_sfa: "Unmatched SFA",
  unmatched_erp: "Unmatched ERP",
};

function statusVariant(status: MultichainPreviewStatus): "default" | "secondary" | "outline" | "destructive" {
  if (status === "mapped") return "default";
  if (status === "suggested") return "secondary";
  if (status === "ambiguous") return "destructive";
  return "outline";
}

function rowKey(row: MultichainPreviewRow, index: number) {
  return row.sfa?.id ?? row.erp?.id ?? `row-${index}`;
}

export function OdaflowMultichainMappingBoard({ canSave }: { canSave: boolean }) {
  const [rows, setRows] = React.useState<MultichainPreviewRow[]>([]);
  const [erpParties, setErpParties] = React.useState<MultichainPreviewParty[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [picked, setPicked] = React.useState<Record<string, string>>({});
  const [skipped, setSkipped] = React.useState<Set<string>>(new Set());
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const loadPreview = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMultichainPreviewApi();
      setRows(data.rows);
      setErpParties(data.erpParties);
      const nextPicked: Record<string, string> = {};
      for (const row of data.rows) {
        if (row.sfa?.id && row.erp?.id) nextPicked[row.sfa.id] = row.erp.id;
      }
      setPicked(nextPicked);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load Multichain preview");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const visibleRows = rows.filter((row, index) => !skipped.has(rowKey(row, index)));

  const handleConfirm = async (row: MultichainPreviewRow, index: number) => {
    const sfaId = row.sfa?.id;
    if (!sfaId) return;
    const erpPartyId = picked[sfaId] || row.erp?.id;
    if (!erpPartyId) {
      toast.error("Choose an ERP Multichain party first.");
      return;
    }
    const key = rowKey(row, index);
    setBusyKey(key);
    try {
      await confirmMultichainLinkApi({ sfaSupermarketId: sfaId, erpPartyId });
      toast.success(`Mapped ${row.sfa?.name ?? "supermarket"} to the ERP party.`);
      await loadPreview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not confirm mapping");
    } finally {
      setBusyKey(null);
    }
  };

  const handleImport = async (row: MultichainPreviewRow, index: number) => {
    const partyId = row.erp?.id;
    if (!partyId) return;
    const key = `${rowKey(row, index)}-import`;
    setBusyKey(key);
    try {
      const result = await importMultichainBranchesApi(partyId);
      toast.success(
        `Imported ${result.imported} branches, updated ${result.updated}${
          result.skipped ? `, skipped ${result.skipped}` : ""
        }.`
      );
      await loadPreview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not import branches");
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading Multichain preview…</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review SFA supermarket HQs against existing Multichain parties, confirm each pair, then import
        that chain&apos;s branches. Suggested matches are not applied until you confirm.
      </p>
      {visibleRows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          No Multichain HQs to review.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">SFA supermarket</th>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">ERP Multichain party</th>
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Status</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => {
                const key = rowKey(row, index);
                const sfaId = row.sfa?.id;
                const selected = sfaId ? picked[sfaId] ?? row.erp?.id ?? "" : "";
                const options = row.candidates?.length ? row.candidates : erpParties;
                return (
                  <tr key={key} className="border-b align-top hover:bg-muted/30">
                    <td className="py-3 pr-4">
                      {row.sfa ? (
                        <div>
                          <div className="font-medium">{row.sfa.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.sfa.code ? `${row.sfa.code} · ` : ""}
                            {row.sfa.branchCount} {row.sfa.branchCount === 1 ? "branch" : "branches"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 min-w-[16rem]">
                      {row.status === "unmatched_erp" ? (
                        <div>
                          <div className="font-medium">{row.erp?.name}</div>
                          <div className="text-xs text-muted-foreground">{row.erp?.code ?? "No SFA match"}</div>
                        </div>
                      ) : row.status === "mapped" ? (
                        <div>
                          <div className="font-medium">{row.erp?.name}</div>
                          <div className="text-xs text-muted-foreground">{row.erp?.code ?? "—"}</div>
                        </div>
                      ) : (
                        <select
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={selected}
                          disabled={!canSave}
                          onChange={(e) => {
                            if (!sfaId) return;
                            setPicked((prev) => ({ ...prev, [sfaId]: e.target.value }));
                          }}
                        >
                          <option value="">Select ERP party…</option>
                          {options.map((party) => (
                            <option key={party.id} value={party.id}>
                              {party.name}
                              {party.code ? ` (${party.code})` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={statusVariant(row.status)}>{STATUS_LABEL[row.status]}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.sfa && row.status !== "mapped" ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={!canSave || busyKey === key}
                            onClick={() => void handleConfirm(row, index)}
                          >
                            {busyKey === key ? (
                              <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Confirm
                          </Button>
                        ) : null}
                        {row.status === "mapped" && row.erp?.id ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canSave || busyKey === `${key}-import`}
                            onClick={() => void handleImport(row, index)}
                          >
                            {busyKey === `${key}-import` ? (
                              <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Icons.Download className="mr-2 h-4 w-4" />
                            )}
                            Import branches
                          </Button>
                        ) : null}
                        {row.status !== "mapped" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSkipped((prev) => {
                                const next = new Set(prev);
                                next.add(key);
                                return next;
                              })
                            }
                          >
                            Skip
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
