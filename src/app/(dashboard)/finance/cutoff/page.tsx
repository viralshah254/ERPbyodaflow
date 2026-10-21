"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect, type AsyncSearchableSelectOption } from "@/components/ui/async-searchable-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AddAssetSheet } from "@/components/assets/add-asset-sheet";
import { suggestNextFaCode } from "@/components/assets/asset-form-constants";
import { fetchAssetsApi } from "@/lib/api/assets";
import {
  createAssetOpeningApi,
  createCutoffDraftApi,
  fetchAssetOpeningsApi,
  fetchCutoffDraftsApi,
  postAssetOpeningApi,
  postCutoffDraftApi,
  signCutoffDraftApi,
  type AssetOpeningSummary,
  type CutoffDraftSummary,
} from "@/lib/api/cutoff";
import { fetchFinanceAccountsApi, type FinanceAccount } from "@/lib/api/finance";
import { formatMoney } from "@/lib/money";
import type { AssetRow } from "@/lib/types/assets";
import { toast } from "sonner";

function friendlyDate(value: string): string {
  const raw = String(value ?? "");
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(date.getTime())) return raw.slice(0, 10);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function accountTitle(account: FinanceAccount | undefined): string {
  if (!account) return "Account";
  const type = account.type ? account.type.charAt(0) + account.type.slice(1).toLowerCase() : "";
  return [account.code, account.name, type].filter(Boolean).join(" · ");
}

function mergeById<T extends { id: string }>(remote: T[], local: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of [...local, ...remote]) map.set(row.id, row);
  return [...map.values()];
}

