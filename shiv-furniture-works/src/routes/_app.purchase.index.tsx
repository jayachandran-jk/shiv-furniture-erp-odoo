import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { canWrite } from "@/components/erp/AppLayout";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button, Field, Input, Select, Sheet } from "@/components/erp/ui";
import { StatusBadge, EmptyState } from "@/components/erp/StatusBadge";
import type { PurchaseOrder } from "@/lib/erp/types";
import { Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/purchase/")({
  head: () => ({ meta: [{ title: "Purchase — Shiv Furniture Works" }] }),
  component: PurchasePage,
});

function PurchasePage() {
  const { purchaseOrders, vendors, products, salesOrders, createPurchaseOrder } = useERP();
  const user = useCurrentUser();
  const writable = canWrite(user?.role);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [newOpen, setNewOpen] = useState(false);

  const vendorName = (id: string) => vendors.find(v => v.id === id)?.name || id;
  const total = (po: PurchaseOrder) => po.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const triggeringNum = (id?: string) => salesOrders.find(s => s.id === id)?.number;

  const filtered = useMemo(() => purchaseOrders.filter(p => {
    const q = query.trim().toLowerCase();
    if (q && !p.number.toLowerCase().includes(q) && !vendorName(p.vendorId).toLowerCase().includes(q)) return false;
    if (status && p.status !== status) return false;
    return true;
  }), [purchaseOrders, query, status, vendors]);

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "number", header: "PO #", sortValue: p => p.number,
      cell: p => (
        <div className="flex items-center gap-2">
          <Link to="/purchase/$id" params={{ id: p.id }} className="font-medium hover:text-accent">{p.number}</Link>
          {p.auto && (
            <span title={`Auto-generated from ${triggeringNum(p.triggeringSalesOrderId) || "a sales order"}`}
              className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">Auto</span>
          )}
        </div>
      ),
    },
    { key: "vendor", header: "Vendor", cell: p => vendorName(p.vendorId), sortValue: p => vendorName(p.vendorId) },
    { key: "date", header: "Date", cell: p => format(new Date(p.date), "dd MMM yyyy"), sortValue: p => p.date },
    { key: "status", header: "Status", cell: p => <StatusBadge status={p.status} />, sortValue: p => p.status },
    { key: "value", header: "Value", align: "right", cell: p => `₹${total(p).toLocaleString("en-IN")}`, sortValue: p => total(p) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by PO # or vendor" value={query} onChange={e => setQuery(e.target.value)} className="w-64 pl-8" />
        </div>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="w-48">
          <option value="">All statuses</option>
          {["Draft", "Confirmed", "Partially Received", "Fully Received", "Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <div className="ml-auto" />
        {writable && <Button variant="primary" onClick={() => setNewOpen(true)}><Plus className="h-3.5 w-3.5" />New purchase order</Button>}
      </div>
      <DataTable
        columns={columns} rows={filtered}
        empty={<EmptyState title="No purchase orders yet" hint="Raise a PO to request stock from a vendor." />}
      />
      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="New purchase order" width={640}>
        <NewPO vendors={vendors} products={products} onSubmit={(po) => { createPurchaseOrder(po); setNewOpen(false); }} />
      </Sheet>
    </div>
  );
}

function NewPO({ vendors, products, onSubmit }: { vendors: any[]; products: any[]; onSubmit: (po: { vendorId: string; lines: { productId: string; qty: number; unitPrice: number }[] }) => void }) {
  const [vendorId, setVendorId] = useState(vendors[0]?.id || "");
  const purchaseable = products.filter((p: any) => p.procurementType === "Purchase");
  const [lines, setLines] = useState([{ productId: purchaseable[0]?.id || "", qty: 1, unitPrice: purchaseable[0]?.costPrice || 0 }]);
  const total = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ vendorId, lines }); }} className="space-y-4">
      <Field label="Vendor">
        <Select value={vendorId} onChange={e => setVendorId(e.target.value)} required>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </Field>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-foreground">Line items</span>
          <Button type="button" variant="ghost" onClick={() => setLines(l => [...l, { productId: purchaseable[0]?.id || "", qty: 1, unitPrice: 0 }])}><Plus className="h-3.5 w-3.5" />Add line</Button>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-md border bg-muted/30 p-2.5">
              <div className="col-span-7">
                <Field label="Product">
                  <Select value={line.productId} onChange={e => {
                    const p = products.find((x: any) => x.id === e.target.value);
                    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, productId: e.target.value, unitPrice: p?.costPrice || 0 } : l));
                  }}>
                    {purchaseable.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="col-span-2"><Field label="Qty"><Input type="number" min={1} value={line.qty} onChange={e => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, qty: +e.target.value } : l))} /></Field></div>
              <div className="col-span-2"><Field label="Unit ₹"><Input type="number" value={line.unitPrice} onChange={e => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, unitPrice: +e.target.value } : l))} /></Field></div>
              <div className="col-span-1 flex h-8 justify-end"><button type="button" onClick={() => setLines(ls => ls.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t pt-3">
        <div className="text-sm text-muted-foreground">Order total</div>
        <div className="font-serif text-xl font-semibold tabular">₹{total.toLocaleString("en-IN")}</div>
      </div>
      <Button type="submit" variant="primary">Create draft</Button>
    </form>
  );
}
