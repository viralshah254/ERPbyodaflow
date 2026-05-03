"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { getPrivacyInboxEmail } from "@/lib/support-contact";

const schema = z.object({
  email: z.string().email("Use the email tied to your OdaERP sign-in."),
  fullName: z.string().max(160).optional(),
  organizationName: z.string().min(1, "Organization or outlet name helps us locate your tenant."),
  appContext: z.enum(["web", "mobile", "both"]),
  requestScope: z.enum(["user_only", "org_close", "not_sure"]),
  notes: z.string().max(4000).optional(),
  acknowledged: z.boolean().refine((v) => v === true, {
    message: "Confirm you understand deletion may be irreversible for your login and some records.",
  }),
});

export type DeleteAccountFormValues = z.infer<typeof schema>;

export function DeleteAccountRequestForm() {
  const inbox = getPrivacyInboxEmail();
  const [didCopyTemplate, setDidCopyTemplate] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      appContext: "both",
      requestScope: "not_sure",
      acknowledged: false,
    },
  });

  const acknowledged = watch("acknowledged");

  const buildBody = React.useCallback((data: DeleteAccountFormValues) => {
    const lines = [
      "OdaERP — account deletion request",
      "",
      `Email (sign-in): ${data.email}`,
      data.fullName ? `Full name: ${data.fullName}` : "",
      `Organization / outlet: ${data.organizationName}`,
      `Used on: ${data.appContext}`,
      `Requested scope: ${data.requestScope}`,
      "",
      data.notes?.trim() ? `Additional context:\n${data.notes.trim()}` : "",
      "",
      "Submitted via /deleteaccount",
    ];
    return lines.filter(Boolean).join("\n");
  }, []);

  const onSubmit = React.useCallback(
    async (data: DeleteAccountFormValues) => {
      const subject = `[OdaERP] Account deletion request — ${data.organizationName}`;
      const body = buildBody(data);

      if (inbox && typeof window !== "undefined") {
        const mailto = `mailto:${encodeURIComponent(inbox)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        return;
      }

      try {
        await navigator.clipboard.writeText(
          `${subject}\n\n${body}`
        );
        setDidCopyTemplate(true);
      } catch {
        setDidCopyTemplate(false);
      }
    },
    [buildBody, inbox]
  );

  return (
    <Card className="p-8">
      {!inbox && (
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 rounded-lg p-3 mb-6">
          <strong className="text-foreground">Heads-up.</strong> A privacy inbox is not configured yet. Submitting
          will copy a template you can paste into email, or reach us via{" "}
          <Link href="/contact" className="underline underline-offset-4">
            Contact
          </Link>
          . Operators: set{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_PRIVACY_EMAIL</code> for one-click mail.
        </p>
      )}
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="dae-email">Work email used to sign in *</Label>
          <Input id="dae-email" type="email" placeholder="you@company.com" autoComplete="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dae-name">Full name (optional)</Label>
          <Input id="dae-name" placeholder="Ada Lovelace" autoComplete="name" {...register("fullName")} />
          {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dae-org">Organization or outlet name *</Label>
          <Input id="dae-org" placeholder="e.g. Apex Retail Nairobi" {...register("organizationName")} />
          <p className="text-xs text-muted-foreground">Helps isolate the correct ERP tenant among many workspaces.</p>
          {errors.organizationName && (
            <p className="text-sm text-destructive">{errors.organizationName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Where do you primarily use OdaERP?</Label>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["web", "Web app"],
                ["mobile", "Mobile app"],
                ["both", "Both"],
              ] as const
            ).map(([val, label]) => (
              <label key={val} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  value={val}
                  className="text-primary accent-primary"
                  {...register("appContext")}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>What are you requesting?</Label>
          <div className="space-y-2">
            {(
              [
                ["user_only", "Remove my individual user/login only"],
                ["org_close", "Close or anonymize data for my whole organization/workspace"],
                ["not_sure", "Not sure — please advise"],
              ] as const
            ).map(([val, label]) => (
              <label key={val} className="flex cursor-pointer items-start gap-2 text-sm leading-snug">
                <input type="radio" value={val} className="text-primary accent-primary mt-1" {...register("requestScope")} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Whole-workspace closures require owner/admin authority; we may ask for verification from your billing or
            security contact before irreversible teardown.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dae-notes">Additional notes (optional)</Label>
          <Textarea id="dae-notes" rows={5} placeholder="Branch IDs, last activity date, urgency, counterpart contact…" {...register("notes")} />
          {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
        </div>

        <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug">
          <Checkbox
            checked={acknowledged}
            onCheckedChange={(v) => setValue("acknowledged", v === true, { shouldValidate: true })}
            id="dae-confirm"
          />
          <span>
            I understand processed deletion/anonymisation may permanently remove ERP access tied to these details and
            that regulatory record-keeping (tax, invoicing chain-of-custody) can require retention-in-place instead of raw
            erasure.
          </span>
        </label>
        {errors.acknowledged && <p className="text-sm text-destructive">{errors.acknowledged.message}</p>}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" className="w-full sm:w-auto">
            {inbox ? "Open email draft" : "Copy request text"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/privacypolicy">Read privacy policy</Link>
          </Button>
        </div>

        {didCopyTemplate && !inbox && (
          <p className="text-sm text-muted-foreground">Template copied — paste into your mail client and send to your administrator or our inbox once published.</p>
        )}
      </form>
    </Card>
  );
}
