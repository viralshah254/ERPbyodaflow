// Core ERP Type Definitions

// ============================================================================
// Tenancy
// ============================================================================

export type TenantId = string;
export type OrgId = string;
export type BranchId = string;
export type UserId = string;
export type RoleId = string;

export type OrgType = "MANUFACTURER" | "DISTRIBUTOR" | "SHOP";

export interface Tenant {
  tenantId: TenantId;
  name: string;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  region: string;
  currency: string;
  timeZone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Org {
  orgId: OrgId;
  tenantId: TenantId;
  orgType: OrgType;
  name: string;
  taxId?: string;
  registrationNumber?: string;
  address?: Address;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  branchId: BranchId;
  orgId: OrgId;
  name: string;
  address?: Address;
  geo?: {
    lat: number;
    lng: number;
  };
  isHeadOffice: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

// ============================================================================
// Users & Permissions
// ============================================================================

export interface User {
  userId: UserId;
  orgId: OrgId;
  branchIds: BranchId[];
  roleIds: RoleId[];
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  roleId: RoleId;
  name: string;
  description?: string;
  scope: "ORG" | "BRANCH" | "DEPARTMENT";
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type Permission = string; // e.g., "inventory.read", "orders.approve", "finance.post_journal"

export interface PermissionContext {
  orgId?: OrgId;
  branchId?: BranchId;
  departmentId?: string;
  resourceId?: string;
}

// ============================================================================
// Master Data
// ============================================================================

export interface Product {
  productId: string;
  orgId: OrgId;
  name: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  skus: SKU[];
  tags?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SKU {
  skuId: string;
  productId: string;
  code: string;
  name: string;
  barcode?: string;
  uom: UOM;
  basePrice: number;
  costPrice?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UOM {
  uomId: string;
  code: string;
  name: string;
  type: "BASE" | "PACK" | "CASE" | "PALLET";
  conversionFactor: number; // relative to base UOM
}

export interface Category {
  categoryId: string;
  orgId: OrgId;
  name: string;
  parentId?: string;
  path: string; // e.g., "Electronics > Phones > Smartphones"
  isActive: boolean;
}

export interface Brand {
  brandId: string;
  orgId?: OrgId; // null if global
  name: string;
  logoUrl?: string;
  isActive: boolean;
}

export interface Customer {
  customerId: string;
  orgId: OrgId;
  name: string;
  type: "B2B_SHOP" | "B2C" | "DISTRIBUTOR";
  taxId?: string;
  email?: string;
  phone?: string;
  address?: Address;
  creditLimit?: number;
  paymentTerms?: string;
  priceListId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  supplierId: string;
  orgId: OrgId;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: Address;
  paymentTerms?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceList {
  priceListId: string;
  orgId: OrgId;
  name: string;
  currency: string;
  isDefault: boolean;
  validFrom: Date;
  validTo?: Date;
  items: PriceListItem[];
}

export interface PriceListItem {
  priceListItemId: string;
  priceListId: string;
  skuId: string;
  price: number;
  minQuantity?: number;
}

export interface Tax {
  taxId: string;
  orgId: OrgId;
  name: string;
  rate: number; // percentage
  type: "SALES" | "PURCHASE" | "BOTH";
  isActive: boolean;
}

export interface DiscountRule {
  discountRuleId: string;
  orgId: OrgId;
  name: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  conditions: DiscountCondition[];
  validFrom: Date;
  validTo?: Date;
  isActive: boolean;
}

export interface DiscountCondition {
  field: string; // "customerId", "categoryId", "quantity", etc.
  operator: "equals" | "in" | "gte" | "lte";
  value: any;
}

export interface Warehouse {
  warehouseId: string;
  orgId: OrgId;
  branchId?: BranchId;
  name: string;
  address?: Address;
  type: "MAIN" | "TRANSIT" | "QUARANTINE" | "RETURNS";
  isActive: boolean;
  locations: Location[];
}

export interface Location {
  locationId: string;
  warehouseId: string;
  code: string; // e.g., "A-01-02-03"
  name?: string;
  type: "BIN" | "ZONE" | "RACK";
  parentLocationId?: string;
  capacity?: number;
  isActive: boolean;
}

export interface Batch {
  batchId: string;
  skuId: string;
  warehouseId: string;
  batchNumber: string;
  expiryDate?: Date;
  manufactureDate?: Date;
  quantity: number;
  reservedQuantity: number;
  createdAt: Date;
}

// ============================================================================
// Finance
// ============================================================================

export interface LedgerAccount {
  accountId: string;
  orgId: OrgId;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  parentAccountId?: string;
  isActive: boolean;
}

export interface CostCenter {
  costCenterId: string;
  orgId: OrgId;
  code: string;
  name: string;
  parentCostCenterId?: string;
  isActive: boolean;
}

export interface Department {
  departmentId: string;
  orgId: OrgId;
  branchId?: BranchId;
  name: string;
  costCenterId?: string;
  isActive: boolean;
}

// ============================================================================
// Transactions
// ============================================================================

export interface SalesOrder {
  orderId: string;
  orgId: OrgId;
  branchId: BranchId;
  orderNumber: string;
  customerId: string;
  orderDate: Date;
  deliveryDate?: Date;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  notes?: string;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrder {
  orderId: string;
  orgId: OrgId;
  branchId: BranchId;
  orderNumber: string;
  supplierId: string;
  orderDate: Date;
  expectedDate?: Date;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  currency: string;
  notes?: string;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PROCESSING"
  | "PARTIALLY_FULFILLED"
  | "FULFILLED"
  | "CANCELLED"
  | "REJECTED";

export interface OrderItem {
  itemId: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  uom: string;
  notes?: string;
}

export interface Invoice {
  invoiceId: string;
  orgId: OrgId;
  branchId: BranchId;
  invoiceNumber: string;
  type: "SALES" | "PURCHASE";
  orderId?: string;
  customerId?: string;
  supplierId?: string;
  invoiceDate: Date;
  dueDate: Date;
  status: "DRAFT" | "ISSUED" | "PAID" | "PARTIALLY_PAID" | "OVERDUE" | "CANCELLED";
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  currency: string;
  notes?: string;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  itemId: string;
  skuId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  uom: string;
}

export interface Payment {
  paymentId: string;
  orgId: OrgId;
  branchId: BranchId;
  paymentNumber: string;
  invoiceId?: string;
  type: "RECEIPT" | "PAYMENT";
  method: "CASH" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";
  amount: number;
  currency: string;
  paymentDate: Date;
  reference?: string;
  notes?: string;
  createdBy: UserId;
  createdAt: Date;
}

export interface Transfer {
  transferId: string;
  orgId: OrgId;
  transferNumber: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: "DRAFT" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";
  items: TransferItem[];
  requestedDate: Date;
  completedDate?: Date;
  notes?: string;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferItem {
  itemId: string;
  skuId: string;
  quantity: number;
  uom: string;
  batchId?: string;
}

export interface GRN {
  grnId: string;
  orgId: OrgId;
  branchId: BranchId;
  grnNumber: string;
  purchaseOrderId?: string;
  supplierId: string;
  warehouseId: string;
  grnDate: Date;
  status: "DRAFT" | "RECEIVED" | "VERIFIED" | "CANCELLED";
  items: GRNItem[];
  notes?: string;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface GRNItem {
  itemId: string;
  skuId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unitPrice: number;
  uom: string;
  batchId?: string;
  locationId?: string;
}

export interface Delivery {
  deliveryId: string;
  orgId: OrgId;
  branchId: BranchId;
  deliveryNumber: string;
  salesOrderId: string;
  warehouseId: string;
  customerId: string;
  deliveryDate: Date;
  status: "PENDING" | "PICKING" | "PACKED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  items: DeliveryItem[];
  address: Address;
  notes?: string;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryItem {
  itemId: string;
  skuId: string;
  quantity: number;
  uom: string;
  batchId?: string;
  locationId?: string;
}

export interface Stocktake {
  stocktakeId: string;
  orgId: OrgId;
  branchId: BranchId;
  warehouseId: string;
  stocktakeNumber: string;
  stocktakeDate: Date;
  status: "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  items: StocktakeItem[];
  notes?: string;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface StocktakeItem {
  itemId: string;
  skuId: string;
  locationId?: string;
  batchId?: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  varianceValue: number;
}

// ============================================================================
// Manufacturing
// ============================================================================

export interface BOM {
  bomId: string;
  orgId: OrgId;
  code: string;
  name: string;
  finishedProductSkuId: string;
  quantity: number; // finished product quantity
  uom: string;
  version: string;
  isActive: boolean;
  items: BOMItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BOMItem {
  itemId: string;
  bomId: string;
  skuId: string;
  quantity: number;
  uom: string;
  isOptional: boolean;
  scrapFactor?: number; // percentage
}

export interface WorkOrder {
  workOrderId: string;
  orgId: OrgId;
  branchId: BranchId;
  workOrderNumber: string;
  bomId: string;
  finishedProductSkuId: string;
  quantity: number;
  uom: string;
  status: "DRAFT" | "PLANNED" | "RELEASED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  items: WorkOrderItem[];
  notes?: string;
  createdBy: UserId;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkOrderItem {
  itemId: string;
  workOrderId: string;
  skuId: string;
  plannedQuantity: number;
  issuedQuantity: number;
  consumedQuantity: number;
  uom: string;
}

export interface ProductionRun {
  runId: string;
  orgId: OrgId;
  branchId: BranchId;
  workOrderId: string;
  runNumber: string;
  startTime: Date;
  endTime?: Date;
  quantityProduced: number;
  quantityRejected: number;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes?: string;
  createdBy: UserId;
}

export interface QCCheck {
  qcCheckId: string;
  orgId: OrgId;
  branchId: BranchId;
  productionRunId?: string;
  grnId?: string;
  checkType: "INCOMING" | "IN_PROCESS" | "FINAL";
  skuId: string;
  batchId?: string;
  quantityChecked: number;
  quantityPassed: number;
  quantityFailed: number;
  checkDate: Date;
  checkedBy: UserId;
  notes?: string;
}

// ============================================================================
// Customization Layer
// ============================================================================

export interface ModuleConfig {
  moduleId: string;
  orgId: OrgId;
  enabled: boolean;
  navLayout?: "SIDEBAR" | "TOP" | "CUSTOM";
  perRoleDefaults?: Record<RoleId, any>;
  customizations?: Record<string, any>;
}

export interface CustomFieldDefinition {
  fieldId: string;
  orgId: OrgId;
  entity: string; // "Product", "Customer", "SalesOrder", etc.
  fieldName: string;
  fieldType: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "SELECT" | "MULTI_SELECT" | "JSON";
  label: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[]; // for SELECT types
  };
  visibilityRules?: {
    roles?: RoleId[];
    branches?: BranchId[];
    conditions?: Record<string, any>;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowDefinition {
  workflowId: string;
  orgId: OrgId;
  entity: string;
  name: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStatus {
  statusId: string;
  name: string;
  label: string;
  color: string;
  isInitial: boolean;
  isFinal: boolean;
}

export interface WorkflowTransition {
  transitionId: string;
  fromStatusId: string;
  toStatusId: string;
  label: string;
  requiresApproval: boolean;
  approverRoleIds?: RoleId[];
  conditions?: Record<string, any>;
}

export interface DashboardDefinition {
  dashboardId: string;
  orgId: OrgId;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  isDefault: boolean;
  isPublic: boolean;
  roleIds?: RoleId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  widgetId: string;
  type: "CHART" | "TABLE" | "METRIC" | "KPI" | "LIST" | "CUSTOM";
  title: string;
  config: Record<string, any>;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  gap: number;
}

// ============================================================================
// AI & Assistant
// ============================================================================

export interface AIAssistantMessage {
  messageId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AISuggestion {
  suggestionId: string;
  type: "ACTION" | "INSIGHT" | "ALERT" | "OPTIMIZATION";
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AnomalyDetection {
  anomalyId: string;
  orgId: OrgId;
  type: "INVENTORY" | "SALES" | "PURCHASE" | "FINANCE" | "PRICING" | "PAYROLL" | "OTHER";
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

