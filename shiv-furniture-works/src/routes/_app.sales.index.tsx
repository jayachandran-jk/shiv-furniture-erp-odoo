import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useERP, useCurrentUser, freeToUse } from "@/lib/erp/store";
import { hasPermission } from "@/lib/erp/permissions";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button, Input, Select } from "@/components/erp/ui";
import { StatusBadge, EmptyState } from "@/components/erp/StatusBadge";
import type { SalesOrder, SoStatus } from "@/lib/erp/types";
import { Plus, Search, LayoutList, Kanban, FileText } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/sales/")({
  head: () => ({ meta: [{ title: "Sales — Shiv Furniture Works" }] }),
  component: SalesPage,
});

const STATUSES: SoStatus[] = ["Draft", "Confirmed", "Partially Delivered", "Fully Delivered", "Cancelled"];

function SalesPage() {
  const navigate = useNavigate();
  const { salesOrders, customers, products, createSalesOrder } = useERP();
  const user = useCurrentUser();
  const canWrite = hasPermission(user?.role, "sales:write");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");

  const customerName = (id: string) => customers.find(c => c.id === id)?.name || id;
  const lineTotal = (so: SalesOrder) => so.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);

  const filtered = useMemo(() => salesOrders.filter(s => {
    const q = query.trim().toLowerCase();
    if (q && !s.number.toLowerCase().includes(q) && !customerName(s.customerId).toLowerCase().includes(q)) return false;
    if (status && s.status !== status) return false;
    return true;
  }), [salesOrders, query, status, customers]);

  const handleNewOrder = async () => {
    if (!canWrite) return;
    const so = await createSalesOrder({
      customerId: customers[0]?.id || "",
      salespersonId: user?.id,
      lines: [],
    });
    if (so?.id) navigate({ to: "/sales/$id", params: { id: so.id } });
  };

  const columns: Column<SalesOrder>[] = [
    {
      key: "number", header: "Reference",
      cell: s => <Link to="/sales/$id" params={{ id: s.id }} className="font-medium hover:text-accent">{s.number}</Link>,
      sortValue: s => s.number,
    },
    { key: "cust", header: "Customer", cell: s => customerName(s.customerId), sortValue: s => customerName(s.customerId) },
    { key: "date", header: "Order Date", cell: s => format(new Date(s.date), "dd MMM yyyy"), sortValue: s => s.date },
    { key: "status", header: "Status", cell: s => <StatusBadge status={s.status} />, sortValue: s => s.status },
    { key: "value", header: "Total", align: "right", cell: s => `₹${lineTotal(s).toLocaleString("en-IN")}`, sortValue: s => lineTotal(s) },
  ];

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by reference or customer" value={query} onChange={e => setQuery(e.target.value)} className="w-64 pl-8" />
        </div>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="w-48">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>

        {/* View toggle */}
        <div className="flex rounded-md border border-border">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            } rounded-l-md`}
          >
            <LayoutList className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "kanban" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            } rounded-r-md border-l`}
          >
            <Kanban className="h-3.5 w-3.5" /> Kanban
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/audit" className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <FileText className="h-3.5 w-3.5" /> Logs
          </Link>
          {canWrite && (
            <Button variant="primary" onClick={handleNewOrder}>
              <Plus className="h-3.5 w-3.5" /> New Sales Order
            </Button>
          )}
        </div>
      </div>

      {/* View content */}
      {view === "list" ? (
        <DataTable
          columns={columns}
          rows={filtered}
          onRowClick={row => navigate({ to: "/sales/$id", params: { id: row.id } })}
          empty={
            <EmptyState
              title="No sales orders yet"
              hint="Create a sales order to reserve stock for a customer."
              action={canWrite && <Button variant="primary" onClick={handleNewOrder}><Plus className="h-3.5 w-3.5" /> New Sales Order</Button>}
            />
          }
        />
      ) : (
        <KanbanView orders={filtered} customerName={customerName} lineTotal={lineTotal} />
      )}
    </div>
  );
}

/* ───────────── Kanban View ───────────── */

function KanbanView({
  orders,
  customerName,
  lineTotal,
}: {
  orders: SalesOrder[];
  customerName: (id: string) => string;
  lineTotal: (so: SalesOrder) => number;
}) {
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const map: Record<SoStatus, SalesOrder[]> = {
      Draft: [], Confirmed: [], "Partially Delivered": [], "Fully Delivered": [], Cancelled: [],
    };
    orders.forEach(o => map[o.status]?.push(o));
    return map;
  }, [orders]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STATUSES.map(status => (
        <div key={status} className="flex w-64 min-w-[16rem] shrink-0 flex-col">
          {/* Column header */}
          <div className="mb-2 flex items-center justify-between rounded-md bg-muted/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <span className="text-[11px] text-muted-foreground font-medium">{grouped[status].length}</span>
            </div>
          </div>

          {/* Cards */}
          <div className="flex flex-1 flex-col gap-2">
            {grouped[status].length === 0 ? (
              <div className="rounded-md border border-dashed bg-card/50 px-3 py-6 text-center text-xs text-muted-foreground">
                No orders
              </div>
            ) : (
              grouped[status].map(so => (
                <button
                  key={so.id}
                  onClick={() => navigate({ to: "/sales/$id", params: { id: so.id } })}
                  className={`rounded-md border bg-card px-3 py-2.5 text-left transition-colors hover:border-accent/40 ${
                    status === "Cancelled" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold">{so.number}</span>
                  </div>
                  <div className="mt-1 text-sm text-foreground">{customerName(so.customerId)}</div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{format(new Date(so.date), "dd MMM yyyy")}</span>
                    <span className="font-medium tabular text-foreground">₹{lineTotal(so).toLocaleString("en-IN")}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
