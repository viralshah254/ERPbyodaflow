"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SignatureAttachmentViewButton } from "@/components/docs/SignatureAttachmentViewButton";
import type {
  DeliveryCheckInRecord,
  DispatchPickupRecord,
  DocumentDetailRecord,
  PodConfirmationRecord,
  WarehouseDropRecord,
} from "@/lib/types/documents";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Download,
  FileCheck2,
  MapPin,
  MessageSquareText,
  PackageCheck,
  PenLine,
  Truck,
  Warehouse,
} from "lucide-react";

type LineMeta = DocumentDetailRecord["lines"][number];

type Props = {
  documentId: string;
  documentNumber?: string;
  lines: LineMeta[];
  dispatchPickup?: DispatchPickupRecord;
  deliveryCheckIn?: DeliveryCheckInRecord;
  warehouseDrop?: WarehouseDropRecord;
  podConfirmation?: PodConfirmationRecord;
  onDownloadSignedCopy: (attachmentId: string, fileBase: string) => void;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function podSourceLabel(source?: PodConfirmationRecord["source"]) {
  if (source === "signed_copy") return "Signed copy (desk)";
  if (source === "mobile") return "Mobile";
  if (source === "desk") return "Desk";
  return null;
}

function qtyFullyReceived(received: number, shipped: number) {
  return Math.abs(received - shipped) < 0.02;
}

export function DeliveryEvidencePanel({
  documentId,
  documentNumber,
  lines,
  dispatchPickup,
  deliveryCheckIn,
  warehouseDrop,
  podConfirmation,
  onDownloadSignedCopy,
}: Props) {
  const podConfirmed = Boolean(podConfirmation?.confirmedAt);
  const sourceLabel = podSourceLabel(podConfirmation?.source);
  const evidence = podConfirmation?.evidenceVerification;
  const showEvidenceDetail =
    evidence &&
    evidence.status !== "skipped" &&
    (evidence.status === "failed" ||
      evidence.status === "pending" ||
      Boolean(evidence.reason));

  const timelineSteps = [
    dispatchPickup
      ? {
          key: "pickup",
          label: "Pickup",
          detail: formatWhen(dispatchPickup.dispatchedAt),
          icon: Truck,
          tone: "neutral" as const,
        }
      : null,
    deliveryCheckIn
      ? {
          key: "checkin",
          label: deliveryCheckIn.withinGeofence ? "On premises" : "Outside geofence",
          detail: formatWhen(deliveryCheckIn.checkedInAt),
          icon: MapPin,
          tone: deliveryCheckIn.withinGeofence ? ("ok" as const) : ("warn" as const),
        }
      : null,
    podConfirmed
      ? {
          key: "pod",
          label: "POD confirmed",
          detail: formatWhen(podConfirmation!.confirmedAt),
          icon: PackageCheck,
          tone: "ok" as const,
        }
      : null,
    podConfirmation?.signedCopyAttachmentId
      ? {
          key: "signed",
          label: "Signed copy",
          detail: "On file",
          icon: FileCheck2,
          tone: "ok" as const,
        }
      : null,
    warehouseDrop
      ? {
          key: "drop",
          label: warehouseDrop.receivedAt ? "Warehouse posted" : "Warehouse return",
          detail: formatWhen(warehouseDrop.droppedAt),
          icon: Warehouse,
          tone: warehouseDrop.receivedAt ? ("ok" as const) : ("warn" as const),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    detail: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: "ok" | "warn" | "neutral";
  }>;

  return (
    <div className="mt-4 rounded-xl border bg-muted/20 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background/60 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">Delivery evidence</p>
            <p className="text-xs text-muted-foreground truncate">
              Check-in, proof of delivery, and signed documents
            </p>
          </div>
        </div>
        {podConfirmed ? (
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/20"
          >
            Delivered
          </Badge>
        ) : null}
      </div>

      {timelineSteps.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
          {timelineSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.key}>
                {i > 0 ? (
                  <span
                    className="hidden sm:inline self-center text-muted-foreground/40 select-none"
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
                    step.tone === "ok" &&
                      "border-emerald-500/25 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100",
                    step.tone === "warn" &&
                      "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-100",
                    step.tone === "neutral" && "border-border bg-background text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  <span className="font-medium">{step.label}</span>
                  <span className="text-muted-foreground tabular-nums">{step.detail}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-4 p-4">
        {dispatchPickup ? (
          <section className="space-y-2">
            <SectionLabel>Pickup / collection</SectionLabel>
            <div className="rounded-lg border bg-background px-3 py-2.5 text-sm">
              <p>
                Dispatched {formatWhen(dispatchPickup.dispatchedAt)}
                {dispatchPickup.dispatcherName ? ` · ${dispatchPickup.dispatcherName}` : ""}
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Driver signature (pickup):{" "}
                {dispatchPickup.signatureAttachmentId ? (
                  <SignatureAttachmentViewButton
                    docType="delivery-note"
                    documentId={documentId}
                    attachmentId={dispatchPickup.signatureAttachmentId}
                  />
                ) : (
                  "—"
                )}
              </p>
            </div>
            {(dispatchPickup.lines?.length ?? 0) > 0 ? (
              <LineList>
                {(dispatchPickup.lines ?? []).map((pl) => {
                  const docLine = lines.find((l) => l.id === pl.lineId);
                  const shippedW = docLine?.weightKg;
                  return (
                    <LineRow
                      key={pl.lineId}
                      title={docLine?.description ?? pl.lineId}
                      meta={[
                        typeof shippedW === "number" ? `Shipped ${shippedW} kg` : null,
                        `Loaded ${pl.loadedWeightKg} kg`,
                        pl.varianceReason ?? null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  );
                })}
              </LineList>
            ) : null}
          </section>
        ) : null}

        {deliveryCheckIn ? (
          <section className="space-y-2">
            <SectionLabel>Customer check-in</SectionLabel>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-2.5">
              <MapPin
                className={cn(
                  "h-4 w-4 shrink-0",
                  deliveryCheckIn.withinGeofence
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium tabular-nums">
                  {formatWhen(deliveryCheckIn.checkedInAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {deliveryCheckIn.withinGeofence
                    ? `${Math.round(deliveryCheckIn.distanceM)} m from customer location`
                    : "Check-in was outside the geofence"}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0",
                  deliveryCheckIn.withinGeofence
                    ? "border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                    : "border-amber-500/30 text-amber-800 dark:text-amber-200"
                )}
              >
                {deliveryCheckIn.withinGeofence ? "On premises" : "Outside geofence"}
              </Badge>
            </div>
          </section>
        ) : null}

        {warehouseDrop ? (
          <section className="space-y-2">
            <SectionLabel>Warehouse return</SectionLabel>
            <div className="rounded-lg border bg-background px-3 py-2.5 text-sm space-y-1">
              <p>
                Dropped {formatWhen(warehouseDrop.droppedAt)}
                {warehouseDrop.dispatcherName ? ` · ${warehouseDrop.dispatcherName}` : ""}
              </p>
              {warehouseDrop.receivedAt ? (
                <p className="text-xs text-muted-foreground">
                  Stock posted {formatWhen(warehouseDrop.receivedAt)}
                </p>
              ) : (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Awaiting warehouse weigh &amp; post
                </p>
              )}
            </div>
          </section>
        ) : null}

        {podConfirmed && podConfirmation ? (
          <section className="space-y-3">
            <SectionLabel>Proof of delivery</SectionLabel>

            <div className="rounded-lg border bg-background p-3 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold">
                    {podConfirmation.receiverName
                      ? `Received by ${podConfirmation.receiverName}`
                      : "Delivery confirmed"}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatWhen(podConfirmation.confirmedAt)}</span>
                    {podConfirmation.receiverPhone ? (
                      <>
                        <span aria-hidden>·</span>
                        <span>{podConfirmation.receiverPhone}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sourceLabel ? (
                    <Badge variant="secondary" className="font-medium">
                      {sourceLabel}
                    </Badge>
                  ) : null}
                  {evidence?.status === "skipped" ? (
                    <Badge variant="outline" className="font-normal text-muted-foreground">
                      Evidence accepted
                    </Badge>
                  ) : null}
                  {evidence?.status === "passed" ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-800 dark:text-emerald-200 font-normal"
                    >
                      Evidence verified
                    </Badge>
                  ) : null}
                  {evidence?.status === "failed" ? (
                    <Badge variant="destructive" className="font-normal">
                      Evidence failed
                    </Badge>
                  ) : null}
                  {evidence?.status === "pending" ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 text-amber-800 dark:text-amber-200 font-normal"
                    >
                      Evidence pending
                    </Badge>
                  ) : null}
                </div>
              </div>

              {podConfirmation.note ? (
                <div className="flex gap-2 rounded-md bg-muted/50 px-2.5 py-2 text-sm">
                  <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <p className="text-muted-foreground whitespace-pre-wrap">{podConfirmation.note}</p>
                </div>
              ) : null}

              {showEvidenceDetail ? (
                <p className="text-xs text-muted-foreground">
                  Evidence check: {evidence!.status}
                  {evidence!.reason ? ` — ${evidence!.reason}` : ""}
                </p>
              ) : null}

              {(podConfirmation.signedCopyAttachmentId ||
                podConfirmation.receiverSignatureAttachmentId ||
                podConfirmation.dispatcherSignatureAttachmentId ||
                podConfirmation.dispatcherName) && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {podConfirmation.signedCopyAttachmentId ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2.5">
                      <div className="min-w-0 flex items-center gap-2">
                        <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium">Signed delivery note</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Customer-signed copy on file
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-8"
                        onClick={() =>
                          onDownloadSignedCopy(
                            podConfirmation.signedCopyAttachmentId!,
                            `${documentNumber ?? documentId}-signed-dn`
                          )
                        }
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download
                      </Button>
                    </div>
                  ) : null}

                  {(podConfirmation.receiverSignatureAttachmentId ||
                    podConfirmation.dispatcherSignatureAttachmentId ||
                    podConfirmation.dispatcherName) && (
                    <div className="rounded-md border border-dashed px-3 py-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <PenLine className="h-4 w-4 shrink-0 text-primary" />
                        <p className="text-xs font-medium">Signatures</p>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-muted-foreground">Customer / receiver</span>
                          {podConfirmation.receiverSignatureAttachmentId ? (
                            <SignatureAttachmentViewButton
                              docType="delivery-note"
                              documentId={documentId}
                              attachmentId={podConfirmation.receiverSignatureAttachmentId}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                        {(podConfirmation.dispatcherName ||
                          podConfirmation.dispatcherSignatureAttachmentId) && (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-muted-foreground truncate">
                              Delivery person
                              {podConfirmation.dispatcherName
                                ? ` · ${podConfirmation.dispatcherName}`
                                : ""}
                            </span>
                            {podConfirmation.dispatcherSignatureAttachmentId ? (
                              <SignatureAttachmentViewButton
                                docType="delivery-note"
                                documentId={documentId}
                                attachmentId={podConfirmation.dispatcherSignatureAttachmentId}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {(podConfirmation.lines?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Received lines</p>
                <LineList>
                  {(podConfirmation.lines ?? []).map((ln) => {
                    const docLine = lines.find((l) => l.id === ln.lineId);
                    const pickupLine = dispatchPickup?.lines?.find((p) => p.lineId === ln.lineId);
                    const shippedW = docLine?.weightKg;
                    const full = qtyFullyReceived(ln.qtyReceived, ln.qtyShipped);
                    const metaParts = [
                      typeof shippedW === "number" ? `shipped ${shippedW} kg` : null,
                      pickupLine ? `loaded ${pickupLine.loadedWeightKg} kg` : null,
                      typeof ln.receivedWeightKg === "number"
                        ? `received ${ln.receivedWeightKg} kg`
                        : null,
                      ln.varianceReason ?? null,
                      (ln.varianceEvidenceAttachmentIds?.length ?? 0) > 0
                        ? `${ln.varianceEvidenceAttachmentIds!.length} variance photo(s)`
                        : null,
                    ].filter(Boolean);

                    return (
                      <LineRow
                        key={ln.lineId}
                        title={docLine?.description ?? ln.lineId}
                        meta={metaParts.join(" · ")}
                        status={
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 tabular-nums font-medium",
                              full
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-amber-700 dark:text-amber-300"
                            )}
                          >
                            {full ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                            Received {ln.qtyReceived} of {ln.qtyShipped}
                          </span>
                        }
                      />
                    );
                  })}
                </LineList>
              </div>
            ) : null}

            {(podConfirmation.extraReceiptLines?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                <SectionLabel>Extra receipt (not on delivery note)</SectionLabel>
                <LineList>
                  {(podConfirmation.extraReceiptLines ?? []).map((row) => (
                    <LineRow
                      key={row.lineId}
                      title={
                        (row.description ?? row.productId ?? row.lineId) +
                        (row.productId ? ` · ${row.productId}` : "")
                      }
                      meta={[
                        typeof row.receivedWeightKg === "number"
                          ? `${row.receivedWeightKg} kg`
                          : null,
                        row.qtyReceived != null ? `qty ${row.qtyReceived}` : null,
                        row.note || null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  ))}
                </LineList>
              </div>
            ) : null}

            {podConfirmation.franchiseeWeightSplit ? (
              <div className="space-y-2">
                <SectionLabel>Outlet weight split</SectionLabel>
                <p className="text-xs text-muted-foreground">
                  Reference total {podConfirmation.franchiseeWeightSplit.referenceTotalWeightKg} kg
                  {podConfirmation.franchiseeWeightSplit.splitNote
                    ? ` — ${podConfirmation.franchiseeWeightSplit.splitNote}`
                    : ""}
                </p>
                <LineList>
                  {(podConfirmation.franchiseeWeightSplit.lines ?? []).map((sl, i) => (
                    <LineRow
                      key={`${sl.description}-${i}`}
                      title={
                        sl.description + (sl.productId ? ` · ${sl.productId}` : "")
                      }
                      meta={`${sl.weightKg} kg${sl.note ? ` · ${sl.note}` : ""}`}
                    />
                  ))}
                </LineList>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function LineList({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border bg-background divide-y overflow-hidden">{children}</div>;
}

function LineRow({
  title,
  meta,
  status,
}: {
  title: string;
  meta?: string;
  status?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 text-sm">
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium leading-snug">{title}</p>
        {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
      </div>
      {status ? <div className="shrink-0 text-xs text-right">{status}</div> : null}
    </div>
  );
}
