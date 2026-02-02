# ERP by OdaFlow — Frontend

A world-class, multi-tenant ERP frontend built with Next.js, designed for Manufacturers, Distributors, and Shops.

## Features

- **Multi-Tenant Architecture**: Support for multiple organizations, branches, and users
- **Standard ERP Modules**: Inventory, Sales, Purchasing, Manufacturing, Finance
- **Customization Framework**: Custom fields, workflows, and module configuration
- **AI-Ready**: Assistant, suggestions, and anomaly detection surfaces
- **Role-Based Access Control**: Comprehensive permissions system
- **Modern UI**: Built with shadcn/ui and TailwindCSS

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Components**: shadcn/ui (Radix UI)
- **State Management**: Zustand (local), React Query (server)
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Dashboard routes
│   │   ├── dashboard/      # Dashboard page
│   │   ├── inventory/       # Inventory module
│   │   ├── sales/          # Sales module
│   │   ├── purchasing/     # Purchasing module
│   │   ├── manufacturing/  # Manufacturing module
│   │   ├── finance/        # Finance module
│   │   └── settings/       # Settings
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   ├── layout/             # Layout components
│   ├── ai/                 # AI-related components
│   └── customization/      # Customization components
├── lib/                    # Utilities and helpers
│   ├── permissions.ts      # Permission system
│   ├── modules.ts          # Module configuration
│   └── utils.ts            # General utilities
├── stores/                 # Zustand stores
│   ├── auth-store.ts       # Authentication state
│   └── ui-store.ts         # UI state
└── types/                  # TypeScript types
    └── erp.ts              # ERP type definitions
```

## Key Features

### Multi-Tenancy

The system supports:
- **Tenants**: Top-level organization
- **Orgs**: Business units (Manufacturer, Distributor, Shop)
- **Branches**: Physical locations
- **Users**: With role-based access

### Modules

Standard modules include:
- **Dashboard**: Overview and KPIs
- **Inventory**: Products, Stock, Transfers, Stocktake
- **Sales**: Orders, Customers, Invoices, Deliveries
- **Purchasing**: Purchase Orders, Suppliers, GRN
- **Manufacturing**: BOM, Work Orders, Production Runs
- **Finance**: Ledger, Payments, Reports

### Customization

- **Custom Fields**: Add fields to any entity
- **Workflows**: Define custom business processes
- **Module Toggles**: Enable/disable modules per org

### AI Features

- **Assistant**: Chat-based AI assistant
- **Suggestions**: AI-powered business recommendations
- **Anomaly Detection**: Automatic detection of unusual patterns

## Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Notes

- This is a **frontend-only** implementation
- Backend APIs are mocked for development
- Authentication is simulated (no real auth flow)
- Data is stored in-memory (not persisted)

## License

Private - ERP by OdaFlow

# ERPbyodaflow
