"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AppFrame } from "@/components/marketing/app-frame";
import { useAuthStore } from "@/stores/auth-store";
import * as Icons from "lucide-react";
import { isFirebaseConfigured, signInAndGetIdToken, setRememberMeUntil, clearRememberMeUntil } from "@/lib/firebase";
import { isApiConfigured, setApiAuth } from "@/lib/api/client";
import { fetchRuntimeSession } from "@/lib/api/context";
import { isDevAuthEnabled } from "@/lib/runtime-flags";
import { useOrgContextStore } from "@/stores/orgContextStore";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setOrg, setTenant, setCurrentBranch, setBranches } =
    useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    watch,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      if (!isApiConfigured() || !isFirebaseConfigured()) {
        const message = !isApiConfigured()
          ? "Sign-in is unavailable until the backend API is configured."
          : "Sign-in is unavailable until the Firebase web app keys are configured.";
        setError("root", { message });
        setIsLoading(false);
        return;
      }
      // Firebase + API: real sign-in and backend session
      if (data.rememberMe) {
        setRememberMeUntil();
      } else {
        clearRememberMeUntil();
      }
      const token = await signInAndGetIdToken(data.email, data.password, data.rememberMe);
      setApiAuth({ bearerToken: token });
      const session = await fetchRuntimeSession();
      const { setSession } = useAuthStore.getState();
      const { hydrateFromBackend } = useOrgContextStore.getState();
      setSession({
        user: session.user,
        org: session.org,
        tenant: session.tenant,
        currentBranch: session.currentBranch,
        branches: session.branches,
        permissions: session.permissions,
        isPlatformOperator: session.isPlatformOperator,
      });
      hydrateFromBackend({
        orgType: session.org.orgType,
        templateId: session.orgContext.templateId,
        enabledModules: session.orgContext.enabledModules,
        featureFlags: session.orgContext.featureFlags,
        terminology: session.orgContext.terminology,
        defaultNav: session.orgContext.defaultNav,
        orgRole: session.orgContext.orgRole,
        parentOrgId: session.orgContext.parentOrgId,
        franchiseNetworkId: session.orgContext.franchiseNetworkId,
        franchiseCode: session.orgContext.franchiseCode,
        franchiseTerritory: session.orgContext.franchiseTerritory,
        franchiseStoreFormat: session.orgContext.franchiseStoreFormat,
        franchiseManagerName: session.orgContext.franchiseManagerName,
        franchisePersona: session.orgContext.franchisePersona,
      });
      setApiAuth({
        bearerToken: token,
        branchId: session.currentBranch?.branchId,
      });
      setIsLoading(false);
      if (session.user.mustChangePassword) {
        router.push("/change-password");
        return;
      }
      const defaultRedirect = session.isPlatformOperator ? "/platform" : "/dashboard";
      const redirectTo = searchParams.get("redirect") || defaultRedirect;
      router.push(redirectTo);
    } catch (err) {
      setIsLoading(false);
      const status =
        err && typeof err === "object" && "status" in err
          ? (err as { status?: number }).status
          : undefined;
      const code =
        err && typeof err === "object" && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      if (status === 401)
        setError("root", {
          message: "Account not found. Contact your administrator.",
        });
      else if (code === "auth/invalid-credential" || code === "auth/user-not-found")
        setError("root", { message: "Invalid email or password." });
      else if (code === "auth/too-many-requests")
        setError("root", { message: "Too many attempts. Try again later." });
      else {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: string }).message)
            : "Sign-in failed";
        setError("root", { message });
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left: Form */}
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Sign in to your account</h1>
              <p className="text-muted-foreground">
                Welcome back. Enter your credentials to continue.
              </p>
              {isDevAuthEnabled() && (
                <p className="text-sm text-muted-foreground mt-3">
                  Local developer auth headers are enabled. Visit `/dashboard` directly to use
                  the configured dev account.
                </p>
              )}
            </div>

            <Card className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {errors.root && (
                  <p className="text-sm text-destructive">{errors.root.message}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10"
                      autoComplete="current-password"
                      {...register("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((p) => !p)}
                    >
                      {showPassword ? (
                        <Icons.EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Icons.Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) =>
                        setValue("rememberMe", checked === true)
                      }
                    />
                    <Label
                      htmlFor="remember"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Remember me (30 days)
                    </Label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Your browser can save your password for faster sign-in next time.
                </p>
              </form>

            </Card>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Need an organization provisioned?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Request setup
              </Link>
            </p>
          </div>

          {/* Right: Visual */}
          <div className="hidden lg:block">
            <AppFrame>
              <div className="p-8 bg-muted/30 min-h-[500px] flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Icons.Box className="h-16 w-16 mx-auto text-primary" />
                  <h3 className="text-xl font-semibold">ERP by OdaFlow</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Manage inventory, orders, finance, and more—all in one place.
                  </p>
                </div>
              </div>
            </AppFrame>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </React.Suspense>
  );
}
