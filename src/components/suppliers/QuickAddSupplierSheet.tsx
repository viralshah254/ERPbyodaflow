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
import { createPartyApi } from "@/lib/api/parties";
import type { CoolcatchSupplierKind, PartyRow } from "@/lib/types/masters";
import { supplierMasterFormToPayload } from "@/components/suppliers/SupplierMasterFormFields";

interface QuickAddSupplierSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the newly created supplier after successful save. */
  onSuccess: (supplier: PartyRow & { id: string; label: string; description?: string }) => void;
  /** Pre-fill the name field with the text the user typed in the search box. */
  initialName?: string;
}

interface FormValues {
  coolcatchSupplierKind: CoolcatchSupplierKind;
  name: string;
  contactPersonFirstName: string;
  contactPersonLastName: string;
  phone: string;
  email: string;
  taxId: string;
}

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
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      coolcatchSupplierKind: "BROKER",
      name: "",
      contactPersonFirstName: "",
      contactPersonLastName: "",
      phone: "",
      email: "",
      taxId: "",
    },
  });

  const kind = watch("coolcatchSupplierKind");

  React.useEffect(() => {
    if (open) {
      reset({
        coolcatchSupplierKind: "BROKER",
        name: initialName ?? "",
        contactPersonFirstName: "",
        contactPersonLastName: "",
        phone: "",
        email: "",
        taxId: "",
      });
    }
  }, [open, initialName, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = supplierMasterFormToPayload({
      coolcatchSupplierKind: values.coolcatchSupplierKind,
      name: values.name,
      contactPersonFirstName: values.contactPersonFirstName,
      contactPersonLastName: values.contactPersonLastName,
      email: values.email,
      phone: values.phone,
      locationFormattedAddress: "",
      addressLine1: "",
      addressCity: "",
      addressRegion: "",
      addressCountry: "",
      paymentTermsId: "",
      defaultCurrency: "KES",
      taxId: values.taxId,
    });
    const created = await createPartyApi(payload);
    const descParts = [created.code, values.phone.trim(), values.email.trim(), values.taxId.trim()].filter(Boolean);
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
          <div className="space-y-2">
            <Label>Supplier kind</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["FARM", "BROKER"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={kind === value ? "default" : "outline"}
                  onClick={() => setValue("coolcatchSupplierKind", value)}
                >
                  {value === "FARM" ? "Farm" : "Broker / wholesaler"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qas-name">
              {kind === "FARM" ? "Farm name" : "Company name"}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qas-name"
              autoFocus
              placeholder={kind === "FARM" ? "Farm name" : "Company name"}
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="qas-first-name">
                Contact first name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="qas-first-name"
                {...register("contactPersonFirstName", { required: "First name is required" })}
              />
              {errors.contactPersonFirstName && (
                <p className="text-xs text-destructive">{errors.contactPersonFirstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qas-last-name">
                Contact last name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="qas-last-name"
                {...register("contactPersonLastName", { required: "Last name is required" })}
              />
              {errors.contactPersonLastName && (
                <p className="text-xs text-destructive">{errors.contactPersonLastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qas-phone">
              Contact number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qas-phone"
              placeholder="e.g. +254712345678"
              {...register("phone", { required: "Contact number is required" })}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qas-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qas-email"
              type="email"
              placeholder="supplier@example.com"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Enter a valid email address",
                },
              })}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qas-tax-id">
              KRA PIN <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qas-tax-id"
              placeholder="e.g. P051234567X"
              autoComplete="off"
              {...register("taxId", { required: "KRA PIN is required" })}
            />
            {errors.taxId && (
              <p className="text-xs text-destructive">{errors.taxId.message}</p>
            )}
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
