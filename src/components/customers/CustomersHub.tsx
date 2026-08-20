"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LIST_PAGE_BODY_CLASS,
  LIST_PAGE_BODY_PAGINATED_CLASS,
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
import { PartyImportSheet } from "@/components/masters/PartyImportSheet";
import { fetchPartyByIdApi } from "@/lib/api/parties";
import { pullSharedCatalogFromSfaApi } from "@/lib/api/odaflow-integration";
import { useErpSfaEnrollment } from "@/lib/integrations/use-erp-sfa-enrollment";
import { toast } from "sonner";

export type CustomersHubProps = {
  fromFinance?: boolean;
};

function CustomersHubContent({ fromFinance = false }: CustomersHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canWrite = useCanWriteSales();
  const { templateId } = useOrgContext();
  const fmcg = isFmcgOrg(templateId);
  const { enrolled: sfaEnrolled } = useErpSfaEnrollment();
  const [pullingCatalog, setPullingCatalog] = React.useState(false);

  const editCustomerId = searchParams.get("id");
  const openCreate = searchParams.get("new") === "1";
  const returnTo = searchParams.get("returnTo");
  const odaflowQueue = searchParams.get("odaflowQueue");
  const prefillName = searchParams.get("name");
  const [importOpen, setImportOpen] = React.useState(false);
  const [importTab, setImportTab] = React.useState<"create" | "sheet">("create");
  const openImport = (tab: "create" | "sheet" = "create") => {
    setImportTab(tab);
    setImportOpen(true);
  };

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
  const [formInitialName, setFormInitialName] = React.useState<string | null>(null);
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
    params.delete("returnTo");
    params.delete("odaflowQueue");
    params.delete("name");
    const qs = params.toString();
    router.replace(qs ? `/sales/customers?${qs}` : "/sales/customers", { scroll: false });
  }, [router, searchParams]);

  const openNewCustomer = React.useCallback(
    (kindId?: CustomerKindId, options?: { lockKind?: boolean; initialName?: string | null }) => {
      setFormCustomerId(null);
      setFormKindId(kindId);
      setLockKind(Boolean(options?.lockKind));
      setFormInitialName(options?.initialName ?? null);
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
    if (openCreate) openNewCustomer(undefined, { initialName: prefillName });
  }, [openCreate, openNewCustomer, prefillName]);

  React.useEffect(() => {
    if (!editCustomerId || fromFinance) return;
    setFormCustomerId(editCustomerId);
    setFormKindId(undefined);
    setBranchParentId(null);
    setBranchParentName(null);
    setFormOpen(true);
  }, [editCustomerId, fromFinance]);

  const pullSharedCatalog = React.useCallback(async () => {
    if (pullingCatalog) return;
    setPullingCatalog(true);
    try {
      const result = await pullSharedCatalogFromSfaApi();
      setRefreshKey((k) => k + 1);
      const hqLabel = result.hqs === 1 ? "1 supermarket HQ" : `${result.hqs} supermarket HQs`;
      const branchLabel = result.branches === 1 ? "1 branch" : `${result.branches} branches`;
      if (result.failed > 0) {
        toast.warning(`Updated ${hqLabel} and ${branchLabel}. ${result.failed} could not sync.`);
      } else {
        toast.success(`Updated ${hqLabel} and ${branchLabel} from SFA.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not refresh from SFA");
    } finally {
      setPullingCatalog(false);
    }
  }, [pullingCatalog]);

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
            ? "SFA holds field outlets (including shared modern trade). Sync from SFA, then use Credit & tax sheet for taxId and credit limits — single edit or bulk download/upload."
            : "Add and manage who you sell to. After SFA sync, update tax ID and credit with Credit & tax sheet or Finance."
        }
        breadcrumbs={breadcrumbs}
        sticky
        showCommandHint
        actions={
          canWrite ? (
            <div className="flex flex-wrap gap-2">
              {fmcg && sfaEnrolled ? (
                <Button
                  variant="outline"
                  onClick={() => void pullSharedCatalog()}
                  disabled={pullingCatalog}
                  title="Pull shared supermarket HQs and branches from SFA. Works even if automatic customer sync is off."
                >
                  {pullingCatalog ? (
                    <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {pullingCatalog ? "Refreshing…" : "Refresh from SFA"}
                </Button>
              ) : null}
              <Button variant="outline" asChild>
                <Link href="/ar/customers">
                  <Icons.Wallet className="mr-2 h-4 w-4" />
                  Credit (Finance)
                </Link>
              </Button>
              <Button variant="outline" onClick={() => openImport("sheet")}>
                <Icons.Sheet className="mr-2 h-4 w-4" />
                Credit & tax sheet
              </Button>
              <Button variant="outline" onClick={() => openImport("create")}>
                <Icons.Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button onClick={() => openNewCustomer()}>
                <Icons.Plus className="mr-2 h-4 w-4" />
                Add customer
              </Button>
            </div>
          ) : null
        }
      />

      <div className={LIST_PAGE_BODY_PAGINATED_CLASS}>
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
        initialName={formInitialName}
        onSuccess={(customer) => {
          setRefreshKey((k) => k + 1);
          if (returnTo && odaflowQueue && customer?.created && customer.id) {
            const params = new URLSearchParams({
              open: odaflowQueue,
              newCustomer: customer.id,
              newCustomerName: customer.name,
              setupPricing: "1",
            });
            router.push(`${returnTo}?${params.toString()}`);
            return;
          }
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

      {canWrite ? (
        <PartyImportSheet
          open={importOpen}
          onOpenChange={setImportOpen}
          type="customer"
          entityLabel="Customer"
          initialTab={importTab}
          onImported={() => setRefreshKey((k) => k + 1)}
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
