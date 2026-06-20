import { createFileRoute, Link } from "@tanstack/react-router";
import { useERP, freeToUse } from "@/lib/erp/store";
import { ShoppingCart, Truck, Factory, AlertTriangle, ClipboardList, IndianRupee, TrendingUp, RefreshCw, Clock } from "lucide-react";
import { Section } from "@/components/erp/ui";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { useWorkOrderContext } from "@/lib/erp/WorkOrderContext";

function formatSeconds(totalSecs: number) {
  if (totalSecs <= 0) return "00m 00s";
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  
  const parts = [];
  if (h > 0) {
    parts.push(`${h}h`);
    parts.push(`${String(m).padStart(2, "0")}m`);
  } else {
    parts.push(`${String(m).padStart(2, "0")}m`);
  }
  parts.push(`${String(s).padStart(2, "0")}s`);
  return parts.join(" ");
}

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Shiv Furniture Works" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { salesOrders, purchaseOrders, manufacturingOrders, products, audit, users, workCenters, refreshData, bottlenecks } = useERP();

  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

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
  const lowStock = products.filter(p => p.isActive !== false && p.reorderThreshold > 0 && p.onHand <= p.reorderThreshold);
  const activeBns = (bottlenecks || []).filter(b => b.status === "ACTIVE");

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

  const chartWidth = 500;
  const chartHeight = 160;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 30;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  const salesPoints = salesTrendData.map((d, i) => {
    const x = paddingLeft + (i * graphWidth) / (salesTrendData.length - 1);
    const y = chartHeight - paddingBottom - (d.count / maxCount) * graphHeight;
    return { x, y, label: d.label, count: d.count };
  });

  let linePath = "";
  let areaPath = "";
  if (salesPoints.length > 0) {
    linePath = `M ${salesPoints[0].x} ${salesPoints[0].y} ` + 
      salesPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");

    areaPath = `M ${salesPoints[0].x} ${chartHeight - paddingBottom} ` +
      salesPoints.map(p => `L ${p.x} ${p.y}`).join(" ") +
      ` L ${salesPoints[salesPoints.length - 1].x} ${chartHeight - paddingBottom} Z`;
  }

  // Inventory Health Pie chart setup
  const activeProducts = products.filter(p => p.isActive !== false);
  const totalProducts = activeProducts.length;
  const outOfStockCount = activeProducts.filter(p => p.onHand <= 0).length;
  const lowStockCount = activeProducts.filter(p => p.onHand > 0 && p.reorderThreshold > 0 && p.onHand <= p.reorderThreshold).length;
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

  // Live bottleneck logic from shared WorkOrderContext
  const { workOrders } = useWorkOrderContext();
  const activeMOs = manufacturingOrders.filter(mo => mo.status !== "Done" && mo.status !== "Cancelled" && mo.status !== "Draft");
  const hasActiveMO = activeMOs.length > 0;

  let bottleneckWo: any = null;
  let maxOvertime = 0;

  if (hasActiveMO) {
    const activeWoIds = new Set(activeMOs.flatMap(mo => (mo.workOrders || []).map(wo => wo.id)));
    const relevantWos = workOrders.filter(wo => activeWoIds.has(wo.id));

    relevantWos.forEach(wo => {
      const plannedSecs = wo.plannedMinutes * 60;
      const overtime = wo.elapsedSeconds - plannedSecs;
      if (wo.elapsedSeconds > plannedSecs) {
        if (overtime > maxOvertime) {
          maxOvertime = overtime;
          bottleneckWo = wo;
        }
      }
    });
  }

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
          <div className="relative h-40 pt-2">
            {/* Tooltip */}
            {hoveredPoint !== null && (
              <div 
                className="absolute bg-popover/95 backdrop-blur-md text-popover-foreground text-xs rounded-lg px-2.5 py-1.5 shadow-md border border-border z-10 pointer-events-none transition-all duration-200"
                style={{
                  left: `${(salesPoints[hoveredPoint].x / chartWidth) * 100}%`,
                  top: `${(salesPoints[hoveredPoint].y / chartHeight) * 100 - 15}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div className="font-semibold text-accent">{salesPoints[hoveredPoint].count} {salesPoints[hoveredPoint].count === 1 ? 'order' : 'orders'}</div>
                <div className="text-[10px] text-muted-foreground">{salesPoints[hoveredPoint].label}</div>
              </div>
            )}
            {/* Y Axis Labels (HTML) */}
            <div 
              className="absolute left-0 top-0 bottom-0 pointer-events-none"
              style={{ width: `${(paddingLeft / chartWidth) * 100}%` }}
            >
              <div 
                className="absolute text-[10px] text-muted-foreground font-medium text-right right-2.5"
                style={{ top: `${((chartHeight - paddingBottom - graphHeight) / chartHeight) * 100}%`, transform: "translateY(-50%)" }}
              >
                {maxCount}
              </div>
              <div 
                className="absolute text-[10px] text-muted-foreground font-medium text-right right-2.5"
                style={{ top: `${((chartHeight - paddingBottom - graphHeight / 2) / chartHeight) * 100}%`, transform: "translateY(-50%)" }}
              >
                {Math.round(maxCount / 2)}
              </div>
              <div 
                className="absolute text-[10px] text-muted-foreground font-medium text-right right-2.5"
                style={{ top: `${((chartHeight - paddingBottom) / chartHeight) * 100}%`, transform: "translateY(-50%)" }}
              >
                0
              </div>
            </div>

            {/* X Axis Labels (HTML) */}
            <div 
              className="absolute left-0 right-0 bottom-0 pointer-events-none"
              style={{ height: '20px' }}
            >
              {salesPoints.map((p, i) => (
                <div
                  key={i}
                  className="absolute text-[9px] text-muted-foreground font-medium whitespace-nowrap"
                  style={{
                    left: `${(p.x / chartWidth) * 100}%`,
                    transform: "translateX(-50%)",
                    bottom: "2px",
                  }}
                >
                  {p.label}
                </div>
              ))}
            </div>

            <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              <line x1={paddingLeft} y1={chartHeight - paddingBottom} x2={chartWidth - paddingRight} y2={chartHeight - paddingBottom} stroke="currentColor" className="text-border" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={paddingLeft} y1={chartHeight - paddingBottom - graphHeight / 2} x2={chartWidth - paddingRight} y2={chartHeight - paddingBottom - graphHeight / 2} stroke="currentColor" className="text-border/60" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={paddingLeft} y1={chartHeight - paddingBottom - graphHeight} x2={chartWidth - paddingRight} y2={chartHeight - paddingBottom - graphHeight} stroke="currentColor" className="text-border/60" strokeWidth="1" strokeDasharray="3 3" />

              {/* Area path */}
              {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

              {/* Line path */}
              {linePath && <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

              {/* Active data point markers */}
              {salesPoints.map((p, i) => (
                <g key={i} className="cursor-pointer">
                  {/* Invisible larger hover zone */}
                  <circle cx={p.x} cy={p.y} r="12" fill="transparent" onMouseEnter={() => setHoveredPoint(i)} onMouseLeave={() => setHoveredPoint(null)} />
                  
                  {/* Glowing outer circle on hover */}
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r={hoveredPoint === i ? "7" : "5"} 
                    fill="var(--color-accent)" 
                    fillOpacity={hoveredPoint === i ? "0.4" : "0.2"} 
                    className="transition-all duration-200 pointer-events-none" 
                  />

                  {/* Inner dot */}
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r={hoveredPoint === i ? "4" : "3"} 
                    fill="var(--color-accent)" 
                    stroke="white" 
                    strokeWidth="1.5"
                    className="transition-all duration-200 pointer-events-none"
                  />
                </g>
              ))}
            </svg>
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
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <defs>
                  {/* Drop shadows for glow effects */}
                  <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  {/* Glassmorphic lens gradient */}
                  <radialGradient id="glassGradient" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                    <stop offset="0%" stopColor="var(--card)" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="var(--muted)" stopOpacity="0.2" />
                  </radialGradient>
                </defs>

                {/* Outer decorative track */}
                <circle 
                  cx="60" 
                  cy="60" 
                  r="45" 
                  className="stroke-muted/30" 
                  strokeWidth="10" 
                  fill="transparent" 
                />

                {/* Inner glass lens */}
                <circle 
                  cx="60" 
                  cy="60" 
                  r="35" 
                  fill="url(#glassGradient)" 
                  stroke="currentColor" 
                  className="text-border/40" 
                  strokeWidth="1" 
                />

                {/* Segment arcs */}
                {inStockCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="45" 
                    className="stroke-emerald-500 transition-all duration-500" 
                    strokeWidth="10" 
                    fill="transparent" 
                    strokeDasharray={`${(inPct / 100) * (2 * Math.PI * 45)} ${(2 * Math.PI * 45)}`} 
                    strokeDashoffset={-(inOffset / circ) * (2 * Math.PI * 45)}
                    strokeLinecap="round"
                    filter="url(#glow-emerald)"
                  />
                )}
                {lowStockCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="45" 
                    className="stroke-amber-500 transition-all duration-500" 
                    strokeWidth="10" 
                    fill="transparent" 
                    strokeDasharray={`${(lowPct / 100) * (2 * Math.PI * 45)} ${(2 * Math.PI * 45)}`} 
                    strokeDashoffset={-(lowOffset / circ) * (2 * Math.PI * 45)}
                    strokeLinecap="round"
                    filter="url(#glow-amber)"
                  />
                )}
                {outOfStockCount > 0 && (
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="45" 
                    className="stroke-red-500 transition-all duration-500" 
                    strokeWidth="10" 
                    fill="transparent" 
                    strokeDasharray={`${(oosPct / 100) * (2 * Math.PI * 45)} ${(2 * Math.PI * 45)}`} 
                    strokeDashoffset={-(oosOffset / circ) * (2 * Math.PI * 45)}
                    strokeLinecap="round"
                    filter="url(#glow-red)"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Healthy</span>
                <span className="text-lg font-bold mt-1 text-emerald-500">{Math.round(inPct)}%</span>
              </div>
            </div>
            <div className="text-[11px] space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                <span className="text-muted-foreground font-medium truncate">{inStockCount} In Stock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] shrink-0" />
                <span className="text-muted-foreground font-medium truncate">{lowStockCount} Low Stock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] shrink-0" />
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
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <defs>
                  {/* Glow filter */}
                  <filter id="glow-primary" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  {/* Gradient for efficiency ring */}
                  <linearGradient id="effGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="var(--color-accent)" />
                  </linearGradient>
                </defs>

                {/* Background track */}
                <circle 
                  cx="60" 
                  cy="60" 
                  r="45" 
                  className="stroke-muted/30" 
                  strokeWidth="10" 
                  fill="transparent" 
                />

                {/* Inner glass lens */}
                <circle 
                  cx="60" 
                  cy="60" 
                  r="35" 
                  fill="url(#glassGradient)" 
                  stroke="currentColor" 
                  className="text-border/40" 
                  strokeWidth="1" 
                />

                {/* Progress arc */}
                <circle 
                  cx="60" 
                  cy="60" 
                  r="45" 
                  stroke="url(#effGradient)" 
                  className="transition-all duration-500" 
                  strokeWidth="10" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 45} 
                  strokeDashoffset={(effOffset / effCirc) * (2 * Math.PI * 45)}
                  strokeLinecap="round"
                  filter="url(#glow-primary)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Done Rate</span>
                <span className="text-lg font-bold mt-1 text-primary">{efficiencyPct}%</span>
              </div>
            </div>
            <div className="text-[11px] space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground font-medium">{doneMOs} Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-muted-foreground font-medium">{inProgressMOs} In Progress</span>
              </div>
              <div className="pt-2 border-t border-border mt-1.5 text-[10px] text-muted-foreground">
                Total MOs: {totalMOs}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <Section
            title="Bottleneck detector"
            actions={
              activeBns.length > 0 && (
                <Link to="/bottleneck" className="text-xs font-semibold text-accent hover:underline flex items-center gap-0.5">
                  View all ({activeBns.length}) &rarr;
                </Link>
              )
            }
          >
            {activeBns.length === 0 ? (
              <div className="rounded-lg border bg-card p-5 flex flex-col items-center justify-center min-h-[150px] text-center">
                <span className="text-xl mb-1">🟢</span>
                <span className="text-sm font-semibold text-[#10B981]">No active bottlenecks</span>
                <span className="text-xs text-muted-foreground mt-1">All pipelines are operational and on track.</span>
              </div>
            ) : (
              <div className="grid gap-3">
                {activeBns.slice(0, 3).map(bn => {
                  const isCritical = bn.severity === "Critical";
                  return (
                    <div
                      key={bn.id}
                      className={`rounded-lg border bg-card p-3.5 flex flex-col gap-1.5 ${
                        isCritical ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-500"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                            isCritical
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {bn.severity}
                        </span>
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                          {bn.stage}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-foreground leading-snug">{bn.title}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>{bn.timeDetail}</span>
                        <span>&middot;</span>
                        <span>{bn.recordNumber}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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