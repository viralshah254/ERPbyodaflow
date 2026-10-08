import type { GoLiveKeepGroup, GoLiveKeepOption } from "@/lib/api/environment";
import { canonicalIndustryTemplateId, resolveIndustryCategoryFromTemplateId } from "@/config/industry";
import { isFmcgOrg } from "@/lib/fmcg/sfa-customer";

export type GoLiveVertical = "fmcg" | "seafood" | "coolcatch" | "franchise" | "chillzone";

type CatalogRow = Omit<GoLiveKeepOption, "count"> & {
  verticals?: GoLiveVertical[];
};

/**
 * Client catalog — mirrors backend go-live-keep-categories.
 * Philosophy: everything checked by default; uncheck what you do not want to keep.
 */
const CATALOG: CatalogRow[] = [
  {
    id: "users_roles",
    label: "Users & roles",
    description: "People who sign in and their permissions.",
    group: "protected",
    locked: true,
    defaultKeep: true,
    includes: ["Users", "Roles"],
  },
  {
    id: "org_structure",
    label: "Branches, warehouses & locations",
    description: "Org structure and warehouses — always kept (slow to rebuild).",
    group: "protected",
    locked: true,
    defaultKeep: true,
    includes: ["Branches", "Warehouses", "Locations"],
  },
  {
    id: "accounting_setup",
    label: "Chart of accounts, taxes & currencies",
    description: "Financial setup that live books still need.",
    group: "protected",
    locked: true,
    defaultKeep: true,
    includes: ["Ledger accounts", "Taxes", "Currencies", "Payment methods", "Payment terms", "Fiscal periods"],
  },
  {
    id: "bank_accounts",
    label: "Bank accounts",
    description: "Company bank accounts used for payments and reconciliation — always kept.",
    group: "protected",
    locked: true,
    defaultKeep: true,
    includes: ["Bank accounts"],
  },
  {
    id: "sfa_integrations",
    label: "SFA / Odaflow integrations & mappings",
    description: "Connector settings and product/customer match links to SFA.",
    group: "protected",
    locked: true,
    defaultKeep: true,
    disclaimer: "Always kept. These are the ERP↔SFA match records built in Integrations.",
    includes: ["Odaflow integration", "Mapping profiles", "External record mappings", "SFA sync queue"],
  },
  {
    id: "products",
    label: "Products, UOM, packing & categories",
    description: "SKUs, packing on products, variants, categories, UOMs, and brands.",
    group: "master",
    locked: false,
    defaultKeep: true,
    disclaimer:
      "Linked to SFA product mappings. Unchecking deletes ERP products (and packing/UOM/categories with them) and can break matches you already made in SFA.",
    includes: [
      "Products (incl. packing)",
      "Product variants",
      "Item categories",
      "Product departments",
      "Brands",
      "UOMs",
      "UOM conversions",
    ],
  },
  {
    id: "customers_suppliers",
    label: "Customers & suppliers",
    description: "Parties, sites, contacts, addresses, and categories.",
    group: "master",
    locked: false,
    defaultKeep: true,
    disclaimer:
      "Linked to SFA customer mappings. Unchecking deletes ERP customers/suppliers and can break matches you already made in SFA.",
    includes: [
      "Parties (customers/suppliers)",
      "Party sites",
      "Contacts",
      "Addresses",
      "Customer categories",
      "Supplier categories",
    ],
  },
  {
    id: "price_lists",
    label: "Price lists & pricing rules",
    description: "List prices, zones, markups, promotions, and daily prices.",
    group: "master",
    locked: false,
    defaultKeep: true,
    disclaimer:
      "Often used with SFA selling. Unchecking removes price data tied to your catalog — keep this if products stay.",
    includes: [
      "Price lists",
      "Price list engine items",
      "Pricing rules",
      "Markup rules",
      "Promotions",
      "Daily prices",
      "Pricing zones",
      "Pricing approval queue",
    ],
  },
  {
    id: "franchise_pricing",
    label: "Franchise pricing",
    description: "Outlet/franchise price profiles, proposals, and batch franchise pricing.",
    group: "master",
    locked: false,
    defaultKeep: true,
    verticals: ["franchise", "seafood", "coolcatch"],
    disclaimer: "Franchise / seafood outlet pricing only. Not shown for FMCG manufacturer templates.",
    includes: ["Franchise pricing profiles", "Outlet price proposals", "Batch franchise pricing"],
  },
  {
    id: "production_setup",
    label: "Production setup (BOM & routing)",
    description: "Blend/recipe structure and routings — kept by default (slow to rebuild).",
    group: "master",
    locked: false,
    defaultKeep: true,
    includes: ["BOMs / recipes", "Routings"],
  },
  {
    id: "crm_deals",
    label: "CRM deals & activities",
    description: "Pipeline deals and activity history.",
    group: "master",
    locked: false,
    defaultKeep: true,
    includes: ["Deals", "Activities"],
  },
  {
    id: "commissions",
    label: "Commissions",
    description: "Commission rules and calculated runs.",
    group: "master",
    locked: false,
    defaultKeep: true,
    includes: ["Commission rules", "Commission runs"],
  },
  {
    id: "assets",
    label: "Fixed assets",
    description: "Asset register, categories, assignments, depreciation, and disposals.",
    group: "master",
    locked: false,
    defaultKeep: true,
    includes: ["Assets", "Asset categories", "Assignments", "Depreciation runs", "Disposals"],
  },
  {
    id: "documents_orders",
    label: "Orders, invoices & documents",
    description: "Sales/purchase orders, deliveries, invoices, drafts, comments, and attachments.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Documents", "Document drafts", "Comments", "Attachments", "Purchase receipt allocations"],
  },
  {
    id: "stock_on_hand",
    label: "Stock on hand",
    description: "Current quantities by warehouse and batch/lot balances.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Stock levels", "Batch / lot stock"],
  },
  {
    id: "stock_movements",
    label: "Stock movements & warehouse ops",
    description: "Movements, adjustments, transfers, cycle counts, putaway, and pick/pack.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Movements", "Stock adjustments", "Transfers", "Cycle counts", "Putaway", "Pick & pack"],
  },
  {
    id: "payments",
    label: "Payments & cash",
    description: "Customer/supplier payments, payment runs, and cash disbursements.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Payments", "Payment runs", "Cash disbursements", "Top-up journals"],
  },
  {
    id: "accounting_postings",
    label: "Accounting postings & open items",
    description: "GL postings and AR/AP open items / applications.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Posting batches", "Posting lines", "Subledger open items", "Subledger applications"],
  },
  {
    id: "bank_reconciliation",
    label: "Bank statements & reconciliation",
    description: "Imported bank lines and match/reconcile work (bank accounts stay).",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Bank statement lines", "Reconciliation sessions", "Allocation proposals", "Payment match claims"],
  },
  {
    id: "production_runs",
    label: "Production runs & WIP",
    description: "Open/closed work orders, yields, genealogy, and WIP balances from practice.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Work orders", "Work order yields", "Genealogy", "WIP balances"],
  },
  {
    id: "vehicles_dispatch",
    label: "Vehicles & dispatch setup",
    description: "Fleet vehicles, carriers, and distribution routes used for dispatch — kept by default.",
    group: "master",
    locked: false,
    defaultKeep: true,
    includes: ["Vehicles", "Carriers", "Distribution routes", "Vehicle cost periods"],
  },
  {
    id: "logistics_trips",
    label: "Trips, fuel & logistics runs",
    description: "Delivery trips and fuel events from practice dispatch.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Trips", "Fuel events"],
  },
  {
    id: "approvals",
    label: "Approvals",
    description: "Pending and completed approval requests.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Approvals"],
  },
  {
    id: "imports",
    label: "Import history",
    description: "CSV/import batches, runs, staged rows, and errors.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Import batches", "Import runs", "Stage records", "Row errors"],
  },
  {
    id: "franchise_ops",
    label: "Franchise operations",
    description: "Outlet ops transactional data.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    verticals: ["franchise", "seafood", "coolcatch"],
    includes: [
      "Weekly stock takes",
      "Stock snapshots",
      "Obligations",
      "Intake sessions",
      "SKU economics",
      "Outlet profiles",
    ],
  },
  {
    id: "coolcatch",
    label: "CoolCatch ops data",
    description: "CoolCatch movements, variances, sourcing, and bot ingress (connector settings stay).",
    group: "operational",
    locked: false,
    defaultKeep: true,
    verticals: ["coolcatch", "seafood"],
    includes: [
      "BS movements",
      "Stock variances",
      "Sourcing batches",
      "Month-end reconciliations",
      "EMP snapshots",
      "Bot order ingress",
    ],
  },
  {
    id: "document_numbers",
    label: "Document number sequences",
    description: "Next SO/PO/invoice numbers. Uncheck this to restart numbering at 1 for live books.",
    group: "operational",
    locked: false,
    defaultKeep: true,
    includes: ["Number sequences"],
  },
];

