"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useOnboardingStore } from "@/stores/onboarding-store";

const orgDetailsSchema = z.object({
  orgName: z.string().min(2, "Company name must be at least 2 characters"),
  country: z.string().min(2, "Country is required"),
  currency: z.string().length(3, "Use a 3-letter code, e.g. KES"),
  timezone: z.string().min(1, "Timezone is required"),
  businessType: z.string().optional(),
});

type OrgDetailsForm = z.infer<typeof orgDetailsSchema>;

interface Step3OrgDetailsProps {
  onNext: () => void;
  onBack: () => void;
}

export function Step3OrgDetails({ onNext, onBack }: Step3OrgDetailsProps) {
  const { data, updateData } = useOnboardingStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrgDetailsForm>({
    resolver: zodResolver(orgDetailsSchema),
    defaultValues: {
      orgName: data.orgName,
      country: data.country || "Kenya",
      currency: data.currency || "KES",
      timezone: data.timezone || "Africa/Nairobi",
      businessType: data.businessType,
    },
  });

  const onSubmit = (formData: OrgDetailsForm) => {
    updateData({ ...formData, plan: data.plan ?? "PROFESSIONAL" });
    onNext();
  };

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Company information</h2>
        <p className="text-sm text-muted-foreground">
          Basic details we use when provisioning your tenant.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName">Company name</Label>
          <Input
            id="orgName"
            placeholder="e.g. Top Food Ea Ltd"
            autoComplete="organization"
            {...register("orgName")}
          />
          {errors.orgName && (
            <p className="text-sm text-destructive">{errors.orgName.message}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" placeholder="Kenya" autoComplete="country-name" {...register("country")} />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" placeholder="KES" {...register("currency")} />
            {errors.currency && (
              <p className="text-sm text-destructive">{errors.currency.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" placeholder="Africa/Nairobi" {...register("timezone")} />
          {errors.timezone && (
            <p className="text-sm text-destructive">{errors.timezone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessType">
            Anything else we should know? <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <textarea
            id="businessType"
            placeholder="e.g. 3 branches in Nairobi, franchise outlets, migrating from spreadsheets…"
            className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("businessType")}
          />
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" type="button" onClick={onBack}>
            Back
          </Button>
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </Card>
  );
}
