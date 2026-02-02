import type { OrgType } from "@/types/erp";

export interface Module {
  id: string;
  name: string;
  label: string;
  icon: string;
  path: string;
  enabled: boolean;
  orgTypes: OrgType[];
  order: number;
  children?: Module[];
}

/**
 * Standard ERP modules configuration
 */
export const STANDARD_MODULES: Module[] = [
  {
    id: "dashboard",
    name: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard",
    enabled: true,
    orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
    order: 0,
  },
  {
    id: "inventory",
    name: "inventory",
    label: "Inventory",
    icon: "Package",
    path: "/inventory",
    enabled: true,
    orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
    order: 1,
    children: [
      {
        id: "inventory-products",
        name: "products",
        label: "Products",
        icon: "Box",
        path: "/inventory/products",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 0,
      },
      {
        id: "inventory-stock",
        name: "stock",
        label: "Stock Levels",
        icon: "Warehouse",
        path: "/inventory/stock",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 1,
      },
      {
        id: "inventory-transfers",
        name: "transfers",
        label: "Transfers",
        icon: "ArrowLeftRight",
        path: "/inventory/transfers",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 2,
      },
      {
        id: "inventory-stocktake",
        name: "stocktake",
        label: "Stocktake",
        icon: "ClipboardCheck",
        path: "/inventory/stocktake",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 3,
      },
    ],
  },
  {
    id: "sales",
    name: "sales",
    label: "Sales",
    icon: "ShoppingCart",
    path: "/sales",
    enabled: true,
    orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
    order: 2,
    children: [
      {
        id: "sales-orders",
        name: "orders",
        label: "Orders",
        icon: "FileText",
        path: "/sales/orders",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 0,
      },
      {
        id: "sales-customers",
        name: "customers",
        label: "Customers",
        icon: "Users",
        path: "/sales/customers",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 1,
      },
      {
        id: "sales-invoices",
        name: "invoices",
        label: "Invoices",
        icon: "Receipt",
        path: "/sales/invoices",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 2,
      },
      {
        id: "sales-deliveries",
        name: "deliveries",
        label: "Deliveries",
        icon: "Truck",
        path: "/sales/deliveries",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 3,
      },
    ],
  },
  {
    id: "purchasing",
    name: "purchasing",
    label: "Purchasing",
    icon: "ShoppingBag",
    path: "/purchasing",
    enabled: true,
    orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
    order: 3,
    children: [
      {
        id: "purchasing-orders",
        name: "orders",
        label: "Purchase Orders",
        icon: "FileText",
        path: "/purchasing/orders",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 0,
      },
      {
        id: "purchasing-suppliers",
        name: "suppliers",
        label: "Suppliers",
        icon: "Building2",
        path: "/purchasing/suppliers",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 1,
      },
      {
        id: "purchasing-grn",
        name: "grn",
        label: "Goods Receipt",
        icon: "PackageCheck",
        path: "/purchasing/grn",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 2,
      },
    ],
  },
  {
    id: "manufacturing",
    name: "manufacturing",
    label: "Manufacturing",
    icon: "Factory",
    path: "/manufacturing",
    enabled: true,
    orgTypes: ["MANUFACTURER"],
    order: 4,
    children: [
      {
        id: "manufacturing-bom",
        name: "bom",
        label: "Bills of Material",
        icon: "List",
        path: "/manufacturing/bom",
        enabled: true,
        orgTypes: ["MANUFACTURER"],
        order: 0,
      },
      {
        id: "manufacturing-work-orders",
        name: "work-orders",
        label: "Work Orders",
        icon: "ClipboardList",
        path: "/manufacturing/work-orders",
        enabled: true,
        orgTypes: ["MANUFACTURER"],
        order: 1,
      },
      {
        id: "manufacturing-production",
        name: "production",
        label: "Production Runs",
        icon: "Cog",
        path: "/manufacturing/production",
        enabled: true,
        orgTypes: ["MANUFACTURER"],
        order: 2,
      },
    ],
  },
  {
    id: "finance",
    name: "finance",
    label: "Finance",
    icon: "DollarSign",
    path: "/finance",
    enabled: true,
    orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
    order: 5,
    children: [
      {
        id: "finance-ledger",
        name: "ledger",
        label: "General Ledger",
        icon: "BookOpen",
        path: "/finance/ledger",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 0,
      },
      {
        id: "finance-payments",
        name: "payments",
        label: "Payments",
        icon: "CreditCard",
        path: "/finance/payments",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 1,
      },
      {
        id: "finance-reports",
        name: "reports",
        label: "Reports",
        icon: "BarChart3",
        path: "/finance/reports",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 2,
      },
    ],
  },
  {
    id: "settings",
    name: "settings",
    label: "Settings",
    icon: "Settings",
    path: "/settings",
    enabled: true,
    orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
    order: 99,
    children: [
      {
        id: "settings-org",
        name: "organization",
        label: "Organization",
        icon: "Building",
        path: "/settings/organization",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 0,
      },
      {
        id: "settings-users",
        name: "users",
        label: "Users & Roles",
        icon: "Users",
        path: "/settings/users",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 1,
      },
      {
        id: "settings-customization",
        name: "customization",
        label: "Customization",
        icon: "Sliders",
        path: "/settings/customization",
        enabled: true,
        orgTypes: ["MANUFACTURER", "DISTRIBUTOR", "SHOP"],
        order: 2,
      },
    ],
  },
];

export function getModulesForOrgType(orgType: OrgType): Module[] {
  return STANDARD_MODULES.filter(
    (module) => module.orgTypes.includes(orgType) && module.enabled
  ).map((module) => ({
    ...module,
    children: module.children?.filter(
      (child) => child.orgTypes.includes(orgType) && child.enabled
    ),
  }));
}

