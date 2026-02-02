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
import { Progress } from "@/components/ui/progress";
import { getDocTypeConfig } from "@/config/documents";
import type { FormFieldConfig } from "@/config/documents/types";
import { ExplainThis } from "@/components/copilot/ExplainThis";
import { t } from "@/lib/terminology";
import { useTerminology } from "@/stores/orgContextStore";
import { useCopilotStore } from "@/stores/copilot-store";
import { useFinancialSettings } from "@/lib/org/useFinancialSettings";
import { formatMoney, toBase } from "@/lib/money";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as Icons from "lucide-react";
import Link from "next/link";
import { DocumentLineEditor, type DocumentLine } from "@/components/docs/DocumentLineEditor";

const DRAFT_KEY = "odaflow_draft";

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  party: z.string().optional(),
  reference: z.string().optional(),
  branch: z.string().optional(),
  dueDate: z.string().optional(),
  poRef: z.string().optional(),
  warehouse: z.string().optional(),
  linesCount: z.number().optional(),
  taxesNote: z.string().optional(),
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
    taxesNote: "—",
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
}: {
  field: FormFieldConfig;
  form: ReturnType<typeof useForm<FormValues>>;
}) {
  const key = fieldIdToKey(field.id);
  const isDate = field.type === "date";
  const isNum = field.type === "number";
  const placeholder =
    field.type === "entity"
      ? "Search or enter"
      : field.type === "select"
        ? "Select..."
        : undefined;

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
        placeholder={placeholder}
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
}

const STEPS = [
  { id: "header", label: "Header" },
  { id: "lines", label: "Lines" },
  { id: "taxes", label: "Taxes & charges" },
  { id: "review", label: "Review & Submit" },
];

export function DocumentCreateWizard({ type }: DocumentCreateWizardProps) {
  const router = useRouter();
  const terminology = useTerminology();
  const openDrawer = useCopilotStore((s) => s.openDrawer);
  const { settings: financialSettings } = useFinancialSettings();
  const baseCurrency = financialSettings.baseCurrency;
  const config = getDocTypeConfig(type);
  const label = config ? t(config.termKey, terminology) : type;

  const [step, setStep] = React.useState(1);
  const [lines, setLines] = React.useState<DocumentLine[]>([]);
  const storageKey = `${DRAFT_KEY}_${type}`;
  const defaults = React.useMemo(
    () => getDefaultValues(baseCurrency),
    [baseCurrency]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: (() => {
      if (typeof window === "undefined") return defaults;
      try {
        const s = localStorage.getItem(storageKey);
        if (s) {
          const parsed = JSON.parse(s) as Partial<FormValues>;
          return { ...defaults, ...parsed };
        }
      } catch {
        /* ignore */
      }
      return defaults;
    })(),
  });

  React.useEffect(() => {
    const sub = form.watch((data) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch {
        /* ignore */
      }
    });
    return () => sub.unsubscribe();
  }, [storageKey, form]);

  const handleLinesChange = React.useCallback(
    (next: DocumentLine[]) => {
      setLines(next);
      const total = next.reduce((s, l) => s + l.amount, 0);
      form.setValue("linesCount", next.length);
      form.setValue("totalAmount", total);
    },
    [form]
  );

  const onReview = () => setStep(4);

  const validateAndNext = async () => {
    if (step === 1) {
      const valid = await form.trigger(["date", "party", "branch", "warehouse", "dueDate", "poRef", "reference"]);
      if (!valid) return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const onSubmit = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    router.push(`/docs/${type}/1`);
  };

  const headerSection = config?.createFormSections.find((s) => s.id === "header");
  const headerFields = headerSection?.fields ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Progress value={(step / 4) * 100} className="max-w-xs" />
        <span className="text-sm text-muted-foreground">
          Step {step} of 4 · {STEPS[step - 1]?.label}
        </span>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>1. Header</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={openDrawer}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Generate draft with Copilot
            </Button>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {headerFields.map((f) => (
                  <RenderField key={f.id} field={f} form={form} />
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
                      value={form.watch("currency") || baseCurrency}
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
                  {(form.watch("currency") || baseCurrency) !== baseCurrency && (
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
                      </div>
                      <div className="space-y-2">
                        <Label>FX date</Label>
                        <Input type="date" {...form.register("fxDate")} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>2. Lines</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={openDrawer}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Generate draft with Copilot
            </Button>
          </CardHeader>
          <CardContent>
            <DocumentLineEditor
              priceListId="pl-retail"
              currency={form.watch("currency") || baseCurrency}
              lines={lines}
              onLinesChange={handleLinesChange}
              mode={type === "bill" || type === "purchase-order" || type === "grn" ? "purchasing" : "sales"}
            />
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>3. Taxes & charges</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={openDrawer}>
              <Icons.Sparkles className="mr-2 h-4 w-4" />
              Generate draft with Copilot
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Taxes (stub). Configure tax codes and charges.
            </div>
            <div className="mt-4">
              <Label className="text-muted-foreground">Notes (stub)</Label>
              <Input
                placeholder="—"
                className="mt-1"
                {...form.register("taxesNote")}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>4. Review & Submit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">{form.watch("date") || "—"}</p>
                </div>
                {(form.watch("party") || form.watch("reference")) && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Party / Reference</span>
                    <p className="font-medium">
                      {form.watch("party") || form.watch("reference") || "—"}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-muted-foreground">Lines</span>
                  <p className="font-medium">
                    {form.watch("linesCount") ?? 0} line(s)
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground">Taxes</span>
                  <p className="font-medium">
                    {form.watch("taxesNote") || "—"}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 border-t pt-4">
                <div className="space-y-1">
                  <span className="text-muted-foreground">Total (Document Currency)</span>
                  <p className="font-medium">
                    {formatMoney(
                      form.watch("totalAmount") ?? 0,
                      form.watch("currency") || baseCurrency
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
              <p className="text-sm text-muted-foreground">Stub: mock GL lines in base currency.</p>
            </CardHeader>
            <CardContent>
              <div className="rounded border text-sm">
                <div className="grid grid-cols-4 gap-2 p-2 bg-muted/50 font-medium">
                  <span>Account</span>
                  <span>Debit</span>
                  <span>Credit</span>
                  <span>Memo</span>
                </div>
                {[
                  { account: "1100 · Cash", debit: 10000, credit: 0, memo: "Stub" },
                  { account: "4000 · Revenue", debit: 0, credit: 10000, memo: "Stub" },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-4 gap-2 p-2 border-t"
                  >
                    <span>{row.account}</span>
                    <span>{row.debit ? formatMoney(row.debit, baseCurrency) : "—"}</span>
                    <span>{row.credit ? formatMoney(row.credit, baseCurrency) : "—"}</span>
                    <span>{row.memo}</span>
                  </div>
                ))}
                {(form.watch("currency") || baseCurrency) !== baseCurrency && (
                  <div className="p-2 border-t bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs">
                    FX Gain/Loss (stub)
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
          {step < 4 ? (
            <Button onClick={validateAndNext}>Next</Button>
          ) : (
            <Button onClick={onSubmit}>Create draft</Button>
          )}
          {step < 4 && (
            <Button variant="outline" onClick={onReview}>
              Review & Submit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
