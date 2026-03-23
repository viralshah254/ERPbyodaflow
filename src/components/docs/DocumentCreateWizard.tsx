"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { getDocTypeConfig } from "@/config/documents";
import type { DocTypeKey } from "@/config/documents/types";
import type { FormFieldConfig } from "@/config/documents/types";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { useCopilotStore } from "@/stores/copilot-store";
import { useCopilotFeatureEnabled } from "@/lib/copilot-feature";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";
import { formatMoney, toBase } from "@/lib/money";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import * as Icons from "lucide-react";
import Link from "next/link";
import { DocumentLineEditor, type DocumentLine } from "@/components/docs/DocumentLineEditor";
import {
  createDocumentApi,
  previewDocumentPostingApi,
  searchPurchaseOrderLookupApi,
  fetchDocumentDetailApi,
  type DocumentPostingPreviewLine,
  type PurchaseOrderLookupOption,
} from "@/lib/api/documents";
import {
  fetchPartyByIdApi,
  fetchPartyCreditSummaryApi,
  searchPartyLookupOptionsApi,
  toPartyLookupOption,
  type PartyDetail,
  type PartyCreditSummary,
} from "@/lib/api/parties";
import { searchArCustomerOptionsApi } from "@/lib/api/payments";
import { fetchBranchOptions, fetchWarehouseOptions, type LookupOption } from "@/lib/api/lookups";
import {
  fetchCustomerDefaultPriceLists,
  fetchPriceListOptions,
  fetchSupplierDefaultCostLists,
  fetchPriceListByIdApi,
} from "@/lib/api/pricing";
import { fetchSavedExchangeRateApi } from "@/lib/api/financial-settings";
import { fetchPaymentTermsApi } from "@/lib/api/payment-terms";
import { fetchCustomerCategoriesApi } from "@/lib/api/customer-categories";
import { fetchFinancialTaxesApi } from "@/lib/api/financial-taxes";
import { hydrateProductsFromApi, listProducts } from "@/lib/data/products.repo";
import {
  fetchProductPackagingApi,
  fetchProductPricingApi,
} from "@/lib/api/product-master";
import type { ProductPrice } from "@/lib/products/pricing-types";
import {
  deleteDocumentDraftApi,
  fetchDocumentDraftApi,
  saveDocumentDraftApi,
} from "@/lib/api/document-drafts";
import { isApiConfigured } from "@/lib/api/client";
import { toast } from "sonner";

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  party: z.string().optional(),
  reference: z.string().optional(),
  branch: z.string().optional(),
  dueDate: z.string().optional(),
  poRef: z.string().optional(),
  warehouse: z.string().optional(),
  linesCount: z.number().optional(),
  linesAreTaxInclusive: z.boolean().optional(),
  currency: z.string().optional(),
  exchangeRate: z.number().optional(),
  fxDate: z.string().optional(),
  totalAmount: z.number().optional(),
});

type FormValues = z.infer<typeof schema>;

function getDefaultValues(baseCurrency: string): FormValues {
  const today = new Date().toISOString().slice(0, 10);
  return {
    date: today,
    party: "",
    reference: "",
    branch: "",
    dueDate: "",
    poRef: "",
    warehouse: "",
    linesCount: 0,
    linesAreTaxInclusive: false,
    currency: baseCurrency,
    exchangeRate: 1,
    fxDate: today,
    totalAmount: 0,
  };
}

function fieldIdToKey(id: string): keyof FormValues {
  const map: Record<string, keyof FormValues> = {
    date: "date",
    customer: "party",
    supplier: "party",
    branch: "branch",
    dueDate: "dueDate",
    poRef: "poRef",
    reference: "reference",
    warehouse: "warehouse",
    currency: "currency",
    exchangeRate: "exchangeRate",
    fxDate: "fxDate",
  };
  return (map[id] ?? "reference") as keyof FormValues;
}