export default function CutoffDraftPage() {
  const [accounts, setAccounts] = React.useState<FinanceAccount[]>([]);
  const [assets, setAssets] = React.useState<AssetRow[]>([]);
  const [drafts, setDrafts] = React.useState<CutoffDraftSummary[]>([]);
  const [openings, setOpenings] = React.useState<AssetOpeningSummary[]>([]);
  const [cutoffDate, setCutoffDate] = React.useState("");
  const [debitAccountId, setDebitAccountId] = React.useState("");
  const [creditAccountId, setCreditAccountId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [draftId, setDraftId] = React.useState("");
  const [selectedAssetId, setSelectedAssetId] = React.useState("");
  const [assetChoice, setAssetChoice] = React.useState<AsyncSearchableSelectOption | null>(null);
  const [addAssetOpen, setAddAssetOpen] = React.useState(false);
  const [suggestedAssetCode, setSuggestedAssetCode] = React.useState("");
  const [suggestedAssetName, setSuggestedAssetName] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [accumulated, setAccumulated] = React.useState("");
  const [openingId, setOpeningId] = React.useState("");
  const [savingDraft, setSavingDraft] = React.useState(false);
  const [savingAsset, setSavingAsset] = React.useState(false);

  const accountOptions = React.useMemo(
    () => accounts.map((account) => ({ id: account.id, label: accountTitle(account), keywords: account.type })),
    [accounts]
  );
  const accountById = React.useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const assetByCode = React.useMemo(() => {
    const map = new Map<string, AssetRow>();
    for (const asset of assets) if (!map.has(asset.code)) map.set(asset.code, asset);
    return map;
  }, [assets]);

  const reloadLists = React.useCallback(async () => {
    const [draftRows, openingRows] = await Promise.all([
      fetchCutoffDraftsApi().catch(() => [] as CutoffDraftSummary[]),
      fetchAssetOpeningsApi().catch(() => [] as AssetOpeningSummary[]),
    ]);
    setDrafts((current) => mergeById(draftRows, current));
    setOpenings((current) => mergeById(openingRows, current));
  }, []);

  React.useEffect(() => {
    void Promise.all([
      fetchFinanceAccountsApi().catch(() => [] as FinanceAccount[]),
      fetchAssetsApi().catch(() => [] as AssetRow[]),
    ]).then(([accountRows, assetRows]) => {
      setAccounts(accountRows);
      setAssets(assetRows);
    });
    void reloadLists();
  }, [reloadLists]);

  const draftOptions = drafts.map((draft) => {
    const debitLine = draft.lines.find((line) => line.debit > 0);
    const creditLine = draft.lines.find((line) => line.credit > 0);
    const status = draft.status === "SIGNED" ? "Signed" : "Draft";
    return {
      id: draft.id,
      label: [
        friendlyDate(draft.cutoffDate),
        formatMoney(draft.debit, "KES"),
        `Debit ${accountTitle(accountById.get(debitLine?.accountId ?? ""))}`,
        `Credit ${accountTitle(accountById.get(creditLine?.accountId ?? ""))}`,
        status,
      ].join(" · "),
    };
  });

  const loadAssetOptions = React.useCallback(async (query: string): Promise<AsyncSearchableSelectOption[]> => {
    const q = query.trim().toLowerCase();
    return assets
      .filter((asset) => !q || `${asset.code} ${asset.name} ${asset.category ?? ""} ${asset.assetTag ?? ""}`.toLowerCase().includes(q))
      .slice(0, 40)
      .map((asset) => ({
        id: asset.id,
        label: `${asset.code} · ${asset.name}`,
        description: asset.category,
      }));
  }, [assets]);

  const openingOptions = openings.map((opening) => {
    const asset = assetByCode.get(opening.assetCode);
    const title = asset ? `${asset.code} · ${asset.name}` : opening.assetCode;
    return {
      id: opening.id,
      label: `${title} · Cost ${formatMoney(opening.cost, "KES")} · Accumulated ${formatMoney(opening.accumulatedDepreciation, "KES")} · Draft`,
    };
  });

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId);

  const chooseAsset = React.useCallback((asset: AssetRow) => {
    setSelectedAssetId(asset.id);
    setAssetChoice({
      id: asset.id,
      label: `${asset.code} · ${asset.name}`,
      description: asset.category,
    });
    setCost(asset.cost != null ? String(asset.cost) : "");
    setAccumulated(asset.accumulatedDepreciation != null ? String(asset.accumulatedDepreciation) : "0");
  }, []);

  return (
    <PageShell>
      <PageHeader
        title="Cutoff drafts"
        description="A second finance user signs a balanced opening draft. Posting the draft stays refused."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Cutoff drafts" }]}
      />
      <div className="space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Opening draft</CardTitle>
            <CardDescription>Search the chart for the debit and credit accounts. Saving keeps a draft. It does not post a journal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                const value = Number(amount);
                if (!debitAccountId || !creditAccountId) {
                  toast.error("Choose the debit account and the credit account.");
                  return;
                }
                if (debitAccountId === creditAccountId) {
                  toast.error("Debit and credit need two different accounts.");
                  return;
                }
                if (!(value > 0)) {
                  toast.error("Enter an amount above zero.");
                  return;
                }
                setSavingDraft(true);
                try {
                  const lines = [
                    { accountId: debitAccountId, debit: value, credit: 0 },
                    { accountId: creditAccountId, debit: 0, credit: value },
                  ];
                  const created = await createCutoffDraftApi({ cutoffDate, lines });
                  const summary: CutoffDraftSummary = {
                    id: created.id,
                    cutoffDate,
                    debit: value,
                    credit: value,
                    status: "DRAFT",
                    lines,
                  };
                  setDrafts((current) => mergeById([], [summary, ...current.filter((row) => row.id !== summary.id)]));
                  setDraftId(created.id);
                  toast.success("Draft saved. A different finance user can sign it.");
                  void reloadLists();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not save the cutoff draft.");
                } finally {
                  setSavingDraft(false);
                }
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="cutoff-date">Cutoff date</Label>
                <Input id="cutoff-date" type="date" value={cutoffDate} onChange={(event) => setCutoffDate(event.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Debit account</Label>
                <SearchableSelect
                  value={debitAccountId}
                  onValueChange={setDebitAccountId}
                  options={accountOptions}
                  placeholder="Search the chart"
                  searchPlaceholder="Code or account name"
                  emptyMessage="No ledger account matches."
                />
              </div>
              <div className="space-y-1">
                <Label>Credit account</Label>
                <SearchableSelect
                  value={creditAccountId}
                  onValueChange={setCreditAccountId}
                  options={accountOptions}
                  placeholder="Search the chart"
                  searchPlaceholder="Code or account name"
                  emptyMessage="No ledger account matches."
                />
              </div>
              <Button type="submit" className="sm:col-span-2 sm:w-fit" disabled={savingDraft}>
                {savingDraft ? "Saving…" : "Save draft"}
              </Button>
            </form>
            <form
              className="mt-6 grid gap-3 sm:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!draftId) {
                  toast.error("Choose the draft to sign.");
                  return;
                }
                try {
                  const signed = await signCutoffDraftApi(draftId);
                  setDrafts((current) => current.map((row) => row.id === draftId ? { ...row, status: signed.status === "SIGNED" ? "SIGNED" : row.status } : row));
                  toast.success(signed.status === "SIGNED" ? "Signed. The journal is still unposted." : `Status ${signed.status}. The journal is still unposted.`);
                  void reloadLists();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not sign the cutoff draft.");
                }
              }}
            >
              <div className="space-y-1 sm:col-span-2">
                <Label>Draft for the second signer</Label>
                <SearchableSelect
                  value={draftId}
                  onValueChange={setDraftId}
                  options={draftOptions}
                  placeholder={draftOptions.length ? "Choose a saved draft" : "Save a draft first"}
                  searchPlaceholder="Date, account, or amount"
                  emptyMessage="No drafts yet."
                />
              </div>
              <Button type="submit" variant="outline" className="sm:w-fit" disabled={!draftId}>Sign draft</Button>
              <Button
                type="button"
                variant="outline"
                className="sm:w-fit"
                disabled={!draftId}
                onClick={async () => {
                  try {
                    await postCutoffDraftApi(draftId);
                    toast.error("Posting returned success, which this screen does not allow.");
                  } catch (error) {
                    toast.message(error instanceof Error ? error.message : "Opening journals stay unposted.");
                  }
                }}
              >
                Post stays refused
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Asset opening</CardTitle>
            <CardDescription>Pick an asset from the register, or add one. Cost and accumulated depreciation start from that asset and stay on a draft. Posting stays refused.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const assetCode = selectedAsset?.code ?? "";
                if (!assetCode) {
                  toast.error("Choose an asset from the register, or add one.");
                  return;
                }
                const openingCost = Number(cost);
                const openingAccumulated = Number(accumulated) || 0;
                if (!(openingCost > 0)) {
                  toast.error("Enter a cost above zero.");
                  return;
                }
                setSavingAsset(true);
                try {
                  const created = await createAssetOpeningApi({
                    assetCode,
                    cost: openingCost,
                    accumulatedDepreciation: openingAccumulated,
                  });
                  const summary: AssetOpeningSummary = {
                    id: created.id,
                    assetCode,
                    cost: openingCost,
                    accumulatedDepreciation: openingAccumulated,
                    status: "DRAFT",
                  };
                  setOpenings((current) => mergeById([], [summary, ...current.filter((row) => row.id !== summary.id)]));
                  setOpeningId(created.id);
                  toast.success("Asset opening saved as a draft.");
                  void reloadLists();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not save the asset opening.");
                } finally {
                  setSavingAsset(false);
                }
              }}
            >
              <div className="space-y-1 sm:col-span-3">
                <Label>Asset</Label>
                <AsyncSearchableSelect
                  value={selectedAssetId || assetChoice?.id || ""}
                  onValueChange={(id) => {
                    if (!id) {
                      setSelectedAssetId("");
                      setAssetChoice(null);
                      return;
                    }
                    const asset = assets.find((row) => row.id === id);
                    if (!asset) return;
                    chooseAsset(asset);
                  }}
                  onOptionSelect={(option) => {
                    if (option) setAssetChoice(option);
                  }}
                  loadOptions={loadAssetOptions}
                  selectedOption={assetChoice}
                  allowClear
                  searchDebounceMs={0}
                  showSelectedDescription
                  onCreateNew={(query) => {
                    setSuggestedAssetCode(suggestNextFaCode(assets));
                    setSuggestedAssetName(query.trim());
                    setAddAssetOpen(true);
                  }}
                  createNewLabel="Add asset"
                  placeholder="Search the asset register"
                  searchPlaceholder="Code, name, or tag"
                  emptyMessage="No asset on the register matches."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="asset-cost">Cost</Label>
                <Input id="asset-cost" type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} required />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="asset-accum">Accumulated depreciation</Label>
                <Input id="asset-accum" type="number" min="0" step="0.01" value={accumulated} onChange={(event) => setAccumulated(event.target.value)} />
              </div>
              <Button type="submit" className="sm:col-span-3 sm:w-fit" disabled={savingAsset}>
                {savingAsset ? "Saving…" : "Save asset draft"}
              </Button>
            </form>
            <form
              className="mt-6 flex flex-wrap items-end gap-3"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!openingId) {
                  toast.error("Choose the asset draft to post.");
                  return;
                }
                try {
                  await postAssetOpeningApi(openingId);
                  toast.error("Posting returned success, which this screen does not allow.");
                } catch (error) {
                  toast.message(error instanceof Error ? error.message : "Asset openings stay unposted.");
                }
              }}
            >
              <div className="min-w-[16rem] flex-1 space-y-1">
                <Label>Asset draft</Label>
                <SearchableSelect
                  value={openingId}
                  onValueChange={setOpeningId}
                  options={openingOptions}
                  placeholder={openingOptions.length ? "Choose a saved asset draft" : "Save an asset draft first"}
                  searchPlaceholder="Asset name or code"
                  emptyMessage="No asset drafts yet."
                />
              </div>
              <Button type="submit" variant="outline" disabled={!openingId}>Post stays refused</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <AddAssetSheet
        open={addAssetOpen}
        onOpenChange={setAddAssetOpen}
        suggestedCode={suggestedAssetCode}
        suggestedName={suggestedAssetName}
        onSuccess={async (created) => {
          const list = await fetchAssetsApi().catch(() => assets);
          setAssets(list);
          const asset = created ? list.find((row) => row.id === created.id) : undefined;
          if (asset) chooseAsset(asset);
        }}
      />
    </PageShell>
  );
}
