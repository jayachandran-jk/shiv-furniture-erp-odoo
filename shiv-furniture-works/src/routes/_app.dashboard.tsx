import { createFileRoute, Link } from "@tanstack/react-router";
import { useERP, freeToUse } from "@/lib/erp/store";
import { ShoppingCart, Truck, Factory, AlertTriangle, ClipboardList, IndianRupee, TrendingUp, RefreshCw } from "lucide-react";
import { Section } from "@/components/erp/ui";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Shiv Furniture Works" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { salesOrders, purchaseOrders, manufacturingOrders, products, audit, users, workCenters, refreshData } = useERP();

  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      setLastRefreshed(new Date());
    } catch (e) {
      console.error("Manual refresh failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData().then(() => {
        setLastRefreshed(new Date());
      }).catch(err => console.error("Error auto-refreshing dashboard:", err));
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // KPIs calculations
  const openSO = salesOrders.filter(s => s.status !== "Fully Delivered" && s.status !== "Cancelled");
  const pendingDel = salesOrders.filter(s => s.status === "Confirmed" || s.status === "Partially Delivered");
  const openMO = manufacturingOrders.filter(s => s.status !== "Done" && s.status !== "Cancelled");
  const openPO = purchaseOrders.filter(s => s.status !== "Fully Received" && s.status !== "Cancelled");
  const lowStock = products.filter(p => p.reorderThreshold > 0 && p.onHand <= p.reorderThreshold);

  // Revenue: sum of Confirmed + Partially Delivered + Fully Delivered SO line totals
  const revenue = salesOrders
    .filter(so => so.status === "Confirmed" || so.status === "Partially Delivered" || so.status === "Fully Delivered")
    .reduce((sum, so) => sum + (so.lines || []).reduce((lSum, l) => lSum + (l.qty * l.unitPrice), 0), 0);

  // Procurement cost: sum of all non-cancelled PO line totals
  const procurementCost = purchaseOrders
    .filter(po => po.status !== "Cancelled")
    .reduce((sum, po) => sum + (po.lines || []).reduce((lSum, l) => lSum + (l.qty * l.unitPrice), 0), 0);

  const kpis = [
    { label: "Total Revenue", value: `₹${revenue.toLocaleString("en-IN")}`, accent: "border-l-emerald-500", icon: TrendingUp, trend: "Confirmed & delivered orders" },
    { label: "Procurement Cost", value: `₹${procurementCost.toLocaleString("en-IN")}`, accent: "border-l-amber-500", icon: IndianRupee, trend: "Active purchase orders" },
    { label: "Open Sales Orders", value: openSO.length, accent: "border-l-blue-500", icon: ShoppingCart, trend: `${openSO.length} orders in pipeline` },
    { label: "Pending Deliveries", value: pendingDel.length, accent: "border-l-indigo-500", icon: Truck, trend: "Awaiting fulfillment" },
    { label: "Active Manufacturing", value: openMO.length, accent: "border-l-purple-500", icon: Factory, trend: `${openMO.filter(mo => mo.status === "In Progress").length} in progress` },
    { label: "Low Stock Items", value: lowStock.length, accent: "border-l-red-500", icon: AlertTriangle, trend: lowStock.length ? `${lowStock.length} items need reorder` : "All levels healthy" },
  ];

  // Sales Trend: last 7 days SO count by day
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const salesTrendData = last7Days.map(date => {
    const dateStr = date.toISOString().split("T")[0];
    const count = salesOrders.filter(so => so.date && so.date.startsWith(dateStr)).length;
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { label, count };
  });

  const maxCount = Math.max(1, ...salesTrendData.map(d => d.count));

  // Inventory Health Pie chart setup
  const totalProducts = products.length;
  const outOfStockCount = products.filter(p => p.onHand <= 0).length;
  const lowStockCount = products.filter(p => p.onHand > 0 && p.reorderThreshold > 0 && p.onHand <= p.reorderThreshold).length;
  const inStockCount = Math.max(0, totalProducts - outOfStockCount - lowStockCount);

  const oosPct = totalProducts ? (outOfStockCount / totalProducts) * 100 : 0;
  const lowPct = totalProducts ? (lowStockCount / totalProducts) * 100 : 0;
  const inPct = totalProducts ? (inStockCount / totalProducts) * 100 : 0;

  const radius = 36;
  const circ = 2 * Math.PI * radius; // ~226.2
  const inOffset = 0;
  const lowOffset = -((inPct / 100) * circ);
  const oosOffset = -(((inPct + lowPct) / 100) * circ);

  // Production Efficiency: Done vs In Progress MOs this month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const mosThisMonth = manufacturingOrders.filter(mo => {
    if (!mo.date) return false;
    const d = new Date(mo.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const doneMOs = mosThisMonth.filter(mo => mo.status === "Done").length;
  const inProgressMOs = mosThisMonth.filter(mo => mo.status === "In Progress" || mo.status === "Waiting for Materials" || mo.status === "Confirmed").length;
  const totalMOs = doneMOs + inProgressMOs;
  const efficiencyPct = totalMOs ? Math.round((doneMOs / totalMOs) * 100) : 100;

  const effRadius = 36;
  const effCirc = 2 * Math.PI * effRadius;
  const effOffset = effCirc - (efficiencyPct / 100) * effCirc;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-[28px] font-semibold leading-tight">Operations dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {pendingDel.length} pending deliveries · {openMO.length} active manufacturing orders · {lowStock.length} items below reorder threshold
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/40 px-3 py-1.5 rounded-lg border text-xs text-muted-foreground">
          <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
          <button 
            onClick={handleManualRefresh} 
            disabled={isRefreshing}
            className="p-1 hover:bg-muted rounded transition-colors text-foreground flex items-center justify-center disabled:opacity-50"
            title="Refresh dashboard now"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map(k => (
          <div key={k.label} className={`rounded-lg border-l-4 ${k.accent} border border-border bg-card p-4 flex flex-col justify-between`}>
            <div>
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</span>
                <k.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 font-serif text-2xl font-semibold tabular text-foreground truncate">{k.value}</div>
            </div>
            {k.trend && <div className="mt-2 text-[10px] text-muted-foreground leading-tight">{k.trend}</div>}
          </div>
        ))}
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sales Trend</h3>
            <span className="text-[10px] text-muted-foreground font-medium">Last 7 Days</span>
          </div>
          <div className="h-40 flex items-end justify-between gap-2 pt-4">
            {salesTrendData.map((d, i) => {
              const heightPct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative flex justify-center">
                    <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-[10px] rounded px-1.5 py-0.5 pointer-events-none whitespace-nowrap shadow border z-10">
                      {d.count} {d.count === 1 ? 'order' : 'orders'}
                    </div>
                    <div 
                      className="w-full rounded-t bg-primary/20 hover:bg-primary/40 transition-colors cursor-pointer relative"
                      style={{ height: `${Math.max(4, (heightPct / 100) * 110)}px` }}
                    >
                      {d.count > 0 && <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary rounded-t" />}
                    </div>
                  </div>
                  <span className="text-[9px] text-muted-foreground text-center truncate w-full">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Inventory Health Pie/Donut Chart */}
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inventory Health</h3>
            <span className="text-[10px] text-muted-foreground font-medium">{totalProducts} SKUs Total</span>
          </div>
          <div className="flex items-center justify-around gap-2 h-40">
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r={radius} 
                  className="stroke-muted" 
                  strokeWidth="8" 
                  fill="transparent" 
                />
                {inStockCount > 0 && (
                  <circle 
                    cx="50" 
                    cy="50" 
                    r={radius} 
                    className="stroke-emerald-500 transition-all duration-500" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={`${(inPct / 100) * circ} ${circ}`} 
                    strokeDashoffset={inOffset}
                    strokeLinecap="round"
                  />
                )}
                {lowStockCount > 0 && (
                  <circle 
                    cx="50" 
                    cy="50" 
                    r={radius} 
                    className="stroke-amber-500 transition-all duration-500" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={`${(lowPct / 100) * circ} ${circ}`} 
                    strokeDashoffset={lowOffset}
                    strokeLinecap="round"
                  />
                )}
                {outOfStockCount > 0 && (
                  <circle 
                    cx="50" 
                    cy="50" 
                    r={radius} 
                    className="stroke-red-500 transition-all duration-500" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray={`${(oosPct / 100) * circ} ${circ}`} 
                    strokeDashoffset={oosOffset}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-[10px] text-muted-foreground uppercase">Healthy</span>
                <span className="text-base font-bold mt-1 text-emerald-500">{Math.round(inPct)}%</span>
              </div>
            </div>
            <div className="text-[11px] space-y-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-muted-foreground font-medium truncate">{inStockCount} In Stock</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-muted-foreground font-medium truncate">{lowStockCount} Low Stock</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-muted-foreground font-medium truncate">{outOfStockCount} Out of Stock</span>
              </div>
            </div>
          </div>
        </div>

        {/* Production Efficiency Radial Gauge */}
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Production Efficiency</h3>
            <span className="text-[10px] text-muted-foreground font-medium">Current Month</span>
          </div>
          <div className="flex items-center justify-around gap-2 h-40">
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r={effRadius} 
                  className="stroke-muted" 
                  strokeWidth="8" 
                  fill="transparent" 
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r={effRadius} 
                  className="stroke-primary transition-all duration-500" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={effCirc} 
                  strokeDashoffset={effOffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-[10px] text-muted-foreground uppercase">Done Rate</span>
                <span className="text-base font-bold mt-1 text-primary">{efficiencyPct}%</span>
              </div>
            </div>
            <div className="text-[11px] space-y-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground font-medium">{doneMOs} Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-muted-foreground font-medium">{inProgressMOs} In Progress</span>
              </div>
              <div className="pt-1.5 border-t border-border mt-1 text-[10px] text-muted-foreground">
                Total MOs: {totalMOs}
              </div>
            </div>
          </div>
        </div>
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