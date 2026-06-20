export type Role = "admin" | "sales" | "purchase" | "manufacturing" | "inventory" | "owner" | "operations";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  password: string;
}

export type Strategy = "MTS" | "MTO";
export type ProcurementType = "Purchase" | "Manufacturing";

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  strategy: Strategy;
  procurementType: ProcurementType;
  preferredVendorId?: string;
  bomId?: string;
  reorderThreshold: number;
  onHand: number;
  reserved: number;
}

export interface Vendor {
  id: string;
  name: string;
  contact?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
}
export interface Customer { id: string; name: string; contact?: string; address?: string }
export interface WorkCenter {
  id: string;
  name: string;
  description?: string;
  capacityPerDay?: number;
  createdAt?: string;
}

export interface BomComponent {
  id?: string;
  bomId?: string;
  productId: string;
  qty: number;
  unitOfMeasure?: string;
  notes?: string;
}

export interface BomOperation {
  id: string;
  bomId?: string;
  sequence: number;
  name: string;
  workCenterId: string;
  durationMinutes: number;
  notes?: string;
}

export interface BoM {
  id: string;
  bomReference: string;
  productId: string;
  qtyProduced: number;
  version: number;
  isActive: boolean;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  components: BomComponent[];
  operations: BomOperation[];
}

export type SoStatus = "Draft" | "Confirmed" | "Partially Delivered" | "Fully Delivered" | "Cancelled";
export interface SoLine {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  reservedQty: number;
  deliveredQty: number;
}
export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  date: string;
  status: SoStatus;
  createdBy: string;
  salespersonId?: string;
  lines: SoLine[];
}

export type PoStatus = "Draft" | "Booked" | "Confirmed" | "Partially Received" | "Fully Received" | "Cancelled";
export interface PoLine {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  receivedQty: number;
}
export interface PurchaseOrder {
  id: string;
  number: string;
  vendorId: string;
  date: string;
  expectedDeliveryDate?: string;
  notes?: string;
  status: PoStatus;
  createdBy: string;
  lines: PoLine[];
  auto?: boolean;
  triggeringSalesOrderId?: string;
}

export type WoStatus = "Pending" | "Started" | "Paused" | "Done";
export interface WorkOrder {
  id: string;
  name: string;
  workCenterId: string;
  plannedMinutes: number;
  status: WoStatus;
  startedAt?: number; // ms epoch when last started
  accumulatedMs: number;
}

export type MoStatus = "Draft" | "Confirmed" | "In Progress" | "Done" | "Cancelled";
export interface ManufacturingOrder {
  id: string;
  number: string;
  productId: string;
  qty: number;
  status: MoStatus;
  assigneeId?: string;
  date: string;
  bomSnapshot: { components: BomComponent[]; operations: BomOperation[] };
  workOrders: WorkOrder[];
  auto?: boolean;
  triggeringSalesOrderId?: string;
}

export type LedgerType = "Receipt" | "Delivery" | "Manufacturing In" | "Manufacturing Out" | "Reserve" | "Unreserve" | "Adjustment";
export interface LedgerEntry {
  id: string;
  ts: string;
  productId: string;
  type: LedgerType;
  deltaQty: number;
  onHandAfter: number;
  reservedAfter: number;
  referenceType?: "SO" | "PO" | "MO";
  referenceId?: string;
  note?: string;
}

export interface AuditEntry {
  id: string;
  ts: string;
  userId: string;
  module: string;
  recordType: string;
  recordId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}