export function resolveGoLiveVerticals(input: {
  templateId?: string | null;
  industryCategory?: "FMCG" | "SEAFOOD" | "OTHER" | null;
}): Set<GoLiveVertical> {
  const verticals = new Set<GoLiveVertical>();
  const key = canonicalIndustryTemplateId(input.templateId).toLowerCase().replace(/_/g, "-").trim();
  const category = input.industryCategory ?? resolveIndustryCategoryFromTemplateId(input.templateId);

  if (isFmcgOrg(input.templateId) || category === "FMCG") {
    verticals.add("fmcg");
  }

  const coolcatchKeys = new Set([
    "cool-catch",
    "coolcatch",
    "seafood-cloud",
    "seafood",
    "seafood-distributor",
  ]);
  if (coolcatchKeys.has(key) || category === "SEAFOOD") {
    verticals.add("coolcatch");
    verticals.add("seafood");
    verticals.add("franchise");
  }

  if (key === "chill-zone" || key === "chillzone") {
    verticals.add("chillzone");
  }

  if (key === "franchise" || key === "franchisor" || key === "retail-multi-store") {
    verticals.add("franchise");
  }

  if (verticals.size === 0) {
    verticals.add("fmcg");
  }
  return verticals;
}

function filterCatalog(
  rows: CatalogRow[],
  templateId?: string | null,
  industryCategory?: "FMCG" | "SEAFOOD" | "OTHER" | null
): CatalogRow[] {
  const verticals = resolveGoLiveVerticals({ templateId, industryCategory });
  return rows.filter((row) => {
    if (!row.verticals || row.verticals.length === 0) return true;
    return row.verticals.some((v) => verticals.has(v));
  });
}

