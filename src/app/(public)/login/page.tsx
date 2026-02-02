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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

const demoAccounts = [
  { type: "MANUFACTURER", label: "Manufacturer Demo" },
  { type: "DISTRIBUTOR", label: "Distributor Demo" },
  { type: "SHOP", label: "Shop Demo" },
  { type: "PLATFORM", label: "Platform Demo" },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setOrg, setTenant, setCurrentBranch, setBranches } =
    useAuthStore();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
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
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock auth setup
    const mockUser = {
      userId: "user-1",
      orgId: "org-1",
      branchIds: ["branch-1"],
      roleIds: ["role-admin"],
      email: data.email,
      firstName: "Admin",
      lastName: "User",
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockOrg = {
      orgId: "org-1",
      tenantId: "tenant-1",
      orgType: "MANUFACTURER" as const,
      name: "Acme Manufacturing",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockTenant = {
      tenantId: "tenant-1",
      name: "Acme Corp",
      plan: "ENTERPRISE" as const,
      region: "US",
      currency: "USD",
      timeZone: "America/New_York",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockBranch = {
      branchId: "branch-1",
      orgId: "org-1",
      name: "Head Office",
      isHeadOffice: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setUser(mockUser);
    setOrg(mockOrg);
    setTenant(mockTenant);
    setBranches([mockBranch]);
    setCurrentBranch(mockBranch);

    setIsLoading(false);
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    router.push(redirectTo);
  };

  const handleDemoLogin = async (type: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const orgTypeMap: Record<string, "MANUFACTURER" | "DISTRIBUTOR" | "SHOP"> = {
      MANUFACTURER: "MANUFACTURER",
      DISTRIBUTOR: "DISTRIBUTOR",
      SHOP: "SHOP",
      PLATFORM: "MANUFACTURER", // Default
    };

    const mockOrg = {
      orgId: "org-demo",
      tenantId: "tenant-demo",
      orgType: orgTypeMap[type] || "MANUFACTURER",
      name: `${orgTypeMap[type] || "Demo"} Organization`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setOrg(mockOrg);
    setUser({
      userId: "user-demo",
      orgId: "org-demo",
      branchIds: ["branch-demo"],
      roleIds: ["role-admin"],
      email: "demo@odaflow.com",
      firstName: "Demo",
      lastName: "User",
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setIsLoading(false);
    router.push("/dashboard");
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
            </div>

            <Card className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                  />
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
                      Remember me
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
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button variant="outline" className="w-full" type="button" disabled>
                  <Icons.Mail className="mr-2 h-4 w-4" />
                  Continue with Google
                </Button>
                <Button variant="outline" className="w-full" type="button" disabled>
                  <Icons.Mail className="mr-2 h-4 w-4" />
                  Continue with Microsoft
                </Button>
              </div>
            </Card>

            {/* Demo Accounts */}
            <div className="mt-6">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                Continue with demo account
              </p>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <Button
                    key={account.type}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDemoLogin(account.type)}
                    disabled={isLoading}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
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
