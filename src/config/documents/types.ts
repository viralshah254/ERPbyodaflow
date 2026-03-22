/**
 * Document type system — unified config for SO, PO, GRN, Invoice, Journal.
 */

export type DocTypeKey =
  | "quote"
  | "sales-order"
  | "delivery-note"
  | "invoice"
  | "credit-note"
  | "debit-note"
  | "purchase-request"
  | "purchase-order"
  | "grn"
  | "bill"
  | "purchase-credit-note"
  | "purchase-debit-note"
  | "journal";

export type TerminologyKey =
  | "quote"
  | "salesOrder"
  | "deliveryNote"
  | "invoice"
  | "creditNote"
  | "debitNote"
  | "purchaseCreditNote"
  | "purchaseDebitNote"
  | "journalEntry"
  | "purchaseOrder"
  | "goodsReceipt"
  | "purchaseRequest"
  | "bill";

export interface ListColumnConfig {
  id: string;
  header: string;
  accessor: string;
  sticky?: boolean;
  width?: string;
}

export interface FormSectionConfig {
  id: string;
  label: string;
  fields: FormFieldConfig[];
}

export interface FormFieldConfig {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "entity" | "po-search";
  required?: boolean;
  entityType?: "customer" | "supplier" | "product";
}

export interface StatusStep {
  id: string;
  label: string;
}

export interface ValidationRule {
  id: string;
  message: string;
  when?: string;
}

export interface TotalsConfig {
  subtotal?: boolean;
  discount?: boolean;
  tax?: boolean;
  total: boolean;
}

export type DocActionKey = "submit" | "approve" | "post" | "cancel" | "reverse";

export interface DocTypeConfig {
  typeKey: DocTypeKey;
  termKey: TerminologyKey;
  listColumns: ListColumnConfig[];
  createFormSections: FormSectionConfig[];
  statusWorkflow: StatusStep[];
  validations: ValidationRule[];
  totals: TotalsConfig;
  actions: DocActionKey[];
}
