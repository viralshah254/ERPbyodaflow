"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Truck, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPartyApi } from "@/lib/api/parties";
import type { PartyRow } from "@/lib/types/masters";

interface QuickAddSupplierSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the newly created supplier after successful save. */
  onSuccess: (supplier: PartyRow & { id: string; label: string; description?: string }) => void;
  /** Pre-fill the name field with the text the user typed in the search box. */
  initialName?: string;
}

interface FormValues {
  name: string;
  phone: string;
  email: string;
  supplierType: string;
}

const SUPPLIER_TYPES = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "SERVICE", label: "Service" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "OTHER", label: "Other" },
] as const;

export function QuickAddSupplierSheet({
  open,
  onOpenChange,
  onSuccess,
  initialName,
}: QuickAddSupplierSheetProps) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { name: "", phone: "", email: "", supplierType: "OTHER" },
  });

  React.useEffect(() => {
    if (open) {
      reset({ name: initialName ?? "", phone: "", email: "", supplierType: "OTHER" });
    }
  }, [open, initialName, reset]);

  const onSubmit = async (values: FormValues) => {
    const created = await createPartyApi({
      name: values.name.trim(),
      roles: ["supplier"],
      supplierType: values.supplierType as PartyRow["supplierType"],
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
      status: "ACTIVE",
    });
    const descParts = [created.code, values.phone.trim(), values.email.trim()].filter(Boolean);
    onSuccess({
      ...created,
      id: created.id,
      label: created.name,
      description: descParts.length ? descParts.join(" · ") : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <SheetTitle>New Supplier</SheetTitle>
          </div>
          <SheetDescription>
            Create a supplier quickly. You can add more details later from the supplier master.
          </SheetDescription>
        </SheetHeader>

        <form
          id="quick-add-supplier-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto py-4 space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="qas-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qas-name"
              autoFocus
              placeholder="Supplier name"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qas-phone">Phone</Label>
            <Input
              id="qas-phone"
              placeholder="e.g. 0712 345 678"
              {...register("phone")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qas-email">Email</Label>
            <Input
              id="qas-email"
              type="email"
              placeholder="supplier@example.com"
              {...register("email")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Supplier Type</Label>
            <Select
              defaultValue="OTHER"
              onValueChange={(v) => setValue("supplierType", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {SUPPLIER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>

        <SheetFooter className="border-t pt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="quick-add-supplier-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create & Select"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
