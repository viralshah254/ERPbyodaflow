"use client";

import * as React from "react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAssetOpeningApi,
  createCutoffDraftApi,
  postAssetOpeningApi,
  postCutoffDraftApi,
  signCutoffDraftApi,
} from "@/lib/api/cutoff";
import { toast } from "sonner";

export default function CutoffDraftPage() {
  const [cutoffDate, setCutoffDate] = React.useState("");
  const [debitAccountId, setDebitAccountId] = React.useState("");
  const [creditAccountId, setCreditAccountId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [draftId, setDraftId] = React.useState("");
  const [assetCode, setAssetCode] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [accumulated, setAccumulated] = React.useState("");
  const [assetId, setAssetId] = React.useState("");

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
            <CardDescription>Debit and credit use accounts that already exist. This screen does not create ledger accounts and does not post the journal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                const value = Number(amount);
                if (!(value > 0)) {
                  toast.error("Enter an amount above zero.");
                  return;
                }
                try {
                  const created = await createCutoffDraftApi({
                    cutoffDate,
                    lines: [
                      { accountId: debitAccountId, debit: value, credit: 0 },
                      { accountId: creditAccountId, debit: 0, credit: value },
                    ],
                  });
                  setDraftId(created.id);
                  toast.success("Draft saved. A different finance user can sign it.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not save the cutoff draft.");
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
                <Label htmlFor="debit-account">Debit account id</Label>
                <Input id="debit-account" value={debitAccountId} onChange={(event) => setDebitAccountId(event.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="credit-account">Credit account id</Label>
                <Input id="credit-account" value={creditAccountId} onChange={(event) => setCreditAccountId(event.target.value)} required />
              </div>
              <Button type="submit" className="sm:col-span-2 sm:w-fit">Save draft</Button>
            </form>
            <form
              className="mt-6 grid gap-3 sm:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  const signed = await signCutoffDraftApi(draftId);
                  toast.success(`Signed. Status ${signed.status}. Posted remains false.`);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not sign the cutoff draft.");
                }
              }}
            >
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="draft-id">Draft id for the second signer</Label>
                <Input id="draft-id" value={draftId} onChange={(event) => setDraftId(event.target.value)} required />
              </div>
              <Button type="submit" variant="outline" className="sm:w-fit">Sign draft</Button>
              <Button
                type="button"
                variant="outline"
                className="sm:w-fit"
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
            <CardDescription>Cost and accumulated depreciation stay on a draft. Posting the opening stays refused.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-3"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  const created = await createAssetOpeningApi({
                    assetCode,
                    cost: Number(cost),
                    accumulatedDepreciation: Number(accumulated) || 0,
                  });
                  setAssetId(created.id);
                  toast.success("Asset opening saved as a draft.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not save the asset opening.");
                }
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="asset-code">Asset code</Label>
                <Input id="asset-code" value={assetCode} onChange={(event) => setAssetCode(event.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="asset-cost">Cost</Label>
                <Input id="asset-cost" type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="asset-accum">Accumulated depreciation</Label>
                <Input id="asset-accum" type="number" min="0" step="0.01" value={accumulated} onChange={(event) => setAccumulated(event.target.value)} />
              </div>
              <Button type="submit" className="sm:col-span-3 sm:w-fit">Save asset draft</Button>
            </form>
            <form
              className="mt-6 flex flex-wrap items-end gap-3"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await postAssetOpeningApi(assetId);
                  toast.error("Posting returned success, which this screen does not allow.");
                } catch (error) {
                  toast.message(error instanceof Error ? error.message : "Asset openings stay unposted.");
                }
              }}
            >
              <div className="min-w-[16rem] flex-1 space-y-1">
                <Label htmlFor="asset-id">Asset opening id</Label>
                <Input id="asset-id" value={assetId} onChange={(event) => setAssetId(event.target.value)} required />
              </div>
              <Button type="submit" variant="outline">Post stays refused</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
