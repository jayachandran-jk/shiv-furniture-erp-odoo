import { createFileRoute, Link } from "@tanstack/react-router";
import { useERP, freeToUse } from "@/lib/erp/store";
import { ShoppingCart, Truck, Factory, AlertTriangle, ClipboardList } from "lucide-react";
import { Section } from "@/components/erp/ui";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Shiv Furniture Works" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { salesOrders, purchaseOrders, manufacturingOrders, products, audit, users, workCenters } = useERP();

  const openSO = salesOrders.filter(s => s.status !== "Fully Delivered" && s.status !== "Cancelled");
  const pendingDel = salesOrders.filter(s => s.status === "Confirmed" || s.status === "Partially Delivered");
  const openMO = manufacturingOrders.filter(s => s.status !== "Done" && s.status !== "Cancelled");
  const openPO = purchaseOrders.filter(s => s.status !== "Fully Received" && s.status !== "Cancelled");
  const lowStock = products.filter(p => p.reorderThreshold > 0 && p.onHand <= p.reorderThreshold);

  const kpis = [
    { label: "Open Sales Orders", value: openSO.length, accent: "border-l-accent", icon: ShoppingCart, trend: "+12% vs last 30d" },
    { label: "Pending Deliveries", value: pendingDel.length, accent: "border-l-warning", icon: Truck, trend: "2 due this week" },
    { label: "Open Manufacturing", value: openMO.length, accent: "border-l-primary", icon: Factory, trend: "1 in progress" },
    { label: "Open Purchase Orders", value: openPO.length, accent: "border-l-primary", icon: ClipboardList, trend: "" },
    { label: "Low Stock Items", value: lowStock.length, accent: "border-l-destructive", icon: AlertTriangle, trend: lowStock.length ? "Reorder needed" : "All good" },
  ];

  // Bottleneck: average actual minutes per work center across all MOs
  const wcStats = workCenters.map(wc => {
    let totalMs = 0, jobs = 0, pending = 0, done = 0;
    for (const mo of manufacturingOrders) for (const wo of mo.workOrders) {
      if (wo.workCenterId !== wc.id) continue;
      if (wo.status === "Done") { done++; jobs++; totalMs += wo.accumulatedMs; }
      else pending++;
    }
    const avgMin = jobs ? totalMs / jobs / 60000 : 0;
    return { wc, avgMin, jobs, pending, done };
  });
  const maxAvg = Math.max(1, ...wcStats.map(s => s.avgMin));
  const bottleneck = wcStats.reduce((a, b) => (b.avgMin > a.avgMin ? b : a), wcStats[0]);

  const userName = (id: string) => users.find(u => u.id === id)?.name || id;
  const productName = (id: string) => products.find(p => p.id === id)?.name || id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[28px] font-semibold leading-tight">Operations dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {pendingDel.length} pending deliveries · {openMO.length} active manufacturing orders · {lowStock.length} items below reorder threshold
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map(k => (
          <div key={k.label} className={`rounded-lg border-l-4 ${k.accent} border border-border bg-card p-4`}>
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</span>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 font-serif text-3xl font-semibold tabular">{k.value}</div>
            {k.trend && <div className="mt-1 text-[11px] text-muted-foreground">{k.trend}</div>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <Section title="Bottleneck detector">
            <div className="rounded-lg border bg-card p-4">
              <div className="space-y-3">
                {wcStats.map(s => {
                  const isBottle = s.wc.id === bottleneck.wc.id && s.avgMin > 0;
                  const pct = (s.avgMin / maxAvg) * 100;
                  return (
                    <div key={s.wc.id} className={`rounded-md border-l-4 pl-3 ${isBottle ? "border-l-warning" : "border-l-transparent"}`}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.wc.name}</span>
                          {isBottle && <span className="rounded-md border border-warning/30 bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">Bottleneck</span>}
                        </div>
                        <span className="tabular text-xs text-muted-foreground">
                          {s.avgMin ? `${s.avgMin.toFixed(0)} min avg` : "—"} · {s.done} done · {s.pending} pending
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full rounded bg-muted overflow-hidden">
                        <div className={isBottle ? "h-full bg-warning" : "h-full bg-primary/50"} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">
                Compares average actual time per completed work order across work centers. The slowest is flagged so you can rebalance staff.
              </p>
            </div>
          </Section>
        </div>
        <div>
          <Section title="Recent activity">
            <ul className="overflow-hidden rounded-lg border bg-card">
              {audit.slice(0, 10).map(a => (
                <li key={a.id} className="border-b px-3 py-2 text-xs last:border-b-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{a.action} <span className="text-muted-foreground">· {a.recordType}</span></span>
                    <span className="shrink-0 text-muted-foreground tabular">{formatDistanceToNow(new Date(a.ts), { addSuffix: true })}</span>
                  </div>
                  <div className="text-muted-foreground">by {userName(a.userId)} in {a.module}</div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      {lowStock.length > 0 && (
        <Section title="Low stock">
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2 font-medium">Product</th><th className="px-3 py-2 font-medium">Category</th><th className="px-3 py-2 text-right font-medium">On Hand</th><th className="px-3 py-2 text-right font-medium">Free to Use</th><th className="px-3 py-2 text-right font-medium">Reorder at</th></tr>
              </thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2"><Link to="/products" className="hover:text-accent">{p.name}</Link> <span className="text-xs text-muted-foreground">· {p.sku}</span></td>
                    <td className="px-3 py-2 text-muted-foreground">{p.category}</td>
                    <td className="px-3 py-2 text-right tabular">{p.onHand}</td>
                    <td className="px-3 py-2 text-right tabular">{freeToUse(p)}</td>
                    <td className="px-3 py-2 text-right tabular text-muted-foreground">{p.reorderThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}