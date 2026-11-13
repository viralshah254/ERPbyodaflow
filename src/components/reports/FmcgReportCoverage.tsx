"use client";
import { Table as InteractiveTable } from "@/components/ui/table";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Search, LayoutGrid, List, Factory, Package, ShoppingCart, Truck, Wallet, FileBarChart2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgContextStore } from "@/stores/orgContextStore";
import { resolveIndustryCategoryFromTemplateId, isPlantCatalogueTemplate } from "@/config/industry";
import { type SageReportEntry } from "@/lib/reports/sage-report-map";

import { REPORT_SUITE_CATALOG, SUITE_DESCRIPTIONS } from "@/lib/reports/suite-catalog";

const descriptions: Record<string, string> = {
  ...SUITE_DESCRIPTIONS,
  "overdue-sales-orders": "See late orders, remaining quantities and the delivery evidence behind each line.",
  "overdue-purchase-orders": "Follow up overdue suppliers against actual goods received.",
  "outstanding-customer-documents": "Review approved demand and trace outstanding lines to their source orders.",
  "outstanding-grns": "Find received quantities awaiting bill allocation and evidence needing reconciliation.",
  "linked-purchase-orders": "Trace purchasing from the order through goods receipt and supplier billing.",
  "executable-orders": "Compare outstanding demand with available stock before releasing dispatch.",
  "lot-transactions": "Follow the movement of each lot across warehouses and source documents.",
  "inventory-management": "Review available, reserved and held stock alongside global reorder policies.",
  "slow-movers": "Review current stock against recorded sales issue activity in your chosen period.",
  "top-sales": "Rank customers by net posted sales, with credits deducted and currencies kept separate.",
  "sales-by-rep": "Compare posted sales by the representative recorded on each document.",
  "sales-vs-purchases": "Compare net sales and supplier bills by currency and reporting period.",
  "bom-explosion": "Expand a recipe into its raw materials, subassemblies and scaled requirements.",
  "bom-where-used": "Find the recipes that depend on a selected raw material or component.",
  "work-in-progress": "Review retained materials and WIP values, including reconciliation exceptions.",
  "manufacture-orders": "Review production orders, quantities and progress for a creation period.",
  "sales-register": "Posted invoices, credit notes and debit notes with direct document links.",
  "purchase-register": "Posted supplier bills and adjustments with direct document links.",
  "post-dated-cheques": "Review future-dated customer cheque receipts and their recorded status.",
  "customer-labels": "Print current customer addresses and identify missing address details.",
  "supplier-labels": "Print current supplier addresses and identify missing address details.",
};
const reportNames: Record<string, string> = { "customer-labels": "Customer address labels", "supplier-labels": "Supplier address labels", "sales-register": "Sales transaction register", "purchase-register": "Supplier bill register", "inventory-management": "Stock availability & reorder", "outstanding-grns": "Unbilled goods receipts", "outstanding-customer-documents": "Outstanding sales orders", "executable-orders": "Order fulfilment readiness", "linked-purchase-orders": "Purchase order receipt & bill trace", "bom-explosion": "BOM explosion", "bom-where-used": "BOM where-used" };
const displayName = (entry: SageReportEntry) => reportNames[entry.href?.split("/").pop() ?? ""] ?? entry.name;
const priority = ["inventory-management", "executable-orders", "overdue-sales-orders", "overdue-purchase-orders", "outstanding-grns", "linked-purchase-orders", "top-sales", "slow-movers", "bom-explosion", "work-in-progress"];
const rank = (entry: SageReportEntry) => { const index = priority.indexOf(entry.href?.split("/").pop() ?? ""); return index < 0 ? 100 : index; };
const category = (entry: SageReportEntry) => entry.href?.includes("/operations/outstanding-customer-documents") ? "Sales" : entry.href?.includes("/operations/outstanding-grns") ? "Purchasing" : ["Manufacturing", "Bill of Materials"].includes(entry.group) ? "Manufacturing" : entry.group === "Inventory" ? "Inventory" : entry.group.includes("Purchas") || entry.group === "Accounts Payable" ? "Purchasing" : entry.group.includes("Sales") || entry.group === "Accounts Receivable" ? "Sales" : entry.group === "Contact Management" ? "CRM" : "Finance & tax";
const icons = { Manufacturing: Factory, Inventory: Package, Purchasing: ShoppingCart, Sales: Truck, "Finance & tax": Wallet, CRM: FileBarChart2 };
export function FmcgReportCoverage({ search: pageSearch, onSearchChange }: {
  search?: string;
  onSearchChange?: (value: string) => void;
} = {}) {
  const permissions = useAuthStore((state) => state.permissions);
  const personalKey = useAuthStore((state) => `erp:report-favorites:${state.org?.orgId ?? "none"}:${state.user?.userId ?? "none"}`);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [onlyFavorites, setOnlyFavorites] = React.useState(false);
  React.useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(personalKey) ?? "[]"); setFavorites(Array.isArray(saved) ? saved.filter((id) => typeof id === "string") : []); } catch { setFavorites([]); } }, [personalKey]);
  const toggleFavorite = (id: string) => { const next = favorites.includes(id) ? favorites.filter((value) => value !== id) : [...favorites, id]; setFavorites(next); try { localStorage.setItem(personalKey, JSON.stringify(next)); } catch { /* Browsing with storage disabled still allows a session favorite. */ } };
  const template = useOrgContextStore((state) => state.templateId);
  const [localSearch, setLocalSearch] = React.useState("");
  const search = pageSearch ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;
  const [group, setGroup] = React.useState("All reports");
  const [view, setView] = React.useState<"library" | "sage">("library");
  const [status, setStatus] = React.useState("available");
  const allowed = (permission: string) => permissions.includes("*") || permissions.includes(permission);
  if (resolveIndustryCategoryFromTemplateId(template) !== "FMCG" || !allowed("reports.read")) return null;
  const entries = REPORT_SUITE_CATALOG.filter((entry) => allowed(entry.permission) && (entry.additionalPermissions ?? []).every(allowed) && (!["Bill of Materials", "Manufacturing"].includes(entry.group) || isPlantCatalogueTemplate(template)));
  const categories = ["All reports", ...Object.keys(icons).filter((name) => entries.some((entry) => category(entry) === name))];
  const unique = entries.filter((entry, index) => !entry.href || entries.findIndex((other) => other.href === entry.href) === index).sort((a, b) => Number(b.status === "new-report") - Number(a.status === "new-report") || rank(a) - rank(b));
  const filtered = (view === "sage" ? entries : unique).filter((entry) => (!onlyFavorites || favorites.includes(entry.href ?? entry.id)) && (group === "All reports" || category(entry) === group) && (status === "all" || (status === "available" ? !!entry.href : !entry.href)) && `${entry.name} ${displayName(entry)} ${entry.group} ${descriptions[entry.href?.split("/").pop() ?? ""] ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="overflow-hidden rounded-2xl border bg-card shadow-sm" aria-label="FMCG reporting workspace">
    <div className="flex flex-wrap items-center gap-2 border-b p-3">
      <div className="relative min-w-0 flex-1 basis-52">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input type="search" className="pl-9" aria-label="Search FMCG reports" placeholder="Search reports, stock, ageing, WIP…" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <select className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Report module" value={group} onChange={(event) => setGroup(event.target.value)}>
        {categories.map((name) => <option key={name}>{name}</option>)}
      </select>
      <select className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Report availability" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="available">Available destinations</option><option value="planned">Needs setup / to build</option><option value="all">All coverage</option>
      </select>
      <Button variant={onlyFavorites ? "secondary" : "outline"} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(!onlyFavorites)}><Star className="mr-2 h-4 w-4" />Favorites</Button>
    </div>
    <div className="p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "result" : "results"}</p>
        <div className="flex gap-1" role="group" aria-label="Report view">
          <Button size="sm" variant={view === "library" ? "secondary" : "ghost"} aria-pressed={view === "library"} onClick={() => setView("library")}><LayoutGrid className="mr-2 h-3.5 w-3.5" />Library</Button>
          <Button size="sm" variant={view === "sage" ? "secondary" : "ghost"} aria-pressed={view === "sage"} onClick={() => setView("sage")}><List className="mr-2 h-3.5 w-3.5" />Sage map</Button>
        </div>
      </div>
      {view === "library" ? (
        <ul className="divide-y rounded-lg border">
          {filtered.map((entry) => {
            const Icon = icons[category(entry) as keyof typeof icons];
            const title = displayName(entry);
            const description = descriptions[entry.href?.split("/").pop() ?? ""] ?? (entry.href ? category(entry) : "Pending build or setup");
            const pinned = Boolean(entry.href && favorites.includes(entry.href));
            return <li key={entry.id} className="flex items-center gap-3 px-3 py-2">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                {entry.href ? <Link href={entry.href} className="text-sm font-medium text-primary hover:underline">{title}</Link> : <p className="text-sm font-medium">{title}</p>}
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              {entry.href ? <Button size="icon" variant="ghost" aria-label={`${pinned ? "Unpin" : "Pin"} ${title}`} aria-pressed={pinned} onClick={() => toggleFavorite(entry.href!)}>
                <Star className={`h-4 w-4 ${pinned ? "fill-amber-400 text-amber-500" : ""}`} />
              </Button> : <Badge variant="outline">{/Commission|Discount/.test(entry.name) ? "Rules needed" : "Planned"}</Badge>}
            </li>;
          })}
        </ul>
      ) : <div className="max-h-[38rem] overflow-auto rounded-lg border"><InteractiveTable className="w-full text-sm"><thead className="sticky top-0 z-10 bg-muted"><tr className="text-left"><th className="p-3">Sage report</th><th className="p-3">Module</th><th className="p-3">ERP destination</th></tr></thead><tbody>{filtered.map((entry) => <tr className="border-t hover:bg-muted/30" key={entry.id}><td className="p-3 font-medium">{entry.name}</td><td className="p-3 text-muted-foreground">{entry.group}</td><td className="p-3">{entry.href ? <Link className="inline-flex items-center gap-2 text-primary hover:underline" href={entry.href}>{entry.status === "new-report" ? "Open report" : "Open workspace"}<ArrowUpRight className="h-3.5 w-3.5" /></Link> : <span className="text-muted-foreground">{entry.kind === "submenu" ? "Report list needed" : "Pending build / setup"}</span>}</td></tr>)}</tbody></InteractiveTable></div>}
    {!filtered.length && <div className="rounded-xl border border-dashed px-6 py-16 text-center"><Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground" /><p className="font-medium">No matching reports</p><p className="mt-2 text-sm text-muted-foreground">Try a different module, search term or availability filter.</p><Button variant="ghost" className="mt-4" onClick={() => { setSearch(""); setGroup("All reports"); setStatus("all"); setOnlyFavorites(false); }}>Clear filters</Button></div>}
    <p className="mt-6 text-xs leading-5 text-muted-foreground">Existing workspace links help locate familiar functions. Matching Sage layouts and financial completeness still require client acceptance.</p></div>
  </section>;
}
