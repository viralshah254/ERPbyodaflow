"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DocumentPageShell } from "@/components/docs/DocumentPageShell";
import { DocumentFulfilmentLinesTable } from "@/components/docs/DocumentFulfilmentLinesTable";
import { DocumentTabs } from "@/components/docs/DocumentTabs";
import { DocumentRightPanel } from "@/components/docs/DocumentRightPanel";
import { DocumentTimeline } from "@/components/docs/DocumentTimeline";
import { DocumentAttachments } from "@/components/docs/DocumentAttachments";
import { DocumentComments } from "@/components/docs/DocumentComments";
import { DocumentTaxesPanel } from "@/components/docs/DocumentTaxesPanel";
import { PodSignaturePad } from "@/components/docs/PodSignaturePad";
import { SignatureAttachmentViewButton } from "@/components/docs/SignatureAttachmentViewButton";
import { PrintPreviewDrawer } from "@/components/docs/PrintPreviewDrawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getDocTypeConfig } from "@/config/documents";
import type { DocTypeKey } from "@/config/documents/types";
import { formatMoney, kesEquivalent } from "@/lib/money";
import { DualCurrencyAmount } from "@/components/ui/dual-currency-amount";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import {
  addDocumentCommentApi,
  confirmDeliveryPodApi,
  convertDocumentApi,
  documentActionApi,
  downloadDocumentPdfApi,
  downloadDocumentAttachmentApi,
  fetchDocumentDetailApi,
  patchDocumentApi,
  requestDocumentApprovalApi,
  uploadDocumentAttachmentApi,
} from "@/lib/api/documents";
import { fetchLandedCostAllocation, type ExistingLandedCostAllocation } from "@/lib/api/landed-cost";
import { CostImpactPanel } from "@/components/operational/CostImpactPanel";
import { fetchWarehouseOptions } from "@/lib/api/lookups";
import { searchApSupplierOptionsApi, searchArCustomerOptionsApi } from "@/lib/api/payments";
import { fetchPartyByIdApi, type PartyLookupOption } from "@/lib/api/parties";
import type { DocumentDetailRecord } from "@/lib/types/documents";
import {
  DocumentDetailHeader,
  DocumentDetailHeaderSkeleton,
  DocumentNumberField,
} from "@/components/docs/document-detail-header";
import { DocumentChainTimeline } from "@/components/docs/document-chain-timeline";
import { deliveryLinePrimaryLabel, deliveryLineSku } from "@/lib/documents/format-delivery-line";
import { fetchPickPackTasks, fetchPutawayTasks } from "@/lib/api/warehouse-execution";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { useUIStore } from "@/stores/ui-store";
import { useCanWriteDocType } from "@/lib/rbac/use-write-guard";
import { resolveDocumentCreatedByName } from "@/lib/documents/resolve-created-by-name";

const POD_QTY_TOLERANCE = 0.02;
const POD_WEIGHT_TOLERANCE_KG = 0.05;

/**
 * Proof of delivery (signatures, received weights) is intentional mobile-app only —
 * dispatch / outlet apps. Web ERP stays view-coordination; do not expose the POD form here.
 */
const DELIVERY_NOTE_POD_WEB_ENABLED = false;

/** Pick-pack tasks past these states mean warehouse issue already happened — do not link again from the DN. */
const PICK_PACK_ACTIONABLE_STATUSES = new Set(["PENDING", "PICKED", "PACKED"]);

/** Match backend invoice posting readiness for linked delivery notes. */
function deliveryNoteSatisfiedForInvoicePost(status: string | undefined): boolean {
  const st = String(status ?? "").trim().toUpperCase();
  return ["DELIVERED", "CONVERTED", "POSTED"].includes(st);
}

function computePodLineEvidenceNeeded(row: {
  qtyShipped: number;
  weightKg?: number;
  qtyReceived: string;
  receivedWeightKg: string;
}): boolean {
  const qtyReceivedNum = Number(row.qtyReceived);
  if (!Number.isFinite(qtyReceivedNum)) return false;
  const qtyVariance = Math.abs(qtyReceivedNum - row.qtyShipped) > POD_QTY_TOLERANCE;
  const shippedW = row.weightKg;
  let weightVariance = false;
  const recvWs = row.receivedWeightKg.trim();
  if (typeof shippedW === "number" && shippedW > 0 && recvWs !== "") {
    const rw = Number(recvWs.replace(",", "."));
    if (Number.isFinite(rw)) weightVariance = Math.abs(rw - shippedW) > POD_WEIGHT_TOLERANCE_KG;
  }
  return qtyVariance || weightVariance;
}

function humanizeDocTypeKey(key: string) {
  return key.replace(/-/g, " ");
}

