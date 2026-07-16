"use client";

import Link from "next/link";
import { OdaLogo } from "@/components/brand/OdaLogo";
import { OrgSignupWizard } from "@/components/onboarding/OrgSignupWizard";

export default function SignupPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] py-10 sm:py-14">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        <header className="mb-8 sm:mb-10">
          <OdaLogo height={36} className="mb-5" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Apply for your organisation
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
            Tell us about your business in a few steps. OdaFlow reviews each application and emails you
            login credentials once your tenant is ready.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </header>

        <OrgSignupWizard />
      </div>
    </div>
  );
}
