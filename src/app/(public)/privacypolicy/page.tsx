import type { Metadata } from "next";
import Link from "next/link";
import { getPrivacyInboxEmail } from "@/lib/support-contact";

export const metadata: Metadata = {
  title: "Privacy Policy | OdaERP",
  description:
    "How DV Tech Ventures collects, uses, and protects information for the OdaERP web and mobile ERP service.",
};

const COMPANY = "DV Tech Ventures";
const PRODUCT = "OdaERP";
const LAST_UPDATED = "May 2026";

export default function PrivacyPolicyPage() {
  const inbox = getPrivacyInboxEmail();

  return (
    <div className="py-16 lg:py-24 border-b bg-background">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground mb-4">Last updated: {LAST_UPDATED}</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">Privacy policy</h1>
        <p className="text-muted-foreground leading-relaxed mb-10">
          This policy describes how {COMPANY} (&quot;we,&quot; &quot;us,&quot;) processes personal information in
          connection with {PRODUCT} — the hosted ERP web application at this site and the OdaERP mobile apps
          (together, the <strong className="text-foreground">&quot;Service&quot;</strong>). If you disagree with
          this policy, please do not use the Service.
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-3" id="controller">
            <h2 className="text-xl font-semibold text-foreground">Who is responsible</h2>
            <p>
              For personal information processed about users of {PRODUCT}, {COMPANY} acts as the data controller
              (or equivalent responsible party) unless we otherwise notify you — for example, where your employer
              or franchisor configures the tenant and directs processing; in those cases both your organization&apos;s
              policies and ours may apply.
            </p>
            <p>
              You can reach us about privacy at{" "}
              {inbox ? (
                <a className="text-primary underline underline-offset-4 hover:no-underline" href={`mailto:${inbox}`}>
                  {inbox}
                </a>
              ) : (
                <>
                  our{" "}
                  <Link href="/contact" className="text-primary underline underline-offset-4 hover:no-underline">
                    Contact
                  </Link>{" "}
                  page
                </>
              )}
              . For account deletion, use our{" "}
              <Link href="/deleteaccount" className="text-primary underline underline-offset-4 hover:no-underline">
                Delete account request
              </Link>{" "}
              form.
            </p>
          </section>

          <section className="space-y-3" id="what-we-collect">
            <h2 className="text-xl font-semibold text-foreground">Information we collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-foreground">Account and identity.</strong> Name, email, phone (if provided),
                job title or role identifiers, hashed credentials, MFA factors you enable, preferences, session and
                device identifiers tied to signing in (including via Firebase Authentication or similar identity
                providers your deployment uses).
              </li>
              <li>
                <strong className="text-foreground">Organization and tenancy context.</strong> Organization name,
                branch or outlet identifiers, role assignments, and configuration you or your admins save in{" "}
                {PRODUCT}.
              </li>
              <li>
                <strong className="text-foreground">Operational and ERP content.</strong> Business records you submit
                to the Service — inventory, orders, shipments, invoicing, payroll-related fields permitted by your
                plan, uploads (e.g. proof-of-delivery images), integrations, webhook payloads, audit events, support
                messages, and free-text fields your users enter inside the tenant.
              </li>
              <li>
                <strong className="text-foreground">Technical and security.</strong> IP address, approximate
                region, timestamps, diagnostics, logs, fraud-prevention signals, and similar metadata needed to
                operate, secure, and improve the Service.
              </li>
              <li>
                <strong className="text-foreground">Cookies and storage.</strong> Essential cookies/session storage
                to keep you signed in; optional preference storage you accept through our UX.
              </li>
            </ul>
          </section>

          <section className="space-y-3" id="why">
            <h2 className="text-xl font-semibold text-foreground">How we use information</h2>
            <p>We process personal information to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, host, personalize, maintain, debug, and support the Service;</li>
              <li>Authenticate users and enforce RBAC policies your organization configures;</li>
              <li>Operate multi-tenant isolation, backups, migration, upgrades, and compliance tooling;</li>
              <li>Detect, prevent, and respond to abuse, outages, incidents, fraud, or legal claims;</li>
              <li>Analytics and product telemetry that do not materially override your statutory rights;</li>
              <li>Fulfill legal obligations and exercise our legal rights;</li>
              <li>
                Communicate about security, outages, contractual changes (including this policy when material), and —
                separately — marketing where you have opted in.
              </li>
            </ul>
          </section>

          <section className="space-y-3" id="bases">
            <h2 className="text-xl font-semibold text-foreground">Legal bases (where applicable)</h2>
            <p>
              Depending on jurisdiction, we rely on one or more of: performance of a contract with your organization or
              you as an individual subscriber; legitimate interests balanced against your rights (e.g.
              cybersecurity); compliance with legal duties; your consent where we ask explicitly (such as cookies
              beyond essentials or marketing emails).
            </p>
          </section>

          <section className="space-y-3" id="sharing">
            <h2 className="text-xl font-semibold text-foreground">Sharing and subprocessors</h2>
            <p>
              We do not sell your personal information. We share personal information only with service providers
              that help operate the Service (for example hosting, identity, backups, observability), with your
              direction (APIs, integrations, exports your admins enable), to comply with law or enforce our terms,
              or in connection with a merger, diligence, bankruptcy, sale of assets — subject to safeguards and
              notice where legally required.
            </p>
            <p>A non-exhaustive list may include regional cloud hosts, Firebase / Google Identity back-ends tied to your deployment, observability tooling, payment processors billing your organization where applicable — all under written agreements restricting use to service delivery.</p>
          </section>

          <section className="space-y-3" id="transfers">
            <h2 className="text-xl font-semibold text-foreground">International transfers</h2>
            <p>
              Your data may be processed outside your region when our infrastructure requires it. We apply
              appropriate safeguards (standard contractual clauses, adequacy findings, supplementary measures where
              required) aligned with GDPR and analogous laws — details available upon request.
            </p>
          </section>

          <section className="space-y-3" id="retention">
            <h2 className="text-xl font-semibold text-foreground">Retention</h2>
            <p>
              Account and security logs remain as long as your relationship with us requires plus a reconciliation
              period. ERP transactional content inside a tenant stays until your administrators delete records,
              downgrade the tenant, or request closure — subject to legal holds, audit requirements, taxation, and
              anti-fraud rules that sometimes require retention after account closure or anonymisation instead of raw
              erasure.
            </p>
          </section>

          <section className="space-y-3" id="rights">
            <h2 className="text-xl font-semibold text-foreground">Your privacy rights</h2>
            <p>
              You may ask to access, correct, restrict, erase, export, object to processing, lodge a complaint with
              a supervisory authority, or revoke consent — subject to exemptions (e.g. records we must keep for lawful
              accounting). Contact us using{" "}
              {inbox ? (
                <>
                  <a className="text-primary underline underline-offset-4" href={`mailto:${inbox}`}>
                    {inbox}
                  </a>{" "}
                  or{" "}
                </>
              ) : null}
              our{" "}
              <Link href="/deleteaccount" className="text-primary underline underline-offset-4">
                account deletion workflow
              </Link>{" "}
              where it applies.
            </p>
          </section>

          <section className="space-y-3" id="security">
            <h2 className="text-xl font-semibold text-foreground">Security</h2>
            <p>
              We implement technical and organizational measures — encryption in transit where supported, hardened
              access controls, tenancy isolation, auditing — appropriate to ERP-class data. See also our{" "}
              <Link href="/security" className="text-primary underline underline-offset-4">
                Security overview
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3" id="children">
            <h2 className="text-xl font-semibold text-foreground">Children</h2>
            <p>
              {PRODUCT} is a business ERP. It is not directed at children under 16. If we learn we processed a
              minor&apos;s profile without lawful authority we will remediate deletion when appropriate.
            </p>
          </section>

          <section className="space-y-3" id="changes">
            <h2 className="text-xl font-semibold text-foreground">Changes</h2>
            <p>
              We update this policy from time to time. Material changes appear with a refreshed &quot;Last
              updated&quot; date above and, where required, additional notices in-product or via email.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
