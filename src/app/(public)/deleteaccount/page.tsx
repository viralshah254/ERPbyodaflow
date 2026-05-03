import type { Metadata } from "next";
import Link from "next/link";
import { DeleteAccountRequestForm } from "./delete-account-request-form";

export const metadata: Metadata = {
  title: "Delete account request | OdaERP",
  description:
    "Request deletion or anonymisation of your OdaERP user account or organization workspace.",
};

export default function DeleteAccountPage() {
  return (
    <div className="py-16 lg:py-24 border-b bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Delete account request</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Use this secure workflow to initiate the erasure workflow for individuals or tenants on OdaERP. We verify
          every request against sign-in identifiers and tenancy ownership before acting — usually within thirty (30)
          business days absent legal holds or disputed billing obligations.
        </p>

        <div className="space-y-3 text-sm text-muted-foreground leading-relaxed mb-10 border-l-2 border-primary pl-4">
          <p>
            <strong className="text-foreground">Self-service first.</strong> If you merely need yourself removed while
            the business keeps trading, often an organization admin removes your role from Settings → Users. If access
            is locked, escalate through your employer first.
          </p>
          <p>
            <strong className="text-foreground">Regulatory nuance.</strong> Finance, invoicing, tax, shipments, statutory HR
            lines, immutable audit trails, backups, litigation holds, and exports used in audits: some categories may need
            to remain hashed or archived instead of bulk deletion on day one — we reply with specifics when reviewing your
            case.
          </p>
          <p>
            <strong className="text-foreground">Authorization.</strong> Whole-workspace closure may require evidence you
            stand in for the lawful business operator (billing contact, incorporation records, MFA recovery).
          </p>
        </div>

        <DeleteAccountRequestForm />

        <p className="mt-10 text-xs text-muted-foreground text-center">
          Need context on how we generally treat data before you escalate? Review the{" "}
          <Link href="/privacypolicy" className="text-primary underline underline-offset-4">
            Privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
