import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, Fragment } from "react";
import { motion } from "framer-motion";
import { useERP } from "@/lib/erp/store";

import {
  ArrowRight,
  Play,
  Sparkles,
  Boxes,
  ShoppingCart,
  Factory,
  AlertTriangle,
  LineChart,
  ClipboardList,
  Zap,
  ShieldCheck,
  Brain,
  Workflow,
  Globe2,
  Building2,
  CheckCircle2,
  TrendingUp,
  Activity,
  Package,
  Truck,
  Clock,
  Cpu,
  Mail,
  Phone,
  Wrench,
  TreePine,
  Wind,
  Layers,
  Settings,
  Sofa,
  Hammer,
  Warehouse,
} from "lucide-react";
import { RotatingWord } from "@/components/ui/animated-rotating-word";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { NavBar as TubelightNav } from "@/components/ui/tubelight-navbar";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import { StepCards } from "@/components/landing/step-cards";
import { CountUp } from "@/components/landing/count-up";
import DisplayCards from "@/components/ui/display-cards";
import { CircularTestimonials } from "@/components/ui/circular-testimonials";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shiv's Furniture Works ERP — AI-Powered Manufacturing Operations Platform" },
      {
        name: "description",
        content:
          "Stop managing operations in spreadsheets. Run inventory, procurement, manufacturing, sales, and analytics from one intelligent ERP platform.",
      },
      { property: "og:title", content: "Shiv's Furniture Works ERP — AI-Powered Manufacturing Operations" },
      {
        property: "og:description",
        content:
          "Unified AI-powered ERP for inventory, procurement, manufacturing, sales, and analytics.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const currentUserId = useERP((s) => s.currentUserId);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUserId) {
      navigate({ to: "/dashboard" });
    }
  }, [currentUserId, navigate]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <BackgroundFX />
      <Nav />
      <main className="relative">
        <Hero />
        <LogoStrip />
        <Problem />
        <Solution />
        <Features />
        <Impact />
        <HowItWorks />
        <DashboardShowcase />
        <Vendors />
        <Clientele />
        <WhyUs />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- Background ---------- */
function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
    </div>
  );
}