export default function DocViewPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const id = params.id as string;
  const terminology = useTerminology();
  const config = getDocTypeConfig(type);
  const label = config ? t(config.termKey, terminology) : type;
  const canWrite = useCanWriteDocType(type);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const [printOpen, setPrintOpen] = React.useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [emailTo, setEmailTo] = React.useState("");
  const [emailSending, setEmailSending] = React.useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = React.useState(false);
  const [openInvoices, setOpenInvoices] = React.useState<Array<{ id: string; number: string; openAmount: number; currency: string }>>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState("");
  const [applyAmount, setApplyAmount] = React.useState("");
  const [applyLoading, setApplyLoading] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  /** True only for the very first fetch when document is still null — drives skeleton vs empty-state decisions. */
  const [initialLoading, setInitialLoading] = React.useState(true);
  /** True when re-fetching after an action; existing document stays visible. */
  const [refreshing, setRefreshing] = React.useState(false);
  const loading = initialLoading;
  const [document, setDocument] = React.useState<Awaited<ReturnType<typeof fetchDocumentDetailApi>>>(null);
  const [notesDraft, setNotesDraft] = React.useState("");
  const [notesSaving, setNotesSaving] = React.useState(false);
  const [landedAllocation, setLandedAllocation] = React.useState<ExistingLandedCostAllocation | null>(null);
  const [convertOpen, setConvertOpen] = React.useState(false);
  const [convertType, setConvertType] = React.useState<DocTypeKey | null>(null);
  const [convertPartyId, setConvertPartyId] = React.useState("");
  const [convertWarehouseId, setConvertWarehouseId] = React.useState("");
  const [outputTemplateId, setOutputTemplateId] = React.useState("");
  const [selectedConvertPartyOption, setSelectedConvertPartyOption] = React.useState<PartyLookupOption | null>(null);
  const [warehouseOptions, setWarehouseOptions] = React.useState<Array<{ id: string; label: string }>>([]);
  const [warehouseTaskLink, setWarehouseTaskLink] = React.useState<{ label: string; href: string } | null>(null);
  const [deliveryNoteWarehouseLabel, setDeliveryNoteWarehouseLabel] = React.useState<string | null>(null);
  const [podSheetOpen, setPodSheetOpen] = React.useState(false);
  const [podReceiverName, setPodReceiverName] = React.useState("");
  const [podReceiverPhone, setPodReceiverPhone] = React.useState("");
  const [podNote, setPodNote] = React.useState("");
  const [podLineRows, setPodLineRows] = React.useState<
    Array<{
      lineId: string;
      description: string;
      /** Muted SKU line under primary title (when API provides SKU). */
      displaySku?: string;
      qtyShipped: number;
      weightKg?: number;
      qtyReceived: string;
      receivedWeightKg: string;
      varianceReason: string;
      varianceEvidenceAttachmentIds: string[];
    }>
  >([]);
  const [podSaving, setPodSaving] = React.useState(false);
  const [podEvidenceUploadBusy, setPodEvidenceUploadBusy] = React.useState(false);
  const podSigRef = React.useRef<SignatureCanvas>(null);
  /** Portals AsyncSearchableSelect panel inside the sheet so Radix does not treat option clicks as “outside”. */
  const convertSheetContentRef = React.useRef<HTMLDivElement | null>(null);
  /** Drop-down teardown can synthesize pointer-outside dismiss on the Sheet in the same frame; briefly ignore closes. */
  const convertSheetDismissShieldUntilRef = React.useRef(0);
  const [convertSelectPortalHost, setConvertSelectPortalHost] = React.useState<HTMLElement | null>(null);
  const setConvertSheetHostRef = React.useCallback((node: HTMLDivElement | null) => {
    convertSheetContentRef.current = node;
    setConvertSelectPortalHost(node);
  }, []);
  const convertTargets = React.useMemo(() => {
    const raw = document?.availableConversionTargets ?? [];
    return [...new Set(raw)];
  }, [document?.availableConversionTargets]);

  React.useEffect(() => {
    if (!podSheetOpen || !document?.lines?.length) return;
    setPodReceiverName("");
    setPodReceiverPhone("");
    setPodNote("");
    setPodLineRows(
      document.lines.map((l) => ({
        lineId: l.id ?? "",
        description: deliveryLinePrimaryLabel({
          productName: l.productName,
          productSku: l.productSku,
          description: l.description,
        }),
        ...(() => {
          const sku = deliveryLineSku({
            productName: l.productName,
            productSku: l.productSku,
            description: l.description,
          });
          return sku ? { displaySku: sku } : {};
        })(),
        qtyShipped: l.qty ?? 0,
        ...(typeof l.weightKg === "number" && l.weightKg > 0 ? { weightKg: l.weightKg } : {}),
        qtyReceived: String(l.qty ?? 0),
        receivedWeightKg: "",
        varianceReason: "",
        varianceEvidenceAttachmentIds: [],
      }))
    );
    const raf = requestAnimationFrame(() => podSigRef.current?.clear());
    return () => cancelAnimationFrame(raf);
  }, [podSheetOpen, document?.id, document?.lines]);
  const [resolvedPartyName, setResolvedPartyName] = React.useState<string | null>(null);
  const isPurchaseDoc = [
    "purchase-request",
    "purchase-order",
    "grn",
    "bill",
    "purchase-credit-note",
    "purchase-debit-note",
  ].includes(type);
  const isGrnDoc = type === "grn";
  const isFulfilmentDoc = type === "sales-order" || type === "delivery-note";
  const dispatchedDnStatuses = ["IN_TRANSIT", "DELIVERED", "POSTED", "CONVERTED"];
  const showFulfilmentTable = React.useMemo(() => {
    if (!isFulfilmentDoc || !document) return false;
    const lines = document.lines ?? [];
    const st = String(document.status ?? "").toUpperCase();
    const sourceSt = String(document.sourceDocument?.status ?? "").toUpperCase();

    const lineHasGap = (l: (typeof lines)[number]) => {
      const ordered = l.orderedQuantity ?? l.sourceQuantity;
      const shipped = l.shippedQuantity ?? l.qty ?? 0;
      return (
        l.fulfilmentStatus === "NOT_PACKED" ||
        l.fulfilmentStatus === "PARTIALLY_PACKED" ||
        (ordered != null && ordered > shipped + 0.01) ||
        (l.backorderQuantity ?? 0) > 0.01
      );
    };

    if (type === "delivery-note") {
      if (st === "DRAFT") return false;
      if (dispatchedDnStatuses.includes(st)) return true;
      return lines.some(lineHasGap) || sourceSt === "PARTIALLY_FULFILLED";
    }

    return (
      st === "PARTIALLY_FULFILLED" ||
      sourceSt === "PARTIALLY_FULFILLED" ||
      lines.some(lineHasGap)
    );
  }, [document, isFulfilmentDoc, type]);
  const counterpartyLabel = isPurchaseDoc ? "Supplier" : "Customer / Supplier";
  const displayPartyName = resolvedPartyName ?? document?.party ?? "—";

  React.useEffect(() => {
    setResolvedPartyName(null);
    if (!document?.partyId) return;
    const p = (document.party ?? "").trim();
    const uuidLike =
      !p ||
      p === document.partyId ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p);
    if (!uuidLike) return;
    let cancelled = false;
    void fetchPartyByIdApi(document.partyId)
      .then((row) => {
        if (!cancelled && row?.name?.trim()) setResolvedPartyName(row.name.trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [document?.partyId, document?.party]);
  const availableActions = document?.availableActions ?? [];
  const canRequestApproval = availableActions.includes("submit");
  const canApprove = availableActions.includes("approve");
  const canPost = availableActions.includes("post");
  const canCancel = availableActions.includes("cancel");
  const canReverse = availableActions.includes("reverse");
  const printDoc = React.useMemo(
    () => ({
      type,
      id,
      title: `${label} ${document?.number ?? id}`,
      date: document?.date ?? "2025-01-28",
      party: displayPartyName,
      total: document?.total ?? 0,
      currency: document?.currency ?? "KES",
      lines: document?.lines,
    }),
    [type, id, label, document, displayPartyName]
  );

  const refreshDocument = React.useCallback(
    async (isBackground = false, fullPayload = true) => {
      if (isBackground) {
        setRefreshing(true);
      } else {
        setInitialLoading(true);
      }
      try {
        const detail = await fetchDocumentDetailApi(type as DocTypeKey, id, {
          include: fullPayload ? ["all"] : ["core"],
        });
        setDocument(detail);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [type, id]
  );

  /** Load attachments, comments, and audit after core document renders. */
  React.useEffect(() => {
    if (initialLoading || !document?.id) return;
    let cancelled = false;
    void fetchDocumentDetailApi(type as DocTypeKey, id, {
      include: ["attachments", "comments", "audit"],
    })
      .then((extra) => {
        if (cancelled || !extra) return;
        setDocument((prev) => {
          if (cancelled || !extra) return prev ?? null;
          if (!prev) return extra;
          const merged = {
            ...prev,
            attachments: extra.attachments ?? prev.attachments,
            comments: extra.comments ?? prev.comments,
            auditHistory: extra.auditHistory ?? prev.auditHistory,
            approvalHistory: extra.approvalHistory ?? prev.approvalHistory,
          };
          return {
            ...merged,
            createdByName: resolveDocumentCreatedByName(merged) ?? merged.createdByName,
          };
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [type, id, document?.id, initialLoading]);

  React.useEffect(() => {
    void refreshDocument(false);
  }, [refreshDocument]);

  React.useEffect(() => {
    if (!initialLoading && document) setNotesDraft(document.notes ?? "");
  }, [initialLoading, document?.id, document?.notes]);

  // For bills: fetch the GRN's landed cost allocation so we can show the breakdown card
  React.useEffect(() => {
    if (type !== "bill") return;
    const grnId =
      document?.sourceDocument?.typeKey === "grn" ? document.sourceDocument.id : undefined;
    if (!grnId) { setLandedAllocation(null); return; }
    fetchLandedCostAllocation(grnId).then(setLandedAllocation).catch(() => {});
  }, [type, document?.sourceDocument?.id, document?.sourceDocument?.typeKey]);

  React.useEffect(() => {
    if (!convertOpen || !convertType) return;
    let active = true;
    const loadOptions = async () => {
      const needsWarehouse = ["delivery-note", "grn"].includes(convertType);
      const warehouseResults = await (needsWarehouse ? fetchWarehouseOptions() : Promise.resolve([]));
      if (!active) return;
      setWarehouseOptions(warehouseResults);
    };
    void loadOptions().catch((error) => toast.error((error as Error).message));
    return () => {
      active = false;
    };
  }, [convertOpen, convertType]);

  React.useEffect(() => {
    if (!document) {
      setWarehouseTaskLink(null);
      return;
    }
    let active = true;
    const loadWarehouseTask = async () => {
      try {
        if (type === "delivery-note") {
          const items = await fetchPickPackTasks({ sourceDocumentId: id });
          if (!active) return;
          const actionable = items.find((t) =>
            PICK_PACK_ACTIONABLE_STATUSES.has(String(t.status ?? "").trim().toUpperCase())
          );
          setWarehouseTaskLink(
            actionable
              ? { label: `Open pick-pack ${actionable.number}`, href: `/warehouse/pick-pack/${actionable.id}` }
              : null
          );
          return;
        }
        if (type === "grn") {
          const items = await fetchPutawayTasks({ sourceDocumentId: id });
          if (!active) return;
          setWarehouseTaskLink(items[0] ? { label: `Open putaway ${items[0].grnNumber}`, href: `/warehouse/putaway/${items[0].id}` } : null);
          return;
        }
        setWarehouseTaskLink(null);
      } catch {
        if (active) setWarehouseTaskLink(null);
      }
    };
    void loadWarehouseTask();
    return () => {
      active = false;
    };
  }, [document, id, type]);

  React.useEffect(() => {
    if (type !== "delivery-note" || !document?.warehouseId?.trim()) {
      setDeliveryNoteWarehouseLabel(null);
      return;
    }
    let cancelled = false;
    fetchWarehouseOptions()
      .then((opts) => {
        if (cancelled) return;
        const m = opts.find((o) => o.id === document.warehouseId);
        setDeliveryNoteWarehouseLabel(m?.label ?? document.warehouseId ?? null);
      })
      .catch(() => {
        if (!cancelled) setDeliveryNoteWarehouseLabel(document.warehouseId ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [type, document?.warehouseId]);

  const isUuidLike = (s: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const openConvertSheet = React.useCallback(
    async (targetType: DocTypeKey) => {
      // PO → GRN: use the dedicated new-GRN wizard (lines, qty, UOM, tax). It already prefills from ?poId=.
      // A sidebar cannot replace that flow without cramming the whole Lines step into a drawer.
      if (type === "purchase-order" && targetType === "grn") {
        router.push(`/docs/grn/new?poId=${encodeURIComponent(id)}`);
        return;
      }
      setConvertType(targetType);

      const seedPartyFromCurrentDocument = () => {
        setConvertPartyId(document?.partyId ?? "");
        const resolvedLabel =
          displayPartyName !== "—" && !isUuidLike(displayPartyName) ? displayPartyName : null;
        setSelectedConvertPartyOption(
          document?.partyId && resolvedLabel
            ? { id: document.partyId, label: resolvedLabel }
            : null
        );
      };

      if (
        type === "grn" &&
        targetType === "bill" &&
        document?.sourceDocument?.typeKey === "purchase-order"
      ) {
        try {
          const po = await fetchDocumentDetailApi("purchase-order", document.sourceDocument.id);
          if (po?.partyId) {
            setConvertPartyId(po.partyId);
            const raw = (po.party ?? "").trim();
            let label = raw && !isUuidLike(raw) ? raw : null;
            if (!label) {
              const row = await fetchPartyByIdApi(po.partyId).catch(() => null);
              if (row?.name?.trim()) label = row.name.trim();
            }
            setSelectedConvertPartyOption(label ? { id: po.partyId, label } : null);
          } else {
            seedPartyFromCurrentDocument();
          }
        } catch {
          seedPartyFromCurrentDocument();
        }
      } else {
        seedPartyFromCurrentDocument();
      }

      setConvertWarehouseId(document?.warehouseId ?? "");
      setOutputTemplateId(document?.outputTemplateId ?? "");
      convertSheetDismissShieldUntilRef.current = Date.now() + 600;
      setConvertOpen(true);
    },
    [document, displayPartyName, type, id, router]
  );

  /** Deferred past dropdown teardown + next frame so Sheet / quick modal does not get stray outside-dismiss. */
  const scheduleConvert = React.useCallback((targetType: DocTypeKey) => {
    window.setTimeout(() => openConvertSheet(targetType), 0);
  }, [openConvertSheet]);

  const handleConvertOpenChange = React.useCallback((open: boolean) => {
    if (!open && Date.now() < convertSheetDismissShieldUntilRef.current) return;
    setConvertOpen(open);
  }, []);

  const rightSlot = (
    <DynamicNextStepsPanel
      type={type}
      document={document}
      convertTargets={convertTargets}
      warehouseTaskLink={warehouseTaskLink}
      actionLoading={actionLoading}
      onAction={async (action) => {
        setActionLoading(true);
        try {
          await documentActionApi(type as DocTypeKey, id, action as "approve" | "post" | "cancel");
          if (action === "post") {
            setDocument((prev) => prev ? { ...prev, status: "POSTED", availableActions: [], availableConversionTargets: [] } : prev);
            toast.success("Document posted.");
            void refreshDocument(true);
          } else {
            await refreshDocument(true);
            toast.success(`Document ${action}d.`);
          }
        } catch (e) { toast.error((e as Error).message); }
        finally { setActionLoading(false); }
      }}
      onConvert={openConvertSheet}
      onSendEmail={() => { setEmailTo(""); setEmailDialogOpen(true); }}
    />
  );

  const selectedConvertParty = React.useMemo(() => {
    if (!convertPartyId || document?.partyId !== convertPartyId) {
      return selectedConvertPartyOption;
    }
    const raw = displayPartyName !== "—" ? displayPartyName : document?.party;
    const label = raw && !isUuidLike(raw) ? raw : null;
    if (!label) return selectedConvertPartyOption;
    return {
      id: convertPartyId,
      label,
    };
  }, [convertPartyId, document?.party, document?.partyId, selectedConvertPartyOption, displayPartyName]);

  const displayTitle = document?.number ? `${document.number}` : `${label} ${id}`;
  const breadcrumbLabel = document?.number ?? id;
  const createdByDisplayName = React.useMemo(
    () => resolveDocumentCreatedByName(document) ?? null,
    [document]
  );

  const handleAppendPodEvidence = React.useCallback(
    async (lineIdx: number, fileList: FileList | null) => {
      if (!fileList?.length) return;
      setPodEvidenceUploadBusy(true);
      try {
        const files = Array.from(fileList);
        for (const file of files) {
          const { id: vid } = await uploadDocumentAttachmentApi("delivery-note", id, file);
          setPodLineRows((prev) =>
            prev.map((r, i) =>
              i === lineIdx ? { ...r, varianceEvidenceAttachmentIds: [...r.varianceEvidenceAttachmentIds, vid] } : r
            )
          );
        }
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setPodEvidenceUploadBusy(false);
      }
    },
    [id]
  );

  return (
    <>
    {refreshing && (
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] overflow-hidden">
        <div className="h-full w-full animate-pulse bg-primary/70" style={{ animation: "indeterminate 1.4s linear infinite" }} />
        <style>{`@keyframes indeterminate { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
      </div>
    )}
    <DocumentPageShell
      title={displayTitle}
      breadcrumbs={[
        { label: "Documents", href: "/docs" },
        { label, href: `/docs/${type}` },
        { label: breadcrumbLabel },
      ]}
      status={document?.status ?? "APPROVED"}
      statusActor={document?.statusActor ?? null}
      createdByName={createdByDisplayName}
      rightSlot={rightSlot}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && document?.status === "DRAFT" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/docs/${type}/${id}/edit`)}
            >
              <Icons.Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {type === "delivery-note" &&
            warehouseTaskLink &&
            !rightPanelOpen &&
            document?.status === "DRAFT" && (
              <Button size="sm" variant="default" asChild>
                <Link href={warehouseTaskLink.href}>
                  <Icons.Warehouse className="mr-2 h-4 w-4" />
                  {warehouseTaskLink.label}
                </Link>
              </Button>
            )}
          {canWrite && convertTargets.length === 1 ? (
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={() => openConvertSheet(convertTargets[0])}
            >
              <Icons.GitBranchPlus className="mr-2 h-4 w-4" />
              Convert to {humanizeDocTypeKey(convertTargets[0])}
            </Button>
          ) : canWrite && convertTargets.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={actionLoading}>
                  <Icons.GitBranchPlus className="mr-2 h-4 w-4" />
                  Convert…
                  <Icons.ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {convertTargets.map((targetType) => (
                  <DropdownMenuItem key={targetType} onSelect={() => scheduleConvert(targetType)}>
                    Convert to {humanizeDocTypeKey(targetType)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {canWrite && canRequestApproval && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  await requestDocumentApprovalApi(type as DocTypeKey, id);
                  await refreshDocument(true);
                  toast.success("Approval requested.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <Icons.CheckCircle2 className="mr-2 h-4 w-4" />
              Request approval
            </Button>
          )}
          {document?.status === "POSTED" && (
            <Button variant="outline" size="sm" disabled className="opacity-70 cursor-default">
              <Icons.CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              Posted
            </Button>
          )}
          {canWrite && (canApprove || canPost) && (
            <>
              {canApprove && (
              <Button
                variant="outline"
                size="sm"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await documentActionApi(type as DocTypeKey, id, "approve");
                    await refreshDocument(true);
                    toast.success(type === "bill" ? "Bill approved." : "Document approved.");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                <Icons.Check className="mr-2 h-4 w-4" />
                {type === "bill" ? "Approve bill" : "Approve"}
              </Button>
              )}
              {canPost && (
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await documentActionApi(type as DocTypeKey, id, "post");
                    // Optimistically mark as POSTED so the UI updates immediately while the
                    // background refresh fills in the rest of the detail.
                    setDocument((prev) => prev ? { ...prev, status: "POSTED", availableActions: [], availableConversionTargets: [] } : prev);
                    toast.success("Document posted.");
                    void refreshDocument(true);
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Send className="mr-2 h-4 w-4" />}
                Post
              </Button>
              )}
            </>
          )}
          {canWrite && canCancel && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  await documentActionApi(type as DocTypeKey, id, "cancel");
                  await refreshDocument(true);
                  toast.success("Document cancelled.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <Icons.XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          {canWrite && canReverse && (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                try {
                  await documentActionApi(type as DocTypeKey, id, "reverse");
                  await refreshDocument(true);
                  toast.success("Reversal created.");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <Icons.RotateCcw className="mr-2 h-4 w-4" />
              Reverse
            </Button>
          )}
          {type === "credit-note" && document?.status === "POSTED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!document?.partyId) { toast.error("No party on this credit note."); return; }
                setApplyLoading(true);
                try {
                  const resp = await fetch(`/api/ar/open-invoices?partyId=${document.partyId}`);
                  if (resp.ok) {
                    const data = await resp.json() as { items?: Array<{ id: string; number: string; outstanding: number; currency: string }> };
                    setOpenInvoices((data.items ?? []).map((item) => ({ id: item.id, number: item.number, openAmount: item.outstanding, currency: item.currency ?? document.currency ?? "KES" })));
                  }
                } catch { /* ignore */ } finally {
                  setApplyLoading(false);
                }
                setSelectedInvoiceId("");
                setApplyAmount(String(document.total ?? ""));
                setApplyDialogOpen(true);
              }}
            >
              <Icons.Link className="mr-2 h-4 w-4" />
              Apply to invoice
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Icons.MoreHorizontal className="mr-2 h-4 w-4" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  downloadDocumentPdfApi(type as DocTypeKey, id, `${document?.number ?? type}-${id}.pdf`, (msg) =>
                    toast.info(msg || "Export not available.")
                  )
                }
              >
                <Icons.FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPrintOpen(true)}>
                <Icons.Printer className="mr-2 h-4 w-4" />
                Print
              </DropdownMenuItem>
              {(type === "invoice" || type === "credit-note") && (
                <DropdownMenuItem
                  onClick={() => {
                    setEmailTo("");
                    setEmailDialogOpen(true);
                  }}
                >
                  <Icons.Mail className="mr-2 h-4 w-4" />
                  Send to customer
                  {document?.emailedAt && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (sent {new Date(document.emailedAt).toLocaleDateString()})
                    </span>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/docs/${type}`}>
                  <Icons.ArrowLeft className="mr-2 h-4 w-4" />
                  Back to list
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <DocumentDetailHeaderSkeleton columns={type === "delivery-note" ? 5 : 4} />
        ) : (
          <DocumentDetailHeader
            fields={[
              {
                label: "Number",
                value: document?.number ? <DocumentNumberField number={document.number} /> : "—",
                mono: true,
              },
              {
                label: "Date",
                value: document?.date
                  ? new Date(document.date as string).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—",
              },
              {
                label: counterpartyLabel,
                value: displayPartyName !== "—" ? displayPartyName : "Internal document",
              },
              {
                label: "Total",
                value: (
                  <DualCurrencyAmount
                    amount={document?.total ?? 0}
                    currency={document?.currency ?? "KES"}
                    exchangeRate={document?.exchangeRate}
                    size="md"
                    showAlternateCurrency={type !== "delivery-note"}
                  />
                ),
              },
              ...(type === "delivery-note"
                ? [
                    {
                      label: "Warehouse",
                      value:
                        deliveryNoteWarehouseLabel ??
                        document?.warehouseId ??
                        "Default from branch after save",
                    },
                  ]
                : []),
            ]}
          />
        )}
        <Card className="border-0 shadow-none bg-transparent p-0">
          <CardContent className="p-0 space-y-4">
            {loading ? null : (
              <>
                {type === "delivery-note" && document?.status === "DRAFT" ? (
                  <div className="mt-4 rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-50">
                    <p className="font-medium flex items-start gap-2 leading-snug">
                      <Icons.Info className="h-4 w-4 shrink-0 mt-0.5" />
                      Draft lines are editable via Edit below. Once this delivery note is approved and dispatched, you cannot amend shipped quantities here; POD (what the customer received) is recorded in the Odaflow mobile app and becomes the invoicing basis.
                    </p>
                  </div>
                ) : null}
                {type === "delivery-note" &&
                document &&
                document.status !== "DRAFT" &&
                !document.podConfirmation?.confirmedAt &&
                ["IN_TRANSIT", "DELIVERED", "POSTED"].includes(String(document.status).toUpperCase()) ? (
                  <div className="mt-4 rounded-lg border border-blue-300/70 bg-blue-50 px-4 py-3 text-sm text-blue-950 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-50">
                    <p className="font-medium flex items-start gap-2 leading-snug">
                      <Icons.Truck className="h-4 w-4 shrink-0 mt-0.5" />
                      Shipped quantities are frozen from warehouse issue. POD (received quantities / signatures) is captured in the Odaflow mobile app only; invoices follow POD-received quantities once recorded there.
                    </p>
                  </div>
                ) : null}
                {type === "delivery-note" &&
                  document &&
                  (document.dispatchPickup ||
                    document.deliveryCheckIn ||
                    document.warehouseDrop ||
                    document.podConfirmation?.confirmedAt) && (
                    <div className="mt-4 pt-4 border-t space-y-6 text-sm">
                      {document.dispatchPickup ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Pickup / collection
                          </p>
                          <p>
                            Dispatched{" "}
                            {new Date(document.dispatchPickup.dispatchedAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                            {document.dispatchPickup.dispatcherName
                              ? ` · ${document.dispatchPickup.dispatcherName}`
                              : ""}
                          </p>
                          <p className="text-muted-foreground">
                            Driver signature (pickup):{" "}
                            {document.dispatchPickup.signatureAttachmentId ? (
                              <SignatureAttachmentViewButton
                                docType="delivery-note"
                                documentId={id}
                                attachmentId={document.dispatchPickup.signatureAttachmentId}
                              />
                            ) : (
                              "—"
                            )}
                          </p>
                          <div className="rounded border divide-y max-w-3xl">
                            {(document.dispatchPickup.lines ?? []).map((pl) => {
                              const docLine = document.lines.find((l) => l.id === pl.lineId);
                              const shippedW = docLine?.weightKg;
                              return (
                                <div
                                  key={pl.lineId}
                                  className="flex flex-wrap gap-2 justify-between px-3 py-2 text-xs"
                                >
                                  <span className="min-w-0">{docLine?.description ?? pl.lineId}</span>
                                  <span className="shrink-0 text-muted-foreground text-right">
                                    {typeof shippedW === "number"
                                      ? `Shipped weight ${shippedW} kg · `
                                      : ""}
                                    Loaded at pickup {pl.loadedWeightKg} kg
                                    {pl.varianceReason ? ` — ${pl.varianceReason}` : ""}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {document.deliveryCheckIn ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Customer check-in
                          </p>
                          <p>
                            {new Date(document.deliveryCheckIn.checkedInAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                            {document.deliveryCheckIn.withinGeofence
                              ? ` · On premises (${Math.round(document.deliveryCheckIn.distanceM)} m)`
                              : " · Outside geofence"}
                          </p>
                        </div>
                      ) : null}

                      {document.warehouseDrop ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Warehouse return
                          </p>
                          <p>
                            Dropped{" "}
                            {new Date(document.warehouseDrop.droppedAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                            {document.warehouseDrop.dispatcherName
                              ? ` · ${document.warehouseDrop.dispatcherName}`
                              : ""}
                          </p>
                          {document.warehouseDrop.receivedAt ? (
                            <p className="text-muted-foreground">
                              Stock posted{" "}
                              {new Date(document.warehouseDrop.receivedAt).toLocaleString(undefined, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </p>
                          ) : (
                            <p className="text-amber-700 dark:text-amber-400">Awaiting warehouse weigh & post</p>
                          )}
                        </div>
                      ) : null}

                      {document.podConfirmation?.confirmedAt ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Proof of delivery
                          </p>
                          <p>
                            Confirmed{" "}
                            {new Date(document.podConfirmation.confirmedAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                            {document.podConfirmation.receiverName
                              ? ` · Received by ${document.podConfirmation.receiverName}`
                              : ""}
                            {document.podConfirmation.receiverPhone
                              ? ` · ${document.podConfirmation.receiverPhone}`
                              : ""}
                          </p>
                          {document.podConfirmation.note ? (
                            <p className="text-muted-foreground whitespace-pre-wrap">{document.podConfirmation.note}</p>
                          ) : null}
                          <p className="text-muted-foreground">
                            Customer / receiver signature:&nbsp;
                            {document.podConfirmation.receiverSignatureAttachmentId ? (
                              <SignatureAttachmentViewButton
                                docType="delivery-note"
                                documentId={id}
                                attachmentId={document.podConfirmation.receiverSignatureAttachmentId}
                              />
                            ) : (
                              "—"
                            )}
                          </p>
                          {(document.podConfirmation.dispatcherName ||
                            document.podConfirmation.dispatcherSignatureAttachmentId) && (
                            <p className="text-muted-foreground">
                              Delivery person (drop-off)
                              {document.podConfirmation.dispatcherName
                                ? ` · ${document.podConfirmation.dispatcherName}`
                                : ""}
                              :{" "}
                              {document.podConfirmation.dispatcherSignatureAttachmentId ? (
                                <SignatureAttachmentViewButton
                                  docType="delivery-note"
                                  documentId={id}
                                  attachmentId={document.podConfirmation.dispatcherSignatureAttachmentId}
                                />
                              ) : (
                                "—"
                              )}
                            </p>
                          )}
                          <div className="rounded border divide-y max-w-3xl">
                            {(document.podConfirmation.lines ?? []).map((ln) => {
                              const docLine = document.lines.find((l) => l.id === ln.lineId);
                              const pickupLine = document.dispatchPickup?.lines?.find((p) => p.lineId === ln.lineId);
                              const shippedW = docLine?.weightKg;
                              const parts: string[] = [];
                              parts.push(`Received ${ln.qtyReceived} of ${ln.qtyShipped}`);
                              if (typeof shippedW === "number") parts.push(`shipped ${shippedW} kg`);
                              if (pickupLine) parts.push(`loaded at pickup ${pickupLine.loadedWeightKg} kg`);
                              if (typeof ln.receivedWeightKg === "number") parts.push(`received ${ln.receivedWeightKg} kg`);
                              if (ln.varianceReason) parts.push(ln.varianceReason);
                              if ((ln.varianceEvidenceAttachmentIds?.length ?? 0) > 0) {
                                parts.push(`${ln.varianceEvidenceAttachmentIds!.length} variance photo(s)`);
                              }
                              return (
                                <div key={ln.lineId} className="flex flex-wrap gap-2 justify-between px-3 py-2 text-xs">
                                  <span className="min-w-0">{docLine?.description ?? ln.lineId}</span>
                                  <span className="shrink-0 text-muted-foreground text-right">{parts.join(" · ")}</span>
                                </div>
                              );
                            })}
                          </div>
                          {(document.podConfirmation.extraReceiptLines?.length ?? 0) > 0 ? (
                            <div className="mt-4 space-y-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Extra receipt (not on delivery note)
                              </p>
                              <div className="rounded border divide-y max-w-3xl">
                                {(document.podConfirmation.extraReceiptLines ?? []).map((row) => (
                                  <div
                                    key={row.lineId}
                                    className="flex flex-wrap gap-2 justify-between px-3 py-2 text-xs"
                                  >
                                    <span className="min-w-0">
                                      {row.description ?? row.productId ?? row.lineId}
                                      {row.productId ? ` · ${row.productId}` : ""}
                                    </span>
                                    <span className="shrink-0 text-muted-foreground text-right">
                                      {typeof row.receivedWeightKg === "number"
                                        ? `${row.receivedWeightKg} kg`
                                        : ""}
                                      {row.qtyReceived != null ? ` · qty ${row.qtyReceived}` : ""}
                                      {row.note ? ` — ${row.note}` : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {document.podConfirmation.franchiseeWeightSplit ? (
                            <div className="mt-4 space-y-2">
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Outlet weight split
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Reference total{" "}
                                {document.podConfirmation.franchiseeWeightSplit.referenceTotalWeightKg} kg
                                {document.podConfirmation.franchiseeWeightSplit.splitNote
                                  ? ` — ${document.podConfirmation.franchiseeWeightSplit.splitNote}`
                                  : ""}
                              </p>
                              <div className="rounded border divide-y max-w-3xl">
                                {(document.podConfirmation.franchiseeWeightSplit.lines ?? []).map(
                                  (sl, i) => (
                                    <div
                                      key={`${sl.description}-${i}`}
                                      className="flex flex-wrap gap-2 justify-between px-3 py-2 text-xs"
                                    >
                                      <span className="min-w-0">
                                        {sl.description}
                                        {sl.productId ? ` · ${sl.productId}` : ""}
                                      </span>
                                      <span className="shrink-0 text-muted-foreground text-right">
                                        {sl.weightKg} kg{sl.note ? ` · ${sl.note}` : ""}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                {/* Invoice payment status bar */}
                {document?.status === "DRAFT" && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <Label htmlFor="document-notes">Notes</Label>
                    <Textarea
                      id="document-notes"
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Notes for this document (internal / print as configured)…"
                      rows={3}
                      className="resize-y min-h-[72px] max-w-3xl"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={
                        notesSaving || notesDraft === (document.notes ?? "")
                      }
                      onClick={async () => {
                        if (!document) return;
                        setNotesSaving(true);
                        try {
                          await patchDocumentApi(type as DocTypeKey, id, {
                            notes: notesDraft.trim() || undefined,
                          });
                          await refreshDocument(true);
                          toast.success("Notes saved.");
                        } catch (e) {
                          toast.error((e as Error).message);
                        } finally {
                          setNotesSaving(false);
                        }
                      }}
                    >
                      {notesSaving ? "Saving…" : "Save notes"}
                    </Button>
                  </div>
                )}
                {type === "invoice" && document?.paymentStatus && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="text-muted-foreground">Payment status</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          document.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-700"
                            : document.paymentStatus === "PARTIALLY_PAID"
                              ? "bg-amber-100 text-amber-700"
                              : document.isOverdue
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {document.isOverdue && document.paymentStatus !== "PAID"
                          ? "OVERDUE"
                          : document.paymentStatus?.replace("_", " ")}
                      </span>
                    </div>
                    {document.paymentStatus !== "PAID" && document.total != null && (
                      <>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${document.isOverdue ? "bg-red-500" : "bg-emerald-500"}`}
                            style={{
                              width: `${Math.min(
                                100,
                                document.total > 0
                                  ? Math.round(((document.paidAmount ?? 0) / document.total) * 100)
                                  : 0
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatMoney(
                            kesEquivalent(document.paidAmount ?? 0, document.currency ?? "KES", document.exchangeRate) ?? (document.paidAmount ?? 0),
                            "KES"
                          )}{" "}
                          paid of{" "}
                          {formatMoney(
                            kesEquivalent(document.total, document.currency ?? "KES", document.exchangeRate) ?? document.total,
                            "KES"
                          )}
                          {document.dueDate && (
                            <span className="ml-2">· Due {new Date(document.dueDate).toLocaleDateString()}</span>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        {!loading && document ? (
          <DocumentChainTimeline
            sourceDocument={document.sourceDocument}
            documentChain={document.documentChain ?? []}
            currentDoc={{
              id,
              typeKey: type,
              number: document.number ?? id,
              status: document.status ?? "DRAFT",
            }}
            currency={document.currency ?? "KES"}
            exchangeRate={document.exchangeRate}
          />
        ) : null}
        {type === "bill" && landedAllocation && (() => {
          const centreLabels: Record<string, string> = {
            currency_conversion: "FX conversion",
            permits: "Additional costs",
            inbound_logistics: "Inbound logistics",
            other: "Other charges",
          };
          const centreLines = Object.entries(landedAllocation.costCentreSummary ?? {}).map(
            ([centre, data]) => ({
              label: centreLabels[centre] ?? centre,
              // costCentreSummary values are in original currency; use base KES total for display
              amount: (data as { originalAmount: number }).originalAmount ?? 0,
            })
          );
          const billKes =
            (document?.currency ?? "KES").toUpperCase() === "KES"
              ? (document?.total ?? 0)
              : document?.exchangeRate
              ? (document.total ?? 0) * document.exchangeRate
              : (document?.total ?? 0);
          return (
            <CostImpactPanel
              title="Additional costs breakdown"
              currency="KES"
              lines={[
                { label: "Invoice value (KES)", amount: billKes },
                ...centreLines,
              ]}
            />
          );
        })()}

        <DocumentTabs
          lines={
            <Card>
              <CardContent className="pt-4">
                {initialLoading && !document ? (
                  <div className="space-y-2 py-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="flex gap-3 animate-pulse">
                        <div className="h-4 flex-1 rounded bg-muted" />
                        <div className="h-4 w-12 rounded bg-muted" />
                        <div className="h-4 w-16 rounded bg-muted" />
                        <div className="h-4 w-20 rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : (document?.lines ?? []).length === 0 ? (
                  <div className="rounded border border-dashed py-12 text-center">
                    <p className="text-muted-foreground mb-1">No line items</p>
                    {document?.status === "DRAFT" ? (
                      <p className="text-sm text-muted-foreground">
                        Add lines to complete this document.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        This document has no line items.
                      </p>
                    )}
                  </div>
                ) : showFulfilmentTable && isFulfilmentDoc ? (
                  <DocumentFulfilmentLinesTable
                    lines={document?.lines ?? []}
                    currency={document?.currency ?? "KES"}
                    exchangeRate={document?.exchangeRate}
                    docType={type as "sales-order" | "delivery-note"}
                    docStatus={document?.status}
                    sourceDocStatus={document?.sourceDocument?.status}
                    showAlternateCurrency={type !== "delivery-note"}
                  />
                ) : (
                  <div className="rounded border overflow-x-auto">
                    <div
                      className={
                        isGrnDoc
                          ? "min-w-[980px] grid grid-cols-[minmax(0,1.2fr)_52px_72px_72px_72px_80px_96px_minmax(100px,0.9fr)_120px] gap-3 border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                          : showFulfilmentTable
                          ? "min-w-[920px] grid grid-cols-[minmax(0,1.2fr)_52px_72px_72px_72px_80px_minmax(100px,0.9fr)_120px] gap-3 border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                          : isPurchaseDoc
                          ? "min-w-[860px] grid grid-cols-[minmax(0,1.2fr)_52px_72px_80px_96px_minmax(100px,0.9fr)_120px] gap-3 border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                          : "min-w-[720px] grid grid-cols-[minmax(0,1.2fr)_52px_72px_80px_minmax(100px,0.9fr)_120px] gap-3 border-b px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      }
                    >
                      <span>Description</span>
                      <span className="text-right">UOM</span>
                      {isGrnDoc ? (
                        <>
                          <span className="text-right">Ordered</span>
                          <span className="text-right">Received</span>
                          <span className="text-right">Variance</span>
                        </>
                      ) : showFulfilmentTable ? (
                        <>
                          <span className="text-right">Ordered</span>
                          <span className="text-right">Shipped</span>
                          <span className="text-right">Backorder</span>
                        </>
                      ) : (
                        <span className="text-right">Qty</span>
                      )}
                      <span className="text-right">{isGrnDoc ? "Unbilled" : "Remaining"}</span>
                      {isPurchaseDoc ? <span className="text-right">Unit price</span> : null}
                      <span>Tax</span>
                      <span className="text-right">Amount</span>
                    </div>
                    {(document?.lines ?? []).map((line) => {
                      const taxLabel =
                        line.taxCodeCode != null || line.taxRate != null
                          ? [line.taxCodeCode, line.taxRate != null ? `${line.taxRate}%` : null]
                              .filter(Boolean)
                              .join(" · ")
                          : "—";
                      const taxTitle = line.taxCodeName
                        ? `${line.taxCodeName}${line.taxCodeCode ? ` (${line.taxCodeCode})` : ""}`
                        : undefined;
                      const orderedQty =
                        line.orderedWeightKg ??
                        line.sourceQuantity ??
                        (isGrnDoc ? undefined : line.qty);
                      const receivedQty = line.receivedWeightKg ?? line.qty;
                      const varianceKg =
                        line.receiptVarianceKg ??
                        (orderedQty != null && receivedQty != null ? receivedQty - orderedQty : undefined);
                      const unitPrice =
                        line.unitPrice ??
                        (receivedQty && receivedQty > 0 && line.amount != null
                          ? line.amount / receivedQty
                          : line.qty && line.qty > 0 && line.amount != null
                            ? line.amount / line.qty
                            : undefined);
                      return (
                        <div
                          key={line.id ?? line.description}
                          className={
                            isGrnDoc
                              ? "min-w-[980px] grid grid-cols-[minmax(0,1.2fr)_52px_72px_72px_72px_80px_96px_minmax(100px,0.9fr)_120px] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
                              : showFulfilmentTable
                              ? `min-w-[920px] grid grid-cols-[minmax(0,1.2fr)_52px_72px_72px_72px_80px_minmax(100px,0.9fr)_120px] gap-3 border-b px-4 py-3 text-sm last:border-b-0${
                                  line.fulfilmentStatus === "NOT_PACKED" ||
                                  line.fulfilmentStatus === "PARTIALLY_PACKED"
                                    ? " bg-amber-50/80 dark:bg-amber-950/20"
                                    : ""
                                }`
                              : isPurchaseDoc
                              ? "min-w-[860px] grid grid-cols-[minmax(0,1.2fr)_52px_72px_80px_96px_minmax(100px,0.9fr)_120px] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
                              : "min-w-[720px] grid grid-cols-[minmax(0,1.2fr)_52px_72px_80px_minmax(100px,0.9fr)_120px] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
                          }
                        >
                          <div className="min-w-0">
                            <span>
                              {deliveryLinePrimaryLabel({
                                productName: line.productName,
                                productSku: line.productSku,
                                description: line.description,
                              })}
                            </span>
                            {line.productSku?.trim() ? (
                              <p className="text-xs text-muted-foreground font-mono truncate">{line.productSku}</p>
                            ) : null}
                            {line.sourceDocumentType && line.sourceDocumentId ? (
                              <p className="text-xs text-muted-foreground">
                                From {line.sourceDocumentType.replace(/-/g, " ")}
                              </p>
                            ) : null}
                            {isGrnDoc && line.varianceReasonCode ? (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                {line.varianceReasonCode.replace(/_/g, " ").toLowerCase()}
                              </p>
                            ) : null}
                            {line.fulfilmentReason ? (
                              <p className="text-xs text-amber-600 dark:text-amber-400">{line.fulfilmentReason}</p>
                            ) : type === "sales-order" && (line.backorderQuantity ?? 0) > 0.01 ? (
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                {(line.shippedQuantity ?? 0) <= 0
                                  ? "Not shipped — out of stock at warehouse"
                                  : `Partially shipped (${line.shippedQuantity} of ${line.orderedQuantity ?? line.qty})`}
                              </p>
                            ) : null}
                          </div>
                          <span className="text-right font-mono text-xs">{line.unit ?? "—"}</span>
                          {isGrnDoc ? (
                            <>
                              <span className="text-right">{orderedQty != null ? orderedQty.toLocaleString() : "—"}</span>
                              <span className="text-right font-medium">
                                {receivedQty != null ? receivedQty.toLocaleString() : "—"}
                              </span>
                              <span
                                className={`text-right ${
                                  varianceKg != null && Math.abs(varianceKg) > 0.05
                                    ? "text-amber-600 dark:text-amber-400"
                                    : ""
                                }`}
                              >
                                {varianceKg != null
                                  ? `${varianceKg > 0 ? "+" : ""}${varianceKg.toLocaleString()}`
                                  : "—"}
                              </span>
                            </>
                          ) : showFulfilmentTable ? (
                            <>
                              <span className="text-right">
                                {(line.orderedQuantity ?? line.sourceQuantity ?? line.qty)?.toLocaleString() ?? "—"}
                              </span>
                              <span className="text-right font-medium">
                                {(line.shippedQuantity ?? line.convertedQuantity ?? 0).toLocaleString()}
                              </span>
                              <span
                                className={`text-right ${
                                  (line.backorderQuantity ?? 0) > 0.01 ||
                                  line.fulfilmentStatus === "NOT_PACKED"
                                    ? "text-amber-600 dark:text-amber-400 font-medium"
                                    : ""
                                }`}
                              >
                                {line.backorderQuantity != null && line.backorderQuantity > 0.01
                                  ? line.backorderQuantity.toLocaleString()
                                  : line.fulfilmentStatus === "NOT_PACKED"
                                    ? (line.orderedQuantity ?? line.qty ?? "—").toLocaleString()
                                    : "—"}
                              </span>
                            </>
                          ) : (
                            <span className="text-right">{line.qty ?? "—"}</span>
                          )}
                          <span className="text-right">
                            {line.remainingQuantity != null ? line.remainingQuantity.toLocaleString() : "—"}
                          </span>
                          {isPurchaseDoc ? (
                            <span className="text-right">
                              {unitPrice != null ? (
                                formatMoney(unitPrice, document?.currency ?? "KES")
                              ) : (
                                "—"
                              )}
                            </span>
                          ) : null}
                          <span className="text-xs text-muted-foreground truncate" title={taxTitle}>
                            {taxLabel}
                          </span>
                          <div className="flex justify-end">
                            {line.amount != null ? (
                              <DualCurrencyAmount
                                amount={line.amount}
                                currency={document?.currency ?? "KES"}
                                exchangeRate={document?.exchangeRate}
                                align="right"
                                size="sm"
                                showAlternateCurrency={type !== "delivery-note"}
                              />
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          }
          taxes={<DocumentTaxesPanel docType={type} docId={id} currency="KES" />}
          attachments={
            <DocumentAttachments
              files={document?.attachments}
              onUpload={async (file) => {
                await uploadDocumentAttachmentApi(type as DocTypeKey, id, file);
                await refreshDocument(true);
                toast.success(`Attachment ${file.name} uploaded.`);
              }}
              onDownload={(file) => {
                downloadDocumentAttachmentApi(type as DocTypeKey, id, file.id, file.name, (msg) =>
                  toast.info(msg || "Attachment download unavailable.")
                );
              }}
            />
          }
          comments={
            <Card>
              <CardContent className="pt-4">
                <DocumentComments
                  comments={document?.comments}
                  onAddComment={async (body) => {
                    await addDocumentCommentApi(type as DocTypeKey, id, body);
                    await refreshDocument(true);
                  }}
                />
              </CardContent>
            </Card>
          }
          approval={
            <Card>
              <CardContent className="pt-4">
                <DocumentTimeline entries={document?.approvalHistory ?? []} />
              </CardContent>
            </Card>
          }
          audit={
            <Card>
              <CardContent className="pt-4">
                <DocumentTimeline entries={document?.auditHistory ?? []} />
              </CardContent>
            </Card>
          }
        />
      </div>
      <PrintPreviewDrawer
        open={printOpen}
        onOpenChange={setPrintOpen}
        doc={printDoc}
      />
      {/* modal={false} avoids focus/pointer guards that block interactions with portaled dropdown panels */}
      <Sheet open={convertOpen} onOpenChange={handleConvertOpenChange} modal={false}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md"
          onPointerDownOutside={(e) => {
            if (Date.now() < convertSheetDismissShieldUntilRef.current) {
              e.preventDefault();
              return;
            }
            const t = e.target as HTMLElement;
            if (t.closest?.("[data-async-searchable-panel]")) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (Date.now() < convertSheetDismissShieldUntilRef.current) {
              e.preventDefault();
              return;
            }
            const t = e.target as HTMLElement;
            if (t.closest?.("[data-async-searchable-panel]")) e.preventDefault();
          }}
        >
          <div ref={setConvertSheetHostRef} className="flex min-h-0 flex-col">
          <SheetHeader>
            <SheetTitle>Convert document</SheetTitle>
            <SheetDescription>
              Confirm downstream details before creating the next linked document.
              {type === "grn" && convertType === "bill" && (
                <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
                  If this GRN has not been posted yet, it will be posted automatically to update stock before the bill is created.
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="rounded border p-3 text-sm">
              <p className="font-medium">{document?.number ?? id}</p>
              <p className="text-muted-foreground">
                {type.replace(/-/g, " ")} to {convertType?.replace(/-/g, " ")}
              </p>
            </div>
            {convertType && ["quote", "sales-order", "delivery-note", "invoice", "purchase-order", "bill"].includes(convertType) ? (
              <div className="space-y-2">
                <Label htmlFor="convert-party">
                  {["purchase-order", "bill"].includes(convertType) ? "Supplier" : "Customer"}
                </Label>
                <AsyncSearchableSelect
                  portalContainer={convertSelectPortalHost}
                  value={convertPartyId}
                  onValueChange={(value) => {
                    setConvertPartyId(value);
                    if (!value) setSelectedConvertPartyOption(null);
                  }}
                  onOptionSelect={(option) => setSelectedConvertPartyOption(option)}
                  loadOptions={
                    ["purchase-order", "bill"].includes(convertType)
                      ? searchApSupplierOptionsApi
                      : searchArCustomerOptionsApi
                  }
                  selectedOption={selectedConvertParty}
                  placeholder="Select counterparty"
                  searchPlaceholder="Type name, code, phone, or email"
                  emptyMessage="No counterparties found."
                  recentStorageKey={
                    ["purchase-order", "bill"].includes(convertType)
                      ? "lookup:recent-suppliers"
                      : "lookup:recent-customers"
                  }
                  allowClear
                />
              </div>
            ) : null}
            {convertType && ["delivery-note", "grn"].includes(convertType) ? (
              <div className="space-y-2">
                <Label htmlFor="convert-warehouse">Warehouse</Label>
                <SearchableSelect
                  value={convertWarehouseId || ""}
                  onValueChange={(value) => setConvertWarehouseId(value)}
                  options={[{ id: "", label: "Leave blank" }, ...warehouseOptions]}
                  placeholder="Select warehouse"
                  searchPlaceholder="Type to search warehouses"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="convert-template">Output template</Label>
              <Input
                id="convert-template"
                value={outputTemplateId}
                onChange={(e) => setOutputTemplateId(e.target.value)}
                placeholder="Default, loading-note-v1, customer-custom-a"
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setConvertOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={actionLoading || !convertType}
              onClick={async () => {
                if (!convertType) return;
                setActionLoading(true);
                try {
                  const created = await convertDocumentApi(type as DocTypeKey, id, {
                    targetType: convertType,
                    partyId: convertPartyId || undefined,
                    warehouseId: convertWarehouseId || undefined,
                    outputTemplateId: outputTemplateId || undefined,
                  });
                  toast.success(`Created ${created.number ?? convertType}.`);
                  if (created.pickPackSyncWarning) toast.warning(created.pickPackSyncWarning);
                  setConvertOpen(false);
                  if (created.id) {
                    router.push(`/docs/${convertType}/${created.id}`);
                    return;
                  }
                  await refreshDocument(true);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              Create linked document
            </Button>
          </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {DELIVERY_NOTE_POD_WEB_ENABLED ? (
      <Sheet open={podSheetOpen} onOpenChange={setPodSheetOpen} modal={false}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Proof of delivery</SheetTitle>
            <SheetDescription>
              Record quantities and receiver acknowledgement. Ship-to-invoice quantities follow POD where present. Variance
              on quantity or weight requires a reason plus at least one photo.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pod-note">Note (optional)</Label>
              <Textarea
                id="pod-note"
                value={podNote}
                onChange={(e) => setPodNote(e.target.value)}
                placeholder="Vehicle, condition, offload details…"
                rows={2}
              />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Lines (qty & optional weight)
              </p>
              {podLineRows.map((row, idx) => {
                const evidenceNeeded = computePodLineEvidenceNeeded(row);
                const showWeight = typeof row.weightKg === "number" && row.weightKg > 0;
                return (
                  <div key={row.lineId || idx} className="rounded border p-3 space-y-2">
                    <p className="text-sm font-medium leading-snug">{row.description}</p>
                    {row.displaySku ? (
                      <p className="text-xs text-muted-foreground font-mono">{row.displaySku}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      Shipped qty: {row.qtyShipped}
                      {showWeight ? ` · Shipped weight: ${row.weightKg} kg` : ""}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">Qty received</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={row.qtyReceived}
                          onChange={(e) => {
                            const v = e.target.value;
                            setPodLineRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, qtyReceived: v } : r))
                            );
                          }}
                        />
                      </div>
                      {showWeight ? (
                        <div>
                          <Label className="text-xs">Weight received (kg)</Label>
                          <Input
                            type="number"
                            step="0.001"
                            min={0}
                            value={row.receivedWeightKg}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPodLineRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, receivedWeightKg: v } : r))
                              );
                            }}
                            placeholder={`vs ${row.weightKg} kg shipped`}
                          />
                        </div>
                      ) : null}
                      {evidenceNeeded ? (
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-xs">Variance reason (required)</Label>
                          <Input
                            value={row.varianceReason}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPodLineRows((prev) =>
                                prev.map((r, i) => (i === idx ? { ...r, varianceReason: v } : r))
                              );
                            }}
                            placeholder="e.g. damaged cases, partial offload"
                          />
                          <div>
                            <Label className="text-xs">Variance photos (≥1)</Label>
                            <p className="text-[11px] text-muted-foreground mb-1">
                              Required when quantity or weight differs beyond tolerance from shipped.
                            </p>
                            <Input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              multiple
                              disabled={podEvidenceUploadBusy || podSaving}
                              className="text-xs"
                              onChange={(e) => {
                                void handleAppendPodEvidence(idx, e.target.files);
                                e.target.value = "";
                              }}
                            />
                            {row.varianceEvidenceAttachmentIds.length > 0 ? (
                              <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                                {row.varianceEvidenceAttachmentIds.map((vid) => (
                                  <li key={vid} className="flex items-center gap-2">
                                    <Icons.Image className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate font-mono text-[11px]" title={vid}>
                                      Photo {vid.slice(0, 8)}…
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2"
                                      onClick={() =>
                                        setPodLineRows((prev) =>
                                          prev.map((r, i) =>
                                            i === idx
                                              ? {
                                                  ...r,
                                                  varianceEvidenceAttachmentIds: r.varianceEvidenceAttachmentIds.filter(
                                                    (x) => x !== vid
                                                  ),
                                                }
                                              : r
                                          )
                                        )
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1">
                                Add at least one photo before saving when this line shows as variance.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pod-receiver">Receiver name (optional)</Label>
              <Input
                id="pod-receiver"
                value={podReceiverName}
                onChange={(e) => setPodReceiverName(e.target.value)}
                placeholder="Who took delivery, if known"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pod-receiver-phone">Phone (optional)</Label>
              <Input
                id="pod-receiver-phone"
                value={podReceiverPhone}
                onChange={(e) => setPodReceiverPhone(e.target.value)}
                placeholder="Contact number"
                type="tel"
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label>Receiver signature (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Draw a signature if someone is available to sign; otherwise leave blank and save.
              </p>
              <PodSignaturePad ref={podSigRef} />
              <Button type="button" variant="outline" size="sm" onClick={() => podSigRef.current?.clear()}>
                Clear signature
              </Button>
            </div>
          </div>
          <SheetFooter className="mt-8">
            <Button variant="outline" onClick={() => setPodSheetOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={podSaving || podEvidenceUploadBusy}
              onClick={async () => {
                const sigCanvas = podSigRef.current;
                for (let i = 0; i < podLineRows.length; i++) {
                  const row = podLineRows[i];
                  const q = Number(row.qtyReceived.replace(",", "."));
                  if (!Number.isFinite(q) || q < -POD_QTY_TOLERANCE) {
                    toast.error(`Line ${i + 1}: enter a valid received quantity.`);
                    return;
                  }
                  if (q - row.qtyShipped > POD_QTY_TOLERANCE) {
                    toast.error(`Line ${i + 1}: received cannot exceed shipped.`);
                    return;
                  }
                  const needsEv = computePodLineEvidenceNeeded(row);
                  if (needsEv) {
                    if (!row.varianceReason.trim()) {
                      toast.error(
                        `Line ${i + 1}: add a variance reason when quantity or weight differs from shipped.`
                      );
                      return;
                    }
                    if (row.varianceEvidenceAttachmentIds.length < 1) {
                      toast.error(
                        `Line ${i + 1}: upload at least one variance photo before saving.`
                      );
                      return;
                    }
                  }
                }
                setPodSaving(true);
                try {
                  let receiverSignatureAttachmentId: string | undefined;
                  if (sigCanvas && !sigCanvas.isEmpty()) {
                    const blob = await new Promise<Blob>((resolve, reject) => {
                      sigCanvas.getCanvas().toBlob(
                        (b) => (b ? resolve(b) : reject(new Error("Could not capture signature."))),
                        "image/png"
                      );
                    });
                    const file = new File([blob], "receiver-signature.png", { type: "image/png" });
                    const { id: attId } = await uploadDocumentAttachmentApi(
                      "delivery-note",
                      id,
                      file
                    );
                    receiverSignatureAttachmentId = attId;
                  }
                  const nameTrim = podReceiverName.trim();
                  const phoneTrim = podReceiverPhone.trim();
                  await confirmDeliveryPodApi(id, {
                    ...(nameTrim ? { receiverName: nameTrim } : {}),
                    ...(phoneTrim ? { receiverPhone: phoneTrim } : {}),
                    ...(receiverSignatureAttachmentId
                      ? { receiverSignatureAttachmentId }
                      : {}),
                    note: podNote.trim() || undefined,
                    lines: podLineRows.map((r) => {
                      const needsEv = computePodLineEvidenceNeeded(r);
                      const recvWk = r.receivedWeightKg.trim();
                      const parsedW =
                        recvWk !== "" && Number.isFinite(Number(recvWk.replace(",", ".")))
                          ? Number(recvWk.replace(",", "."))
                          : undefined;
                      return {
                        lineId: r.lineId,
                        qtyReceived: Number(r.qtyReceived.replace(",", ".")),
                        ...(r.varianceReason.trim() ? { varianceReason: r.varianceReason.trim() } : {}),
                        ...(parsedW != null ? { receivedWeightKg: parsedW } : {}),
                        ...(needsEv && r.varianceEvidenceAttachmentIds.length
                          ? { varianceEvidenceAttachmentIds: r.varianceEvidenceAttachmentIds }
                          : {}),
                      };
                    }),
                  });
                  toast.success("Proof of delivery saved.");
                  setPodSheetOpen(false);
                  await refreshDocument(true);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setPodSaving(false);
                }
              }}
            >
              {podSaving ? <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.Check className="mr-2 h-4 w-4" />}
              Save POD
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      ) : null}

      {/* Apply credit note to invoice dialog */}
      {applyDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-3">
              <Icons.Link className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Apply credit note to invoice</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Select an open invoice for this customer to net off against the credit note.
            </p>
            <div className="mb-4 space-y-3">
              <div>
                <Label className="text-xs mb-1 block">Invoice</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={selectedInvoiceId}
                  onChange={(e) => {
                    setSelectedInvoiceId(e.target.value);
                    const inv = openInvoices.find((i) => i.id === e.target.value);
                    if (inv) setApplyAmount(String(Math.min(inv.openAmount, document?.total ?? 0)));
                  }}
                >
                  <option value="">Select invoice...</option>
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} — {inv.currency} {inv.openAmount.toLocaleString()} outstanding
                    </option>
                  ))}
                  {openInvoices.length === 0 && <option disabled>No open invoices found</option>}
                </select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Amount to apply</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={applyLoading || !selectedInvoiceId || !applyAmount}
                onClick={async () => {
                  setApplyLoading(true);
                  try {
                    const resp = await fetch("/api/ar/credit-note-applications", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ creditNoteId: id, invoiceId: selectedInvoiceId, amount: parseFloat(applyAmount) }),
                    });
                    if (!resp.ok) {
                      const err = await resp.json().catch(() => ({ error: "Failed" }));
                      throw new Error((err as { error?: string }).error || "Failed to apply");
                    }
                    toast.success("Credit note applied to invoice.");
                    setApplyDialogOpen(false);
                    await refreshDocument(true);
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setApplyLoading(false);
                  }
                }}
              >
                {applyLoading ? "Applying..." : "Apply"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email to customer dialog */}
      {emailDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-3">
              <Icons.Mail className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Send to customer</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The invoice PDF will be attached and sent to the customer email address.
              {document?.emailedAt && (
                <span className="block mt-1 text-xs">
                  Last sent: {new Date(document.emailedAt).toLocaleString()}
                  {document.emailedTo ? ` → ${document.emailedTo}` : ""}
                </span>
              )}
            </p>
            <div className="mb-4">
              <Label className="text-xs mb-1 block">Override email (optional)</Label>
              <Input
                placeholder="Leave blank to use customer email on file"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                type="email"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={emailSending}
                onClick={async () => {
                  setEmailSending(true);
                  try {
                    const body: Record<string, string> = {};
                    if (emailTo.trim()) body.overrideTo = emailTo.trim();
                    const resp = await fetch(`/api/documents/invoice/${id}/email`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(body),
                    });
                    if (!resp.ok) {
                      const err = await resp.json().catch(() => ({ error: "Failed to send" }));
                      throw new Error((err as { error?: string }).error || "Failed to send");
                    }
                    const result = await resp.json() as { to?: string };
                    toast.success(`Invoice sent to ${result.to ?? "customer"}`);
                    setEmailDialogOpen(false);
                    await refreshDocument(true);
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setEmailSending(false);
                  }
                }}
              >
                <Icons.Send className="mr-2 h-4 w-4" />
                {emailSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DocumentPageShell>
    </>
  );
}

// ─── Dynamic Next Steps Panel ────────────────────────────────────────────────

function DynamicNextStepsPanel({
  type,
  document,
  convertTargets,
  warehouseTaskLink,
  actionLoading,
  onAction,
  onConvert,
  onSendEmail,
}: {
  type: string;
  document: DocumentDetailRecord | null;
  convertTargets: DocTypeKey[];
  warehouseTaskLink: { label: string; href: string } | null;
  actionLoading: boolean;
  onAction: (action: string) => Promise<void>;
  onConvert: (target: DocTypeKey) => void | Promise<void>;
  onSendEmail: () => void;
}) {
  const [notesPreviewOpen, setNotesPreviewOpen] = React.useState(false);

  React.useEffect(() => {
    setNotesPreviewOpen(false);
  }, [document?.id]);

  const status = document?.status ?? "";
  const paymentStatus = document?.paymentStatus;

  type GuidanceStep = { icon: React.ReactNode; text: string; action?: () => void; actionLabel?: string; href?: string; variant?: "default" | "outline" | "destructive" };
  const steps: GuidanceStep[] = [];

  if (type === "sales-order") {
    if (status === "DRAFT") {
      steps.push({ icon: <Icons.ListPlus className="h-4 w-4" />, text: "Add line items to this order" });
      steps.push({ icon: <Icons.CheckCircle2 className="h-4 w-4" />, text: "Submit for approval", action: () => void onAction("submit"), actionLabel: "Submit", variant: "default" });
    } else if (status === "PENDING" || status === "PENDING_APPROVAL") {
      steps.push({ icon: <Icons.Clock className="h-4 w-4 text-amber-500" />, text: "Awaiting manager approval" });
    } else if (status === "APPROVED") {
      steps.push({ icon: <Icons.Truck className="h-4 w-4 text-blue-500" />, text: "Ready to fulfill — create a Delivery Note", action: () => onConvert("delivery-note"), actionLabel: "Create Delivery Note", variant: "default" });
    }
  } else if (type === "delivery-note") {
    const st = status.toUpperCase();
    const hasPod = !!document?.podConfirmation?.confirmedAt;
    if (status === "DRAFT") {
      if (warehouseTaskLink) {
        steps.push({
          icon: <Icons.Package className="h-4 w-4" />,
          text: "Use Open pick-pack (header or below) to confirm pick & pack, then dispatch.",
        });
      } else if (!document?.warehouseId?.trim()) {
        steps.push({
          icon: <Icons.Info className="h-4 w-4 text-amber-500" />,
          text: "Save this delivery note from Edit — a fulfilment warehouse is applied automatically from your branch so pick-pack can run.",
        });
      } else {
        steps.push({
          icon: <Icons.Info className="h-4 w-4 text-amber-500" />,
          text: "Pick-pack link missing — refresh the page. If it persists, ensure your organisation has an active warehouse for this branch.",
        });
      }
    } else if (["IN_TRANSIT", "DELIVERED", "POSTED"].includes(st)) {
      if (!hasPod) {
        steps.push({
          icon: <Icons.Smartphone className="h-4 w-4 text-amber-600" />,
          text:
            "Proof of delivery is recorded only in the Odaflow mobile app (dispatch/driver or outlet). After POD, create the invoice here from acknowledged quantities.",
        });
      }
      if (hasPod && convertTargets.includes("invoice")) {
        steps.push({
          icon: <Icons.FileText className="h-4 w-4 text-emerald-500" />,
          text: "Create invoice from quantities acknowledged at delivery.",
          action: () => onConvert("invoice"),
          actionLabel: "Create Invoice",
          variant: "default",
        });
      }
    }
    // Only surface the pick-pack link when the DN still needs fulfilment (DRAFT/APPROVED).
    // Once CONVERTED, IN_TRANSIT, DELIVERED, or POSTED the pick-pack task is no longer actionable here.
    const dnNeedsFulfilment = ["DRAFT", "APPROVED"].includes(st);
    if (warehouseTaskLink && dnNeedsFulfilment) {
      steps.push({ icon: <Icons.Warehouse className="h-4 w-4" />, text: warehouseTaskLink.label, href: warehouseTaskLink.href });
    }
  } else if (type === "invoice") {
    if (status === "DRAFT") {
      const undelivered = (document?.linkedDeliveries ?? []).filter(
        (d) => !deliveryNoteSatisfiedForInvoicePost(d.status)
      );
      if (undelivered.length > 0) {
        for (const dn of undelivered) {
          steps.push({
            icon: <Icons.Truck className="h-4 w-4 text-amber-500" />,
            text: `${dn.number} — confirm POD / delivery completion before posting`,
            href: `/docs/delivery-note/${dn.id}`,
            actionLabel: `Go to ${dn.number}`,
            variant: "default",
          });
        }
      } else {
        steps.push({ icon: <Icons.Send className="h-4 w-4" />, text: "Post invoice to finalize", action: () => void onAction("post"), actionLabel: "Post", variant: "default" });
      }
    } else if (status === "PENDING_APPROVAL") {
      steps.push({ icon: <Icons.Clock className="h-4 w-4 text-amber-500" />, text: "Awaiting credit approval — held due to credit policy breach" });
      steps.push({ icon: <Icons.CheckSquare className="h-4 w-4 text-blue-500" />, text: "Approve in Approvals Inbox", href: "/approvals/inbox", actionLabel: "Go to Inbox", variant: "default" });
    } else if (status === "APPROVED") {
      steps.push({ icon: <Icons.Send className="h-4 w-4 text-emerald-500" />, text: "Credit override approved — post invoice to finalize", action: () => void onAction("post"), actionLabel: "Post", variant: "default" });
    } else if (status === "POSTED") {
      if (paymentStatus === "PAID") {
        steps.push({ icon: <Icons.CheckCircle2 className="h-4 w-4 text-emerald-500" />, text: "Invoice fully settled ✓" });
      } else if (paymentStatus === "PARTIALLY_PAID") {
        steps.push({ icon: <Icons.DollarSign className="h-4 w-4 text-amber-500" />, text: "Partially paid — record remaining payment", href: "/treasury/collections" });
        steps.push({ icon: <Icons.Mail className="h-4 w-4" />, text: "Send reminder to customer", action: onSendEmail, actionLabel: "Send Invoice", variant: "outline" });
      } else if (document?.isOverdue) {
        steps.push({ icon: <Icons.AlertTriangle className="h-4 w-4 text-red-500" />, text: "OVERDUE — follow up immediately", href: "/ar/aging" });
        steps.push({ icon: <Icons.Mail className="h-4 w-4" />, text: "Email invoice to customer", action: onSendEmail, actionLabel: "Send Email", variant: "default" });
      } else {
        steps.push({ icon: <Icons.DollarSign className="h-4 w-4" />, text: "Outstanding — record payment", href: "/treasury/collections" });
        steps.push({ icon: <Icons.Mail className="h-4 w-4" />, text: "Email invoice to customer", action: onSendEmail, actionLabel: "Send Email", variant: "outline" });
      }
    }
  } else if (type === "credit-note") {
    if (status === "POSTED") {
      steps.push({ icon: <Icons.Link className="h-4 w-4" />, text: "Apply to an open invoice directly from this page" });
    }
  } else if (type === "purchase-request") {
    if (status === "DRAFT") {
      steps.push({ icon: <Icons.Send className="h-4 w-4" />, text: "Add lines and submit for approval", action: () => void onAction("submit"), actionLabel: "Submit for approval", variant: "default" });
    } else if (status === "PENDING_APPROVAL") {
      steps.push({ icon: <Icons.Inbox className="h-4 w-4" />, text: "Awaiting approval — check your inbox", href: "/approvals/inbox", actionLabel: "Go to inbox" });
    } else if (status === "APPROVED") {
      steps.push({ icon: <Icons.ShoppingCart className="h-4 w-4 text-blue-500" />, text: "Approved — convert to a Purchase Order", action: () => onConvert("purchase-order"), actionLabel: "Create PO", variant: "default" });
    }
  } else if (type === "purchase-order") {
    if (status === "DRAFT") {
      steps.push({ icon: <Icons.Send className="h-4 w-4" />, text: "Submit this PO for approval before creating a GRN", action: () => void onAction("submit"), actionLabel: "Submit for approval", variant: "default" });
    } else if (status === "PENDING_APPROVAL") {
      steps.push({ icon: <Icons.Inbox className="h-4 w-4" />, text: "Awaiting approval — check your inbox", href: "/approvals/inbox", actionLabel: "Go to inbox" });
    } else if (status === "APPROVED") {
      steps.push({ icon: <Icons.Package className="h-4 w-4 text-blue-500" />, text: "Receive goods — create GRN", action: () => onConvert("grn"), actionLabel: "Create GRN", variant: "default" });
    }
  } else if (type === "grn") {
    if (status === "POSTED" || status === "APPROVED") {
      steps.push({ icon: <Icons.FileText className="h-4 w-4" />, text: "Create supplier bill", action: () => onConvert("bill"), actionLabel: "Create Bill", variant: "default" });
    }
  } else if (type === "bill") {
    if (status === "DRAFT") {
      steps.push({
        icon: <Icons.Send className="h-4 w-4" />,
        text: "Submit this bill for finance approval before posting",
        action: () => void onAction("submit"),
        actionLabel: "Request approval",
        variant: "default",
      });
    } else if (status === "PENDING_APPROVAL") {
      steps.push({
        icon: <Icons.Clock className="h-4 w-4 text-amber-500" />,
        text: "Awaiting finance approval — a user with finance approval rights must approve this bill",
      });
      steps.push({
        icon: <Icons.Inbox className="h-4 w-4" />,
        text: "You can also approve from the approvals inbox",
        href: "/approvals/inbox",
        actionLabel: "Go to inbox",
        variant: "outline",
      });
    } else if (status === "APPROVED") {
      const srcDoc = document?.sourceDocument;
      const grnBlocked = srcDoc?.typeKey === "grn" && !["POSTED", "RECEIVED", "CONVERTED"].includes(srcDoc.status ?? "");
      if (grnBlocked) {
        steps.push({
          icon: <Icons.AlertTriangle className="h-4 w-4 text-amber-500" />,
          text: `GRN ${srcDoc!.number} must be posted before this bill can be posted`,
          href: `/inventory/receipts/${srcDoc!.id}`,
          actionLabel: `Go to ${srcDoc!.number}`,
          variant: "default",
        });
      } else {
        steps.push({
          icon: <Icons.Send className="h-4 w-4" />,
          text: "Post bill to record the liability in the GL and AP subledger",
          action: () => void onAction("post"),
          actionLabel: "Post",
          variant: "default",
        });
      }
    } else if (status === "POSTED") {
      steps.push({
        icon: <Icons.DollarSign className="h-4 w-4" />,
        text: "Outstanding — record payment to supplier",
        href: "/ap/payments",
      });
    }
  }

  // Typed blocks above cover sales-order + delivery-note; avoid repeating the same convert CTAs here.
  const skipGenericConvertAppend = type === "sales-order" || type === "delivery-note";
  if (!skipGenericConvertAppend) {
    const seenConvertTargets = new Set<string>();
    for (const target of convertTargets) {
      if (seenConvertTargets.has(target)) continue;
      seenConvertTargets.add(target);
      const label = target.replace(/-/g, " ");
      if (!steps.some((s) => s.actionLabel?.toLowerCase().includes(label))) {
        steps.push({
          icon: <Icons.GitBranchPlus className="h-4 w-4" />,
          text: `Convert to ${label}`,
          action: () => onConvert(target),
          actionLabel: `Convert to ${label}`,
          variant: "outline",
        });
      }
    }
  }

  return (
    <DocumentRightPanel>
      <div className="space-y-4">
        <div>
          <p className="font-medium text-sm mb-1 flex items-center gap-1">
            <Icons.Compass className="h-3.5 w-3.5" />
            What to do next
          </p>
          {steps.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {status === "CANCELLED" ? "This document has been cancelled." :
               status === "REVERSED" ? "This document has been reversed." :
               "No further actions required."}
            </p>
          ) : (
            <ul className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-muted-foreground shrink-0">{step.icon}</span>
                  <div className="flex-1">
                    <p className="text-muted-foreground">{step.text}</p>
                    {step.action && step.actionLabel && (
                      <Button
                        size="sm"
                        variant={step.variant ?? "outline"}
                        className="mt-1 h-7 text-xs"
                        disabled={actionLoading}
                        onClick={step.action}
                      >
                        {step.actionLabel}
                      </Button>
                    )}
                    {step.href && !step.action && (
                      <Link href={step.href} className="text-primary text-xs underline-offset-4 hover:underline">
                        {step.actionLabel ?? "Go →"}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {document?.notes ? (
          <div className="border-t border-border/60 pt-3">
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground flex items-center gap-1 w-full text-left hover:text-foreground"
              onClick={() => setNotesPreviewOpen((v) => !v)}
            >
              <Icons.ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${notesPreviewOpen ? "rotate-90" : ""}`} />
              Notes preview
            </button>
            {notesPreviewOpen ? (
              <p className="text-muted-foreground text-sm bg-muted/50 rounded p-2 mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {document.notes}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </DocumentRightPanel>
  );
}

