"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { UserPlus, AlertCircle, Link2, Loader2 } from "lucide-react";
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
import { createPartyApi, checkCustomerIdentityApi } from "@/lib/api/parties";
import type { PartyRow } from "@/lib/types/masters";
import { cn } from "@/lib/utils";

interface QuickAddCustomerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the newly created customer after successful save. */
  onSuccess: (customer: PartyRow & { id: string; label: string; description?: string }) => void;
  /** Pre-fill the name field with the text the user typed in the search box. */
  initialName?: string;
}

interface FormValues {
  name: string;
  phone: string;
  email: string;
  customerType: string;
}

type IdentityMatch = {
  networkCustomerId: string;
  matchedOn: { name?: string; phone?: string; email?: string };
};

const CUSTOMER_TYPES = [
  { value: "END_CUSTOMER", label: "End Customer" },
  { value: "RETAILER", label: "Retailer" },
  { value: "WHOLESALER", label: "Wholesaler" },
  { value: "DISTRIBUTOR", label: "Distributor" },
  { value: "FRANCHISEE", label: "Franchisee" },
] as const;

export function QuickAddCustomerSheet({
  open,
  onOpenChange,
  onSuccess,
  initialName,
}: QuickAddCustomerSheetProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { name: "", phone: "", email: "", customerType: "END_CUSTOMER" },
  });

  const [identityMatch, setIdentityMatch] = React.useState<IdentityMatch | null>(null);
  const [acceptLink, setAcceptLink] = React.useState(false);
  const [identityChecking, setIdentityChecking] = React.useState(false);
  const identityCheckTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill name when the sheet opens with a search query
  React.useEffect(() => {
    if (open) {
      reset({ name: initialName ?? "", phone: "", email: "", customerType: "END_CUSTOMER" });
      setIdentityMatch(null);
      setAcceptLink(false);
    }
  }, [open, initialName, reset]);

  const phone = watch("phone");
  const email = watch("email");

  // Debounced identity check when phone or email changes
  React.useEffect(() => {
    if (!open) return;
    if (!phone?.trim() && !email?.trim()) {
      setIdentityMatch(null);
      return;
    }
    if (identityCheckTimer.current) clearTimeout(identityCheckTimer.current);
    identityCheckTimer.current = setTimeout(async () => {
      try {
        setIdentityChecking(true);
        const result = await checkCustomerIdentityApi({
          phone: phone?.trim() || undefined,
          email: email?.trim() || undefined,
        });
        if (result.found) {
          setIdentityMatch({ networkCustomerId: result.networkCustomerId, matchedOn: result.matchedOn });
        } else {
          setIdentityMatch(null);
        }
      } catch {
        setIdentityMatch(null);
      } finally {
        setIdentityChecking(false);
      }
    }, 500);
    return () => {
      if (identityCheckTimer.current) clearTimeout(identityCheckTimer.current);
    };
  }, [phone, email, open]);

  const onSubmit = async (values: FormValues) => {
    const payload: Parameters<typeof createPartyApi>[0] = {
      name: values.name.trim(),
      roles: ["customer"],
      customerType: values.customerType as PartyRow["customerType"],
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
      ...(acceptLink && identityMatch
        ? { networkCustomerId: identityMatch.networkCustomerId }
        : {}),
    };
    const created = await createPartyApi(payload);
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
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            <SheetTitle>New Customer</SheetTitle>
          </div>
          <SheetDescription>
            Create a customer quickly. You can add more details later from the customer master.
          </SheetDescription>
        </SheetHeader>

        <form
          id="quick-add-customer-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto py-4 space-y-4"
        >
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="qac-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="qac-name"
              autoFocus
              placeholder="Customer name"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="qac-phone">Phone</Label>
            <div className="relative">
              <Input
                id="qac-phone"
                placeholder="e.g. 0712 345 678"
                {...register("phone")}
              />
              {identityChecking && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="qac-email">Email</Label>
            <div className="relative">
              <Input
                id="qac-email"
                type="email"
                placeholder="customer@example.com"
                {...register("email")}
              />
              {identityChecking && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Customer type */}
          <div className="space-y-1.5">
            <Label>Customer Type</Label>
            <Select
              defaultValue="END_CUSTOMER"
              onValueChange={(v) => setValue("customerType", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Identity linking suggestion */}
          {identityMatch && (
            <div
              className={cn(
                "rounded-lg border p-3 space-y-2 text-sm transition-colors",
                acceptLink
                  ? "border-primary/40 bg-primary/5"
                  : "border-amber-500/40 bg-amber-500/5"
              )}
            >
              <div className="flex items-start gap-2">
                {acceptLink ? (
                  <Link2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                )}
                <div className="space-y-1">
                  <p className="font-medium">
                    {acceptLink
                      ? "This customer will be linked to the existing network identity."
                      : "Possible match found in the franchise network"}
                  </p>
                  <p className="text-muted-foreground">
                    An existing customer{" "}
                    {identityMatch.matchedOn.name && (
                      <strong>{identityMatch.matchedOn.name}</strong>
                    )}{" "}
                    has the same{" "}
                    {identityMatch.matchedOn.phone && identityMatch.matchedOn.email
                      ? "phone and email"
                      : identityMatch.matchedOn.phone
                        ? "phone number"
                        : "email address"}
                    . Linking them lets HQ track buying patterns across outlets.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={acceptLink ? "default" : "outline"}
                  onClick={() => setAcceptLink(true)}
                >
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  Link identities
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!acceptLink ? "default" : "outline"}
                  onClick={() => setAcceptLink(false)}
                >
                  Keep separate
                </Button>
              </div>
            </div>
          )}
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
            form="quick-add-customer-form"
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
