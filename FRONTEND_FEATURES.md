# ERP OdaFlow — Frontend Features

A summary of all **built** frontend features in the ERP OdaFlow Next.js app. This document reflects the current UI, routes, components, and behavior (mock data / no real backend).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | TailwindCSS |
| Components | shadcn/ui (Radix UI) |
| State | Zustand (auth, UI, onboarding, template stores) |
| Forms | React Hook Form + Zod |
| Tables | Custom `DataTable` + TanStack Table patterns |
| Icons | Lucide React |

---

## 1. Public & Marketing

### Routes (under `(public)`)

| Route | Feature |
|-------|---------|
| `/` | **Landing page** — Hero, social proof, feature highlights, industry templates (Manufacturer / Distributor / Shop), pricing preview, security teaser, “Watch Demo” CTA |
| `/login` | **Login** — Email/password form (Zod validated), “Remember me”, “Forgot password” link, disabled Google/Microsoft placeholders, **demo accounts** (Manufacturer / Distributor / Shop / Platform) that set org type and redirect to dashboard |
| `/signup` | **Sign up** — Entry to registration flow |
| `/signup/onboarding` | **Onboarding wizard** — 7-step flow (see Onboarding section) |
| `/forgot-password` | **Forgot password** — Placeholder page |
| `/about` | **About** — Marketing page |
| `/contact` | **Contact** — Marketing page |
| `/features` | **Features** — List of product features (operational speed, visibility, AI, industry templates, customization, multi-branch) with icons and copy |
| `/pricing` | **Pricing** — Pricing page |
| `/security` | **Security** — Security/compliance narrative |
| `/industries` | **Industries hub** — Overview of industry focus |
| `/industries/manufacturing` | **Manufacturing** — Industry-specific page |
| `/industries/distribution` | **Distribution** — Industry-specific page |
| `/industries/retail` | **Retail** — Industry-specific page |

### Marketing Components

- **AppFrame** — Browser-style frame for in-page app previews  
- **GradientBlob** — Decorative gradient blob on hero  
- **MarketingHeader** / **MarketingFooter** — Shared public layout chrome  

### Industry Templates (config)

- **Industry selection on landing** — Cards for Manufacturer, Distributor, Shop linking to `/signup?orgType=…`
- **Industry config** (`industries.ts`, `industryTemplates.ts`) — FMCG Manufacturing, Pharma Distribution, Hardware & Building Materials, Agri Inputs, HoReCa, with `enabledModules`, `terminology`, `navOverrides`, `defaultKPIs`

---

## 2. Authentication & Onboarding

### Auth (mock)

- **Auth store** (`auth-store.ts`) — `user`, `org`, `tenant`, `currentBranch`, `branches`, `isAuthenticated`, `logout`, setters
- **Dashboard layout** — Redirects unauthenticated users; in dev, initializes mock user/org/tenant/branch if not logged in
- **Login** — Sets mock user/org/tenant/branch and optional `?redirect=` to dashboard

### Onboarding Wizard (7 steps)

- **Step 1 — Account** — Email, password, plan (e.g. Starter / Professional / Enterprise)
- **Step 2 — Industry** — Org type (Manufacturer / Distributor / Shop) and industry template
- **Step 3 — Org details** — Org name, country, currency, timezone
- **Step 4 — Modules** — Enable/disable modules (dashboard, inventory, sales, purchasing, manufacturing, finance, CRM, reports, etc.)
- **Step 5 — Branches** — Add branches (name, head office flag)
- **Step 6 — Invite team** — Placeholder for inviting users
- **Step 7 — Finish** — Summary and “Go to dashboard”

- **Onboarding store** — Persists wizard data; **template store** holds selected industry template and enabled modules
- **Completion** — Creates mock org/tenant/user/branches and navigates to `/dashboard`

---

## 3. App Shell (Dashboard Layout)

### Layout

- **MainLayout** — Sidebar + header + main content area; sidebar visibility from UI store
- **PageLayout** — Reusable page chrome: `title`, `description`, `actions` (e.g. primary button)

### Sidebar (`AppSidebar`)

