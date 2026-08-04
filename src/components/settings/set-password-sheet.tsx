"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { setUserPasswordApi } from "@/lib/api/users-roles";
import * as Icons from "lucide-react";

export type SetPasswordSheetUser = {
  id: string;
  email: string;
  displayName: string;
  roleHint?: string;
};

type SetPasswordSheetProps = {
  open: boolean;
  user: SetPasswordSheetUser | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** When true, shows forgot-password context copy. */
  fromPasswordResetRequest?: boolean;
};

export function SetPasswordSheet({
  open,
  user,
  onOpenChange,
  onSuccess,
  fromPasswordResetRequest = false,
}: SetPasswordSheetProps) {
  const [passwordNew, setPasswordNew] = React.useState("");
  const [passwordConfirm, setPasswordConfirm] = React.useState("");
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [mustChangePassword, setMustChangePassword] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPasswordNew("");
    setPasswordConfirm("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setMustChangePassword(true);
    setError(null);
  }, [open, user?.id]);

  const handleSave = async () => {
    if (!user) return;
    if (passwordNew.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (passwordNew !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setUserPasswordApi(user.id, {
        newPassword: passwordNew,
        mustChangePassword,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Set login password</SheetTitle>
          <SheetDescription>
            {fromPasswordResetRequest
              ? "Create a new password for this user, then share it with them securely (phone, WhatsApp, in person)."
              : "Provision Firebase sign-in — same flow as when you activate a new user account."}
          </SheetDescription>
        </SheetHeader>

        {user ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-lg border bg-muted/30 px-4 py-3">
              <p className="font-medium">{user.displayName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.roleHint ? (
                <p className="text-xs text-muted-foreground mt-1">{user.roleHint}</p>
              ) : null}
            </div>

            {fromPasswordResetRequest ? (
              <p className="text-sm text-amber-900 dark:text-amber-100 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                This user forgot their password. After you save, they can sign in with this email and the new password you set.
              </p>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="space-y-2">
              <Label htmlFor="set-password-new">New password</Label>
              <div className="relative">
                <Input
                  id="set-password-new"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-10"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  placeholder="Min 8 characters"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowNewPassword((p) => !p)}
                >
                  {showNewPassword ? (
                    <Icons.EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Icons.Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-password-confirm">Confirm password</Label>
              <div className="relative">
                <Input
                  id="set-password-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="pr-10"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirmPassword((p) => !p)}
                >
                  {showConfirmPassword ? (
                    <Icons.EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Icons.Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={mustChangePassword}
                onCheckedChange={(c) => setMustChangePassword(c === true)}
              />
              <span className="text-sm">Require password change on next sign-in</span>
            </label>
          </div>
        ) : null}

        <SheetFooter className="mt-8 gap-2 sm:flex-col sm:space-x-0">
          <Button
            className="w-full"
            disabled={saving || !user || !passwordNew || passwordNew !== passwordConfirm}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save password"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
