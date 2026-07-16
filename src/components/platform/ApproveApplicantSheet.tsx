"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  approveOrgSignupApplicantApi,
  type OrgSignupApplicantRow,
} from "@/lib/api/platform";
import { toast } from "sonner";

interface ApproveApplicantSheetProps {
  applicant: OrgSignupApplicantRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: { initialPassword: string }) => void;
}

export function ApproveApplicantSheet({
  applicant,
  open,
  onOpenChange,
  onSuccess,
}: ApproveApplicantSheetProps) {
  const [password, setPassword] = React.useState("");
  const [useCustomPassword, setUseCustomPassword] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setPassword("");
      setUseCustomPassword(false);
    }
  }, [open, applicant?.id]);

  const handleApprove = async () => {
    if (!applicant) return;
    if (useCustomPassword && password.trim().length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await approveOrgSignupApplicantApi(
        applicant.id,
        useCustomPassword ? { initialPassword: password.trim() } : undefined
      );
      toast.success(`Approved. Credentials emailed to ${applicant.email}.`);
      onSuccess({ initialPassword: result.initialPassword });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!applicant) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Approve application</SheetTitle>
          <SheetDescription>
            Provision {applicant.orgName} and email login credentials to {applicant.email}.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md border p-4 text-sm space-y-2">
            <p><strong>Contact:</strong> {applicant.firstName} {applicant.lastName}</p>
            <p><strong>Industry:</strong> {applicant.industryCategory} · {applicant.templateName ?? applicant.templateId}</p>
            <p><strong>Plan:</strong> {applicant.plan}</p>
            {applicant.message ? <p><strong>Note:</strong> {applicant.message}</p> : null}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useCustomPassword}
                onChange={(e) => setUseCustomPassword(e.target.checked)}
              />
              Set a custom initial password
            </label>
            {useCustomPassword ? (
              <div className="space-y-2">
                <Label htmlFor="initialPassword">Initial password</Label>
                <Input
                  id="initialPassword"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                />
                <p className="text-xs text-muted-foreground">
                  The applicant must change this password on first sign-in.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                A secure password will be generated automatically and emailed to the applicant.
              </p>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={submitting}>
            {submitting ? "Provisioning…" : "Approve and send credentials"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
