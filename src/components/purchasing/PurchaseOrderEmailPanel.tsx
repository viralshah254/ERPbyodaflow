"use client";
import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { can } from "@/lib/rbac/can";
import {
  getPoDeliveries,
  sendPo,
  type PoDeliveryState,
} from "@/lib/api/procurement-flow";
import { apiRequest } from "@/lib/api/client";
export function PurchaseOrderEmailPanel({
  id,
  status,
  onChanged,
}: {
  id: string;
  status: string;
  onChanged: () => Promise<void>;
}) {
  const user = useAuthStore((s) => s.user);
  const canWrite = can(user, "purchase.write"),
    canApprove = can(user, "purchase.approve");
  const [data, setData] = React.useState<PoDeliveryState | null>(null),
    [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    [reviewed, setReviewed] = React.useState(false);
  const [resendReason, setResendReason] = React.useState("");
  const requestKey = React.useRef(crypto.randomUUID());
  const load = React.useCallback(async () => {
    setError("");
    try {
      setData(await getPoDeliveries(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  React.useEffect(() => {
    setData(null);
    setReviewed(false);
    requestKey.current = crypto.randomUUID();
    void load();
  }, [load, status]);
  const send = async (approve: boolean) => {
    setBusy(true);
    setError("");
    try {
      await sendPo(
        id,
        requestKey.current,
        approve,
        canResend ? resendReason : undefined,
        {
          to: canResend
            ? data!.jobs.find((job) =>
                ["ACCEPTED", "DELIVERED"].includes(job.status),
              )!.to
            : data!.supplier!.email!,
          from: data!.sender!,
          sourceHash: data!.sourceHash,
        },
      );
      requestKey.current = crypto.randomUUID();
      setReviewed(false);
      setResendReason("");
      await load();
      await onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const active = data?.jobs.some((j) =>
    [
      "WAITING_APPROVAL",
      "QUEUED",
      "SENDING",
      "ACCEPTED",
      "DELIVERED",
      "UNKNOWN",
    ].includes(j.status),
  );
  const canResend = Boolean(
    data?.jobs.length &&
      data.jobs.some((job) => ["ACCEPTED", "DELIVERED"].includes(job.status)) &&
      !data.jobs.some((job) =>
        ["WAITING_APPROVAL", "QUEUED", "SENDING", "UNKNOWN"].includes(
          job.status,
        ),
      ),
  );
  return (
    <section
      id="supplier-email"
      tabIndex={-1}
      className="scroll-mt-36 space-y-2 rounded-md border p-3"
      aria-label="Supplier email delivery"
      data-tutorial-hint="purchase-order-email"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Supplier email delivery</h2>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setReviewed(false);
            requestKey.current = crypto.randomUUID();
            void load();
          }}
        >
          Refresh status
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
      {!data ? (
        <p>Loading supplier and company sender…</p>
      ) : (
        <>
          <dl className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Supplier</dt>
              <dd className="font-medium [overflow-wrap:anywhere]">{data.supplier?.name || "Select a supplier"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">To</dt>
              <dd className="font-medium [overflow-wrap:anywhere]">
                {canResend ? data.jobs.find(job => ["ACCEPTED", "DELIVERED"].includes(job.status))?.to : data.supplier?.email || "Supplier email missing"}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">From</dt>
              <dd className="font-medium [overflow-wrap:anywhere]">{data.sender || "Company sender not verified"}</dd>
            </div>
          </dl>
          {!data.sender ? (
            <Link
              className="text-primary underline"
              href="/settings/company-email"
            >
              Set up company email
            </Link>
          ) : null}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Changing the supplier</summary>
            <p className="mt-1">Edit the supplier while the PO is a draft. After sending, use cancellation and replacement to issue a new commitment.</p>
          </details>
          {(status === "PENDING_APPROVAL" || status === "APPROVED") &&
          (!active || canResend) ? (
            <>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviewed}
                  disabled={busy}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                I reviewed this PO&apos;s supplier, recipient, quantities,
                prices and PDF.
              </label>
              {canResend ? (
                <label className="block text-sm">
                  Reason for resending the same approved PO
                  <Input
                    value={resendReason}
                    onChange={(e) => {
                      setResendReason(e.target.value);
                      requestKey.current = crypto.randomUUID();
                    }}
                  />
                </label>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {status === "PENDING_APPROVAL" && canApprove ? (
                  <Button
                    disabled={
                      busy || !reviewed || !data.sender || !data.supplier?.email
                    }
                    onClick={() => void send(true)}
                  >
                    Approve &amp; send to supplier
                  </Button>
                ) : null}
                {status === "APPROVED" && canWrite ? (
                  <Button
                    disabled={
                      busy ||
                      !reviewed ||
                      !data.sender ||
                      !data.supplier?.email ||
                      (canResend && resendReason.trim().length < 5)
                    }
                    onClick={() => void send(false)}
                  >
                    {canResend ? "Resend same approved PO" : "Send to supplier"}
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
          {status === "DRAFT" ? (
            <p className="text-sm">
              Save and submit this PO using the document approval actions. An
              authorised approver can then choose Approve &amp; send.
            </p>
          ) : null}
          {data.jobs.map((job) => (
            <div
              key={job._id}
              className="space-y-1 rounded bg-muted p-3 text-sm [overflow-wrap:anywhere]"
            >
              <p>
                {job.status === "ACCEPTED"
                  ? "Accepted by provider (delivery not yet confirmed)"
                  : job.status}{" "}
                · {job.to} · {new Date(job.createdAt).toLocaleString()}
              </p>
              {job.error ? <p>{job.error}</p> : null}
              {job.status === "UNKNOWN" ? (
                <p>
                  Check SendGrid activity before requesting any resend. The
                  provider may already have accepted this order.
                </p>
              ) : null}
              {canWrite &&
              ["WAITING_APPROVAL", "QUEUED"].includes(job.status) ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void apiRequest(
                      `/api/procurement/orders/${encodeURIComponent(id)}/cancel-delivery`,
                      { method: "POST", body: { deliveryId: job._id } },
                    )
                      .then(load)
                      .catch((e) => setError((e as Error).message))
                      .finally(() => setBusy(false));
                  }}
                >
                  Cancel unsent delivery
                </Button>
              ) : null}
            </div>
          ))}
        </>
      )}
    </section>
  );
}
