import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { hasPermission } from "@/lib/erp/permissions";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button, Field, Input, Select, Sheet } from "@/components/erp/ui";
import { StatusBadge, EmptyState } from "@/components/erp/StatusBadge";
import type { ManufacturingOrder } from "@/lib/erp/types";
import { Plus, Search, Package, ShoppingCart, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/manufacturing/")({
  head: () => ({ meta: [{ title: "Manufacturing — Shiv Furniture Works" }] }),
  component: MfgPage,
});

function MfgPage() {
  const { manufacturingOrders, products, users, boms, createManufacturingOrder, searchQuery: query, setSearchQuery: setQuery } = useERP();
  const user = useCurrentUser();
  const writable = hasPermission(user?.role, "manufacturing:write");
  const [status, setStatus] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const productName = (id: string) => products.find(p => p.id === id)?.name || id;
  const userName = (id?: string) => users.find(u => u.id === id)?.name || "—";

  const filtered = useMemo(() => manufacturingOrders.filter(m => {
    const q = query.trim().toLowerCase();
    if (q && !m.number.toLowerCase().includes(q) && !productName(m.productId).toLowerCase().includes(q)) return false;
    if (status && m.status !== status) return false;
    return true;
  }), [manufacturingOrders, query, status, products]);

  const columns: Column<ManufacturingOrder>[] = [
    { key: "number", header: "MO #", sortValue: m => m.number,
      cell: m => (
        <div className="flex items-center gap-2">
          <Link to="/manufacturing/$id" params={{ id: m.id }} className="font-medium hover:text-accent">{m.number}</Link>
          {m.auto && <span className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">Auto</span>}
        </div>
      ) },
    { key: "prod", header: "Product", cell: m => productName(m.productId), sortValue: m => productName(m.productId) },
    { key: "qty", header: "Qty", align: "right", cell: m => m.qty, sortValue: m => m.qty },
    { key: "status", header: "Status", cell: m => <StatusBadge status={m.status} />, sortValue: m => m.status },
    { key: "asn", header: "Assignee", cell: m => userName(m.assigneeId) },
    { key: "date", header: "Date", cell: m => format(new Date(m.date), "dd MMM yyyy"), sortValue: m => m.date },
  ];

  const manufacturable = products.filter(p => p.procurementType === "Manufacturing" && p.isActive !== false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by MO # or product" value={query} onChange={e => setQuery(e.target.value)} className="w-64 pl-8" />
        </div>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          {["Draft", "Confirmed", "Waiting for Materials", "In Progress", "Done", "Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <div className="ml-auto" />
        {writable && <Button variant="primary" onClick={() => setNewOpen(true)}><Plus className="h-3.5 w-3.5" />New manufacturing order</Button>}
      </div>
      <DataTable
        columns={columns} rows={filtered}
        empty={<EmptyState title="No manufacturing orders yet" hint="Plan an MO to build finished goods from their bill of materials." />}
      />
      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="New manufacturing order">
        <NewMO products={manufacturable} users={users} boms={boms} allProducts={products} onSubmit={(productId, qty, assigneeId) => {
          createManufacturingOrder(productId, qty, assigneeId); setNewOpen(false);
        }} />
      </Sheet>
    </div>
  );
}

function NewMO({ products, users, boms, allProducts, onSubmit }: {
  products: any[];
  users: any[];
  boms: any[];
  allProducts: any[];
  onSubmit: (productId: string, qty: number, assigneeId?: string) => void;
}) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [assigneeId, setAssigneeId] = useState("");

  // Find the active BOM for the selected product
  const activeBom = boms.find(b => b.productId === productId && b.isActive);

  // Compute component availability
  const componentPreview = activeBom
    ? activeBom.components.map((c: any) => {
        const p = allProducts.find((x: any) => x.id === c.productId);
        const need = c.qty * qty;
        const free = p ? (p.onHand - p.reserved) : 0;
        const short = free < need;
        return { component: c, product: p, need, free, short };
      })
    : [];

  const hasShortage = componentPreview.some((cp: any) => cp.short);
  const hasBom = !!activeBom;

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(productId, qty, assigneeId || undefined); }} className="space-y-4">
      <Field label="Finished product">
        <Select value={productId} onChange={e => setProductId(e.target.value)} required>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <Field label="Quantity to produce"><Input type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)} /></Field>
      <Field label="Assignee">
        <Select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
          <option value="">Unassigned</option>
          {users.filter(u => u.role !== "owner").map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
      </Field>

      {/* Component preview section */}
      {!hasBom && productId && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground text-xs">No active Bill of Materials found for this product. Components will be empty and must be added manually after creation.</p>
        </div>
      )}

      {hasBom && (
        <div className="space-y-2">
          {/* Routing hint banner */}
          <div className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm ${hasShortage ? "border-warning/40 bg-warning/5" : "border-success/40 bg-success/5"}`}>
            {hasShortage ? (
              <>
                <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="font-medium text-warning text-xs">Components shortage detected → will auto-route to Purchase</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Short components will trigger automatic Purchase Orders when you confirm this MO. The MO will wait until goods arrive.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div>
                  <p className="font-medium text-success text-xs">All components in stock → will apply to BOM directly</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    All required components are available. Confirming will reserve stock and move to production immediately.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Component table */}
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="border-b bg-muted/40 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              BOM Components Preview
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-[11px] text-muted-foreground">
                  <th className="px-3 py-1.5 font-medium">Component</th>
                  <th className="px-3 py-1.5 text-right font-medium">Required</th>
                  <th className="px-3 py-1.5 text-right font-medium">Available</th>
                  <th className="px-3 py-1.5 text-right font-medium">Route</th>
                </tr>
              </thead>
              <tbody>
                {componentPreview.map((cp: any, i: number) => (
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5">
                      <span className="font-medium">{cp.product?.name || cp.component.productId}</span>
                      {cp.product?.sku && <span className="ml-1 font-mono text-muted-foreground">{cp.product.sku}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular">{cp.need}</td>
                    <td className={`px-3 py-1.5 text-right tabular font-semibold ${cp.short ? "text-warning" : "text-success"}`}>
                      {cp.free}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {cp.short ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning border border-warning/30">
                          <ShoppingCart className="h-2.5 w-2.5" /> PO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success border border-success/30">
                          <Package className="h-2.5 w-2.5" /> BOM
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Button type="submit" variant="primary">Create draft MO</Button>
    </form>
  );
}
