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
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  country: z.string().min(2, "Country is required"),
  currency: z.string().length(3, "Currency code must be 3 characters"),
  timezone: z.string().min(1, "Timezone is required"),
  businessType: z.string().optional(),
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
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
      plan: data.plan || "PROFESSIONAL",
    },
  });

  const onSubmit = (formData: OrgDetailsForm) => {
    updateData(formData);
    onNext();
  };

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Organization details</h2>
        <p className="text-muted-foreground">
          Tell us about your organization to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName">Organization name</Label>
          <Input
            id="orgName"
            placeholder="Acme Manufacturing"
            {...register("orgName")}
          />
          {errors.orgName && (
            <p className="text-sm text-destructive">{errors.orgName.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" placeholder="Kenya" {...register("country")} />
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
          <Input
            id="timezone"
            placeholder="Africa/Nairobi"
            {...register("timezone")}
          />
          {errors.timezone && (
            <p className="text-sm text-destructive">{errors.timezone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessType">Business type (optional)</Label>
          <Input
            id="businessType"
            placeholder="Manufacturing"
            {...register("businessType")}
          />
        </div>

        <div className="space-y-2">
          <Label>Plan</Label>
          <div className="grid grid-cols-3 gap-4">
            {(["STARTER", "PROFESSIONAL", "ENTERPRISE"] as const).map((plan) => (
              <label
                key={plan}
                className="relative flex cursor-pointer rounded-lg border p-4 focus:outline-none"
              >
                <input
                  type="radio"
                  value={plan}
                  {...register("plan")}
                  className="sr-only"
                />
                <div className="flex flex-1">
                  <div className="flex flex-col">
                    <span className="block text-sm font-medium">{plan}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
          {errors.plan && (
            <p className="text-sm text-destructive">{errors.plan.message}</p>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" type="button" onClick={onBack}>
            Back
          </Button>
          <Button type="submit">Continue</Button>
        </div>
      </form>
    </Card>
  );
}





