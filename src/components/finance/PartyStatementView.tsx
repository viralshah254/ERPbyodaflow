"use client";

import * as React from "react";
import Link from "next/link";
import { LIST_PAGE_BODY_CLASS, LIST_PAGE_SHELL_CLASS, PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AsyncSearchableSelect } from "@/components/ui/async-searchable-select";
import type { PartyLookupOption } from "@/lib/api/parties";
import type { PartyStatementKind } from "@/lib/api/party-statements";
import { PartyStatementPanel } from "@/components/finance/PartyStatementPanel";
import * as Icons from "lucide-react";

export function PartyStatementView(props: {
  kind: PartyStatementKind;
  partyId?: string | null;
  from?: string | null;
  to?: string | null;
  loadOptions: (search?: string) => Promise<PartyLookupOption[]>;
  selectedOption?: PartyLookupOption | null;
  canEmail: boolean;
}) {
  const [partyId, setPartyId] = React.useState(props.partyId ?? "");
  const [selectedOption, setSelectedOption] = React.useState<PartyLookupOption | null>(
    props.selectedOption ?? null
  );

  React.useEffect(() => {
    if (props.partyId) setPartyId(props.partyId);
  }, [props.partyId]);

  const title = props.kind === "customer" ? "Customer statements" : "Supplier statements";
  const entity = props.kind === "customer" ? "customer" : "supplier";
  const listHref = props.kind === "customer" ? "/ar/customers" : "/ap/suppliers";

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title={title}
        description={`Period statement from the ${props.kind === "customer" ? "AR" : "AP"} subledger, including invoices or bills, payments, credit notes, and opening balance.`}
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: title }]}
        sticky
        showCommandHint
        actions={
          <Button variant="outline" asChild>
            <Link href={listHref}>
              <Icons.Users className="mr-2 h-4 w-4" />
              {props.kind === "customer" ? "Customer credit" : "Suppliers"}
            </Link>
          </Button>
        }
      />
      <div className={`${LIST_PAGE_BODY_CLASS} space-y-4 print:space-y-3`}>
        <Card className="print:hidden">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>{props.kind === "customer" ? "Customer" : "Supplier"}</Label>
              <AsyncSearchableSelect
                value={partyId}
                onValueChange={(value) => {
                  setPartyId(value);
                  if (!value) setSelectedOption(null);
                }}
                onOptionSelect={setSelectedOption}
                loadOptions={props.loadOptions}
                selectedOption={selectedOption}
                placeholder={`Select ${entity}`}
                searchPlaceholder="Type name, code, phone, or email"
                emptyMessage={`No ${entity}s found.`}
                recentStorageKey={
                  props.kind === "customer" ? "lookup:recent-customers" : "lookup:recent-suppliers"
                }
              />
            </div>
          </CardContent>
        </Card>

        {partyId ? (
          <PartyStatementPanel
            kind={props.kind}
            partyId={partyId}
            from={props.from}
            to={props.to}
            canEmail={props.canEmail}
            syncUrl
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a {entity} and date range, then generate a statement.
          </p>
        )}
      </div>
    </PageShell>
  );
}
