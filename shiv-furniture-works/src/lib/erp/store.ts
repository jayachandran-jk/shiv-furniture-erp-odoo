import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuditEntry, BoM, Customer, LedgerEntry, ManufacturingOrder, Product,
  PurchaseOrder, SalesOrder, User, Vendor, WorkCenter, WoStatus, LedgerType,
} from "./types";

interface State {
  // entities
  users: User[];
  vendors: Vendor[];
  customers: Customer[];
  workCenters: WorkCenter[];
  products: Product[];
  boms: BoM[];
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  manufacturingOrders: ManufacturingOrder[];
  ledger: LedgerEntry[];
  audit: AuditEntry[];
  // session
  currentUserId: string | null;
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  tick: number; // forces re-render for live timers

  // actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setTheme: (t: "light" | "dark") => void;
  toggleSidebar: () => void;
  bumpTick: () => void;

  // products
  createProduct: (p: Omit<Product, "id" | "onHand" | "reserved"> & Partial<Pick<Product, "onHand">>) => Promise<void>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>;

  // users
  createUser: (u: Omit<User, "id">) => Promise<void>;
  toggleUserActive: (id: string) => Promise<void>;

  // sales
  createSalesOrder: (so: { customerId: string; salespersonId?: string; lines: Array<{ productId: string; qty: number; unitPrice: number }> }) => Promise<SalesOrder>;
  updateSalesOrder: (id: string, so: { customerId: string; salespersonId?: string; lines: Array<{ productId: string; qty: number; unitPrice: number }> }) => Promise<SalesOrder>;
  confirmSalesOrder: (id: string) => Promise<void>;
  deliverSalesOrder: (id: string, deliveries: { lineId: string; qty: number }[]) => Promise<void>;
  cancelSalesOrder: (id: string) => Promise<void>;

  // purchase
  createPurchaseOrder: (po: { vendorId: string; expectedDeliveryDate?: string; notes?: string; lines: Array<{ productId: string; qty: number; unitPrice: number }> }) => Promise<PurchaseOrder>;
  updatePurchaseOrder: (id: string, po: { vendorId: string; expectedDeliveryDate?: string; notes?: string; lines: Array<{ productId: string; qty: number; unitPrice: number }> }) => Promise<PurchaseOrder>;
  bookPurchaseOrder: (id: string) => Promise<void>;
  confirmPurchaseOrder: (id: string) => Promise<void>;
  receivePurchaseOrder: (id: string, receipts: { lineId: string; qty: number }[]) => Promise<void>;
  cancelPurchaseOrder: (id: string) => Promise<void>;
  createVendor: (vendor: Omit<Vendor, "id">) => Promise<Vendor>;

  // manufacturing
  createManufacturingOrder: (productId: string, qty: number, assigneeId?: string, triggeringSO?: string) => Promise<ManufacturingOrder | null>;
  confirmManufacturingOrder: (id: string) => Promise<void>;
  setWorkOrderStatus: (moId: string, woId: string, status: WoStatus) => Promise<void>;
  completeManufacturingOrder: (id: string) => Promise<void>;
  cancelManufacturingOrder: (id: string) => Promise<void>;

  // bom
  upsertBom: (bom: BoM) => Promise<void>;
  deactivateBom: (id: string) => Promise<void>;
  createWorkCenter: (wc: { name: string; description?: string; capacityPerDay?: number }) => Promise<WorkCenter>;
  createCustomer: (c: { name: string; contact?: string; address?: string }) => Promise<Customer>;
  refreshData: () => Promise<void>;
}

