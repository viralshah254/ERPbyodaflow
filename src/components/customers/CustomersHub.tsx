"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_SHELL_CLASS,
  PageShell,
} from "@/components/layout/page-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import * as Icons from "lucide-react";
import { useOrgContext } from "@/stores/orgContextStore";
import {
  CUSTOMER_DIRECTORY_TABS,
  isFmcgOrg,
  type CustomerKindId,
} from "@/lib/fmcg/sfa-customer";

type DirectoryTabId = (typeof CUSTOMER_DIRECTORY_TABS)[number]["id"];
import { isApiConfigured } from "@/lib/api/client";
import { useCanWriteSales } from "@/lib/rbac/use-write-guard";
import { CustomerDirectoryPanel } from "@/components/customers/CustomerDirectoryPanel";
import { CustomerFormSheet } from "@/components/customers/CustomerFormSheet";
import { AddModernTradeBranchSheet } from "@/components/customers/AddModernTradeBranchSheet";

export type CustomersHubProps = {
  fromFinance?: boolean;
};

function CustomersHubContent({ fromFinance = false }: CustomersHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canWrite = useCanWriteSales();
  const { templateId } = useOrgContext();
  const fmcg = isFmcgOrg(templateId);

  const editCustomerId = searchParams.get("id");
  const openCreate = searchParams.get("new") === "1";

  // Finance users land on the dedicated credit page — send them there.
  React.useEffect(() => {
    if (!fromFinance) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `/ar/customers?${qs}` : "/ar/customers");
  }, [fromFinance, router, searchParams]);

  const [formOpen, setFormOpen] = React.useState(false);
  const [formKindId, setFormKindId] = React.useState<CustomerKindId | undefined>(undefined);
  const [formCustomerId, setFormCustomerId] = React.useState<string | null>(null);
  const [lockKind, setLockKind] = React.useState(false);
  const [returnToBranchAfterSupermarket, setReturnToBranchAfterSupermarket] = React.useState(false);
  const [branchOpen, setBranchOpen] = React.useState(false);
  const [branchSupermarketId, setBranchSupermarketId] = React.useState<string | null>(null);
  const [newlyCreatedSupermarketId, setNewlyCreatedSupermarketId] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [directoryTab, setDirectoryTab] = React.useState<DirectoryTabId>("modern-trade");
  const supermarketCreatedRef = React.useRef(false);

  const clearQueryFlags = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.delete("id");
    params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `/sales/customers?${qs}` : "/sales/customers", { scroll: false });
  }, [router, searchParams]);

  const openNewCustomer = React.useCallback(
    (kindId?: CustomerKindId, options?: { lockKind?: boolean; returnToBranch?: boolean }) => {
      setFormCustomerId(null);
      setFormKindId(kindId);
      setLockKind(Boolean(options?.lockKind));
      setReturnToBranchAfterSupermarket(Boolean(options?.returnToBranch));
      setFormOpen(true);
      clearQueryFlags();
    },
    [clearQueryFlags]
  );

  const openBranchSheet = React.useCallback((supermarketId?: string) => {
    setBranchSupermarketId(supermarketId ?? null);
    setBranchOpen(true);
  }, []);

  React.useEffect(() => {
    if (openCreate) openNewCustomer();
  }, [openCreate, openNewCustomer]);

  React.useEffect(() => {
    if (!editCustomerId || fromFinance) return;
    setFormCustomerId(editCustomerId);
    setFormKindId(undefined);
    setFormOpen(true);
  }, [editCustomerId, fromFinance]);

  const breadcrumbs = [
    { label: "Sales", href: "/sales/overview" },
    { label: "Customers" },
  ];

  if (fromFinance) {
    return (
      <PageShell className={LIST_PAGE_SHELL_CLASS}>
        <PageHeader title="Customers" description="Opening Finance customer credit…" breadcrumbs={breadcrumbs} />
        <div className="p-6 text-sm text-muted-foreground">Redirecting…</div>
      </PageShell>
    );
  }

  if (!isApiConfigured()) {
    return (
      <PageShell className={LIST_PAGE_SHELL_CLASS}>
        <PageHeader
          title="Customers"
          description="Who you sell to."
          breadcrumbs={breadcrumbs}
        />
        <div className={LIST_PAGE_BODY_CLASS}>
          <EmptyState
            icon="PlugZap"
            title="API not configured"
            description="Set NEXT_PUBLIC_API_URL to load customers from your organisation."
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className={LIST_PAGE_SHELL_CLASS}>
      <PageHeader
        title="Customers"
        description={
          fmcg
            ? "Add and manage who you sell to. Credit limits for existing customers are managed under Finance."
            : "Add and manage who you sell to. Finance can update credit on existing customers."
        }
        breadcrumbs={breadcrumbs}
        sticky
        showCommandHint
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/ar/customers">
                  <Icons.CreditCard className="mr-2 h-4 w-4" />
                  Customer credit
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings/migrations">
                  <Icons.Upload className="mr-2 h-4 w-4" />
                  Import
                </Link>
              </Button>
              <Button onClick={() => openNewCustomer()}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                Add customer
              </Button>
            </div>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/ar/customers">
                <Icons.CreditCard className="mr-2 h-4 w-4" />
                Customer credit
              </Link>
            </Button>
          )
        }
      />

      <div className={LIST_PAGE_BODY_CLASS}>
        <CustomerDirectoryPanel
          fmcg={fmcg}
          segmentTabs={fmcg}
          branchListRefreshKey={refreshKey}
          activeTab={directoryTab}
          onActiveTabChange={setDirectoryTab}
          onAddCustomer={(kindId) => openNewCustomer(kindId)}
          onEditCustomer={(id) => {
            setFormCustomerId(id);
            setFormKindId(undefined);
            setLockKind(false);
            setReturnToBranchAfterSupermarket(false);
            setFormOpen(true);
          }}
          onAddBranch={fmcg ? openBranchSheet : undefined}
        />
      </div>

      <CustomerFormSheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            const returningToBranch = returnToBranchAfterSupermarket;
            const created = supermarketCreatedRef.current;
            supermarketCreatedRef.current = false;
            setFormCustomerId(null);
            setLockKind(false);
            setReturnToBranchAfterSupermarket(false);
            if (editCustomerId) clearQueryFlags();
            // Cancelled supermarket create → resume branch sheet (draft kept)
            if (returningToBranch && !created) {
              setBranchOpen(true);
            }
          }
        }}
        fmcg={fmcg}
        initialKindId={formKindId}
        lockKind={lockKind}
        customerId={formCustomerId}
        onSuccess={(customer) => {
          setRefreshKey((k) => k + 1);
          if (customer?.kindId) {
            const tab = CUSTOMER_DIRECTORY_TABS.find((t) => t.id === customer.kindId);
            if (tab) setDirectoryTab(tab.id);
          }
          if (returnToBranchAfterSupermarket && customer?.id) {
            supermarketCreatedRef.current = true;
            setNewlyCreatedSupermarketId(customer.id);
            setBranchSupermarketId(customer.id);
            setBranchOpen(true);
          }
        }}
      />

      {fmcg ? (
        <AddModernTradeBranchSheet
          open={branchOpen}
          onOpenChange={setBranchOpen}
          initialSupermarketId={branchSupermarketId}
          selectSupermarketId={newlyCreatedSupermarketId}
          onSelectSupermarketConsumed={() => setNewlyCreatedSupermarketId(null)}
          onAddSupermarket={() => {
            openNewCustomer("modern-trade", { lockKind: true, returnToBranch: true });
          }}
          onSuccess={() => setRefreshKey((k) => k + 1)}
        />
      ) : null}
    </PageShell>
  );
}

export function CustomersHub(props: CustomersHubProps) {
  return (
    <React.Suspense
      fallback={
        <PageShell className={LIST_PAGE_SHELL_CLASS}>
          <PageHeader
            title="Customers"
            description="Loading…"
            breadcrumbs={[{ label: "Sales", href: "/sales/overview" }, { label: "Customers" }]}
          />
          <div className="p-6 text-sm text-muted-foreground">Loading customers…</div>
        </PageShell>
      }
    >
      <CustomersHubContent {...props} />
    </React.Suspense>
  );
}
