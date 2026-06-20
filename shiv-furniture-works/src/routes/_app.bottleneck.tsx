import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useERP } from "@/lib/erp/store";
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  Inbox,
  AlertCircle
} from "lucide-react";

export const Route = createFileRoute("/_app/bottleneck")({
  head: () => ({ meta: [{ title: "Bottleneck Detector — Shiv Furniture Works" }] }),
  component: BottleneckPage,
});

const STAGES = ["All", "Sales", "Inventory", "Manufacturing", "Delivery"];
const SEVERITIES = ["All", "Warning", "Critical"];

function BottleneckPage() {
  const {
    bottlenecks,
    salesOrders,
    products,
    manufacturingOrders,
    dismissBottleneck,
    forceScanBottlenecks
  } = useERP();

  const [selectedStage, setSelectedStage] = useState("All");
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeBottlenecks = (bottlenecks || []).filter(b => b.status === "ACTIVE");
  const warningsCount = activeBottlenecks.filter(b => b.severity === "Warning").length;
  const criticalCount = activeBottlenecks.filter(b => b.severity === "Critical").length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await forceScanBottlenecks();
    } catch (e) {
      console.error("Manual scan failed:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getRecordLink = (bn: any) => {
    if (bn.type.startsWith("SO_STUCK") || bn.type.startsWith("INVENTORY_DELAYED") || bn.type.startsWith("DELIVERY_DELAYED")) {
      return `/sales/${bn.recordId}`;
    }
    if (bn.type.startsWith("MO_NOT_STARTED") || bn.type.startsWith("MO_STALLED") || bn.type.startsWith("WO_OVERTIME")) {
      return `/manufacturing`; // Link to manufacturing dashboard or search
    }
    if (bn.type.startsWith("STOCKOUT_RISK")) {
      return `/inventory`;
    }
    return "#";
  };

  const filtered = activeBottlenecks.filter(b => {
    const stageMatch = selectedStage === "All" || b.stage.toLowerCase() === selectedStage.toLowerCase();
    const severityMatch = selectedSeverity === "All" || b.severity.toLowerCase() === selectedSeverity.toLowerCase();
    const textMatch = searchQuery === "" ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.recordNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.suggestedAction.toLowerCase().includes(searchQuery.toLowerCase());
    return stageMatch && severityMatch && textMatch;
  });

  // Calculate Health status for pipeline stages
  const getStageHealth = (stageName: string) => {
    const stageBottlenecks = activeBottlenecks.filter(b => b.stage.toLowerCase() === stageName.toLowerCase());
    if (stageBottlenecks.some(b => b.severity === "Critical")) return "critical";
    if (stageBottlenecks.length > 0) return "warning";
    return "healthy";
  };

  const pipelineStages = [
    {
      name: "Sales",
      health: getStageHealth("Sales"),
      activeLabel: "Confirmed Orders",
      count: salesOrders.filter(so => so.status === "Confirmed").length,
      description: "Order entry & quotation confirmation"
    },
    {
      name: "Inventory",
      health: getStageHealth("Inventory"),
      activeLabel: "Low Stock Items",
      count: products.filter(p => p.isActive && (p.onHand - p.reserved) <= p.reorderThreshold).length,
      description: "Reservation & component availability"
    },
    {
      name: "Manufacturing",
      health: getStageHealth("Manufacturing"),
      activeLabel: "Active Job Orders",
      count: manufacturingOrders.filter(mo => mo.status === "Confirmed" || mo.status === "In Progress" || mo.status === "Waiting for Materials").length,
      description: "Production routing & operations"
    },
    {
      name: "Delivery",
      health: getStageHealth("Delivery"),
      activeLabel: "Ready Shipments",
      count: salesOrders.filter(so => so.status === "Ready for Delivery" || so.status === "Partially Delivered").length,
      description: "Final logistics & dispatch"
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Live Status Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted/40">
            {criticalCount > 0 ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/20 opacity-75"></span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white">
                  <ShieldAlert className="h-5 w-5" />
                </div>
              </>
            ) : warningsCount > 0 ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/20 opacity-75"></span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold leading-tight">
              {criticalCount > 0
                ? "Critical Action Required"
                : warningsCount > 0
                ? "Attention Required"
                : "System Operations Healthy"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {activeBottlenecks.length === 0
                ? "All order pipelines are moving according to schedule."
                : `${activeBottlenecks.length} active process bottleneck${activeBottlenecks.length > 1 ? "s" : ""} detected.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Total Open:</span>
            <span className="font-semibold">{activeBottlenecks.length}</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-1.5 text-xs">
            <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
            <span className="font-medium text-muted-foreground">Critical:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">{criticalCount}</span>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-1.5 text-xs">
            <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
            <span className="font-medium text-muted-foreground">Warnings:</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">{warningsCount}</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/95 hover:shadow-sm disabled:opacity-50 transition-all cursor-pointer ml-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Scanning..." : "Scan Now"}
          </button>
        </div>
      </div>

      {/* 3. Cycle Health Overview */}
      <div className="space-y-3">
        <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cycle Health Overview</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pipelineStages.map((stage, idx) => {
            const isHealthy = stage.health === "healthy";
            const isWarning = stage.health === "warning";
            const isCritical = stage.health === "critical";

            return (
              <div key={stage.name} className="relative flex flex-col justify-between rounded-xl border bg-card p-4.5 shadow-xs transition-all hover:shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-base font-semibold">{stage.name}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isHealthy
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : isWarning
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 animate-pulse"
                      }`}
                    >
                      {stage.health}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{stage.description}</p>
                </div>

                <div className="mt-5 border-t border-border/60 pt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{stage.activeLabel}</span>
                  <span className="font-bold text-foreground">{stage.count}</span>
                </div>

                {idx < 3 && (
                  <div className="absolute top-1/2 -right-3.5 z-10 hidden -translate-y-1/2 rounded-full border bg-background p-1 text-muted-foreground lg:block">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Active Bottlenecks Panel */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Process Bottlenecks</h3>

          {/* Filtering & Search Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-xs flex-1">
              <input
                type="text"
                placeholder="Search bottlenecks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-8.5 rounded-lg border bg-card px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-muted-foreground">Filters</span>
            </div>

            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
              className="h-8.5 rounded-lg border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option disabled>Stage</option>
              {STAGES.map(s => (
                <option key={s} value={s}>{s === "All" ? "All Stages" : s}</option>
              ))}
            </select>

            <select
              value={selectedSeverity}
              onChange={e => setSelectedSeverity(e.target.value)}
              className="h-8.5 rounded-lg border bg-card px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option disabled>Severity</option>
              {SEVERITIES.map(sev => (
                <option key={sev} value={sev}>{sev === "All" ? "All Severities" : sev}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bottleneck Cards Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 py-12 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/60" />
            <p className="mt-2.5 text-sm font-medium text-muted-foreground">No active bottlenecks matching current filters</p>
            <p className="text-xs text-muted-foreground/75 mt-0.5">Adjust your filters or run a scan to find active issues.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map(bn => {
              const isCritical = bn.severity === "Critical";
              return (
                <div
                  key={bn.id}
                  className={`flex flex-col justify-between rounded-xl border bg-card p-5 shadow-xs transition-all hover:shadow-md ${
                    isCritical ? "border-l-4 border-l-red-500" : "border-l-4 border-l-amber-500"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              isCritical
                                ? "bg-red-500/10 text-red-700 dark:text-red-400"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {bn.severity}
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                            {bn.stage}
                          </span>
                        </div>
                        <h4 className="mt-2 text-sm font-semibold leading-tight text-foreground">{bn.title}</h4>
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            await dismissBottleneck(bn.id);
                          } catch (e: any) {
                            alert(e.message || "Failed to dismiss bottleneck");
                          }
                        }}
                        className="rounded-md border border-border/80 hover:bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>

                    {/* Stats & Metadata */}
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 rounded-lg bg-muted/40 p-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{bn.timeDetail}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Record:</span>
                        <Link
                          to={getRecordLink(bn)}
                          className="flex items-center font-bold text-accent hover:underline"
                        >
                          {bn.recordNumber}
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>

                    {/* Impact Analysis */}
                    <div className="mt-4.5 space-y-1 text-xs">
                      <div className="font-semibold text-muted-foreground">Operational Impact</div>
                      <p className="text-muted-foreground leading-relaxed">{bn.impact}</p>
                    </div>
                  </div>

                  {/* Suggested Resolution */}
                  <div className="mt-4.5 border-t border-border/60 pt-4 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <AlertCircle className="h-3.5 w-3.5 text-accent shrink-0" />
                      Suggested Action
                    </div>
                    <p className="mt-1 text-muted-foreground leading-relaxed">{bn.suggestedAction}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
