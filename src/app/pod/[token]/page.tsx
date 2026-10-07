"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getApiBase } from "@/lib/api/client";
import { PodSignaturePad } from "@/components/docs/PodSignaturePad";
import type SignatureCanvas from "react-signature-canvas";

type ReceiptStatus = "FULL" | "PARTIAL" | "DISCREPANCY" | "REJECTED";

type PodLine = { lineId: string; description: string; quantity: number; unit: string };

type PodPayload = {
  orgName: string;
  deliveryNoteNumber: string;
  invoiceNumber?: string | null;
  customerName: string;
  deliveryDate?: string;
  alreadyConfirmed: boolean;
  readyForConfirmation: boolean;
  allowSignature: boolean;
  allowPhoto: boolean;
  allowPartial: boolean;
  lines: PodLine[];
};

function formatDeliveryDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const bytes = new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${file.type || "image/jpeg"};base64,${btoa(binary)}`;
}

export default function PublicProofOfDeliveryPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const sigRef = React.useRef<SignatureCanvas>(null);
  const [payload, setPayload] = React.useState<PodPayload | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [receiverName, setReceiverName] = React.useState("");
  const [receiverPhone, setReceiverPhone] = React.useState("");
  const [receiverJobTitle, setReceiverJobTitle] = React.useState("");
  const [comments, setComments] = React.useState("");
  const [receiptStatus, setReceiptStatus] = React.useState<ReceiptStatus>("FULL");
  const [photo, setPhoto] = React.useState<File | null>(null);
  const [lineQty, setLineQty] = React.useState<Record<string, string>>({});
  const [lineReason, setLineReason] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [doneNumber, setDoneNumber] = React.useState("");

  React.useEffect(() => {
    if (!token) return;
    const base = getApiBase();
    if (!base) {
      setError("This page cannot reach the delivery service.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(`${base}/api/public/pod/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("This delivery link is not valid.");
        return res.json() as Promise<PodPayload>;
      })
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
        const qty: Record<string, string> = {};
        for (const line of data.lines ?? []) qty[line.lineId] = String(line.quantity);
        setLineQty(qty);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async () => {
    if (!payload) return;
    const base = getApiBase();
    setSubmitting(true);
    setError("");
    try {
      let signatureDataUrl = "";
      if (payload.allowSignature && sigRef.current && !sigRef.current.isEmpty()) {
        signatureDataUrl = sigRef.current.toDataURL("image/png");
      }
      const photoDataUrl = photo ? await fileToDataUrl(photo) : "";
      const discrepancies =
        receiptStatus === "FULL"
          ? []
          : (payload.lines ?? []).map((line) => ({
              lineId: line.lineId,
              quantity: Number(lineQty[line.lineId] ?? 0),
              reason: lineReason[line.lineId]?.trim() || undefined,
            }));
      const res = await fetch(`${base}/api/public/pod/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverName,
          receiverPhone,
          receiverJobTitle,
          receiptStatus,
          comments,
          signatureDataUrl,
          photoDataUrl,
          discrepancies,
        }),
      });
      const body = (await res.json()) as { error?: string; deliveryNoteNumber?: string };
      if (!res.ok) throw new Error(body.error || "Could not confirm this delivery.");
      setDoneNumber(body.deliveryNoteNumber || payload.deliveryNoteNumber);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (doneNumber) {
    return (
      <main className="mx-auto min-h-screen max-w-lg px-5 py-10">
        <p className="text-sm font-medium text-emerald-700">Delivery confirmed</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Thank you.</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Receipt of delivery note {doneNumber} has been recorded.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 py-8">
      {loading ? <p className="text-sm text-muted-foreground">Loading delivery…</p> : null}
      {!loading && error && !payload ? <p className="text-sm text-destructive">{error}</p> : null}
      {payload ? (
        <div className="space-y-6">
          <header>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{payload.orgName}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Confirm receipt of delivery</h1>
          </header>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Delivery note</dt>
              <dd className="font-medium">{payload.deliveryNoteNumber}</dd>
            </div>
            {payload.invoiceNumber ? (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Invoice</dt>
                <dd className="font-medium">{payload.invoiceNumber}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="text-right font-medium">{payload.customerName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Delivery date</dt>
              <dd className="font-medium">{formatDeliveryDate(payload.deliveryDate)}</dd>
            </div>
          </dl>

          {payload.alreadyConfirmed ? (
            <p className="rounded-md border bg-muted/40 px-3 py-3 text-sm">Receipt of this delivery was already recorded.</p>
          ) : !payload.readyForConfirmation ? (
            <p className="rounded-md border bg-muted/40 px-3 py-3 text-sm">
              This delivery is not ready to confirm yet. Scan the code again after the goods are dispatched.
            </p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="receiver-name">Receiver name</Label>
                <Input id="receiver-name" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} required autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiver-phone">Phone number</Label>
                <Input id="receiver-phone" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} type="tel" autoComplete="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiver-role">Job title or department</Label>
                <Input id="receiver-role" value={receiverJobTitle} onChange={(e) => setReceiverJobTitle(e.target.value)} />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">How was this delivery received?</legend>
                {(
                  [
                    ["FULL", "Received in full"],
                    ["PARTIAL", "Partially received"],
                    ["DISCREPANCY", "Received with discrepancy"],
                    ["REJECTED", "Rejected"],
                  ] as Array<[ReceiptStatus, string]>
                )
                  .filter(([value]) => payload.allowPartial || value === "FULL")
                  .map(([value, label]) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="receipt"
                        checked={receiptStatus === value}
                        onChange={() => setReceiptStatus(value)}
                      />
                      {label}
                    </label>
                  ))}
              </fieldset>
              {receiptStatus !== "FULL" ? (
                <div className="space-y-3">
                  {payload.lines.map((line) => (
                    <div key={line.lineId} className="rounded-md border p-3 space-y-2">
                      <p className="text-sm font-medium">{line.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Shipped {line.quantity} {line.unit}
                      </p>
                      <Label className="text-xs">Quantity received</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={lineQty[line.lineId] ?? ""}
                        onChange={(e) => setLineQty((prev) => ({ ...prev, [line.lineId]: e.target.value }))}
                      />
                      <Label className="text-xs">Reason</Label>
                      <Input
                        value={lineReason[line.lineId] ?? ""}
                        onChange={(e) => setLineReason((prev) => ({ ...prev, [line.lineId]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              {payload.allowSignature ? (
                <div className="space-y-2">
                  <Label>Signature</Label>
                  <PodSignaturePad ref={sigRef} />
                  <Button type="button" variant="outline" size="sm" onClick={() => sigRef.current?.clear()}>
                    Clear signature
                  </Button>
                </div>
              ) : null}
              {payload.allowPhoto ? (
                <div className="space-y-2">
                  <Label htmlFor="pod-photo">Photo of the signed delivery note</Label>
                  <Input
                    id="pod-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="comments">Comments</Label>
                <Textarea id="comments" value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={submitting || !receiverName.trim()}>
                {submitting ? "Confirming…" : "Confirm delivery"}
              </Button>
            </form>
          )}
        </div>
      ) : null}
    </main>
  );
}
