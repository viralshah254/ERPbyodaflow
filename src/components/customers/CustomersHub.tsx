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
import { fetchPartyByIdApi } from "@/lib/api/parties";

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
  const [branchParentId, setBranchParentId] = React.useState<string | null>(null);
  const [branchParentName, setBranchParentName] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [directoryTab, setDirectoryTab] = React.useState<DirectoryTabId>("modern-trade");

  const clearQueryFlags = React.useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    params.delete("id");
    params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `/sales/customers?${qs}` : "/sales/customers", { scroll: false });
  }, [router, searchParams]);

  const openNewCustomer = React.useCallback(
    (kindId?: CustomerKindId, options?: { lockKind?: boolean }) => {
      setFormCustomerId(null);
      setFormKindId(kindId);
      setLockKind(Boolean(options?.lockKind));
      setBranchParentId(null);
      setBranchParentName(null);
      setFormOpen(true);
      clearQueryFlags();
    },
    [clearQueryFlags]
  );

  const openNewBranchCustomer = React.useCallback(
    async (supermarketId: string, supermarketName?: string) => {
      setFormCustomerId(null);
      setFormKindId("modern-trade-branch");
      setLockKind(true);
      setBranchParentId(supermarketId);
      if (supermarketName?.trim()) {
        setBranchParentName(supermarketName.trim());
      } else {
        setBranchParentName(null);
        try {
          const hq = await fetchPartyByIdApi(supermarketId);
          if (hq?.name) setBranchParentName(hq.name);
        } catch {
          /* optional */
        }
      }
      setFormOpen(true);
      clearQueryFlags();
    },
    [clearQueryFlags]
  );

  const openEditBranchCustomer = React.useCallback(
    (branchId: string, supermarket: { id: string; name: string }) => {
      setFormCustomerId(branchId);
      setFormKindId("modern-trade-branch");
      setLockKind(true);
      setBranchParentId(supermarket.id);
      setBranchParentName(supermarket.name);
      setFormOpen(true);
      clearQueryFlags();
    },
    [clearQueryFlags]
  );

  React.useEffect(() => {
    if (openCreate) openNewCustomer();
  }, [openCreate, openNewCustomer]);

  React.useEffect(() => {
    if (!editCustomerId || fromFinance) return;
    setFormCustomerId(editCustomerId);
    setFormKindId(undefined);
    setBranchParentId(null);
    setBranchParentName(null);
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
            ? "Add and manage who you sell to — including supermarket branches as full customers. Credit limits for existing customers are managed under Finance."
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
                  <Icons.Wallet className="mr-2 h-4 w-4" />
                  Credit (Finance)
                </Link>
              </Button>
              <Button onClick={() => openNewCustomer()}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                Add customer
              </Button>
            </div>
          ) : null
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
            setBranchParentId(null);
            setBranchParentName(null);
            setFormOpen(true);
          }}
          onAddBranch={
            fmcg
              ? (supermarketId, supermarketName) => {
                  if (supermarketId) void openNewBranchCustomer(supermarketId, supermarketName);
                }
              : undefined
          }
          onEditBranch={fmcg ? openEditBranchCustomer : undefined}
        />
      </div>

      <CustomerFormSheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setFormCustomerId(null);
            setLockKind(false);
            setBranchParentId(null);
            setBranchParentName(null);
            if (editCustomerId) clearQueryFlags();
          }
        }}
        fmcg={fmcg}
        initialKindId={formKindId}
        lockKind={lockKind}
        parentPartyId={branchParentId}
        parentPartyName={branchParentName}
        customerId={formCustomerId}
        onSuccess={(customer) => {
          setRefreshKey((k) => k + 1);
          if (customer?.kindId === "modern-trade-branch" || customer?.kindId === "modern-trade") {
            setDirectoryTab("modern-trade");
          } else if (customer?.kindId) {
            const tab = CUSTOMER_DIRECTORY_TABS.find((t) => t.id === customer.kindId);
            if (tab) setDirectoryTab(tab.id);
          }
          // After creating a supermarket, open the branch stepper immediately.
          if (customer?.created && customer.kindId === "modern-trade" && customer.id) {
            void openNewBranchCustomer(customer.id, customer.name);
          }
        }}
      />
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