// REST API helper
async function apiCall(path: string, method: string = "GET", body?: any) {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`http://localhost:4000${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

function mapManufacturingOrder(mo: any): ManufacturingOrder {
  const bomSnapshot = {
    components: (mo.components || []).map((c: any) => ({
      productId: c.productId,
      qty: mo.qty ? c.requiredQty / mo.qty : c.requiredQty,
    })),
    operations: (mo.workOrders || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      workCenterId: w.workCenterId,
      durationMinutes: w.expectedDurationMinutes,
    })),
  };
  return {
    id: mo.id,
    number: mo.number,
    productId: mo.productId,
    qty: mo.qty,
    status: mo.status,
    assigneeId: mo.assigneeId,
    date: mo.date || new Date().toISOString(),
    bomSnapshot,
    workOrders: (mo.workOrders || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      workCenterId: w.workCenterId,
      plannedMinutes: w.expectedDurationMinutes,
      status: w.status === "Completed" ? "Done" : w.status,
      startedAt: w.startedAt ? new Date(w.startedAt).getTime() : undefined,
      accumulatedMs: (w.actualDurationMinutes || 0) * 60000,
    })),
    auto: mo.isAutoGenerated,
    triggeringSalesOrderId: mo.triggeringSalesOrderId,
  };
}

function mapLedgerEntry(l: any): LedgerEntry {
  let type: LedgerType = "Adjustment";
  let deltaQty = l.quantity;
  const mt = l.movementType.toUpperCase();
  if (mt === "SALES_RESERVE" || mt === "MFG_RESERVE") {
    type = "Reserve";
    deltaQty = 0;
  } else if (mt === "SALES_DELIVERY") {
    type = "Delivery";
    deltaQty = -l.quantity;
  } else if (mt === "SALES_CANCEL" || mt === "MFG_CANCEL") {
    type = "Unreserve";
    deltaQty = 0;
  } else if (mt === "PURCHASE_RECEIPT") {
    type = "Receipt";
    deltaQty = l.quantity;
  } else if (mt === "MFG_CONSUME") {
    type = "Manufacturing Out";
    deltaQty = -l.quantity;
  } else if (mt === "MFG_PRODUCE") {
    type = "Manufacturing In";
    deltaQty = l.quantity;
  } else if (mt === "STOCK_ADJUST") {
    type = "Adjustment";
  }
  return {
    id: l.id,
    ts: l.ts || new Date().toISOString(),
    productId: l.productId,
    type,
    deltaQty,
    onHandAfter: l.onHandAfter,
    reservedAfter: l.reservedAfter,
    referenceType: l.referenceType,
    referenceId: l.referenceId,
    note: l.notes,
  };
}

function formatAuditChanges(oldValStr: string | undefined, newValStr: string | undefined) {
  let field = "—";
  let oldValue = oldValStr || "";
  let newValue = newValStr || "";

  const cleanJsonString = (s: string) => {
    if (!s) return s;
    if (s.startsWith("\"") && s.endsWith("\"")) return s.slice(1, -1);
    return s;
  };

  const isJson = (str: string) => {
    const s = str.trim();
    return (s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"));
  };

  try {
    if (oldValStr && newValStr && isJson(oldValStr) && isJson(newValStr)) {
      const oldObj = JSON.parse(oldValStr);
      const newObj = JSON.parse(newValStr);
      
      const changedFields: string[] = [];
      const oldValues: string[] = [];
      const newValues: string[] = [];

      for (const key of Object.keys(newObj)) {
        const oldValJson = JSON.stringify(oldObj[key]);
        const newValJson = JSON.stringify(newObj[key]);
        
        if (oldValJson !== newValJson) {
          changedFields.push(key);
          oldValues.push(`${key}: ${oldObj[key] !== undefined ? oldObj[key] : 'none'}`);
          newValues.push(`${key}: ${newObj[key] !== undefined ? newObj[key] : 'none'}`);
        }
      }

      if (changedFields.length > 0) {
        field = changedFields.join(", ");
        oldValue = oldValues.join(", ");
        newValue = newValues.join(", ");
      } else {
        oldValue = cleanJsonString(oldValStr);
        newValue = cleanJsonString(newValStr);
      }
    } else if (newValStr && isJson(newValStr) && !oldValStr) {
      const newObj = JSON.parse(newValStr);
      const fields = Object.keys(newObj);
      field = fields.join(", ");
      newValue = fields.map(k => `${k}: ${newObj[k]}`).join(", ");
      oldValue = "—";
    } else {
      oldValue = cleanJsonString(oldValStr || "");
      newValue = cleanJsonString(newValStr || "");
    }
  } catch (e) {
    oldValue = cleanJsonString(oldValStr || "");
    newValue = cleanJsonString(newValStr || "");
  }

  return { field, oldValue: oldValue || "—", newValue: newValue || "—" };
}

function mapAuditEntry(a: any): AuditEntry {
  let module = "System";
  const et = a.entityType;
  if (et === "Product") module = "Products";
  else if (et === "SalesOrder") module = "Sales";
  else if (et === "PurchaseOrder" || et === "Vendor") module = "Purchase";
  else if (et === "ManufacturingOrder" || et === "WorkCenter" || et === "WorkOrder") module = "Manufacturing";
  else if (et === "User") module = "Settings";
  else if (et === "BoM" || et === "BILL_OF_MATERIALS") module = "Bill of Materials";

  const formatted = formatAuditChanges(a.oldValue, a.newValue);

  return {
    id: a.id,
    ts: a.ts || new Date().toISOString(),
    userId: a.userId || "system",
    module,
    recordType: a.entityType,
    recordId: a.entityId,
    action: a.action,
    field: formatted.field,
    oldValue: formatted.oldValue,
    newValue: formatted.newValue,
  };
}

export const useERP = create<State>()(
  persist(
    (set, get) => ({
      users: [],
      vendors: [],
      customers: [],
      workCenters: [],
      products: [],
      boms: [],
      salesOrders: [],
      purchaseOrders: [],
      manufacturingOrders: [],
      ledger: [],
      audit: [],
      currentUserId: null,
      theme: "light",
      sidebarCollapsed: false,
      tick: 0,

      login: async (email, password) => {
        try {
          const res = await apiCall("/api/auth/login", "POST", { email, password });
          if (res && res.token) {
            localStorage.setItem("token", res.token);
            set({ currentUserId: res.user.id });
            await get().refreshData();
            return true;
          }
        } catch (err) {
          console.error("Login failed:", err);
        }
        return false;
      },

      logout: () => {
        localStorage.removeItem("token");
        set({
          currentUserId: null,
          users: [],
          vendors: [],
          customers: [],
          workCenters: [],
          products: [],
          boms: [],
          salesOrders: [],
          purchaseOrders: [],
          manufacturingOrders: [],
          ledger: [],
          audit: [],
        });
      },

      setTheme: (t) => {
        set({ theme: t });
        if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", t === "dark");
      },
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      bumpTick: () => set(s => ({ tick: s.tick + 1 })),

      refreshData: async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            // No token means session is invalid - clear state
            set({ currentUserId: null });
            return;
          }

          // Fetch all data, gracefully handling 403 from RBAC restrictions
          const safeCall = (path: string) => apiCall(path).catch(() => []);

          const [users, vendors, customers, workCenters, products, boms, salesOrders, purchaseOrders, manufacturingOrders, ledger, audit] = await Promise.all([
            apiCall("/api/users"),
            safeCall("/api/vendors"),
            safeCall("/api/customers"),
            safeCall("/api/work-centers"),
            safeCall("/api/products"),
            safeCall("/api/boms"),
            safeCall("/api/sales-orders"),
            safeCall("/api/purchase-orders"),
            safeCall("/api/manufacturing"),
            safeCall("/api/inventory"),
            safeCall("/api/audit-logs"),
          ]);

          const mappedUsers = (users || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            active: u.isActive,
            password: "",
          }));

          const mappedProducts = (products || []).map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            description: p.description,
            costPrice: p.costPrice,
            salePrice: p.salePrice,
            strategy: p.strategy,
            procurementType: p.procurementType,
            preferredVendorId: p.preferredVendorId,
            bomId: p.bomId,
            reorderThreshold: p.reorderThreshold,
            onHand: p.onHandQty,
            reserved: p.reservedQty,
          }));

          const mappedSalesOrders = (salesOrders || []).map((so: any) => ({
            id: so.id,
            number: so.number,
            customerId: so.customerId,
            date: so.date || new Date().toISOString(),
            status: so.status,
            createdBy: so.createdBy || "system",
            salespersonId: so.salespersonId,
            lines: (so.lines || []).map((l: any) => ({
              id: l.id,
              productId: l.productId,
              qty: l.qty,
              unitPrice: l.unitPrice,
              reservedQty: l.reservedQty,
              deliveredQty: l.deliveredQty,
              shortageQty: l.shortageQty,
              autoCreatedOrderId: l.autoCreatedOrderId,
              autoCreatedOrderNumber: l.autoCreatedOrderNumber,
            })),
          }));

          const mappedPurchaseOrders = (purchaseOrders || []).map((po: any) => ({
            id: po.id,
            number: po.number,
            vendorId: po.vendorId,
            date: po.date || new Date().toISOString(),
            expectedDeliveryDate: po.expectedDeliveryDate,
            notes: po.notes,
            status: po.status,
            createdBy: po.createdBy || "system",
            lines: (po.lines || []).map((l: any) => ({
              id: l.id,
              productId: l.productId,
              qty: l.qty,
              unitPrice: l.unitPrice,
              receivedQty: l.receivedQty,
            })),
            auto: po.isAutoGenerated,
            triggeringSalesOrderId: po.triggeringSalesOrderId,
          }));

          const mappedManufacturingOrders = (manufacturingOrders || []).map(mapManufacturingOrder);
          const mappedLedger = (ledger || []).map(mapLedgerEntry);
          const auditArray = Array.isArray(audit) ? audit : (audit?.content || []);
          const mappedAudit = auditArray.map(mapAuditEntry);

          set({
            users: mappedUsers,
            vendors: vendors || [],
            customers: customers || [],
            workCenters: workCenters || [],
            products: mappedProducts,
            boms: boms || [],
            salesOrders: mappedSalesOrders,
            purchaseOrders: mappedPurchaseOrders,
            manufacturingOrders: mappedManufacturingOrders,
            ledger: mappedLedger,
            audit: mappedAudit,
          });
        } catch (err: any) {
          console.error("Error refreshing data:", err);
          // If we get an auth error, clear the session so user is redirected to login
          if (err?.message?.includes("401") || err?.message?.includes("403")) {
            localStorage.removeItem("token");
            set({ currentUserId: null });
          }
        }
      },

      createProduct: async (p) => {
        await apiCall("/api/products", "POST", p);
        await get().refreshData();
      },

      createCustomer: async (c) => {
        const saved = await apiCall("/api/customers", "POST", {
          name: c.name,
          contact: c.contact || "",
          address: c.address || "",
        });
        await get().refreshData();
        return saved;
      },

      updateProduct: async (id, patch) => {
        await apiCall(`/api/products/${id}`, "PUT", patch);
        await get().refreshData();
      },

      createUser: async (u) => {
        await apiCall("/api/users", "POST", {
          name: u.name,
          email: u.email,
          role: u.role,
          passwordHash: u.password,
          isActive: true,
        });
        await get().refreshData();
      },

      toggleUserActive: async (id) => {
        await apiCall(`/api/users/${id}/toggle-active`, "POST");
        await get().refreshData();
      },

      createSalesOrder: async (so) => {
        const order = await apiCall("/api/sales-orders", "POST", {
          customerId: so.customerId,
          salespersonId: so.salespersonId,
          lines: so.lines.map(l => ({
            productId: l.productId,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        });
        await get().refreshData();
        return order;
      },

      confirmSalesOrder: async (id) => {
        await apiCall(`/api/sales-orders/${id}/confirm`, "POST");
        await get().refreshData();
      },

      deliverSalesOrder: async (id, deliveries) => {
        const payload: Record<string, number> = {};
        deliveries.forEach(d => {
          payload[d.lineId] = d.qty;
        });
        await apiCall(`/api/sales-orders/${id}/deliver`, "PATCH", payload);
        await get().refreshData();
      },

      cancelSalesOrder: async (id) => {
        await apiCall(`/api/sales-orders/${id}/cancel`, "PATCH");
        await get().refreshData();
      },

      updateSalesOrder: async (id, so) => {
        const order = await apiCall(`/api/sales-orders/${id}`, "PUT", {
          customerId: so.customerId,
          salespersonId: so.salespersonId,
          lines: so.lines.map(l => ({
            productId: l.productId,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        });
        await get().refreshData();
        return order;
      },

      createPurchaseOrder: async (po) => {
        const order = await apiCall("/api/purchase-orders", "POST", {
          vendorId: po.vendorId,
          expectedDeliveryDate: po.expectedDeliveryDate,
          notes: po.notes,
          lines: po.lines.map(l => ({
            productId: l.productId,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        });
        await get().refreshData();
        return order;
      },

      updatePurchaseOrder: async (id, po) => {
        const order = await apiCall(`/api/purchase-orders/${id}`, "PUT", {
          vendorId: po.vendorId,
          expectedDeliveryDate: po.expectedDeliveryDate,
          notes: po.notes,
          lines: po.lines.map(l => ({
            productId: l.productId,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        });
        await get().refreshData();
        return order;
      },

      bookPurchaseOrder: async (id) => {
        await apiCall(`/api/purchase-orders/${id}/book`, "POST");
        await get().refreshData();
      },

      confirmPurchaseOrder: async (id) => {
        await apiCall(`/api/purchase-orders/${id}/confirm`, "POST");
        await get().refreshData();
      },

      receivePurchaseOrder: async (id, receipts) => {
        const payload = receipts.map(r => ({
          lineId: r.lineId,
          receivedQty: r.qty,
        }));
        await apiCall(`/api/purchase-orders/${id}/receive`, "POST", payload);
        await get().refreshData();
      },

      cancelPurchaseOrder: async (id) => {
        await apiCall(`/api/purchase-orders/${id}/cancel`, "POST");
        await get().refreshData();
      },

      createVendor: async (vendor) => {
        const saved = await apiCall("/api/vendors", "POST", vendor);
        await get().refreshData();
        return saved;
      },

      createManufacturingOrder: async (productId, qty, assigneeId, triggeringSO) => {
        const order = await apiCall("/api/manufacturing", "POST", {
          productId,
          qty,
          assigneeId,
          triggeringSalesOrderId: triggeringSO,
        });
        await get().refreshData();
        return mapManufacturingOrder(order);
      },

      confirmManufacturingOrder: async (id) => {
        await apiCall(`/api/manufacturing/${id}/confirm`, "POST");
        await get().refreshData();
      },

      setWorkOrderStatus: async (moId, woId, status) => {
        const backendStatus = status === "Done" ? "Completed" : status;
        await apiCall(`/api/manufacturing/${moId}/work-orders/${woId}/status?status=${backendStatus}`, "POST");
        await get().refreshData();
      },

      completeManufacturingOrder: async (id) => {
        await apiCall(`/api/manufacturing/${id}/complete`, "POST");
        await get().refreshData();
      },

      cancelManufacturingOrder: async (id) => {
        await apiCall(`/api/manufacturing/${id}/cancel`, "POST");
        await get().refreshData();
      },

      upsertBom: async (bom) => {
        if (bom.id && bom.id.startsWith("bom-") && !bom.id.includes("new")) {
          await apiCall(`/api/boms/${bom.id}`, "PUT", bom);
        } else {
          await apiCall("/api/boms", "POST", bom);
        }
        await get().refreshData();
      },

      deactivateBom: async (id) => {
        await apiCall(`/api/boms/${id}/deactivate`, "POST");
        await get().refreshData();
      },

      createWorkCenter: async (wc) => {
        const res = await apiCall("/api/work-centers", "POST", wc);
        await get().refreshData();
        return res;
      },
    }),
    {
      name: "shiv-erp-v1",
      partialize: (s) => ({
        currentUserId: s.currentUserId,
        theme: s.theme,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
);

export const freeToUse = (p: Product) => p.onHand - p.reserved;

export function useCurrentUser(): User | null {
  return useERP(s => s.users.find(u => u.id === s.currentUserId) || null);
}

import { useEffect, useState } from "react";
export function useHasHydrated() {
  const [hydrated, setHydrated] = useState(
    typeof window !== "undefined" && useERP.persist?.hasHydrated?.(),
  );
  useEffect(() => {
    const unsub = useERP.persist?.onFinishHydration?.(() => setHydrated(true));
    if (useERP.persist?.hasHydrated?.()) setHydrated(true);
    return () => { unsub?.(); };
  }, []);
  return hydrated;
}