/* ---------- Nav ---------- */
function Nav() {
  const items = [
    { name: "Platform", url: "#features", icon: Boxes },
    { name: "Solution", url: "#solution", icon: Workflow },
    { name: "How it works", url: "#how", icon: Zap },
    { name: "Impact", url: "#impact", icon: TrendingUp },
  ];
  return (
    <>
      <header className="sticky top-0 z-40 w-full px-4">
        <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-2xl border border-white/5 bg-background/60 px-5 py-3 backdrop-blur-xl">
          <a href="#" className="flex items-center gap-2">
            <img src="/logo.png" alt="Shiv's Furniture Works ERP" className="h-24 md:h-32 object-contain transition-all" />
          </a>
          <nav className="hidden md:flex items-center gap-5">
            {items.map((item, idx) => {
              const Icon = item.icon;
              const gradients = [
                { from: '#a955ff', to: '#ea51ff' },
                { from: '#56CCF2', to: '#2F80ED' },
                { from: '#FF9966', to: '#FF5E62' },
                { from: '#80FF72', to: '#7EE8FA' },
              ];
              const { from, to } = gradients[idx % gradients.length];
              return (
                <a
                  key={item.name}
                  href={item.url}
                  style={{
                    // @ts-ignore
                    '--gradient-from': from,
                    // @ts-ignore
                    '--gradient-to': to
                  }}
                  className="relative w-[44px] h-[44px] bg-white border border-[#E8E2D9] shadow-sm rounded-full flex items-center justify-center transition-all duration-500 hover:w-[150px] hover:shadow-none group cursor-pointer"
                >
                  {/* Gradient background on hover */}
                  <span className="absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-all duration-500 group-hover:opacity-100"></span>
                  {/* Blur glow */}
                  <span className="absolute top-[8px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[10px] opacity-0 -z-10 transition-all duration-500 group-hover:opacity-40"></span>

                  {/* Icon */}
                  <span className="relative z-10 transition-all duration-500 group-hover:scale-0 delay-0 text-zinc-500 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>

                  {/* Title */}
                  <span className="absolute text-white uppercase tracking-wider text-[10px] font-extrabold transition-all duration-500 scale-0 group-hover:scale-100 delay-100 whitespace-nowrap">
                    {item.name}
                  </span>
                </a>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline">Sign in</Link>
            <Link to="/login" className="group inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-white shadow-[0_4px_24px_-4px_rgba(140,90,255,0.5)]" style={{ background: "var(--gradient-primary)" }}>
              Get Started
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </header>
      <div className="md:hidden">
        <TubelightNav items={items} />
      </div>
    </>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-20 sm:pt-28">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-gradient sm:text-6xl lg:text-7xl animate-fade-up" style={{ animationDelay: "60ms" }}>
          Stop managing operations
          <br />
          in{" "}
          <RotatingWord
            words={["spreadsheets.", "silos.", "chaos.", "the dark.", "guesswork."]}
          />
        </h1>
        <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg animate-fade-up" style={{ animationDelay: "140ms" }}>
          Track inventory, automate procurement, manage manufacturing, detect production
          bottlenecks, and gain complete operational visibility — from one unified platform.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "220ms" }}>
          <Link to="/login" className="group inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_40px_-10px_rgba(140,90,255,0.6)]" style={{ background: "var(--gradient-primary)" }}>
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <div className="relative mx-auto mt-16 max-w-6xl animate-fade-up" style={{ animationDelay: "320ms" }}>
        <div className="absolute -inset-x-10 -top-10 -z-10 h-72 rounded-[3rem] opacity-60 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        <div className="glass-card rounded-2xl p-3 sm:p-5 overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 pb-3 border-b border-white/5 mb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            <div className="ml-3 flex h-6 flex-1 items-center rounded-md bg-white/5 px-3 text-[11px] text-muted-foreground">
              app.shiverp.io / operations / dashboard
            </div>
          </div>
          <img src="/dashboard_actual.png" alt="Operations Dashboard" className="w-full h-auto rounded-xl shadow-lg border border-white/10" />
        </div>
      </div>
    </section>
  );
}

function HeroDashboard() {
  const [activeTab, setActiveTab] = useState("Overview");
  
  const initialLogs = [
    "CNC Milling completed Job #WO-9481 (50/50 parts)",
    "Low stock alert: Copper tubes dropped to 32 units",
    "Auto-Procure generated PO #4822 for 500 units of copper",
    "Vendor SwiftLogistics confirmed shipment for Steel Sheets",
  ];

  const allPossibleLogs = [
    "CNC Milling completed Job #WO-9481 (50/50 parts)",
    "Low stock alert: Copper tubes dropped to 32 units",
    "Auto-Procure generated PO #4822 for 500 units of copper",
    "Vendor SwiftLogistics confirmed shipment for Steel Sheets",
    "QA inspection complete: Batch #B-204 approved (99.8% precision)",
    "Assembly Line B efficiency optimized by 4.2% via AI adjustments",
    "Work order #WO-9485 released to production floor",
    "AI model forecasted 14% demand surge for Item #7492 next week",
    "CNC Lathe #2 entered standby mode (cleaning cycle)",
    "Delivery truck #T-92 dispatched with 120 finished cabinets",
    "Purchase Order PO-4821 approved by Procurement Manager",
    "Paint room temperature calibrated to 22.4°C (+0.2°C adjustment)",
  ];

  const [logs, setLogs] = useState(initialLogs);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(prev => {
        const nextLog = allPossibleLogs[(logIndex + prev.length) % allPossibleLogs.length];
        return [nextLog, ...prev.slice(0, 3)];
      });
      setLogIndex(prev => prev + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, [logIndex]);

  const tabs = [
    { i: Activity, l: "Overview" },
    { i: Boxes, l: "Inventory" },
    { i: Factory, l: "Manufacturing" },
    { i: LineChart, l: "Analytics" },
  ];

  return (
    <div className="glass-card rounded-2xl p-3 sm:p-5">
      <div className="flex items-center gap-1.5 px-2 pb-3 border-b border-white/5 mb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
        <div className="ml-3 flex h-6 flex-1 items-center rounded-md bg-white/5 px-3 text-[11px] text-muted-foreground">
          app.shiverp.io / operations / {activeTab.toLowerCase()}
        </div>
      </div>
      
      {/* Mobile tabs row */}
      <div className="col-span-12 flex lg:hidden gap-1.5 mb-3 overflow-x-auto pb-1 text-xs no-scrollbar">
        {tabs.map((it, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(it.l)}
            className={`flex items-center gap-1.5 shrink-0 rounded-lg px-3 py-2 border transition-all ${activeTab === it.l ? "bg-white/10 border-white/15 text-foreground font-medium" : "border-transparent text-muted-foreground hover:bg-white/5"}`}
          >
            <it.i className="h-3.5 w-3.5" />
            {it.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Desktop Sidebar */}
        <div className="col-span-2 hidden flex-col gap-1 rounded-xl bg-white/[0.03] p-3 text-xs lg:flex">
          {tabs.map((it, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(it.l)}
              className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left transition-all ${activeTab === it.l ? "bg-white/10 text-foreground font-semibold" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
            >
              <it.i className="h-3.5 w-3.5 text-primary" />
              {it.l}
            </button>
          ))}
        </div>
        
        {/* Main Content */}
        <div className="col-span-12 grid grid-cols-6 gap-3 lg:col-span-10">
          {activeTab === "Overview" && (
            <>
              <KPI label="Revenue" value="$2.84M" delta="+12.4%" icon={TrendingUp} />
              <KPI label="On-time Orders" value="98.2%" delta="+3.1%" icon={CheckCircle2} />
              <KPI label="Active Production" value="42" delta="+6" icon={Factory} />
              <div className="col-span-6 grid grid-cols-3 gap-3">
                <WidgetInventory />
                <WidgetProcurement />
                <WidgetBottleneck />
              </div>
              <div className="col-span-6 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Throughput</div>
                    <div className="text-sm font-semibold">Last 30 days</div>
                  </div>
                  <div className="flex gap-1 text-[10px] text-muted-foreground">
                    {["1D","1W","1M","3M","1Y"].map(t => (
                      <span key={t} className={`rounded px-2 py-0.5 ${t==="1M"?"bg-white/10 text-foreground":""}`}>{t}</span>
                    ))}
                  </div>
                </div>
                <Chart />
              </div>
            </>
          )}

          {activeTab === "Inventory" && (
            <>
              <KPI label="Total SKU Count" value="1,420 Items" delta="+14 added today" icon={Boxes} />
              <KPI label="Safety Stock Level" value="94.8%" delta="+0.5% buffer" icon={ShieldCheck} />
              <KPI label="Incoming Logist." value="12 Shipments" delta="4 arriving today" icon={Truck} />
              <div className="col-span-6 grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Boxes className="h-3.5 w-3.5 text-primary" /> Stock Allocations</div>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <Row label="Raw Materials" value="18,200 kg" />
                    <Row label="Work In Prog." value="4,500 units" tone="warn" />
                    <Row label="Finished Goods" value="12,050 units" tone="ok" />
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShoppingCart className="h-3.5 w-3.5 text-primary" /> Active POs</div>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <Row label="PO #4821 (Steel)" value="Shipped" tone="ok" />
                    <Row label="PO #4822 (Copper)" value="Pending" tone="warn" />
                    <Row label="PO #4823 (Resin)" value="Draft" />
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 text-red-400" /> Low Stock Alerts</div>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <Row label="Brass Joints" value="18 units" tone="warn" />
                    <Row label="Polymer P-12" value="45 units" tone="warn" />
                    <Row label="Steel Fasteners" value="150 units" tone="ok" />
                  </div>
                </div>
              </div>
              <div className="col-span-6 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="mb-2 text-xs text-muted-foreground">Warehouse Bay Occupancy</div>
                <div className="space-y-3 mt-3">
                  {[
                    { bay: "Bay A — Heavy Steel Components", fill: 85, status: "Near Capacity" },
                    { bay: "Bay B — Electrical & Wiring Hub", fill: 42, status: "Optimal" },
                    { bay: "Bay C — Fasteners & Packaging Materials", fill: 91, status: "Alert: Reorganize Needed" }
                  ].map((bay, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">{bay.bay}</span>
                        <span className={bay.fill > 90 ? "text-amber-400" : "text-foreground"}>{bay.fill}% ({bay.status})</span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${bay.fill > 90 ? "bg-amber-400" : "bg-primary"}`} style={{ width: `${bay.fill}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "Manufacturing" && (
            <>
              <KPI label="Active Work Orders" value="18 Orders" delta="4 completed today" icon={Factory} />
              <KPI label="Overall OEE" value="86.4%" delta="+1.2% this shift" icon={Activity} />
              <KPI label="Floor Personnel" value="45 Active" delta="3 lines running" icon={Building2} />
              <div className="col-span-6 grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5 text-primary" /> CNC Milling Line B</div>
                  <div className="mt-3 text-xs">
                    <Row label="Order" value="#WO-9481" />
                    <Row label="Status" value="Running" tone="ok" />
                    <div className="mt-2.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Progress</span><span>78%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full animate-pulse-glow" style={{ width: "78%" }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-3.5 w-3.5 text-primary" /> Robotic Assembly A</div>
                  <div className="mt-3 text-xs">
                    <Row label="Order" value="#WO-9483" />
                    <Row label="Status" value="Running" tone="ok" />
                    <div className="mt-2.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Progress</span><span>54%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: "54%" }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 text-red-400" /> Paint Shop Line C</div>
                  <div className="mt-3 text-xs">
                    <Row label="Order" value="#WO-9484" />
                    <Row label="Status" value="Bottlenecked" tone="warn" />
                    <div className="mt-2.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Cycle Time</span><span>150 min</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: "90%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-6 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">Machine Telemetry (OEE)</span>
                  <span className="text-[10px] text-emerald-400">All Nodes Online</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { m: "CNC Mill #1", oee: "88.2%", temp: "42°C", stat: "ok" },
                    { m: "CNC Mill #2", oee: "84.9%", temp: "45°C", stat: "ok" },
                    { m: "Laser Cutter #1", oee: "92.1%", temp: "38°C", stat: "ok" },
                    { m: "Paint Robot #1", oee: "72.4%", temp: "52°C", stat: "warn" }
                  ].map((mach, idx) => (
                    <div key={idx} className="border border-white/5 bg-black/15 rounded-lg p-2.5">
                      <div className="font-semibold">{mach.m}</div>
                      <div className="mt-1 flex justify-between text-muted-foreground text-[10px]">
                        <span>OEE</span>
                        <span className={mach.stat === "warn" ? "text-amber-400 font-semibold" : "text-emerald-400 font-semibold"}>{mach.oee}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground text-[10px]">
                        <span>Temp</span>
                        <span>{mach.temp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "Analytics" && (
            <>
              <KPI label="Quality Yield Rate" value="99.2%" delta="+0.3% scrap reduction" icon={Brain} />
              <KPI label="Energy Efficiency" value="4.8 kWh/unit" delta="-8% vs yesterday" icon={Zap} />
              <KPI label="Downtime Risks" value="0 Alerts" delta="All machines stable" icon={ShieldCheck} />
              <div className="col-span-6 grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Boxes className="h-3.5 w-3.5 text-primary" /> Material Savings</div>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <Row label="Metal Waste" value="-$1,250" tone="ok" />
                    <Row label="Chemicals" value="-$400" tone="ok" />
                    <Row label="Packaging" value="+$200" tone="warn" />
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Machine Health</div>
                  <div className="mt-3 space-y-2.5 text-xs">
                    <Row label="CNC Lathe" value="96% Score" tone="ok" />
                    <Row label="Hydraulics" value="92% Score" tone="ok" />
                    <Row label="Compressors" value="89% Score" />
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Brain className="h-3.5 w-3.5 text-primary" /> AI Insights</div>
                  <div className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                    Next preventative maintenance window in <span className="text-primary font-semibold">48h</span> for Paint Shop Line C.
                  </div>
                </div>
              </div>
              <div className="col-span-6 rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-muted-foreground">Production Forecast Chart (30 Days)</span>
                  <span className="text-[10px] text-primary">AI Projected Growth: +14.2%</span>
                </div>
                <Chart />
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Live Log Ticker */}
      <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Operations Log (AI Autopilot Active)
          </span>
          <span>Auto-Synced</span>
        </div>
        <div className="mt-2 space-y-1.5 h-[72px] overflow-hidden flex flex-col justify-end">
          {logs.map((log, idx) => (
            <div 
              key={idx} 
              className={`flex items-center gap-2 text-[11px] font-mono transition-all duration-500 ${idx === 0 ? "text-emerald-300 font-semibold" : "text-muted-foreground/60"}`}
            >
              <span className="text-emerald-500/60">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, delta, icon: Icon }: { label: string; value: string; delta: string; icon: any }) {
  return (
    <div className="col-span-6 sm:col-span-3 lg:col-span-2 rounded-xl border border-white/5 bg-white/[0.03] p-4 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <Icon className="h-3.5 w-3.5 text-primary animate-pulse-glow" />
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-[11px] text-emerald-400">{delta}</div>
    </div>
  );
}

function WidgetInventory() {
  return (
    <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Boxes className="h-3.5 w-3.5" /> Inventory</div>
      <div className="mt-3 space-y-2 text-xs">
        <Row label="Available" value="250" />
        <Row label="Reserved" value="120" tone="warn" />
        <Row label="Incoming" value="300" tone="ok" />
      </div>
    </div>
  );
}
function WidgetProcurement() {
  return (
    <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><ShoppingCart className="h-3.5 w-3.5" /> Procurement</div>
      <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-[11px] text-amber-300">
        Shortage: Steel Rods · 50 units
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">PO #4821 auto-generated</div>
    </div>
  );
}
function WidgetBottleneck() {
  return (
    <div className="col-span-3 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> Bottleneck</div>
      <div className="mt-3 text-sm font-semibold">Painting Floor</div>
      <div className="text-[11px] text-muted-foreground">Avg cycle: 150 min</div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-[78%] rounded-full" style={{ background: "linear-gradient(90deg,#f59e0b,#ef4444)" }} />
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "warn" | "ok" }) {
  const color = tone === "warn" ? "text-amber-300" : tone === "ok" ? "text-emerald-300" : "text-foreground";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${color}`}>{value}</span>
    </div>
  );
}

function Chart() {
  const points = [12, 18, 14, 22, 26, 20, 28, 32, 30, 36, 34, 42, 38, 46, 50, 48, 54, 60, 58, 66, 62, 70, 74, 72, 80, 78, 84, 88, 86, 92];
  const max = 100;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - (p / max) * 100;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const area = `${path} L 100 100 L 0 100 Z`;
  return (
    <div className="relative group/chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-32 w-full overflow-visible">
        <defs>
          <linearGradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.55 0.13 55)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="oklch(0.55 0.13 55)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="line-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="oklch(0.42 0.09 50)" />
            <stop offset="100%" stopColor="oklch(0.65 0.14 55)" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[20, 40, 60, 80].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.4" strokeDasharray="1,1" />
        ))}
        {/* Shaded Area */}
        <path d={area} fill="url(#chart-grad)" />
        {/* Glow path */}
        <path d={path} fill="none" stroke="oklch(0.55 0.13 55)" strokeWidth="1.6" strokeLinecap="round" className="opacity-45 blur-[2px]" />
        {/* Neon Line */}
        <path d={path} fill="none" stroke="url(#line-grad)" strokeWidth="1" strokeLinecap="round" />
        {/* Glowing dot on last point */}
        <circle cx="100" cy="8" r="1.5" fill="oklch(0.55 0.13 55)" className="animate-pulse" />
        <circle cx="100" cy="8" r="3" fill="none" stroke="oklch(0.55 0.13 55)" strokeWidth="0.5" className="animate-ping" style={{ transformOrigin: "100px 8px" }} />
      </svg>
    </div>
  );
}


/* ---------- Logos ---------- */
function LogoStrip() {
  const partners = [
    { name: "Northwind", icon: <Wind className="h-6 w-6 text-emerald-600" />, subtitle: "LOGISTICS" },
    { name: "Acme Fab", icon: <Factory className="h-6 w-6 text-amber-600" />, subtitle: "HEAVY MFG" },
    { name: "Steelcore", icon: <ShieldCheck className="h-6 w-6 text-sky-600" />, subtitle: "STRUCTURES" },
    { name: "Voltron", icon: <Zap className="h-6 w-6 text-yellow-600" />, subtitle: "AUTOMOTIVE" },
    { name: "Axion", icon: <Workflow className="h-6 w-6 text-purple-600" />, subtitle: "AEROSPACE" },
    { name: "Meridian", icon: <Globe2 className="h-6 w-6 text-primary" />, subtitle: "INDUSTRIES" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-12 border-b border-zinc-200/50">
      <p className="text-center text-sm uppercase tracking-[0.25em] text-muted-foreground font-bold">
        Trusted by operations teams at
      </p>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map((p, idx) => (
          <div
            key={idx}
            className="flex items-center gap-4 justify-start rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] backdrop-blur-sm transition-all hover:scale-102 hover:border-primary/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-50 border border-zinc-200">
              {p.icon}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[30px] font-extrabold tracking-tight text-zinc-900 leading-none font-display">{p.name}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mt-1 leading-none">{p.subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Problem ---------- */
function Problem() {
  const pains = [
    { 
      i: Boxes, 
      t: "Inventory Stockouts", 
      d: "Safety stock lapses halt lines and burn cash. Average mid-market plants lose 17% of annual profit to emergency logistics and shipping penalties." 
    },
    { 
      i: Clock, 
      t: "Schedule Slippage", 
      d: "Manual floor dispatching slips deadlines week after week. Over 60% of custom builders miss delivery promises due to machine bottlenecks." 
    },
    { 
      i: ShoppingCart, 
      t: "Reactive Purchasing", 
      d: "Emergency purchase orders and untracked vendors inflate raw material costs by up to 22% compared to structured contract rates." 
    },
    { 
      i: Workflow, 
      t: "Departmental Silos", 
      d: "Floor staff, buyers, and sales use separate logs. Up to 4.5 hours per employee per week is wasted chasing order updates via phone and email." 
    },
    { 
      i: AlertTriangle, 
      t: "Blind Spot Operations", 
      d: "Critical decisions are based on outdated morning reports. 74% of shop floor managers report reacting to failures hours after they occurred." 
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6">
      <ContainerScroll
        titleComponent={
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#7C5C3E]">
              The problem
            </div>
            <h2 className="mt-4 section-heading">
              The hidden cost of poor operations
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
              Spreadsheets and disconnected tools quietly drain revenue, delay deliveries, and frustrate customers.
            </p>
          </div>
        }
      >
        <div className="h-full w-full overflow-auto p-6">
          <div className="grid h-full gap-4 md:grid-cols-3 lg:grid-cols-5">
            {pains.map((p, i) => (
              <div key={i} className="glass-card group rounded-2xl p-5 transition hover:-translate-y-1 hover:border-white/20">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-500/10 text-red-300">
                  <p.i className="h-5 w-5" />
                </div>
                <div className="mt-4 text-sm font-semibold">{p.t}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{p.d}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {["Lost revenue", "Delayed deliveries", "Operational waste", "Customer churn"].map(c => (
              <div key={c} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> {c}
              </div>
            ))}
          </div>
        </div>
      </ContainerScroll>
    </section>
  );
}

/* ---------- Solution ---------- */
function Solution() {
  const solutionData = [
    { id: 1, title: "Inventory", date: "Real-time", content: "Live stock visibility across every warehouse with reserved & incoming tracking.", category: "Core", icon: Boxes, relatedIds: [2, 3], status: "completed" as const, energy: 95 },
    { id: 2, title: "Procurement", date: "Automated", content: "Shortage detection and auto-generated POs with vendor scoring.", category: "Core", icon: ShoppingCart, relatedIds: [1, 3], status: "completed" as const, energy: 90 },
    { id: 3, title: "Manufacturing", date: "Connected", content: "Work orders, BOMs, and floor monitoring linked to inventory and sales.", category: "Core", icon: Factory, relatedIds: [1, 2, 4], status: "in-progress" as const, energy: 85 },
    { id: 4, title: "Sales", date: "End-to-end", content: "Order lifecycle from quote to delivery with full traceability.", category: "Core", icon: ClipboardList, relatedIds: [3, 5], status: "completed" as const, energy: 80 },
    { id: 5, title: "Analytics", date: "Always-on", content: "KPI dashboards and AI insights for every role.", category: "Core", icon: LineChart, relatedIds: [4, 1], status: "in-progress" as const, energy: 75 },
  ];
  return (
    <section id="solution" className="relative mx-auto max-w-7xl px-6 py-28">
      <SectionHeader
        eyebrow="The solution"
        title={<>One platform. <span className="text-gradient-primary">Complete operational control.</span></>}
        subtitle="Connect Inventory, Procurement, Manufacturing, Sales, and Analytics in a single intelligent ecosystem."
      />
      <div className="mt-14 grid items-center gap-10 lg:grid-cols-2">
        <div className="glass-card relative aspect-square rounded-3xl overflow-hidden">
          <RadialOrbitalTimeline timelineData={solutionData} />
        </div>
        <div className="space-y-6">
          {[
            { t: "Unified data model", d: "Inventory, BOMs, POs, work orders, customers — one source of truth." },
            { t: "AI-driven decisions", d: "Forecast demand, detect bottlenecks, and recommend actions automatically." },
            { t: "Automated workflows", d: "Shortage triggers POs. Completed work triggers shipping. Zero manual chasing." },
            { t: "Live operational visibility", d: "Every department, every shift, every order — in real time." },
          ].map((x, i) => (
            <div key={i} className="flex gap-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: "var(--gradient-primary)" }}>
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-base font-semibold">{x.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{x.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Features ---------- */
function Features() {
  const features = [
    { i: Boxes, t: "Smart Inventory Management", d: "Real-time stock visibility, reserved stock tracking, and incoming inventory at every warehouse.", tag: "Inventory" },
    { i: ShoppingCart, t: "Automated Procurement", d: "Shortage detection, auto-generated purchase orders, and vendor performance scoring.", tag: "Procurement" },
    { i: Factory, t: "Manufacturing Control", d: "Production order tracking, raw material consumption, and finished goods monitoring.", tag: "Production" },
    { i: AlertTriangle, t: "Bottleneck Detection", d: "Department performance monitoring, delay alerts, and throughput analytics.", tag: "AI" },
    { i: ClipboardList, t: "Sales & Order Management", d: "Order lifecycle tracking, fulfillment visibility, and customer order management.", tag: "Sales" },
    { i: LineChart, t: "Advanced Analytics", d: "KPI dashboards, performance reports, and business intelligence for every role.", tag: "Insights" },
  ];
  
  const doubleFeatures = [...features, ...features];

  return (
    <section id="features" className="py-28 overflow-hidden">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader eyebrow="Platform" title="Built for every layer of the factory floor" subtitle="A modular ERP designed around real manufacturing workflows — not generic business processes." />
      </div>
      
      <div className="relative mt-14 w-full overflow-hidden select-none">
        {/* Soft blur overlays on left and right for premium depth */}
        <div className="absolute left-0 top-0 bottom-0 z-10 w-20 md:w-32 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 z-10 w-20 md:w-32 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        
        <div className="flex gap-5 w-max marquee-track hover:[animation-play-state:paused]">
          {doubleFeatures.map((f, i) => (
            <div
              key={i}
              className="glass-card group relative w-[22rem] shrink-0 overflow-hidden rounded-2xl p-6 transition hover:-translate-y-1 hover:border-white/20"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition group-hover:opacity-60" style={{ background: "var(--gradient-primary)" }} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5">
                    <f.i className="h-5 w-5 text-primary" />
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{f.tag}</span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#7C5C3E] font-display">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-4 max-w-7xl px-6 text-center text-xs text-muted-foreground">hover to pause scrolling</div>
    </section>
  );
}

/* ---------- Impact ---------- */
function Impact() {
  const statItems = [
    {
      id: 1,
      targetValue: 98,
      prefix: "Up to ",
      suffix: "%",
      label: "Order fulfillment accuracy",
      description: "Real-time stock visibility at the point of sale is designed to eliminate orders placed against inventory that doesn't exist.",
      x2: "35%",
      y2: "22%"
    },
    {
      id: 2,
      targetValue: 3,
      prefix: "Up to ",
      suffix: "x",
      label: "Faster procurement response",
      description: "Automatic shortage detection and purchase order generation is designed to remove the manual delay between noticing a shortage and acting on it.",
      x2: "65%",
      y2: "22%"
    },
    {
      id: 3,
      isStringValue: true,
      stringValue: "Single",
      label: "Source of truth for stock",
      description: "Every sale, purchase, and manufacturing step updates the same ledger, designed to eliminate the spreadsheet-vs-reality mismatch.",
      x2: "35%",
      y2: "78%"
    },
    {
      id: 4,
      targetValue: 40,
      prefix: "Up to ",
      suffix: "%",
      label: "Reduction in production delays",
      description: "Bottleneck detection across work centers is designed to surface the exact production step causing delays, before it impacts delivery.",
      x2: "65%",
      y2: "78%"
    }
  ];

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleLogoClick = () => {
    setRevealedIndex(prev => {
      if (prev >= 3) {
        return -1; // Reset to only logo visible
      }
      return prev + 1; // Show next card
    });
  };

  const getLogoLabel = () => {
    if (revealedIndex === -1) return "Click to Reveal (1/4)";
    if (revealedIndex === 0) return "Click to Reveal (2/4)";
    if (revealedIndex === 1) return "Click to Reveal (3/4)";
    if (revealedIndex === 2) return "Click to Reveal (4/4)";
    return "Click to Reset";
  };

  return (
    <section id="impact" ref={sectionRef} className="mx-auto max-w-7xl px-6 py-28 relative overflow-hidden">
      
      {/* Header Info */}
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#7C5C3E]">
          Business Impact
        </div>
        <h2 className="section-heading">
          Measurable outcomes from day one
        </h2>
        <p className="text-[#6B6258] text-base sm:text-lg leading-relaxed">
          Built to replace scattered spreadsheets and manual tracking with one connected system — here's what that's designed to deliver.
        </p>
        <p className="text-[11px] text-zinc-500 italic mt-2">
          *Projected outcomes based on system design — not measured production results.
        </p>
      </div>

      {/* Grid container with sequential animate-in */}
      <div className="relative min-h-[480px] flex flex-col justify-center">

        {/* Mobile Center Logo (Clickable) */}
        <div className="flex md:hidden flex-col items-center justify-center mb-10 relative">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 12 }}
            onClick={handleLogoClick}
            className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#C76B3F]/30 bg-white shadow-lg cursor-pointer hover:scale-105 active:scale-95 hover:shadow-[0_0_24px_rgba(199,107,63,0.35)] hover:border-[#C76B3F] transition-all duration-300 group"
          >
            <img src="/logo.png" alt="Shiv's Furniture" className="h-12 object-contain px-2 select-none" />
            <span className="absolute -bottom-7 text-[9px] uppercase tracking-wider text-zinc-400 font-bold select-none whitespace-nowrap opacity-75 group-hover:opacity-100 transition-opacity">
              {getLogoLabel()}
            </span>
          </motion.div>
        </div>

        {/* SVG Drawing Lines (Desktop only) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none -z-10 max-md:hidden">
          {statItems.map((item, idx) => (
            <motion.line
              key={item.id}
              x1="50%"
              y1="50%"
              x2={item.x2}
              y2={item.y2}
              stroke="#C76B3F"
              strokeWidth="2"
              strokeOpacity="0.25"
              strokeDasharray="5 5"
              initial={{ pathLength: 0 }}
              animate={revealedIndex >= idx ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          ))}
        </svg>

        {/* Desktop Layout: 3 Columns (Left Cards, Center Anchor, Right Cards) */}
        <div className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center gap-x-20 gap-y-10 max-w-5xl mx-auto w-full">
          
          {/* Left Column (Cards 1 and 3) */}
          <div className="flex flex-col gap-16 justify-between h-full py-4">
            
            {/* Card 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95, pointerEvents: "none" }}
              animate={revealedIndex >= 0 ? { opacity: 1, y: 0, scale: 1, pointerEvents: "auto" as const } : { opacity: 0, y: 30, scale: 0.95, pointerEvents: "none" as const }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl p-7 border border-[#E8E2D9] shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow relative"
            >
              <div className="text-5xl font-extrabold tracking-tight text-[#C76B3F] font-display">
                <StatCounter
                  target={statItems[0].targetValue || 0}
                  active={revealedIndex >= 0}
                  prefix={statItems[0].prefix}
                  suffix={statItems[0].suffix}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </div>
              <h3 className="text-base font-bold text-[#2B2622]">{statItems[0].label}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{statItems[0].description}</p>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95, pointerEvents: "none" }}
              animate={revealedIndex >= 2 ? { opacity: 1, y: 0, scale: 1, pointerEvents: "auto" as const } : { opacity: 0, y: 30, scale: 0.95, pointerEvents: "none" as const }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl p-7 border border-[#E8E2D9] shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow relative"
            >
              <div className="text-5xl font-extrabold tracking-tight text-[#C76B3F] font-display">
                {statItems[2].stringValue}
              </div>
              <h3 className="text-base font-bold text-[#2B2622]">{statItems[2].label}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{statItems[2].description}</p>
            </motion.div>

          </div>

          {/* Center Column (Circular Anchor) */}
          <div className="flex flex-col items-center justify-center relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100, damping: 12 }}
              onClick={handleLogoClick}
              className="relative z-10 flex h-32 w-32 items-center justify-center rounded-full border-2 border-[#C76B3F]/30 bg-white shadow-lg cursor-pointer hover:scale-110 active:scale-95 hover:shadow-[0_0_32px_rgba(199,107,63,0.4)] hover:border-[#C76B3F] transition-all duration-300 group"
            >
              <img src="/logo.png" alt="Shiv's Furniture" className="h-14 object-contain px-2 select-none" />
              <span className="absolute -bottom-8 text-[10px] uppercase tracking-wider text-zinc-400 font-bold select-none whitespace-nowrap opacity-75 group-hover:opacity-100 transition-opacity">
                {getLogoLabel()}
              </span>
            </motion.div>
          </div>

          {/* Right Column (Cards 2 and 4) */}
          <div className="flex flex-col gap-16 justify-between h-full py-4">
            
            {/* Card 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95, pointerEvents: "none" }}
              animate={revealedIndex >= 1 ? { opacity: 1, y: 0, scale: 1, pointerEvents: "auto" as const } : { opacity: 0, y: 30, scale: 0.95, pointerEvents: "none" as const }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl p-7 border border-[#E8E2D9] shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow relative"
            >
              <div className="text-5xl font-extrabold tracking-tight text-[#C76B3F] font-display">
                <StatCounter
                  target={statItems[1].targetValue || 0}
                  active={revealedIndex >= 1}
                  prefix={statItems[1].prefix}
                  suffix={statItems[1].suffix}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </div>
              <h3 className="text-base font-bold text-[#2B2622]">{statItems[1].label}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{statItems[1].description}</p>
            </motion.div>

            {/* Card 4 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95, pointerEvents: "none" }}
              animate={revealedIndex >= 3 ? { opacity: 1, y: 0, scale: 1, pointerEvents: "auto" as const } : { opacity: 0, y: 30, scale: 0.95, pointerEvents: "none" as const }}
              transition={{ duration: 0.4 }}
              className="bg-white rounded-2xl p-7 border border-[#E8E2D9] shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow relative"
            >
              <div className="text-5xl font-extrabold tracking-tight text-[#C76B3F] font-display">
                <StatCounter
                  target={statItems[3].targetValue || 0}
                  active={revealedIndex >= 3}
                  prefix={statItems[3].prefix}
                  suffix={statItems[3].suffix}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </div>
              <h3 className="text-base font-bold text-[#2B2622]">{statItems[3].label}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{statItems[3].description}</p>
            </motion.div>

          </div>

        </div>

        {/* Mobile Layout: Vertical Stacking with Sequential Divider Strokes */}
        <div className="flex flex-col md:hidden max-w-md mx-auto w-full gap-2">
          {statItems.map((item, idx) => {
            const isLast = idx === statItems.length - 1;
            return (
              <Fragment key={item.id}>
                {/* Card */}
                <motion.div
                  initial={{ opacity: 0, y: 25, scale: 0.96, pointerEvents: "none" }}
                  animate={revealedIndex >= idx ? { opacity: 1, y: 0, scale: 1, pointerEvents: "auto" as const } : { opacity: 0, y: 25, scale: 0.96, pointerEvents: "none" as const }}
                  transition={{ duration: 0.4 }}
                  className="bg-white rounded-2xl p-6 border border-[#E8E2D9] shadow-sm flex flex-col gap-3"
                >
                  <div className="text-4xl font-extrabold tracking-tight text-[#C76B3F] font-display">
                    {item.isStringValue ? (
                      item.stringValue
                    ) : (
                      <StatCounter
                        target={item.targetValue || 0}
                        active={revealedIndex >= idx}
                        prefix={item.prefix}
                        suffix={item.suffix}
                        prefersReducedMotion={prefersReducedMotion}
                      />
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#2B2622]">{item.label}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{item.description}</p>
                </motion.div>

                {/* Dotted connector stroke to next card */}
                {!isLast && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={revealedIndex >= idx ? { height: 28 } : { height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-[2px] bg-gradient-to-b from-[#C76B3F]/30 to-transparent mx-auto overflow-hidden shrink-0"
                  />
                )}
              </Fragment>
            );
          })}
        </div>

      </div>

    </section>
  );
}

function StatCounter({
  target,
  active,
  prefix = "",
  suffix = "",
  prefersReducedMotion
}: {
  target: number;
  active: boolean;
  prefix?: string;
  suffix?: string;
  prefersReducedMotion: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }
    if (!active) return;

    let start: number | null = null;
    const duration = 1000; // 1s count-up

    const tick = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const p = Math.min(1, progress / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setCount(target * eased);
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(tick);
  }, [target, active, prefersReducedMotion]);

  const displayVal = target % 1 === 0 ? Math.round(count) : count.toFixed(1);

  return (
    <span>
      {prefix}
      {prefersReducedMotion ? target : displayVal}
      {suffix}
    </span>
  );
}

/* ---------- How it works ---------- */
function HowItWorks() {
  const steps = [
    { n: "01", i: Activity, t: "Detect", d: "Continuously monitor inventory levels, production progress, and order pipelines across every site — surfacing risk before it becomes a missed shipment." },
    { n: "02", i: Zap, t: "Automate", d: "Trigger procurement, manufacturing, and fulfillment actions automatically. Shortages spawn POs, completed work orders release shipments — no manual chasing." },
    { n: "03", i: Workflow, t: "Optimize", d: "AI continuously rebalances workloads, predicts bottlenecks, and routes work to the right floor at the right time." },
    { n: "04", i: Truck, t: "Deliver", d: "Ship complete orders on time, every time, with full traceability from raw material to customer doorstep." },
  ];
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-28">
      <SectionHeader eyebrow="How it works" title="From signal to shipment in four steps" subtitle="A closed-loop operating system that turns operational data into decisive action — tap a step to explore." />
      <div className="mt-14">
        <StepCards steps={steps} />
      </div>
    </section>
  );
}

function DashboardShowcase() {
  const showcaseCards = [
    {
      icon: <Boxes className="size-4 text-primary" />,
      title: "Smart Inventory",
      description: "Available: 42 units",
      date: "Updated 2 mins ago",
      titleClassName: "text-zinc-900",
      className: "rotate-[-2deg] hover:-translate-y-1.5 transition-all duration-300",
    },
    {
      icon: <Factory className="size-4 text-emerald-600" />,
      title: "Active Manufacturing",
      description: "MO-0034 in progress",
      date: "2 mins ago",
      titleClassName: "text-emerald-700",
      className: "rotate-[1.5deg] hover:-translate-y-1.5 transition-all duration-300",
    },
    {
      icon: <AlertTriangle className="size-4 text-red-500" />,
      title: "Bottleneck Detected",
      description: "Painting Floor average time is 150 mins",
      date: "10 mins ago",
      titleClassName: "text-red-600",
      className: "rotate-[-1deg] hover:-translate-y-1.5 transition-all duration-300",
    },
    {
      icon: <ShoppingCart className="size-4 text-amber-600" />,
      title: "Auto Purchase Order",
      description: "PO-0089 created for Teak Wood",
      date: "5 mins ago",
      titleClassName: "text-amber-700",
      className: "rotate-[2deg] hover:-translate-y-1.5 transition-all duration-300",
    },
    {
      icon: <Package className="size-4 text-primary" />,
      title: "Stock Reserved",
      description: "10 units reserved for SO-0021",
      date: "Just now",
      titleClassName: "text-zinc-900",
      className: "rotate-[-2.5deg] hover:-translate-y-1.5 transition-all duration-300",
    },
    {
      icon: <Activity className="size-4 text-zinc-500" />,
      title: "Audit Trail",
      description: "Sales price updated on Wooden Chair",
      date: "14 mins ago",
      titleClassName: "text-zinc-600",
      className: "rotate-[1.5deg] hover:-translate-y-1.5 transition-all duration-300",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <SectionHeader eyebrow="Inside the platform" title="A workspace your operations team will actually use" subtitle="Every widget designed around the real questions floor managers ask every shift." />
      <div className="w-full mt-10">
        <DisplayCards cards={showcaseCards} />
      </div>
    </section>
  );
}

/* ---------- Clientele ---------- */
function Clientele() {
  const segments = [
    {
      title: "Furniture Manufacturers",
      description: "Production lines optimized for tables, seating, and casegoods.",
      icon: <Sofa className="h-7 w-7 text-[#7C5C3E]" />,
      badgeBg: "bg-[#7C5C3E]/5 border-[#7C5C3E]/10"
    },
    {
      title: "Custom Woodworking Shops",
      description: "Job-shop routing for bespoke design orders and custom sizing.",
      icon: <Hammer className="h-7 w-7 text-amber-600" />,
      badgeBg: "bg-amber-500/5 border-amber-500/10"
    },
    {
      title: "Wholesale Furniture Suppliers",
      description: "Direct inventory sync with distribution hubs and dealer chains.",
      icon: <Warehouse className="h-7 w-7 text-emerald-600" />,
      badgeBg: "bg-emerald-500/5 border-emerald-500/10"
    },
    {
      title: "Contract Manufacturers",
      description: "High-volume OEM production matching rigid institutional specs.",
      icon: <Factory className="h-7 w-7 text-zinc-600" />,
      badgeBg: "bg-zinc-500/5 border-zinc-500/10"
    },
    {
      title: "Export & Trading Houses",
      description: "LCL/FCL shipping logs, customs compliance, and packing audits.",
      icon: <Truck className="h-7 w-7 text-blue-600" />,
      badgeBg: "bg-blue-500/5 border-blue-500/10"
    },
    {
      title: "Multi-Unit Production Facilities",
      description: "Multi-plant operations running synchronized materials planning.",
      icon: <Building2 className="h-7 w-7 text-purple-600" />,
      badgeBg: "bg-purple-500/5 border-purple-500/10"
    }
  ];

  const [rotations, setRotations] = useState<number[]>([]);
  useEffect(() => {
    // Generate slight alternating rotations for organic feel
    const newRots = Array.from({ length: 6 }, (_, idx) => {
      const dir = idx % 2 === 0 ? -1 : 1;
      return (Math.random() * 2 + 1) * dir; // -3 to -1 or +1 to +3 degrees
    });
    setRotations(newRots);
  }, []);

  return (
    <section className="w-full bg-[#FAF8F5] py-24 border-y border-[#E8E2D9] overflow-hidden">
      <div className="mx-auto max-w-7xl px-8 flex flex-col lg:flex-row items-start justify-between gap-12">
        
        {/* Left Side: Copy */}
        <div className="lg:w-1/3 text-left space-y-5 lg:sticky lg:top-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-white px-3.5 py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-[#7C5C3E]">
            Built For
          </div>
          <h2 className="section-heading">
            Built for <span className="text-[#C76B3F]">furniture manufacturers</span>
          </h2>
          <p className="text-[#6B6258] text-base sm:text-lg leading-relaxed max-w-sm">
            From small workshops to growing manufacturing operations — built for the businesses that make, assemble, and ship physical products every day.
            <span className="block mt-4 text-xs font-semibold text-[#7C5C3E] uppercase tracking-wider">
              ✦ Try dragging the cards to rearrange
            </span>
          </p>
        </div>

        {/* Right Side: Clean Even Grid */}
        <div className="lg:w-2/3 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {segments.map((seg, idx) => (
              <motion.div 
                key={idx}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.15}
                dragTransition={{ bounceStiffness: 400, bounceDamping: 18 }}
                whileTap={{ scale: 1.05, zIndex: 99 }}
                whileHover={{
                  scale: 1.05,
                  rotateZ: (rotations[idx] || 0) * 0.5,
                  zIndex: 99,
                }}
                whileDrag={{
                  scale: 1.05,
                  zIndex: 99,
                }}
                initial={{ opacity: 0, scale: 0.9, rotate: 0 }}
                whileInView={{
                  opacity: 1,
                  scale: 1,
                  rotate: rotations[idx] || 0,
                  transition: {
                    type: "spring",
                    stiffness: 80,
                    damping: 15,
                    delay: idx * 0.08,
                  }
                }}
                viewport={{ once: true, margin: "-100px" }}
                style={{
                  touchAction: "none",
                  userSelect: "none",
                }}
                className="bg-white rounded-2xl p-7 border border-[#E8E2D9] shadow-sm flex flex-col gap-5 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
              >
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${seg.badgeBg}`}>
                  {seg.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#2B2622] font-display">{seg.title}</h3>
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{seg.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

/* ---------- Why Us ---------- */
function WhyUs() {
  return _WhyUs();
}

/* ---------- Vendors / Integrations Marquee ---------- */
function Vendors() {
  const vendors = [
    {
      name: "Blum Hardware",
      type: "Hinge Systems",
      icon: <Wrench className="h-5 w-5 text-rose-500" />,
    },
    {
      name: "Häfele Architectural",
      type: "Fittings & Locks",
      icon: <Building2 className="h-5 w-5 text-sky-500" />,
    },
    {
      name: "FSC Certified Timber",
      type: "Sustainable Wood",
      icon: <TreePine className="h-5 w-5 text-emerald-600" />,
    },
    {
      name: "Lumina Fabrics",
      type: "Polyurethane Coatings",
      icon: <Layers className="h-5 w-5 text-purple-500" />,
    },
    {
      name: "Global Fasteners",
      type: "Precision Screws",
      icon: <Settings className="h-5 w-5 text-zinc-500" />,
    },
    {
      name: "SwiftLogistics API",
      type: "Delivery Sync",
      icon: <Truck className="h-5 w-5 text-orange-500" />,
    },
    {
      name: "Northwind Supply",
      type: "Raw Lumber Logs",
      icon: <Wind className="h-5 w-5 text-teal-600" />,
    },
    {
      name: "Acme Fabrication",
      type: "Custom Metal Parts",
      icon: <Factory className="h-5 w-5 text-amber-600" />,
    },
  ];
  const loop = [...vendors, ...vendors];
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Integrations & vendors"
          title="Trusted by the partners that move manufacturing"
          subtitle="Plug into the suppliers, hardware, and logistics platforms you already work with."
        />
      </div>
      <div
        className="group relative mt-12 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent, black 12%, black 88%, transparent)",
        }}
      >
        <div className="flex w-max marquee-track gap-6 group-hover:[animation-play-state:paused]">
          {loop.map((v, i) => (
            <div
              key={i}
              className="flex h-20 w-72 shrink-0 items-center gap-4 justify-start rounded-2xl border border-zinc-200/80 bg-white px-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition hover:border-primary/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-200/60">
                {v.icon}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold tracking-wide text-zinc-800">{v.name}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{v.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function _WhyUs() {
  const testimonials = [
    {
      eyebrow: "INVENTORY ENGINE",
      heading: "Closed-loop automated production",
      paragraph: "Every sale, purchase, and manufacturing step updates the same stock record automatically — no spreadsheets, no manual reconciliation, no guesswork.",
      bullets: [
        "Automatic stock reservation on order confirmation",
        "Auto-generated purchase or manufacturing orders on shortage",
        "Real-time free-to-use inventory across every module",
      ],
      stat: "Zero manual stock reconciliation",
      src: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1368&auto=format&fit=crop",
    },
    {
      eyebrow: "SALES INTEGRATION",
      heading: "Never sell what you don't have",
      paragraph: "See exactly what's available on the shop floor before promising a ship date. Shiv's Furniture Works ERP gives sales reps a direct window into actual free-to-use quantities.",
      bullets: [
        "Live stock availability checks during order entry",
        "Automatic reservation of raw lumber and components",
        "Partial and full delivery tracking in real-time",
      ],
      stat: "One source of truth across 6 modules",
      src: "https://images.unsplash.com/photo-1426927308491-6380b6a9936f?q=80&w=1368&auto=format&fit=crop",
    },
    {
      eyebrow: "PROCUREMENT AUTOMATION",
      heading: "Procurement that decides for itself",
      paragraph: "Stop scanning inventory reports to find out what to buy. When raw wood or hardware dips below safety levels, draft orders are generated automatically.",
      bullets: [
        "Auto-created Purchase Orders for hardware and materials",
        "Auto-generated Manufacturing Orders for assembled components",
        "Smart deduplication to prevent accidental double ordering",
      ],
      stat: "100% automated shortage triggers",
      src: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=1368&auto=format&fit=crop",
    },
    {
      eyebrow: "OPERATIONS ANALYTICS",
      heading: "Find your bottleneck before it finds you",
      paragraph: "Track actual build times against your standard estimates. Identify exactly which work center is slowing down shipments before it impacts customers.",
      bullets: [
        "Real-time average duration tracking per work center",
        "Automatic flagging of assembly and painting floor delays",
        "Up-to-the-minute visibility of all pending shop floor jobs",
      ],
      stat: "Real-time work center duration tracking",
      src: "/bottleneck.png",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-28">
      <SectionHeader eyebrow="Why Shiv's Furniture" title="Engineered for modern manufacturing" />
      <div className="mt-14 flex items-center justify-center relative bg-white/[0.02] border border-white/5 rounded-3xl p-6 sm:p-12 overflow-hidden">
        <CircularTestimonials
          testimonials={testimonials}
          autoplay={true}
          colors={{
            arrowBackground: "var(--primary)",
            arrowForeground: "#ffffff",
            arrowHoverBackground: "oklch(0.62 0.12 55)",
          }}
        />
      </div>
    </section>
  );
}

/* ---------- Final CTA ---------- */
function FinalCTA() {
  return (
    <section id="cta" className="mx-auto max-w-7xl px-6 py-28">
      <div className="glass-card relative overflow-hidden rounded-3xl p-8 sm:p-12">
        <div className="absolute inset-x-0 -top-32 mx-auto h-72 w-[40rem] rounded-full opacity-40 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        
        <div className="relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Connect with our <span className="text-gradient-primary">Operations Experts</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Ready to streamline your shop floor? Reach out to our technical integration desk, explore enterprise licensing, or visit one of our innovation hubs.
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3 text-left border-t border-white/5 pt-8">
            {/* Column 1: Locations */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="h-4.5 w-4.5 text-primary" />
                <span>Our Hubs</span>
              </div>
              <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground block">Corporate Headquarters</span>
                  500 Innovation Way, Suite 300<br />Boston, MA 02110
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Manufacturing Testing Hub</span>
                  100 Industrial Parkway<br />Detroit, MI 48201
                </div>
              </div>
            </div>
            
            {/* Column 2: Contacts */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Globe2 className="h-4.5 w-4.5 text-primary" />
                <span>Direct Channels</span>
              </div>
              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block">General Inquiries</span>
                    <a href="mailto:contact@shiverp.in" className="text-foreground hover:underline">contact@shiverp.in</a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Enterprise Sales</span>
                    <a href="mailto:sales@shiverp.in" className="text-foreground hover:underline">sales@shiverp.in</a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Support Line</span>
                    <a href="tel:+18005550199" className="text-foreground hover:underline">+1 (800) 555-0199</a>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Column 3: Hours */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Clock className="h-4.5 w-4.5 text-primary" />
                <span>Operating Hours</span>
              </div>
              <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground block">Technical Desk & Support</span>
                  Monday – Friday<br />8:00 AM – 6:00 PM EST
                </div>
                <div>
                  <span className="font-semibold text-foreground block">Autopilot Operations</span>
                  Active 24/7/365<br />
                  <span className="inline-flex items-center gap-1.5 mt-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    All systems nominal
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-xs text-muted-foreground sm:flex-row">

        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Shiv's Furniture Works ERP" className="h-16 object-contain bg-white/10 rounded-xl px-3 py-1.5" />
          <span>© {new Date().getFullYear()} Shiv's Furniture Works ERP. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">Security</a>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Section header ---------- */
function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-white px-3.5 py-1.5 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#7C5C3E]">
        {eyebrow}
      </div>
      <h2 className="mt-4 section-heading">{title}</h2>
      {subtitle && <p className="mt-4 text-base text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