export function getFallbackKeepOptions(input?: {
  templateId?: string | null;
  industryCategory?: "FMCG" | "SEAFOOD" | "OTHER" | null;
}): GoLiveKeepOption[] {
  return filterCatalog(CATALOG, input?.templateId, input?.industryCategory).map((row) => {
    const { verticals: _v, ...rest } = row;
    return { ...rest, count: 0 };
  });
}

export function getFallbackDefaultKeepIds(input?: {
  templateId?: string | null;
  industryCategory?: "FMCG" | "SEAFOOD" | "OTHER" | null;
}): string[] {
  return filterCatalog(CATALOG, input?.templateId, input?.industryCategory)
    .filter((row) => row.defaultKeep || row.locked)
    .map((row) => row.id);
}

export function resolveKeepOptions(
  status: { keepOptions?: GoLiveKeepOption[]; defaultKeepCategoryIds?: string[] } | null,
  org?: {
    templateId?: string | null;
    industryCategory?: "FMCG" | "SEAFOOD" | "OTHER" | null;
  }
): {
  keepOptions: GoLiveKeepOption[];
  defaultKeepCategoryIds: string[];
  apiSupportsKeepSelection: boolean;
} {
  const fromApi = status?.keepOptions;
  if (Array.isArray(fromApi) && fromApi.length > 0) {
    const verticals = resolveGoLiveVerticals(org ?? {});
    const filtered = fromApi.filter((o) => {
      const catalog = CATALOG.find((c) => c.id === o.id);
      if (!catalog?.verticals?.length) return true;
      return catalog.verticals.some((v) => verticals.has(v));
    });
    return {
      keepOptions: filtered,
      defaultKeepCategoryIds: status?.defaultKeepCategoryIds?.length
        ? status.defaultKeepCategoryIds.filter((id) => filtered.some((o) => o.id === id))
        : filtered.filter((o) => o.defaultKeep || o.locked).map((o) => o.id),
      apiSupportsKeepSelection: true,
    };
  }
  return {
    keepOptions: getFallbackKeepOptions(org),
    defaultKeepCategoryIds: getFallbackDefaultKeepIds(org),
    apiSupportsKeepSelection: false,
  };
}

export type { GoLiveKeepGroup };