- **Nav config** (`nav.ts`) — Sections and items with `id`, `label`, `href`, `icon`, `moduleId`, `orgTypes`, `permission`, `children`, `badge`
- **Filtering** — By org type, enabled modules (from template store), and permission (via `can()`); Manufacturing section only for `MANUFACTURER`
- **Collapsible** — Toggle from UI store
- **Hierarchy** — Sections (Core, Inventory, Sales, Purchasing, Finance, Manufacturing, CRM, Reports, Automation, Settings) and nested items (e.g. Financial Statements → P&amp;L, Balance Sheet, Cash Flow; Customizer → Modules, Custom Fields, Workflows, Dashboards)

### Header

- **Global search** — Search input (UI only)
- **Branch** — Displays `currentBranch.name`
- **Theme toggle** — Light/dark (ThemeToggle)
- **Notifications** — Bell icon (UI only)
- **User menu** — Avatar, name, email, Profile, Settings, Log out

---

## 4. Core & Dashboard

### Routes

| Route | Feature |
|-------|---------|
| `/dashboard` | **Main dashboard** — KPI cards (Total Sales, Orders, Products, Customers, AR/AP, Low Stock, Pending Approvals), Sales chart placeholder, Recent Orders list with status badges and “View all”, Quick actions (Create SO/PO, Journal, Add Product), **AI Suggestions** and **Anomaly Detection** blocks |
| `/approvals` | **Approvals Inbox** — Empty state “No pending approvals” |
| `/tasks` | **Tasks / Work Queue** — Tasks list UI |

---

## 5. Inventory

| Route | Feature |
|-------|---------|
| `/inventory/products` | **Products** — DataTable with FiltersBar (search, status, category), Export/Import actions, StatusBadge, RowActions (View/Edit/Duplicate/Delete); mock product rows |
| `/inventory/stock-levels` | **Stock levels** — Page with stock-level UI |
| `/inventory/stock` | **Stock** — Stock view |
| `/inventory/movements` | **Stock movements** — Movements list/table |
| `/inventory/warehouses` | **Warehouses & locations** — Warehouses list |

*Nav also references Transfers and Stocktake routes; those may be defined elsewhere or as placeholders.*

---

## 6. Sales

| Route | Feature |
|-------|---------|
| `/sales/orders` | **Sales orders** — DataTable, FiltersBar (search, status), Export / More Filters, RowActions (View/Edit/Print/Duplicate/Cancel), date formatting, KES totals |
| `/sales/customers` | **Customers** — Customers list/page |
| `/sales/invoices` | **Invoices** — Invoices list/page |
| `/sales/returns` | **Returns / Credit notes** — Returns page |

---

## 7. Purchasing

| Route | Feature |
|-------|---------|
| `/purchasing/purchase-orders` | **Purchase orders** — PO list/page |
| `/purchasing/orders` | **Orders** (alternate) — Orders list |
| `/purchasing/goods-receipt` | **Goods receipt (GRN)** — GRN page |
| `/purchasing/supplier-invoices` | **Supplier invoices (AP bills)** — Supplier invoices page |
| `/purchasing/purchase-returns` | **Purchase returns** — Returns page |

*Nav includes “Suppliers” `/purchasing/suppliers`; page may exist under a different path.*

---

## 8. Finance & Accounting

| Route | Feature |
|-------|---------|
| `/finance` | **Finance dashboard** — Cash, AR, AP, Net Revenue MTD cards; Overdue receivables / payables tables (or placeholders) |
| `/finance/gl` | **General ledger** — GL view |
| `/finance/ledger` | **Ledger** — Ledger view |
| `/finance/chart-of-accounts` | **Chart of accounts** — CoA page |
| `/finance/journals` | **Journal entries** — Journals page |
| `/finance/ar` | **Accounts receivable** — AR page |
| `/finance/ap` | **Accounts payable** — AP page |
| `/finance/payments` | **Payments & receipts** — Payments page |
| `/finance/bank-recon` | **Bank reconciliation** — Bank recon page |
| `/finance/tax` | **Tax / VAT** — Tax page |
| `/finance/fixed-assets` | **Fixed assets** — Fixed assets page |
| `/finance/budgets` | **Budgets** — Budgets page |
| `/finance/statements` | **Financial statements** — Statements hub |
| `/finance/statements/pnl` | **P&amp;L** — P&amp;L statement |
| `/finance/statements/balance-sheet` | **Balance sheet** — Balance sheet |
| `/finance/statements/cash-flow` | **Cash flow** — Cash flow statement |
| `/finance/period-close` | **Period close** — Period close UI |
| `/finance/audit` | **Audit log (finance)** — Audit log page |

