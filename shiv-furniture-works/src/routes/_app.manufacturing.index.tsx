import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { canWrite } from "@/components/erp/AppLayout";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button, Field, Input, Select, Sheet } from "@/components/erp/ui";
import { StatusBadge, EmptyState } from "@/components/erp/StatusBadge";
import type { ManufacturingOrder } from "@/lib/erp/types";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/manufacturing/")({
  head: () => ({ meta: [{ title: "Manufacturing — Shiv Furniture Works" }] }),
  component: MfgPage,
});

function MfgPage() {
  const { manufacturingOrders, products, users, createManufacturingOrder } = useERP();
  const user = useCurrentUser();
  const writable = canWrite(user?.role);
  const [query, setQuery] = useState("");
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

  const manufacturable = products.filter(p => p.procurementType === "Manufacturing");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by MO # or product" value={query} onChange={e => setQuery(e.target.value)} className="w-64 pl-8" />
        </div>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="w-44">
          <option value="">All statuses</option>
          {["Draft", "Confirmed", "In Progress", "Done", "Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
        <div className="ml-auto" />
        {writable && <Button variant="primary" onClick={() => setNewOpen(true)}><Plus className="h-3.5 w-3.5" />New manufacturing order</Button>}
      </div>
      <DataTable
        columns={columns} rows={filtered}
        empty={<EmptyState title="No manufacturing orders yet" hint="Plan an MO to build finished goods from their bill of materials." />}
      />
      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="New manufacturing order">
        <NewMO products={manufacturable} users={users} onSubmit={(productId, qty, assigneeId) => {
          createManufacturingOrder(productId, qty, assigneeId); setNewOpen(false);
        }} />
      </Sheet>
    </div>
  );
}

function NewMO({ products, users, onSubmit }: { products: any[]; users: any[]; onSubmit: (productId: string, qty: number, assigneeId?: string) => void }) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState(1);
  const [assigneeId, setAssigneeId] = useState("");
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(productId, qty, assigneeId || undefined); }} className="space-y-3">
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
      <Button type="submit" variant="primary">Create draft MO</Button>
    </form>
  );
}
