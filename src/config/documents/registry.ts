import type { DocTypeConfig, DocTypeKey } from "./types";

export const DOC_TYPE_REGISTRY: Record<DocTypeKey, DocTypeConfig> = {
  quote: {
    typeKey: "quote",
    termKey: "quote",
    listColumns: [
      { id: "number", header: "Number", accessor: "number", sticky: true },
      { id: "date", header: "Date", accessor: "date" },
      { id: "party", header: "Customer", accessor: "party" },
      { id: "total", header: "Total", accessor: "total" },
      { id: "status", header: "Status", accessor: "status" },
    ],
    createFormSections: [
      {
        id: "header",
        label: "Header",
        fields: [
          { id: "date", label: "Date", type: "date", required: true },
          { id: "customer", label: "Customer", type: "entity", entityType: "customer", required: true },
          { id: "branch", label: "Branch", type: "select" },
        ],
      },
      { id: "lines", label: "Lines", fields: [] },
      { id: "taxes", label: "Taxes & charges", fields: [] },
    ],
    statusWorkflow: [
      { id: "DRAFT", label: "Draft" },
      { id: "PENDING_APPROVAL", label: "Pending Approval" },
      { id: "APPROVED", label: "Approved" },
      { id: "CONVERTED", label: "Converted" },
    ],
    validations: [
      { id: "has-lines", message: "At least one line required" },
      { id: "customer-required", message: "Customer is required" },
    ],
    totals: { subtotal: true, discount: true, tax: true, total: true },
    actions: ["submit", "approve", "cancel"],
  },
  "sales-order": {
    typeKey: "sales-order",
    termKey: "salesOrder",
    listColumns: [
      { id: "number", header: "Number", accessor: "number", sticky: true },
      { id: "date", header: "Date", accessor: "date" },
      { id: "party", header: "Customer", accessor: "party" },
      { id: "total", header: "Total", accessor: "total" },
      { id: "status", header: "Status", accessor: "status" },
    ],
    createFormSections: [
      {
        id: "header",
        label: "Header",
        fields: [
          { id: "date", label: "Date", type: "date", required: true },
          { id: "customer", label: "Customer", type: "entity", entityType: "customer", required: true },
          { id: "branch", label: "Branch", type: "select" },
        ],
      },
      { id: "lines", label: "Lines", fields: [] },
      { id: "taxes", label: "Taxes & charges", fields: [] },
    ],
    statusWorkflow: [
      { id: "DRAFT", label: "Draft" },
      { id: "PENDING_APPROVAL", label: "Pending Approval" },
      { id: "APPROVED", label: "Approved" },
      { id: "FULFILLED", label: "Fulfilled" },
    ],
    validations: [
      { id: "has-lines", message: "At least one line required" },
      { id: "customer-required", message: "Customer is required" },
    ],
    totals: { subtotal: true, discount: true, tax: true, total: true },
    actions: ["submit", "approve", "cancel"],
  },
  "delivery-note": {
    typeKey: "delivery-note",
    termKey: "deliveryNote",
    listColumns: [
      { id: "number", header: "Number", accessor: "number", sticky: true },
      { id: "date", header: "Date", accessor: "date" },
      { id: "party", header: "Customer", accessor: "party" },
      { id: "total", header: "Total", accessor: "total" },
      { id: "status", header: "Status", accessor: "status" },
    ],
    createFormSections: [
      {
        id: "header",
        label: "Header",
        fields: [
          { id: "date", label: "Date", type: "date", required: true },
          { id: "customer", label: "Customer", type: "entity", entityType: "customer", required: true },
          { id: "branch", label: "Branch", type: "select" },
        ],
      },
      { id: "lines", label: "Lines", fields: [] },
    ],
    statusWorkflow: [
      { id: "DRAFT", label: "Draft" },
      { id: "IN_TRANSIT", label: "In Transit" },
      { id: "DELIVERED", label: "Delivered" },
    ],
    validations: [
      { id: "has-lines", message: "At least one line required" },
      { id: "customer-required", message: "Customer is required" },
    ],
    totals: { total: true },
    actions: ["submit", "cancel"],
  },
  "purchase-order": {
    typeKey: "purchase-order",
    termKey: "purchaseOrder",
    listColumns: [
      { id: "number", header: "Number", accessor: "number", sticky: true },
      { id: "date", header: "Date", accessor: "date" },
      { id: "party", header: "Supplier", accessor: "party" },
      { id: "total", header: "Total", accessor: "total" },
      { id: "status", header: "Status", accessor: "status" },
    ],
    createFormSections: [
      {
        id: "header",
        label: "Header",
        fields: [
          { id: "date", label: "Date", type: "date", required: true },
          { id: "supplier", label: "Supplier", type: "entity", entityType: "supplier", required: true },
          { id: "branch", label: "Branch", type: "select" },
        ],
      },
      { id: "lines", label: "Lines", fields: [] },
      { id: "taxes", label: "Taxes & charges", fields: [] },
    ],
    statusWorkflow: [
      { id: "DRAFT", label: "Draft" },
      { id: "PENDING_APPROVAL", label: "Pending Approval" },
      { id: "APPROVED", label: "Approved" },
      { id: "RECEIVED", label: "Received" },
    ],
    validations: [
      { id: "has-lines", message: "At least one line required" },
      { id: "supplier-required", message: "Supplier is required" },
    ],
    totals: { subtotal: true, discount: true, tax: true, total: true },
    actions: ["submit", "approve", "cancel"],
  },
  "purchase-request": {
    typeKey: "purchase-request",
    termKey: "purchaseRequest",
    listColumns: [
      { id: "number", header: "Number", accessor: "number", sticky: true },
      { id: "date", header: "Date", accessor: "date" },
      { id: "party", header: "Requester", accessor: "party" },
      { id: "total", header: "Total", accessor: "total" },
      { id: "status", header: "Status", accessor: "status" },
    ],
    createFormSections: [
      {
        id: "header",
        label: "Header",
        fields: [
          { id: "date", label: "Date", type: "date", required: true },
          { id: "branch", label: "Branch", type: "select" },
        ],
      },
      { id: "lines", label: "Lines", fields: [] },
    ],
    statusWorkflow: [
      { id: "DRAFT", label: "Draft" },
      { id: "PENDING_APPROVAL", label: "Pending Approval" },
      { id: "APPROVED", label: "Approved" },
    ],
    validations: [{ id: "has-lines", message: "At least one line required" }],
    totals: { total: true },
    actions: ["submit", "approve", "cancel"],
  },
  grn: {
    typeKey: "grn",
    termKey: "goodsReceipt",
    listColumns: [
      { id: "number", header: "Number", accessor: "number", sticky: true },
      { id: "date", header: "Date", accessor: "date" },
      { id: "poRef", header: "PO Reference", accessor: "poRef" },
      { id: "warehouse", header: "Warehouse", accessor: "warehouse" },
      { id: "status", header: "Status", accessor: "status" },
    ],
    createFormSections: [
      {
        id: "header",
        label: "Header",
        fields: [
          { id: "date", label: "Date", type: "date", required: true },
          { id: "poRef", label: "Purchase Order", type: "text" },
          { id: "warehouse", label: "Warehouse", type: "select", required: true },
        ],
      },
      { id: "lines", label: "Lines", fields: [] },
    ],
    statusWorkflow: [
      { id: "DRAFT", label: "Draft" },
      { id: "POSTED", label: "Posted" },
    ],
    validations: [
      { id: "has-lines", message: "At least one line required" },
      { id: "warehouse-required", message: "Warehouse is required" },
    ],
    totals: { total: true },
    actions: ["submit", "post", "cancel"],
  },
  bill: {
    typeKey: "bill",
    termKey: "bill",
    listColumns: [
      { id: "number", header: "Number", accessor: "number", sticky: true },
      { id: "date", header: "Date", accessor: "date" },
      { id: "party", header: "Supplier", accessor: "party" },
      { id: "total", header: "Total", accessor: "total" },
      { id: "status", header: "Status", accessor: "status" },
    ],
    createFormSections: [
      {
        id: "header",
        label: "Header",
        fields: [
          { id: "date", label: "Date", type: "date", required: true },
          { id: "supplier", label: "Supplier", type: "entity", entityType: "supplier", required: true },
          { id: "dueDate", label: "Due date", type: "date" },
        ],
      },
      { id: "lines", label: "Lines", fields: [] },
      { id: "taxes", label: "Taxes & charges", fields: [] },
    ],
    statusWorkflow: [
      { id: "DRAFT", label: "Draft" },
      { id: "POSTED", label: "Posted" },
    ],
    validations: [
      { id: "has-lines", message: "At least one line required" },
      { id: "supplier-required", message: "Supplier is required" },
    ],
    totals: { subtotal: true, tax: true, total: true },
    actions: ["submit", "post", "cancel", "reverse"],
  },
  invoice: {
    typeKey: "invoice",
    termKey: "invoice",
    listColumns: [
      { id: "number", header: "Number", accessor: "number", sticky: true },
      { id: "date", header: "Date", accessor: "date" },
      { id: "party", header: "Customer", accessor: "party" },
      { id: "total", header: "Total", accessor: "total" },
      { id: "status", header: "Status", accessor: "status" },
    ],
    createFormSections: [
      {
        id: "header",
        label: "Header",
        fields: [
          { id: "date", label: "Date", type: "date", required: true },
          { id: "customer", label: "Customer", type: "entity", entityType: "customer", required: true },
          { id: "dueDate", label: "Due date", type: "date" },
        ],
      },
      { id: "lines", label: "Lines", fields: [] },
      { id: "taxes", label: "Taxes & charges", fields: [] },
    ],
    statusWorkflow: [
      { id: "DRAFT", label: "Draft" },
      { id: "POSTED", label: "Posted" },
    ],
    validations: [
      { id: "has-lines", message: "At least one line required" },
      { id: "customer-required", message: "Customer is required" },
    ],
    totals: { subtotal: true, tax: true, total: true },
    actions: ["submit", "post", "cancel", "reverse"],
  },
  journal: {
    typeKey: "journal",
    termKey: "journalEntry",
    listColumns: [
      { id: "number", header: "Number", accessor: "number", sticky: true },
      { id: "date", header: "Date", accessor: "date" },
      { id: "reference", header: "Reference", accessor: "reference" },
      { id: "status", header: "Status", accessor: "status" },
    ],
    createFormSections: [
      {
        id: "header",
        label: "Header",
        fields: [
          { id: "date", label: "Date", type: "date", required: true },
          { id: "reference", label: "Reference", type: "text" },
        ],
      },
      { id: "lines", label: "Lines", fields: [] },
    ],
    statusWorkflow: [
      { id: "DRAFT", label: "Draft" },
      { id: "POSTED", label: "Posted" },
    ],
    validations: [
      { id: "balanced", message: "Debits must equal credits" },
      { id: "has-lines", message: "At least two lines required" },
    ],
    totals: { total: true },
    actions: ["submit", "post", "cancel", "reverse"],
  },
};

export function getDocTypeConfig(typeKey: string): DocTypeConfig | null {
  return DOC_TYPE_REGISTRY[typeKey as DocTypeKey] ?? null;
}

export const DOC_TYPES: DocTypeKey[] = [
  "quote",
  "sales-order",
  "delivery-note",
  "invoice",
  "purchase-request",
  "purchase-order",
  "grn",
  "bill",
  "journal",
];