---

## 9. CRM

| Route | Feature |
|-------|---------|
| `/crm/accounts` | **Accounts / parties** — Accounts list |
| `/crm/activities` | **Activities / notes** — Activities list |
| `/crm/deals` | **Deals / opportunities** — Deals list |
| `/crm/tickets` | **Support / tickets** — Tickets list |

---

## 10. Reports

| Route | Feature |
|-------|---------|
| `/reports` | **Report library** — Reports hub |
| `/reports/saved` | **Saved views** — Saved report views |
| `/reports/scheduled` | **Scheduled reports** — Scheduled runs |
| `/reports/exports` | **Exports** — Export history / manager |

---

## 11. Automation Center

| Route | Feature |
|-------|---------|
| `/automation` | **Automation dashboard** — Cards: Active Rules, Active Alerts, Scheduled Jobs, AI Insights (counts) |
| `/automation/rules` | **Rules engine** — Rules list/configuration |
| `/automation/alerts` | **Alerts & notifications** — Alerts list (nav badge “3”) |
| `/automation/schedules` | **Scheduled jobs** — Schedules list |
| `/automation/workflows` | **Approval workflows** — Workflows list |
| `/automation/integrations` | **Integrations** — Integrations list |
| `/automation/ai-insights` | **AI insights** — AI insights view (nav badge “NEW”) |

---

## 12. Settings

| Route | Feature |
|-------|---------|
| `/settings/org` | **Organization profile** — Org settings |
| `/settings/branches` | **Branches** — Branch list/settings |
| `/settings/users-roles` | **Users & roles** — User and role management |
| `/settings/preferences` | **Preferences** — App preferences |
| `/settings/sequences` | **Numbering sequences** — Document number sequences |
| `/settings/customization` | **Customization** — Customization hub |
| `/settings/customizer` | **Customizer (Enterprise)** — Parent for below |
| `/settings/customizer/modules` | **Modules** — Enable/disable modules |
| `/settings/customizer/fields` | **Custom fields** — Custom field definitions |
| `/settings/customizer/workflows` | **Workflows** — Custom workflows |
| `/settings/customizer/dashboards` | **Dashboards** — Dashboard customizer |

---

## 13. Shared UI Components

| Component | Purpose |
|-----------|---------|
| **DataTable** | Table with sortable columns, row click, empty state |
| **FiltersBar** | Search + filter dropdowns, “Clear filters”, active count |
| **StatusBadge** | Status pills (e.g. APPROVED, PENDING_APPROVAL, FULFILLED) |
| **RowActions** | Per-row dropdown (View/Edit/Print/Duplicate/Delete/Cancel etc.) with icons and destructive variant |
| **KPICard** | Metric card with title, value, optional change (increase/decrease), icon, description |
| **EmptyState** | Icon + title + description for empty lists |
| **Card** / **CardHeader** / **CardTitle** / **CardDescription** / **CardContent** | Layout and structure |
| **Button**, **Input**, **Label**, **Checkbox**, **Select** | Forms and actions |
| **Badge**, **Avatar**, **DropdownMenu**, **Tooltip**, **Tabs**, **Sheet**, **ScrollArea**, **Separator**, **Progress**, **Skeleton** | General UI |
| **ThemeToggle** | Light/dark theme switch |

---

## 14. Customization & Terminology

- **Custom fields** (`custom-fields.tsx`) — Add/remove/edit custom field definitions per entity (TEXT, NUMBER, DATE, BOOLEAN, SELECT, MULTI_SELECT); uses `CustomFieldDefinition` from `@/types/erp`.
- **Terminology** (`lib/terminology/getLabel.ts`) — Resolves labels from industry template `navOverrides` and `terminology` so the same module can show different labels (e.g. “Retailers & Visits” for CRM in Agri).
- **Module config** (`lib/modules.ts`) — `STANDARD_MODULES` with `orgTypes`, `children`; `getModulesForOrgType()` for filtering by org type.
- **Template store** — Selected industry template and enabled modules used by sidebar and onboarding.

