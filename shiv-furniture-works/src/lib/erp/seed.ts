import type {
  BoM, Customer, ManufacturingOrder, Product, PurchaseOrder, SalesOrder,
  User, Vendor, WorkCenter, LedgerEntry, AuditEntry,
} from "./types";

export function seedData() {
  const users: User[] = [
    { id: "u-1", name: "Anita Sharma", email: "admin@shiv.co", role: "admin", active: true, password: "admin" },
    { id: "u-2", name: "Ravi Kumar", email: "ops@shiv.co", role: "operations", active: true, password: "ops" },
    { id: "u-3", name: "Shiv Patel", email: "owner@shiv.co", role: "owner", active: true, password: "owner" },
    { id: "u-4", name: "Meera Joshi", email: "meera@shiv.co", role: "operations", active: true, password: "ops" },
  ];

  const vendors: Vendor[] = [
    { id: "v-1", name: "Karnataka Hardwood Co.", contact: "+91 98450 12345" },
    { id: "v-2", name: "Bharat Fasteners", contact: "+91 99876 54321" },
    { id: "v-3", name: "Sundaram Polish & Finish", contact: "+91 90123 45678" },
  ];

  const customers: Customer[] = [
    { id: "c-1", name: "Hotel Indus Bengaluru", contact: "purchase@hotelindus.in" },
    { id: "c-2", name: "Meher Residence", contact: "meher.r@gmail.com" },
    { id: "c-3", name: "Tata Coffee Office", contact: "facilities@tatacoffee.com" },
    { id: "c-4", name: "Saraswati School Trust", contact: "office@saraswatitrust.org" },
  ];

  const workCenters: WorkCenter[] = [
    { id: "wc-1", name: "Cutting Bay" },
    { id: "wc-2", name: "Assembly Line A" },
    { id: "wc-3", name: "Sanding Booth" },
    { id: "wc-4", name: "Polish & Finish" },
  ];

  // Raw materials (purchase strategy)
  const products: Product[] = [
    { id: "p-w1", sku: "RAW-TEAK-PLK", name: "Teak Plank 6ft", category: "Raw Material", costPrice: 1200, salePrice: 0, strategy: "MTS", procurementType: "Purchase", preferredVendorId: "v-1", reorderThreshold: 20, onHand: 84, reserved: 0 },
    { id: "p-w2", sku: "RAW-PLY-18", name: "Plywood Sheet 18mm", category: "Raw Material", costPrice: 850, salePrice: 0, strategy: "MTS", procurementType: "Purchase", preferredVendorId: "v-1", reorderThreshold: 30, onHand: 12, reserved: 0 },
    { id: "p-w3", sku: "RAW-SCRW-50", name: "Wood Screw 50mm (pack)", category: "Hardware", costPrice: 180, salePrice: 0, strategy: "MTS", procurementType: "Purchase", preferredVendorId: "v-2", reorderThreshold: 25, onHand: 110, reserved: 0 },
    { id: "p-w4", sku: "RAW-VARN-1L", name: "Walnut Varnish 1L", category: "Finishing", costPrice: 620, salePrice: 0, strategy: "MTS", procurementType: "Purchase", preferredVendorId: "v-3", reorderThreshold: 10, onHand: 8, reserved: 0 },
    { id: "p-w5", sku: "RAW-LEG-OAK", name: "Oak Leg Blank", category: "Raw Material", costPrice: 320, salePrice: 0, strategy: "MTS", procurementType: "Purchase", preferredVendorId: "v-1", reorderThreshold: 40, onHand: 96, reserved: 0 },

    // Finished goods (MTO + Manufacturing)
    { id: "p-f1", sku: "FG-DINTBL-6", name: "Heritage Dining Table (6-seat)", category: "Dining", costPrice: 0, salePrice: 38500, strategy: "MTO", procurementType: "Manufacturing", reorderThreshold: 0, onHand: 2, reserved: 0 },
    { id: "p-f2", sku: "FG-OFFCHR", name: "Walnut Office Chair", category: "Office", costPrice: 0, salePrice: 9200, strategy: "MTS", procurementType: "Manufacturing", reorderThreshold: 5, onHand: 14, reserved: 0 },
    { id: "p-f3", sku: "FG-BKSHLF-5", name: "5-Tier Bookshelf", category: "Living Room", costPrice: 0, salePrice: 14800, strategy: "MTO", procurementType: "Manufacturing", reorderThreshold: 0, onHand: 4, reserved: 0 },
    { id: "p-f4", sku: "FG-STUDENTDESK", name: "Student Study Desk", category: "Office", costPrice: 0, salePrice: 6400, strategy: "MTS", procurementType: "Manufacturing", reorderThreshold: 10, onHand: 22, reserved: 0 },
  ];

  const boms: BoM[] = [
    {
      id: "bom-1", productId: "p-f1",
      components: [
        { productId: "p-w1", qty: 3 },
        { productId: "p-w5", qty: 4 },
        { productId: "p-w3", qty: 1 },
        { productId: "p-w4", qty: 1 },
      ],
      operations: [
        { id: "op-1", name: "Cut planks to size", workCenterId: "wc-1", durationMinutes: 90 },
        { id: "op-2", name: "Sand all surfaces", workCenterId: "wc-3", durationMinutes: 60 },
        { id: "op-3", name: "Assemble table", workCenterId: "wc-2", durationMinutes: 120 },
        { id: "op-4", name: "Apply walnut finish", workCenterId: "wc-4", durationMinutes: 150 },
      ],
    },
    {
      id: "bom-2", productId: "p-f2",
      components: [{ productId: "p-w2", qty: 1 }, { productId: "p-w5", qty: 4 }, { productId: "p-w3", qty: 1 }],
      operations: [
        { id: "op-5", name: "Cut chair parts", workCenterId: "wc-1", durationMinutes: 45 },
        { id: "op-6", name: "Assemble chair", workCenterId: "wc-2", durationMinutes: 75 },
        { id: "op-7", name: "Polish", workCenterId: "wc-4", durationMinutes: 90 },
      ],
    },
    {
      id: "bom-3", productId: "p-f3",
      components: [{ productId: "p-w2", qty: 2 }, { productId: "p-w3", qty: 1 }, { productId: "p-w4", qty: 1 }],
      operations: [
        { id: "op-8", name: "Cut shelves", workCenterId: "wc-1", durationMinutes: 60 },
        { id: "op-9", name: "Assemble shelf frame", workCenterId: "wc-2", durationMinutes: 100 },
        { id: "op-10", name: "Finish coat", workCenterId: "wc-4", durationMinutes: 120 },
      ],
    },
    {
      id: "bom-4", productId: "p-f4",
      components: [{ productId: "p-w2", qty: 1 }, { productId: "p-w5", qty: 4 }, { productId: "p-w3", qty: 1 }],
      operations: [
        { id: "op-11", name: "Cut desk panels", workCenterId: "wc-1", durationMinutes: 50 },
        { id: "op-12", name: "Assemble desk", workCenterId: "wc-2", durationMinutes: 80 },
      ],
    },
  ];
  products.find(p => p.id === "p-f1")!.bomId = "bom-1";
  products.find(p => p.id === "p-f2")!.bomId = "bom-2";
  products.find(p => p.id === "p-f3")!.bomId = "bom-3";
  products.find(p => p.id === "p-f4")!.bomId = "bom-4";

  const now = Date.now();
  const dayAgo = (d: number) => new Date(now - d * 86400000).toISOString();

  const salesOrders: SalesOrder[] = [
    {
      id: "so-1", number: "SO-2026-0142", customerId: "c-1", date: dayAgo(2), status: "Confirmed", createdBy: "u-2",
      lines: [
        { id: "sol-1", productId: "p-f2", qty: 8, unitPrice: 9200, reservedQty: 8, deliveredQty: 0 },
        { id: "sol-2", productId: "p-f4", qty: 4, unitPrice: 6400, reservedQty: 4, deliveredQty: 0 },
      ],
    },
    {
      id: "so-2", number: "SO-2026-0143", customerId: "c-2", date: dayAgo(1), status: "Partially Delivered", createdBy: "u-4",
      lines: [{ id: "sol-3", productId: "p-f2", qty: 2, unitPrice: 9200, reservedQty: 1, deliveredQty: 1 }],
    },
    {
      id: "so-3", number: "SO-2026-0144", customerId: "c-3", date: dayAgo(0), status: "Draft", createdBy: "u-2",
      lines: [{ id: "sol-4", productId: "p-f3", qty: 3, unitPrice: 14800, reservedQty: 0, deliveredQty: 0 }],
    },
    {
      id: "so-4", number: "SO-2026-0141", customerId: "c-4", date: dayAgo(8), status: "Fully Delivered", createdBy: "u-2",
      lines: [{ id: "sol-5", productId: "p-f4", qty: 12, unitPrice: 6400, reservedQty: 0, deliveredQty: 12 }],
    },
  ];
  // reflect reservations on products
  products.find(p => p.id === "p-f2")!.reserved = 9;
  products.find(p => p.id === "p-f4")!.reserved = 4;

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: "po-1", number: "PO-2026-0088", vendorId: "v-1", date: dayAgo(3), status: "Partially Received", createdBy: "u-2",
      lines: [
        { id: "pol-1", productId: "p-w1", qty: 30, unitPrice: 1200, receivedQty: 18 },
        { id: "pol-2", productId: "p-w5", qty: 50, unitPrice: 320, receivedQty: 50 },
      ],
    },
    {
      id: "po-2", number: "PO-2026-0089", vendorId: "v-3", date: dayAgo(1), status: "Confirmed", createdBy: "u-2",
      lines: [{ id: "pol-3", productId: "p-w4", qty: 12, unitPrice: 620, receivedQty: 0 }],
      auto: true, triggeringSalesOrderId: "so-1",
    },
  ];

  const manufacturingOrders: ManufacturingOrder[] = [
    {
      id: "mo-1", number: "MO-2026-0034", productId: "p-f1", qty: 2, status: "In Progress",
      assigneeId: "u-4", date: dayAgo(2),
      bomSnapshot: { components: boms[0].components, operations: boms[0].operations },
      workOrders: [
        { id: "wo-1", name: "Cut planks to size", workCenterId: "wc-1", plannedMinutes: 90, status: "Done", accumulatedMs: 92 * 60000 },
        { id: "wo-2", name: "Sand all surfaces", workCenterId: "wc-3", plannedMinutes: 60, status: "Started", startedAt: now - 12 * 60000, accumulatedMs: 0 },
        { id: "wo-3", name: "Assemble table", workCenterId: "wc-2", plannedMinutes: 120, status: "Pending", accumulatedMs: 0 },
        { id: "wo-4", name: "Apply walnut finish", workCenterId: "wc-4", plannedMinutes: 150, status: "Pending", accumulatedMs: 0 },
      ],
    },
    {
      id: "mo-2", number: "MO-2026-0035", productId: "p-f3", qty: 3, status: "Draft",
      assigneeId: "u-4", date: dayAgo(0),
      bomSnapshot: { components: boms[2].components, operations: boms[2].operations },
      workOrders: boms[2].operations.map((o, i) => ({
        id: `wo-d-${i}`, name: o.name, workCenterId: o.workCenterId, plannedMinutes: o.durationMinutes,
        status: "Pending" as const, accumulatedMs: 0,
      })),
      auto: true, triggeringSalesOrderId: "so-3",
    },
  ];

  const ledger: LedgerEntry[] = [
    { id: "l-1", ts: dayAgo(8), productId: "p-f4", type: "Delivery", deltaQty: -12, onHandAfter: 22, reservedAfter: 0, referenceType: "SO", referenceId: "so-4" },
    { id: "l-2", ts: dayAgo(3), productId: "p-w5", type: "Receipt", deltaQty: 50, onHandAfter: 96, reservedAfter: 0, referenceType: "PO", referenceId: "po-1" },
    { id: "l-3", ts: dayAgo(2), productId: "p-w1", type: "Receipt", deltaQty: 18, onHandAfter: 84, reservedAfter: 0, referenceType: "PO", referenceId: "po-1" },
    { id: "l-4", ts: dayAgo(2), productId: "p-f2", type: "Reserve", deltaQty: 0, onHandAfter: 14, reservedAfter: 8, referenceType: "SO", referenceId: "so-1" },
    { id: "l-5", ts: dayAgo(1), productId: "p-f2", type: "Delivery", deltaQty: -1, onHandAfter: 14, reservedAfter: 9, referenceType: "SO", referenceId: "so-2" },
  ];

  const audit: AuditEntry[] = [
    { id: "a-1", ts: dayAgo(2), userId: "u-2", module: "Sales", recordType: "SalesOrder", recordId: "so-1", action: "Confirmed", field: "status", oldValue: "Draft", newValue: "Confirmed" },
    { id: "a-2", ts: dayAgo(2), userId: "u-2", module: "Purchase", recordType: "PurchaseOrder", recordId: "po-2", action: "Auto-created", newValue: "Draft (from SO-2026-0142)" },
    { id: "a-3", ts: dayAgo(1), userId: "u-4", module: "Sales", recordType: "SalesOrder", recordId: "so-2", action: "Partially Delivered", field: "deliveredQty", oldValue: "0", newValue: "1" },
    { id: "a-4", ts: dayAgo(0), userId: "u-2", module: "Sales", recordType: "SalesOrder", recordId: "so-3", action: "Created" },
  ];

  return { users, vendors, customers, workCenters, products, boms, salesOrders, purchaseOrders, manufacturingOrders, ledger, audit };
}