function RenderField({
  field,
  form,
  options,
  selectedPartyOption,
}: {
  field: FormFieldConfig;
  form: ReturnType<typeof useForm<FormValues>>;
  options?: LookupOption[];
  selectedPartyOption?: { id: string; label: string; description?: string } | null;
}) {
  const key = fieldIdToKey(field.id);
  const isDate = field.type === "date";
  const isNum = field.type === "number";
  const isPartyEntity = field.type === "entity" && (field.id === "customer" || field.id === "supplier");
  const hasOptions = Boolean(options?.length) && (field.type === "entity" || field.type === "select");

  if (isPartyEntity) {
    const role = field.id === "supplier" ? "supplier" : "customer";
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label>
            {field.label}
            {field.required ? " *" : ""}
          </Label>
          <ExplainThis
            prompt={`Explain: ${field.label} in document context.`}
            label={`Explain ${field.label}`}
          />
        </div>
        <AsyncSearchableSelect
          value={(form.watch(key) as string | undefined) || ""}
          onValueChange={(value) => form.setValue(key, value)}
          loadOptions={
            role === "customer"
              ? searchArCustomerOptionsApi
              : (query) =>
                  searchPartyLookupOptionsApi({
                    role,
                    status: "ACTIVE",
                    search: query,
                    limit: 20,
                  })
          }
          selectedOption={selectedPartyOption}
          placeholder={`Select ${field.label.toLowerCase()}`}
          searchPlaceholder="Type name, code, phone, or email"
          emptyMessage={`No ${field.label.toLowerCase()}s found.`}
          recentStorageKey={role === "customer" ? "lookup:recent-customers" : "lookup:recent-suppliers"}
        />
        {form.formState.errors[key] && (
          <p className="text-sm text-destructive">
            {form.formState.errors[key]?.message as string}
          </p>
        )}
      </div>
    );
  }

  if (field.type === "entity" && hasOptions) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label>
            {field.label}
            {field.required ? " *" : ""}
          </Label>
          <ExplainThis
            prompt={`Explain: ${field.label} in document context.`}
            label={`Explain ${field.label}`}
          />
        </div>
        <SearchableSelect
          value={(form.watch(key) as string | undefined) || ""}
          onValueChange={(value) => form.setValue(key, value)}
          options={options?.map((option) => ({ id: option.id, label: option.label })) ?? []}
          placeholder={`Select ${field.label.toLowerCase()}`}
          searchPlaceholder={`Type to search ${field.label.toLowerCase()}`}
        />
        {form.formState.errors[key] && (
          <p className="text-sm text-destructive">
            {form.formState.errors[key]?.message as string}
          </p>
        )}
      </div>
    );
  }

  if (hasOptions) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label>
            {field.label}
            {field.required ? " *" : ""}
          </Label>
          <ExplainThis
            prompt={`Explain: ${field.label} in document context.`}
            label={`Explain ${field.label}`}
          />
        </div>
        <SearchableSelect
          value={(form.watch(key) as string | undefined) || ""}
          onValueChange={(value) => form.setValue(key, value)}
          options={options?.map((option) => ({ id: option.id, label: option.label })) ?? []}
          placeholder={`Select ${field.label.toLowerCase()}`}
          searchPlaceholder={`Type to search ${field.label.toLowerCase()}`}
        />
        {form.formState.errors[key] && (
          <p className="text-sm text-destructive">
            {form.formState.errors[key]?.message as string}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <Label>
          {field.label}
          {field.required ? " *" : ""}
        </Label>
        <ExplainThis
          prompt={`Explain: ${field.label} in document context.`}
          label={`Explain ${field.label}`}
        />
      </div>
      <Input
        type={isDate ? "date" : isNum ? "number" : "text"}
        placeholder={field.type === "entity" ? "Search or enter" : field.type === "select" ? "Select..." : undefined}
        {...form.register(key)}
      />
      {form.formState.errors[key] && (
        <p className="text-sm text-destructive">
          {form.formState.errors[key]?.message as string}
        </p>
      )}
    </div>
  );
}

interface DocumentCreateWizardProps {
  type: string;
  /** Pre-link a GRN to this PO id (hydrated from ?poId= URL param). */
  initialPoId?: string;
}

const STEPS = [
  { id: "header", label: "Header" },
  { id: "lines", label: "Lines" },
  { id: "review", label: "Review & Submit" },
];