---

## 15. RBAC & Permissions

- **Permission helpers** (`lib/permissions.ts`) — `can(user, permission, context?)`, `hasAnyPermission`, `hasAllPermissions`; `Permissions` constants (e.g. `inventory.read`, `sales.approve`, `finance.post_journal`).
- **RBAC `can()`** (`lib/rbac/can.ts`) — Used by sidebar to show/hide items by `permission` on nav items.
- **Nav permissions** — Each nav item can have `permission` (e.g. `approvals.read`, `inventory.read`, `finance.gl.read`). Sidebar hides items when `can(user, item.permission)` is false.
- **Types** — `User`, `Role`, `Permission`, `PermissionContext` in `types/erp.ts`. Current implementation is mock (e.g. all permissions granted for development).

---

## 16. AI Surfaces

- **Suggestions** (`components/ai/suggestions.tsx`) — Cards for AI suggestions (Reorder Point, Sales Trend, Approve Pending Orders) with type (OPTIMIZATION, INSIGHT, ACTION, ALERT), priority (HIGH/MEDIUM/LOW), optional `actionUrl`.
- **AnomalyDetection** (`components/ai/anomaly-detection.tsx`) — Block for anomaly alerts on the dashboard.
- **Assistant** (`components/ai/assistant.tsx`) — AI assistant/chat component (included in codebase for future use).

Types: `AISuggestion` in `types/erp.ts` with `suggestionId`, `type`, `title`, `description`, `priority`, `actionUrl`, `createdAt`.

---

## 17. Data & State

### Zustand stores

- **auth-store** — User, org, tenant, current branch, branches, `isAuthenticated`, `logout`, setters.
- **ui-store** — Sidebar open/collapsed.
- **onboarding-store** — Wizard data (orgType, orgName, plan, country, currency, timezone, branches, etc.).
- **template-store** — Selected industry template and enabled modules.

### Types (`types/erp.ts`)

- Tenancy: `Tenant`, `Org`, `Branch`, `Address`, `OrgType`.
- Users: `User`, `Role`, `Permission`, `PermissionContext`.
- Master: `Product`, `SKU`, and related entities.
- Documents and domain types for sales, purchasing, finance, manufacturing, etc.
- AI: `AISuggestion`; customization: `CustomFieldDefinition`.

### Modules & nav

- **nav.ts** — Single source of nav structure and permissions.
- **modules.ts** — Standard module tree and `getModulesForOrgType()`.
- **industries.ts** / **industryTemplates.ts** — Industry-specific modules, terminology, and labels.

---

## 18. Page Patterns

- **List pages** — `PageLayout` + `Card` + `FiltersBar` + `DataTable` + `RowActions` + optional Export/Import/More filters (e.g. Products, Sales Orders).
- **Dashboard-style pages** — `PageLayout` + grid of `Card`/`KPICard` (e.g. main Dashboard, Finance dashboard, Automation dashboard).
- **Empty states** — `EmptyState` with icon, title, description (e.g. Approvals).
- **Public pages** — Marketing layout with `AppFrame`, `GradientBlob`, and shared header/footer.

---

## Summary Counts

- **Public routes:** ~14 (landing, login, signup, onboarding, forgot-password, about, contact, features, pricing, security, industries × 4).
- **Dashboard routes:** ~55+ (dashboard, approvals, tasks; inventory × 5; sales × 4; purchasing × 5; finance × 18; CRM × 4; reports × 4; automation × 7; settings × 10).
- **Reusable UI components:** 25+ (DataTable, FiltersBar, StatusBadge, RowActions, KPICard, EmptyState, theme toggle, etc.).
- **AI components:** Suggestions, Anomaly Detection, Assistant.
- **Stores:** Auth, UI, Onboarding, Template.
- **Config:** Nav, modules, industries, industry templates, permissions.

---

*This document reflects the frontend as implemented. Backend calls are not wired; data is in-memory or mock. Auth is simulated for development.*