export function DocumentCreateWizard({ type, initialPoId }: DocumentCreateWizardProps) {
  const router = useRouter();
  const terminology = useTerminology();
  const copilotEnabled = useCopilotFeatureEnabled();
  const openDrawer = useCopilotStore((s) => s.openDrawer);
  const { settings: financialSettings } = useFinancialSettings();
  const baseCurrency = financialSettings.baseCurrency;
  const config = getDocTypeConfig(type);
  const label = config ? t(config.termKey, terminology) : type;

  const [step, setStep] = React.useState(1);
  const [lines, setLines] = React.useState<DocumentLine[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [loadingFxRate, setLoadingFxRate] = React.useState(false);
  const [postingPreview, setPostingPreview] = React.useState<DocumentPostingPreviewLine[]>([]);
  const [loadingPostingPreview, setLoadingPostingPreview] = React.useState(false);
  const [postingPreviewError, setPostingPreviewError] = React.useState<string | null>(null);
  const [fieldOptions, setFieldOptions] = React.useState<Record<string, LookupOption[]>>({});
  const [customerDefaultPriceLists, setCustomerDefaultPriceLists] = React.useState<Record<string, string>>({});
  const [supplierDefaultCostLists, setSupplierDefaultCostLists] = React.useState<Record<string, string>>({});
  const [fallbackPriceListId, setFallbackPriceListId] = React.useState<string>("pl-retail");
  const [selectedPartyDetail, setSelectedPartyDetail] = React.useState<PartyDetail | null>(null);
  const [creditSummary, setCreditSummary] = React.useState<PartyCreditSummary | null>(null);
  const [creditOverrideOpen, setCreditOverrideOpen] = React.useState(false);
  const [creditOverrideReason, setCreditOverrideReason] = React.useState("");
  const [creditOverrideGranted, setCreditOverrideGranted] = React.useState(false);
  const [paymentTermsNameById, setPaymentTermsNameById] = React.useState<Record<string, string>>({});
  const [customerCategoryNameById, setCustomerCategoryNameById] = React.useState<Record<string, string>>({});
  const [taxCodes, setTaxCodes] = React.useState<Array<{ id: string; code: string; name: string; rate: number }>>([]);
  const [packagingByProductId, setPackagingByProductId] = React.useState<Record<string, Awaited<ReturnType<typeof fetchProductPackagingApi>>>>({});
  const [pricingByProductId, setPricingByProductId] = React.useState<Record<string, Awaited<ReturnType<typeof fetchProductPricingApi>>>>({});
  const [costPricingByProductId, setCostPricingByProductId] = React.useState<Record<string, ProductPrice[]>>({});
  const [linkedPoId, setLinkedPoId] = React.useState<string | null>(() =>
    type === "grn" && initialPoId ? initialPoId : null
  );
  const [linkedPoOption, setLinkedPoOption] = React.useState<PurchaseOrderLookupOption | null>(null);
  const [loadingPo, setLoadingPo] = React.useState(false);
  /** Resolve GRN warehouse after warehouse options load (PO may have branchId but no warehouseId). */
  const pendingGrnWarehouseFromPoRef = React.useRef<{ warehouseId?: string; branchId?: string } | null>(null);
  const defaults = React.useMemo(
    () => getDefaultValues(baseCurrency),
    [baseCurrency]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  React.useEffect(() => {
    let cancelled = false;
    fetchDocumentDraftApi(type)
      .then((draft) => {
        if (cancelled || !draft) return;
        form.reset({ ...defaults, ...(draft as Partial<FormValues>) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [defaults, form, type]);

  React.useEffect(() => {
    const sub = form.watch((data) => {
      const payload = data as Record<string, unknown>;
      void saveDocumentDraftApi(type, payload).catch(() => {});
    });
    return () => sub.unsubscribe();
  }, [type, form]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchBranchOptions(),
      fetchWarehouseOptions(),
      fetchCustomerDefaultPriceLists(),
      fetchSupplierDefaultCostLists(),
      fetchPriceListOptions(),
      fetchPaymentTermsApi(),
      fetchCustomerCategoriesApi(),
      hydrateProductsFromApi(),
    ])
      .then(([branches, warehouses, customerDefaults, supplierCostLists, priceLists, paymentTerms, customerCategories, _products]) => {
        if (cancelled) return;
        setFieldOptions({
          branch: branches,
          warehouse: warehouses,
        });
        setCustomerDefaultPriceLists(
          Object.fromEntries(customerDefaults.map((item) => [item.customerId, item.priceListId]))
        );
        setSupplierDefaultCostLists(
          Object.fromEntries(supplierCostLists.map((item) => [item.supplierId, item.costListId]))
        );
        setFallbackPriceListId(priceLists[0]?.id ?? "pl-retail");
        setPaymentTermsNameById(Object.fromEntries(paymentTerms.map((item) => [item.id, item.name])));
        setCustomerCategoryNameById(
          Object.fromEntries(customerCategories.map((item) => [item.id, item.name]))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setFieldOptions({});
          setCustomerDefaultPriceLists({});
          setSupplierDefaultCostLists({});
          setFallbackPriceListId("pl-retail");
          setPaymentTermsNameById({});
          setCustomerCategoryNameById({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (type !== "grn") return;
    const pending = pendingGrnWarehouseFromPoRef.current;
    if (!pending) return;
    const opts = fieldOptions["warehouse"] ?? [];
    if (!opts.length) return;
    if (form.getValues("warehouse")) {
      pendingGrnWarehouseFromPoRef.current = null;
      return;
    }
    if (pending.warehouseId) {
      const ok = opts.some((o) => o.id === pending.warehouseId);
      if (ok) {
        form.setValue("warehouse", pending.warehouseId);
      }
      pendingGrnWarehouseFromPoRef.current = null;
      return;
    }
    if (pending.branchId) {
      const match = opts.find((o) => o.branchId === pending.branchId);
      if (match) {
        form.setValue("warehouse", match.id);
        toast.success(`Warehouse set to ${match.label} (from PO branch).`);
      }
      pendingGrnWarehouseFromPoRef.current = null;
    }
  }, [type, fieldOptions, form]);

  React.useEffect(() => {
    if (step === 2) void hydrateProductsFromApi();
  }, [step]);

  React.useEffect(() => {
    if ((step !== 2 && step !== 3) || !isApiConfigured()) return;
    if (taxCodes.length > 0) return; // already loaded
    let cancelled = false;
    fetchFinancialTaxesApi()
      .then((items) => {
        if (!cancelled) setTaxCodes(items.map((t) => ({ id: t.id, code: t.code, name: t.name, rate: t.rate })));
      })
      .catch(() => {
        if (!cancelled) setTaxCodes([]);
      });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  React.useEffect(() => {
    if (step !== 2) return;
    const products = listProducts();
    if (!products.length) {
      setPackagingByProductId({});
      setPricingByProductId({});
      return;
    }
    let cancelled = false;
    Promise.all(
      products.map((p) =>
        Promise.all([fetchProductPackagingApi(p.id), fetchProductPricingApi(p.id)])
      )
    )
      .then((results) => {
        if (cancelled) return;
        const packaging: Record<string, Awaited<ReturnType<typeof fetchProductPackagingApi>>> = {};
        const pricing: Record<string, Awaited<ReturnType<typeof fetchProductPricingApi>>> = {};
        products.forEach((p, i) => {
          packaging[p.id] = results[i][0];
          pricing[p.id] = results[i][1];
        });
        setPackagingByProductId(packaging);
        setPricingByProductId(pricing);
      })
      .catch(() => {
        if (!cancelled) {
          setPackagingByProductId({});
          setPricingByProductId({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [step]);

  const selectedPartyIdForCost = form.watch("party");
  const lineEditorModeForCost =
    type === "bill" || type === "purchase-order" || type === "grn" ||
    type === "purchase-request" || type === "purchase-credit-note" || type === "purchase-debit-note"
      ? "purchasing" : "sales";
  const supplierCostListId =
    lineEditorModeForCost === "purchasing" && selectedPartyIdForCost
      ? supplierDefaultCostLists[selectedPartyIdForCost]
      : undefined;

  React.useEffect(() => {
    if (!supplierCostListId || step !== 2) {
      setCostPricingByProductId({});
      return;
    }
    let cancelled = false;
    fetchPriceListByIdApi(supplierCostListId)
      .then((costList) => {
        if (cancelled || !costList) return;
        const byProduct: Record<string, ProductPrice[]> = {};
        for (const item of costList.items ?? []) {
          byProduct[item.productId] = [
            {
              productId: item.productId,
              priceListId: supplierCostListId,
              tiers: [{ minQty: 1, price: item.price, uom: "EA" }],
            },
          ];
        }
        setCostPricingByProductId(byProduct);
      })
      .catch(() => {
        if (!cancelled) setCostPricingByProductId({});
      });
    return () => {
      cancelled = true;
    };
  }, [supplierCostListId, step]);

  const handleLinesChange = React.useCallback(
    (next: DocumentLine[]) => {
      setLines(next);
      const total = next.reduce((s, l) => s + l.amount, 0);
      form.setValue("linesCount", next.length);
      form.setValue("totalAmount", total);
    },
    [form]
  );

  const handlePoSelect = React.useCallback(
    async (poId: string, option: PurchaseOrderLookupOption | null) => {
      setLinkedPoId(poId);
      setLinkedPoOption(option);
      if (!poId) {
        form.setValue("poRef", "");
        return;
      }
      setLoadingPo(true);
      try {
        const po = await fetchDocumentDetailApi("purchase-order", poId);
        if (!po) return;
        // When arriving from a deep-link (?poId=) the option is null — build it from fetched PO data
        // so the AsyncSearchableSelect renders the PO number instead of the placeholder.
        if (!option) {
          setLinkedPoOption({
            id: poId,
            label: po.number ?? poId,
            description: po.party ?? po.partyId ?? undefined,
            status: po.status ?? "APPROVED",
            partyId: po.partyId,
            date: po.date,
            currency: po.currency,
            total: po.total,
          });
        }
        if (po.partyId) form.setValue("party", po.partyId);
        if (po.branchId) form.setValue("branch", po.branchId);
        pendingGrnWarehouseFromPoRef.current = {
          warehouseId: po.warehouseId,
          branchId: po.branchId,
        };
        if (po.warehouseId) {
          form.setValue("warehouse", po.warehouseId);
        } else {
          form.setValue("warehouse", "");
        }
        if (po.currency) form.setValue("currency", po.currency);
        form.setValue("poRef", po.number);
        const receivable = (po.lines ?? []).filter(
          (l) => l.productId && (l.remainingQuantity ?? l.qty ?? 0) > 0.01
        );
        if (receivable.length > 0) {
          const prefilled: DocumentLine[] = receivable.map((l, i) => {
            const qty = l.remainingQuantity ?? l.qty ?? 1;
            const unitPrice = l.unitPrice ?? (l.qty && l.qty > 0 ? (l.amount ?? 0) / l.qty : 0);
            const amount = Math.round(unitPrice * qty * 100) / 100;
            return {
              id: `po-${poId}-line-${i}`,
              productId: l.productId!,
              sku: l.productSku ?? "",
              name: l.description ?? l.productName ?? "",
              uom: l.unit ?? "EA",
              qty,
              baseQty: qty,
              price: unitPrice,
              priceReason: "From PO",
              amount,
              sourceLineId: l.id,
            };
          });
          setLines(prefilled);
          form.setValue("linesCount", prefilled.length);
          form.setValue("totalAmount", prefilled.reduce((s, l) => s + l.amount, 0));
          toast.success(`Linked to ${po.number} — ${prefilled.length} line(s) prefilled.`);
        } else {
          setLines([]);
          form.setValue("linesCount", 0);
          form.setValue("totalAmount", 0);
          toast.info(`Linked to ${po.number}. All lines fully received — add lines manually if needed.`);
        }
      } catch {
        toast.error("Could not load PO details.");
      } finally {
        setLoadingPo(false);
      }
    },
    [form]
  );

  const handlePoClear = React.useCallback(() => {
    pendingGrnWarehouseFromPoRef.current = null;
    setLinkedPoId(null);
    setLinkedPoOption(null);
    form.setValue("poRef", "");
    setLines([]);
    form.setValue("linesCount", 0);
    form.setValue("totalAmount", 0);
  }, [form]);

  // When arriving from a deep-link (?poId=…), auto-trigger PO load so lines, party, and warehouse are pre-filled.
  React.useEffect(() => {
    if (type !== "grn" || !initialPoId) return;
    void handlePoSelect(initialPoId, null);
  // Run once on mount only — initialPoId and type are stable props, handlePoSelect will be called once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildDraftPayload = React.useCallback(
    () => {
      const selectedCurrency = form.getValues("currency") || baseCurrency;
      const exchangeRate = selectedCurrency === baseCurrency ? 1 : (form.getValues("exchangeRate") || 1);
      return {
        date: form.getValues("date"),
        branchId: form.getValues("branch") || undefined,
        partyId: form.getValues("party") || undefined,
        warehouseId: form.getValues("warehouse") || undefined,
        poRef: form.getValues("poRef") || undefined,
        reference: form.getValues("reference") || undefined,
        dueDate: form.getValues("dueDate") || undefined,
        ...(linkedPoId && {
          sourceDocumentId: linkedPoId,
          sourceDocumentType: "purchase-order" as const,
          sourceDocumentNumber: form.getValues("poRef") || undefined,
        }),
        lines: lines.map((line) => ({
          productId: line.productId,
          description: line.name,
          quantity: line.qty,
          unit: line.uom,
          unitPrice: line.price,
          ...(line.taxCodeId && { taxCodeId: line.taxCodeId }),
          ...(line.tax != null && line.tax > 0 && { tax: line.tax }),
          amount: line.amount,
          ...(line.sourceLineId && { sourceLineId: line.sourceLineId }),
        })),
        subtotal: lines.reduce((s, l) => s + l.qty * l.price, 0),
        tax: lines.reduce((s, l) => s + (l.tax ?? 0), 0) || undefined,
        total: form.getValues("totalAmount") ?? 0,
        currency: selectedCurrency,
        ...(selectedCurrency !== baseCurrency && { exchangeRate }),
        linesAreTaxInclusive: form.getValues("linesAreTaxInclusive") ?? false,
      };
    },
    [baseCurrency, form, lines, linkedPoId]
  );

  const onReview = async () => {
    if (lines.length === 0) {
      toast.error("Add at least one line item before reviewing.");
      setStep(2);
      return;
    }
    // Credit check: if over limit and no override granted, open override dialog
    if (
      creditSummary?.isOverCredit &&
      !creditOverrideGranted &&
      (creditSummary?.creditControlMode === "AMOUNT" || creditSummary?.creditControlMode === "HYBRID")
    ) {
      setCreditOverrideOpen(true);
      return;
    }
    setStep(3);
    setPostingPreviewError(null);
    try {
      setLoadingPostingPreview(true);
      setPostingPreview(await previewDocumentPostingApi(type as DocTypeKey, buildDraftPayload()));
    } catch (error) {
      const msg = (error as Error).message || "Failed to load posting preview.";
      setPostingPreviewError(msg);
      setPostingPreview([]);
    } finally {
      setLoadingPostingPreview(false);
    }
  };

  const validateAndNext = async () => {
    if (step === 1) {
      const valid = await form.trigger(["date", "party", "branch", "warehouse", "dueDate", "poRef", "reference"]);
      if (!valid) return;
      if (type === "grn" && !String(form.getValues("warehouse") ?? "").trim()) {
        toast.error("Select a warehouse — stock must be received into a specific location.");
        return;
      }
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const onSubmit = async () => {
    if (lines.length === 0) {
      toast.error("Add at least one line item before submitting.");
      setStep(2);
      return;
    }
    try {
      setSubmitting(true);
      const payload = buildDraftPayload();
      if (creditOverrideGranted && creditOverrideReason) {
        (payload as Record<string, unknown>).notes = `[Credit override: ${creditOverrideReason}]`;
      }
      const result = await createDocumentApi(type as DocTypeKey, payload);
      await deleteDocumentDraftApi(type);
      toast.success(`${label} draft created.`);
      router.push(`/docs/${type}/${result.id}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const headerSection = config?.createFormSections.find((s) => s.id === "header");
  const headerFields = headerSection?.fields ?? [];
  const selectedPartyId = form.watch("party");
  const selectedCurrency = form.watch("currency") || baseCurrency;
  const selectedPartyOption = React.useMemo(
    () => (selectedPartyDetail ? toPartyLookupOption(selectedPartyDetail) : null),
    [selectedPartyDetail]
  );
  const selectedFxDate = form.watch("fxDate") || form.watch("date") || new Date().toISOString().slice(0, 10);
  const resolvedPriceListId =
    (selectedPartyId ? customerDefaultPriceLists[selectedPartyId] : undefined) ?? fallbackPriceListId;
  const lineEditorMode =
    type === "bill" || type === "purchase-order" || type === "grn" ||
    type === "purchase-request" || type === "purchase-credit-note" || type === "purchase-debit-note"
      ? "purchasing" : "sales";
  const useCostPricing = lineEditorMode === "purchasing" && !supplierCostListId;
  const lineEditorPriceListId = lineEditorMode === "purchasing"
    ? (supplierCostListId ?? "")
    : resolvedPriceListId;
  const lineEditorPricingByProductId = lineEditorMode === "purchasing" && supplierCostListId
    ? costPricingByProductId
    : pricingByProductId;

  React.useEffect(() => {
    if (!selectedPartyId) {
      setSelectedPartyDetail(null);
      setCreditSummary(null);
      setCreditOverrideGranted(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchPartyByIdApi(selectedPartyId),
      fetchPartyCreditSummaryApi(selectedPartyId),
    ]).then(([party, credit]) => {
      if (!cancelled) {
        setSelectedPartyDetail(party);
        setCreditSummary(credit);
        setCreditOverrideGranted(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setSelectedPartyDetail(null);
        setCreditSummary(null);
      }
    });
    return () => { cancelled = true; };
  }, [selectedPartyId]);

  React.useEffect(() => {
    if (selectedCurrency === baseCurrency) {
      form.setValue("exchangeRate", 1);
      return;
    }
    let cancelled = false;
    setLoadingFxRate(true);
    fetchSavedExchangeRateApi({
      fromCurrency: selectedCurrency,
      toCurrency: baseCurrency,
      date: selectedFxDate,
    })
      .then((rate) => {
        if (!cancelled) {
          form.setValue("exchangeRate", rate.rate, { shouldDirty: true });
        }
      })
      .catch(() => {
        if (!cancelled) {
          form.setValue("exchangeRate", form.getValues("exchangeRate") || 1, { shouldDirty: true });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingFxRate(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [baseCurrency, form, selectedCurrency, selectedFxDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Progress value={(step / 3) * 100} className="max-w-xs" />
        <span className="text-sm text-muted-foreground">
          Step {step} of 3 · {STEPS[step - 1]?.label}
        </span>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>1. Header</CardTitle>
            {copilotEnabled ? (
              <Button type="button" variant="ghost" size="sm" onClick={openDrawer}>
                <Icons.Sparkles className="mr-2 h-4 w-4" />
                Generate draft with Copilot
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              {type === "grn" && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-2">
                    <Icons.Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p className="text-sm text-muted-foreground">
                      Select a Purchase Order to auto-fill supplier, warehouse, and line items (remaining quantities). Skip if receiving goods without a PO.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Purchase Order</Label>
                    <AsyncSearchableSelect
                      value={linkedPoId ?? ""}
                      onValueChange={(poId) => {
                        if (!poId) {
                          handlePoClear();
                        } else {
                          void handlePoSelect(poId, null);
                        }
                      }}
                      onOptionSelect={(opt) => {
                        if (opt && linkedPoId === opt.id) return;
                        if (opt) void handlePoSelect(opt.id, opt as PurchaseOrderLookupOption);
                      }}
                      loadOptions={async (q) => {
                        const items = await searchPurchaseOrderLookupApi(q);
                        return items.map((item) => ({
                          id: item.id,
                          label: item.label,
                          description: item.description,
                          badges: [{ label: item.status, variant: item.status === "APPROVED" ? "default" : "secondary" as const }],
                        }));
                      }}
                      selectedOption={linkedPoOption ? { id: linkedPoOption.id, label: linkedPoOption.label, description: linkedPoOption.description } : null}
                      placeholder="Search by PO number..."
                      searchPlaceholder="Type PO number or reference"
                      emptyMessage="No purchase orders found."
                      allowClear
                      disabled={loadingPo}
                      recentStorageKey="lookup:recent-pos"
                    />
                    {loadingPo && (
                      <p className="text-xs text-muted-foreground">Loading PO details...</p>
                    )}
                    {linkedPoId && !loadingPo && !form.watch("warehouse") && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        This PO has no warehouse set — please select a warehouse below.
                      </p>
                    )}
                    {linkedPoId && !loadingPo && form.watch("warehouse") && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Supplier, warehouse, and lines have been prefilled from this PO. You can still edit them below.
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {headerFields.filter((f) => f.type !== "po-search").map((f) => (
                    <RenderField
                      key={f.id}
                      field={f}
                      form={form}
                      options={fieldOptions[f.id]}
                      selectedPartyOption={selectedPartyOption}
                    />
                ))}
              </div>
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Currency</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label>Currency</Label>
                      <ExplainThis
                        prompt="Explain: Currency vs base currency in this ERP."
                        label="Explain currency"
                      />
                    </div>
                    <Select
                      value={selectedCurrency}
                      onValueChange={(v) => {
                        form.setValue("currency", v);
                        form.setValue(
                          "exchangeRate",
                          v === baseCurrency ? 1 : form.watch("exchangeRate") || 1
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {financialSettings.enabledCurrencies.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedCurrency !== baseCurrency && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Label>Exchange rate</Label>
                          <ExplainThis
                            prompt="Explain: Exchange rate and how base equivalents work."
                            label="Explain exchange rate"
                          />
                        </div>
                        <Input
                          type="number"
                          step="any"
                          {...form.register("exchangeRate", {
                            valueAsNumber: true,
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          {loadingFxRate
                            ? `Loading saved ${selectedCurrency}/${baseCurrency} rate...`
                            : `Saved ${selectedCurrency}/${baseCurrency} rate for ${selectedFxDate}. You can still override it.`}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>FX date</Label>
                        <Input type="date" {...form.register("fxDate")} />
                      </div>
                    </>
                  )}
                </div>
              </div>
              {selectedPartyDetail && (
                <CreditPanel
                  partyDetail={selectedPartyDetail}
                  creditSummary={creditSummary}
                  orderTotal={form.watch("totalAmount") ?? 0}
                  currency={selectedCurrency}
                  categoryName={selectedPartyDetail.customerCategoryId ? (customerCategoryNameById[selectedPartyDetail.customerCategoryId] ?? selectedPartyDetail.customerCategoryId) : undefined}
                  paymentTermsName={selectedPartyDetail.paymentTermsId ? (paymentTermsNameById[selectedPartyDetail.paymentTermsId] ?? selectedPartyDetail.paymentTermsId) : undefined}
                  overrideGranted={creditOverrideGranted}
                />
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>2. Lines</CardTitle>
            {copilotEnabled ? (
              <Button type="button" variant="ghost" size="sm" onClick={openDrawer}>
                <Icons.Sparkles className="mr-2 h-4 w-4" />
                Generate draft with Copilot
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {type === "grn" && linkedPoId && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-blue-500/10 px-3 py-2 text-sm text-blue-700 dark:text-blue-300">
                <Icons.Link className="h-3.5 w-3.5 shrink-0" />
                Lines prefilled from PO <span className="font-medium">{form.watch("poRef")}</span> · Edit quantities to match actual goods received.
              </div>
            )}
            <DocumentLineEditor
              priceListId={lineEditorPriceListId}
              useCostPricing={useCostPricing}
              currency={selectedCurrency}
              lines={lines}
              onLinesChange={handleLinesChange}
              mode={lineEditorMode}
              productFilter={lineEditorMode === "purchasing" ? "purchasable" : "sellable"}
              packagingByProductId={packagingByProductId}
              pricingByProductId={lineEditorPricingByProductId}
              taxCodes={taxCodes}
              linesAreTaxInclusive={form.watch("linesAreTaxInclusive") ?? false}
            />
            <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Prices are tax-inclusive</Label>
                <p className="text-xs text-muted-foreground">
                  Enable if unit prices already include VAT. Tax will be back-calculated.
                </p>
              </div>
              <Switch
                checked={form.watch("linesAreTaxInclusive") ?? false}
                onCheckedChange={(v) => form.setValue("linesAreTaxInclusive", v)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>3. Review & Submit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">{form.watch("date") || "—"}</p>
                </div>
                {(selectedPartyDetail?.name || form.watch("reference")) && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Party / Reference</span>
                    <p className="font-medium">
                      {selectedPartyDetail?.name || form.watch("reference") || "—"}
                    </p>
                  </div>
                )}
                {form.watch("poRef") && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Purchase Order</span>
                    <p className="font-medium">{form.watch("poRef")}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-muted-foreground">Lines</span>
                  <p className="font-medium">
                    {form.watch("linesCount") ?? 0} line(s)
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Tax pricing</span>
                  <p className="font-medium">
                    {form.watch("linesAreTaxInclusive") ? "Tax-inclusive (VAT in price)" : "Tax-exclusive (VAT added on top)"}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Total (Document Currency)</span>
                  <p className="font-medium">
                    {formatMoney(
                      form.watch("totalAmount") ?? 0,
                      selectedCurrency
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Total (Base Currency Equivalent)</span>
                  <p className="font-medium">
                    {formatMoney(
                      toBase(
                        form.watch("totalAmount") ?? 0,
                        form.watch("exchangeRate") ?? 1
                      ),
                      baseCurrency
                    )}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Confirm and create draft. You can edit after creation.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Posting Preview</CardTitle>
              <p className="text-sm text-muted-foreground">Preview draft GL impact in base currency before creation.</p>
            </CardHeader>
            <CardContent>
              <div className="rounded border text-sm">
                <div className="grid grid-cols-4 gap-2 p-2 bg-muted/50 font-medium">
                  <span>Account</span>
                  <span>Debit</span>
                  <span>Credit</span>
                  <span>Memo</span>
                </div>
                {loadingPostingPreview ? (
                  <div className="p-3 text-sm text-muted-foreground">Loading posting preview…</div>
                ) : postingPreviewError ? (
                  <div className="p-3 text-sm text-destructive">
                    Preview failed: {postingPreviewError}. Check that posting accounts are configured in Financial Settings.
                  </div>
                ) : postingPreview.length > 0 ? (
                  postingPreview.map((row, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-4 gap-2 p-2 border-t"
                    >
                      <span>{row.accountCode} · {row.accountName}</span>
                      <span>{row.debit ? formatMoney(row.debit, baseCurrency) : "—"}</span>
                      <span>{row.credit ? formatMoney(row.credit, baseCurrency) : "—"}</span>
                      <span>{row.memo}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground">
                    {type === "purchase-order"
                      ? "Purchase orders are commitment documents — GL entries are created when the linked GRN or Bill is posted."
                      : "No GL lines to preview — total is zero or this document type posts on a later action."}
                  </div>
                )}
                {selectedCurrency !== baseCurrency && (
                  <div className="p-2 border-t bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs">
                    FX gain/loss line will be included if document and base currency differ.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-between">
        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/docs/${type}`}>Cancel</Link>
          </Button>
        </div>
        <div className="flex gap-2">
          {step < 3 ? (
            <Button onClick={validateAndNext}>Next</Button>
          ) : (
            <Button onClick={() => void onSubmit()} disabled={submitting}>
              {submitting ? "Creating..." : "Create draft"}
            </Button>
          )}
          {step < 3 && (
            <Button variant="outline" onClick={onReview}>
              Review & Submit
            </Button>
          )}
        </div>
      </div>

      {/* Credit override dialog */}
      {creditOverrideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-3">
              <Icons.AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="text-base font-semibold">Credit limit exceeded</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This customer is over their credit limit. You can override and continue, but a reason is required for the audit trail.
            </p>
            <div className="mb-4">
              <Label className="text-xs mb-1 block">Reason for override *</Label>
              <Input
                placeholder="e.g. Approved by sales manager, urgent order..."
                value={creditOverrideReason}
                onChange={(e) => setCreditOverrideReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreditOverrideOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={!creditOverrideReason.trim()}
                onClick={() => {
                  setCreditOverrideGranted(true);
                  setCreditOverrideOpen(false);
                  void onReview();
                }}
              >
                Override & Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Credit Panel sub-component ───────────────────────────────────────────────

function CreditPanel({
  partyDetail,
  creditSummary,
  orderTotal,
  currency,
  categoryName,
  paymentTermsName,
  overrideGranted,
}: {
  partyDetail: PartyDetail;
  creditSummary: PartyCreditSummary | null;
  orderTotal: number;
  currency: string;
  categoryName?: string;
  paymentTermsName?: string;
  overrideGranted: boolean;
}) {
  const hasTerms =
    creditSummary?.creditLimitAmount != null || partyDetail.paymentTermsId;

  const projected =
    creditSummary?.creditLimitAmount != null && creditSummary.creditLimitAmount > 0
      ? Math.round(
          ((creditSummary.outstandingBalance + orderTotal) / creditSummary.creditLimitAmount) * 100
        )
      : null;

  const isOverAfterOrder =
    creditSummary?.creditLimitAmount != null &&
    creditSummary.creditLimitAmount > 0 &&
    creditSummary.outstandingBalance + orderTotal > creditSummary.creditLimitAmount;

  const panelColor = overrideGranted
    ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
    : isOverAfterOrder
    ? "border-destructive/50 bg-destructive/5"
    : creditSummary?.isNearLimit
    ? "border-amber-400/50 bg-amber-50 dark:bg-amber-950/20"
    : "border-border bg-muted/30";

  return (
    <div className={`border rounded-lg p-3 mt-4 text-sm ${panelColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Credit &amp; Terms</span>
        {overrideGranted && (
          <span className="text-xs bg-amber-200 text-amber-800 rounded px-2 py-0.5">Override granted</span>
        )}
        {!overrideGranted && isOverAfterOrder && (
          <span className="text-xs bg-destructive/20 text-destructive rounded px-2 py-0.5 font-medium">Over limit</span>
        )}
        {!overrideGranted && !isOverAfterOrder && creditSummary?.isNearLimit && (
          <span className="text-xs bg-amber-200 text-amber-800 rounded px-2 py-0.5">Near limit</span>
        )}
      </div>
      {!hasTerms ? (
        <p className="text-muted-foreground text-xs">
          No credit terms configured.{" "}
          <a href={`/master/parties`} className="underline text-primary">Edit party →</a>
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {categoryName && (
            <>
              <span className="text-muted-foreground">Category</span>
              <span>{categoryName}</span>
            </>
          )}
          {paymentTermsName && (
            <>
              <span className="text-muted-foreground">Payment terms</span>
              <span>{paymentTermsName}</span>
            </>
          )}
          {creditSummary?.creditLimitAmount != null && (
            <>
              <span className="text-muted-foreground">Outstanding</span>
              <span>
                {formatMoney(creditSummary.outstandingBalance, currency)}{" "}
                / {formatMoney(creditSummary.creditLimitAmount, currency)}
                {creditSummary.utilizationPct != null && (
                  <span className="text-muted-foreground ml-1">({creditSummary.utilizationPct}%)</span>
                )}
              </span>
            </>
          )}
          {projected != null && orderTotal > 0 && (
            <>
              <span className="text-muted-foreground">After this order</span>
              <span className={isOverAfterOrder ? "text-destructive font-medium" : ""}>
                {formatMoney(creditSummary!.outstandingBalance + orderTotal, currency)}{" "}
                ({projected}%)
              </span>
            </>
          )}
          {partyDetail.maxOutstandingInvoiceAgeDays != null && (
            <>
              <span className="text-muted-foreground">Max invoice age</span>
              <span>{partyDetail.maxOutstandingInvoiceAgeDays} days</span>
            </>
          )}
        </div>
      )}
      {creditSummary?.creditLimitAmount != null && (
        <div className="mt-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isOverAfterOrder ? "bg-destructive" : creditSummary.isNearLimit ? "bg-amber-400" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, projected ?? creditSummary.utilizationPct ?? 0)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
