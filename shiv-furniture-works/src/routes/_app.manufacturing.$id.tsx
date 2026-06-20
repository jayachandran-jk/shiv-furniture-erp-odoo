import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { useEffect, useState, useRef } from "react";
import { hasPermission } from "@/lib/erp/permissions";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { Button, StatusStepper, Field, Input, Select } from "@/components/erp/ui";
import { format } from "date-fns";
import { ArrowLeft, Play, Pause, Check, Pencil, X, Save, Package, ShoppingCart } from "lucide-react";
import type { WorkOrder } from "@/lib/erp/types";
import { useWorkOrderContext } from "@/lib/erp/WorkOrderContext";

export const Route = createFileRoute("/_app/manufacturing/$id")({
  component: MoDetail,
});

// STEPS defined dynamically inside component

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}h ` : ""}${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
}

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

function MoDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const writable = hasPermission(user?.role, "manufacturing:write");
  const {
    manufacturingOrders, products, workCenters, users, salesOrders,
    confirmManufacturingOrder, setWorkOrderStatus, completeManufacturingOrder, cancelManufacturingOrder,
    updateManufacturingOrder, tick, refreshData
  } = useERP();
  void tick;
  const mo = manufacturingOrders.find(m => m.id === id);

  const [editingComponents, setEditingComponents] = useState(false);
  const [editComponents, setEditComponents] = useState<{ productId: string; requiredQty: number }[]>([]);

  // Consume WorkOrderContext instead of local timers
  const { workOrders, startWorkOrder, completeWorkOrder } = useWorkOrderContext();
  const moWorkOrders = workOrders.filter(wo => wo.moId === mo?.id);

  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  // Bottleneck calculations using live context work orders
  let bottleneckWo: any = null;
  let btOvertime = 0;

  moWorkOrders.forEach(wo => {
    const plannedSec = wo.plannedMinutes * 60;
    const overtimeSec = wo.elapsedSeconds - plannedSec;
    if (wo.elapsedSeconds > plannedSec) {
      if (!bottleneckWo || overtimeSec > btOvertime) {
        bottleneckWo = wo;
        btOvertime = overtimeSec;
      }
    }
  });

  // Completed MO Summary variables
  const startTimes = moWorkOrders.map(wo => wo.startedAt).filter((t): t is number => t !== null && t > 0);
  const completionTimes = moWorkOrders.map(wo => wo.completedAt).filter((t): t is number => t !== null && t > 0);
  
  const minStartedAt = startTimes.length > 0 ? Math.min(...startTimes) : null;
  const maxCompletedAt = completionTimes.length > 0 ? Math.max(...completionTimes) : null;
  
  const totalTimeMs = (minStartedAt && maxCompletedAt) ? (maxCompletedAt - minStartedAt) : 0;
  const totalDurationMinutes = Math.round(totalTimeMs / 60000);
  const totalPlannedMinutes = moWorkOrders.reduce((sum, wo) => sum + wo.plannedMinutes, 0);

  function formatMinutesToHoursAndMinutes(mins: number) {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h ? `${h}h ` : ""}${m}m`;
  }

  function formatDurationBreakdown(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h ? `${h}h` : ""}${m}m`;
  }

  if (!mo) return <p>Not found. <Link to="/manufacturing" className="text-accent">Back</Link></p>;

  const product = products.find(p => p.id === mo.productId);
  const wcName = (id: string) => workCenters.find(w => w.id === id)?.name || id;
  const assignee = users.find(u => u.id === mo.assigneeId);
  const triggerSO = salesOrders.find(s => s.id === mo.triggeringSalesOrderId);
  const isDraft = mo.status === "Draft";
  const isWaitingForMaterials = mo.status === "Waiting for Materials";
  const hasTickets = (mo.shortageTickets || []).some(t => t.status === "OPEN");

  const STEPS = isWaitingForMaterials
    ? ["Draft", "Confirmed", "Waiting for Materials", "In Progress", "Done"]
    : ["Draft", "Confirmed", "In Progress", "Done"];


  function startEditComponents() {
    if (!mo) return;
    setEditComponents(mo.bomSnapshot.components.map(c => ({
      productId: c.productId,
      requiredQty: c.qty * mo.qty,
    })));
    setEditingComponents(true);
  }

  function addEditComponent() {
    const available = products.filter(p => !editComponents.some(ec => ec.productId === p.id));
    if (available.length > 0) {
      setEditComponents([...editComponents, { productId: available[0].id, requiredQty: 1 }]);
    }
  }

  async function saveComponents() {
    if (!mo) return;
    await updateManufacturingOrder(mo.id, { components: editComponents });
    setEditingComponents(false);
  }

  // Determine which components are short and which are available
  const componentStatus = mo.bomSnapshot.components.map(c => {
    const p = products.find(x => x.id === c.productId);
    const need = c.qty * mo.qty;
    const free = p ? p.onHand - p.reserved : 0;
    return { component: c, product: p, need, free, short: free < need };
  });
  const hasShortage = componentStatus.some(cs => cs.short);

  return (
    <div className="space-y-5">
      <div>
        <button onClick={() => navigate({ to: "/manufacturing" })} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back</button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-[26px] font-semibold leading-none">{mo.number}</h1>
              {mo.auto && <span className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">Auto</span>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {product?.name} · qty {mo.qty} · assignee {assignee?.name || "—"} · {format(new Date(mo.date), "dd MMM yyyy")}
              {triggerSO && <> · from <Link to="/sales/$id" params={{ id: triggerSO.id }} className="text-accent">{triggerSO.number}</Link></>}
            </p>
            {mo.workOrders.length > 0 && (
              <p className="mt-1 text-xs font-medium text-accent">
                {mo.workOrders.filter(wo => wo.status === "Completed").length} of {mo.workOrders.length} work orders completed
              </p>
            )}
          </div>
          <StatusBadge status={mo.status} />
        </div>
      </div>

      {mo.status !== "Cancelled" && (
        <div className="rounded-lg border bg-card p-4"><StatusStepper steps={STEPS} current={mo.status} /></div>
      )}

      {/* Smart routing banner */}
      {(isDraft || isWaitingForMaterials) && mo.bomSnapshot.components.length > 0 && (
        <div className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${hasShortage ? "border-warning/40 bg-warning/5" : "border-success/40 bg-success/5"}`}>
          {hasShortage ? (
            <>
              <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="font-medium text-warning">Insufficient components — will auto-route to Purchase</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  One or more components are short in inventory. On confirm, the system will automatically create Purchase Orders for the shortfall and set this MO to <strong>Waiting for Materials</strong>.
                </p>
              </div>
            </>
          ) : (
            <>
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div>
                <p className="font-medium text-success">All components available — ready to confirm</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  All required components have sufficient stock. Confirming will reserve components and move this MO directly to <strong>Confirmed</strong>.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {isWaitingForMaterials && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
          <ShoppingCart className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-warning">Waiting for Materials</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Purchase Orders have been auto-generated for the short components. This MO will automatically move to <strong>In Progress</strong> once all required stock is received.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-serif text-base font-semibold">Components</h2>
            {writable && isDraft && !editingComponents && (
              <Button variant="ghost" onClick={startEditComponents} className="text-xs"><Pencil className="h-3 w-3" /> Edit</Button>
            )}
            {editingComponents && (
              <div className="flex gap-1">
                <Button variant="ghost" onClick={() => setEditingComponents(false)} className="text-xs"><X className="h-3 w-3" /> Cancel</Button>
                <Button variant="primary" onClick={saveComponents} className="text-xs"><Save className="h-3 w-3" /> Save</Button>
              </div>
            )}
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            {editingComponents ? (
              <div className="space-y-3 p-3">
                {editComponents.map((ec, i) => {
                  return (
                    <div key={i} className="grid grid-cols-[1fr_5rem_2rem] items-end gap-2">
                      <Field label="Component">
                        <Select value={ec.productId} onChange={e => {
                          const updated = [...editComponents];
                          updated[i] = { ...ec, productId: e.target.value };
                          setEditComponents(updated);
                        }}>
                          {products.filter(pp => pp.id !== mo.productId && (pp.isActive !== false || editComponents.some(ecLine => ecLine.productId === pp.id))).map(pp => (
                            <option key={pp.id} value={pp.id}>{pp.name} ({pp.sku})</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Qty">
                        <Input type="number" min={1} value={ec.requiredQty} onChange={e => {
                          const updated = [...editComponents];
                          updated[i] = { ...ec, requiredQty: +e.target.value };
                          setEditComponents(updated);
                        }} />
                      </Field>
                      <div className="flex flex-col gap-1.5 pb-[1px] justify-end">
                        <button
                          type="button"
                          onClick={() => setEditComponents(editComponents.filter((_, idx) => idx !== i))}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove"
                        >✕</button>
                      </div>
                    </div>
                  );
                })}
                <Button type="button" variant="ghost" onClick={addEditComponent} className="text-xs">+ Add component</Button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr><th className="px-3 py-2 font-medium">Component</th><th className="px-3 py-2 text-right font-medium">Required</th><th className="px-3 py-2 text-right font-medium">Available</th></tr>
                </thead>
                <tbody>
                  {mo.bomSnapshot.components.map(c => {
                    const p = products.find(x => x.id === c.productId);
                    const need = c.qty * mo.qty;
                    const free = p ? p.onHand - p.reserved : 0;
                    // Find shortage ticket for this component
                    const ticket = (mo.shortageTickets || []).find(t => t.productId === c.productId);
                    return (
                      <tr key={c.productId} className="border-b last:border-b-0">
                        <td className="px-3 py-2">
                          {p?.name} <span className="font-mono text-xs text-muted-foreground">{p?.sku}</span>
                          {ticket && (
                            <div className="mt-0.5">
                              {ticket.poId ? (
                                <Link to="/purchase/$id" params={{ id: ticket.poId }} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${ticket.status === "RESOLVED" ? "bg-success/10 text-success border border-success/30" : "bg-warning/10 text-warning border border-warning/30"}`}>
                                  Shortage: {ticket.poNumber} ({ticket.status === "RESOLVED" ? "Resolved" : "Open"})
                                </Link>
                              ) : (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${ticket.status === "RESOLVED" ? "bg-success/10 text-success border border-success/30" : "bg-warning/10 text-warning border border-warning/30"}`}>
                                  Shortage: {ticket.shortageQty} short ({ticket.status === "RESOLVED" ? "Resolved" : "Open"})
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular">{need}</td>
                        <td className={`px-3 py-2 text-right tabular ${free < need ? "text-warning font-medium" : "text-success font-medium"}`}>{free}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-serif text-base font-semibold">Work orders</h2>
          
          {/* Completed MO Collapsible Summary Panel */}
          {mo.status === "Done" && (
            <div className="mb-4 overflow-hidden rounded-lg border border-border bg-card">
              <button 
                onClick={() => setSummaryCollapsed(!summaryCollapsed)}
                className="w-full flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-400 border-b hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Manufacturing Order Completed</span>
                </div>
                <span className="text-xs font-normal underline">
                  {summaryCollapsed ? "Show details" : "Collapse"}
                </span>
              </button>
              
              {!summaryCollapsed && (
                <div className="p-4 space-y-3 text-xs text-muted-foreground">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="font-medium text-foreground">Started:</span>{" "}
                      {minStartedAt ? format(new Date(minStartedAt), "dd MMM yyyy, hh:mm a") : "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Completed:</span>{" "}
                      {maxCompletedAt ? format(new Date(maxCompletedAt), "dd MMM yyyy, hh:mm a") : "—"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Total Time:</span>{" "}
                      <span className="font-semibold text-foreground">
                        {formatMinutesToHoursAndMinutes(totalDurationMinutes)}
                      </span>{" "}
                      (Planned: {formatMinutesToHoursAndMinutes(totalPlannedMinutes)})
                    </div>
                  </div>
                  
                  <div className="border-t pt-3 space-y-2">
                    <div className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                      Work Order Breakdown:
                    </div>
                    <ul className="space-y-1.5 font-mono text-[11px]">
                      {moWorkOrders.map(wo => {
                        const plannedSecs = wo.plannedMinutes * 60;
                        const isOver = wo.elapsedSeconds > plannedSecs;
                        const diffSecs = Math.abs(wo.elapsedSeconds - plannedSecs);
                        
                        return (
                          <li key={wo.id} className="flex items-center justify-between gap-4 py-0.5 border-b last:border-b-0 border-dashed border-border">
                            <span className="text-foreground">{wo.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-foreground">{formatDurationBreakdown(wo.elapsedSeconds)}</span>
                              {isOver ? (
                                <span className="text-[#DC2626] font-semibold">
                                  ⚠ +{formatDurationBreakdown(diffSecs)} over
                                </span>
                              ) : (
                                <span className="text-success font-semibold">
                                  ✓ within plan
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {bottleneckWo ? (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50/50 p-2.5 text-xs font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
              <span className="text-base leading-none">🔴</span>
              <span>Bottleneck detected: <strong>"{bottleneckWo.name}"</strong> — {formatSeconds(btOvertime)} over planned</span>
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
              <span className="text-base leading-none">🟢</span>
              <span>All work orders on schedule</span>
            </div>
          )}
          <ul className="space-y-2">
            {moWorkOrders.map(wo => {
              const elapsedSec = wo.elapsedSeconds;
              const plannedSec = wo.plannedMinutes * 60;
              const isOverdue = elapsedSec > plannedSec;
              const overtimeSec = elapsedSec - plannedSec;
              const isBottleneck = bottleneckWo && bottleneckWo.id === wo.id;
              
              return (
                <li key={wo.id} className="rounded-md border bg-card p-3">
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes pulse {
                      0% { transform: scale(0.95); opacity: 0.6; }
                      50% { transform: scale(1.2); opacity: 1; }
                      100% { transform: scale(0.95); opacity: 0.6; }
                    }
                    .animate-timer-pulse {
                      animation: pulse 1.5s infinite ease-in-out;
                    }
                  `}} />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{wo.name}</div>
                      <div className="text-xs text-muted-foreground">{wo.workCenter} · planned {wo.plannedMinutes} min</div>
                    </div>
                    <StatusBadge status={wo.status === "done" ? "Done" : wo.status === "started" ? "Started" : "Pending"} />
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className="flex flex-col gap-1.5">
                      <div className={`font-mono tabular text-xs ${wo.status === "started" ? "text-[#C2623F] font-semibold" : "text-muted-foreground"}`}>
                        Elapsed {formatSeconds(elapsedSec)}
                        {wo.status === "started" && (
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#C2623F] ml-1.5 animate-timer-pulse align-middle" />
                        )}
                      </div>
                      
                      {wo.status === "done" && (
                        <div className="space-y-1 text-[11px] font-mono text-muted-foreground border-t pt-1.5">
                          <div>
                            <span className="font-semibold text-foreground">Started:</span>{" "}
                            {wo.startedAt ? format(new Date(wo.startedAt), "dd MMM yyyy, hh:mm a") : "—"}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">Completed:</span>{" "}
                            {wo.completedAt ? format(new Date(wo.completedAt), "dd MMM yyyy, hh:mm a") : "—"}
                          </div>
                          <div className={isOverdue ? "text-[#DC2626] font-semibold" : "text-success font-semibold"}>
                            Duration: {formatSeconds(elapsedSec)} (Planned: {wo.plannedMinutes} min)
                            <div className="mt-0.5">
                              {isOverdue ? (
                                <span>⚠ {formatSeconds(elapsedSec)} — {formatSeconds(overtimeSec)} over plan</span>
                              ) : (
                                <span>✓ {formatSeconds(elapsedSec)} — within plan</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {writable && mo.status !== "Done" && mo.status !== "Cancelled" && (
                      <div className="flex gap-2">
                        {wo.status === "pending" && (
                          <button
                            onClick={() => startWorkOrder(mo.id, wo.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[#C2623F] text-[#C2623F] bg-transparent hover:bg-[#C2623F]/10 transition-colors"
                          >
                            Start
                          </button>
                        )}
                        {wo.status === "started" && (
                          <>
                            <button
                              disabled
                              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#C2623F] text-white opacity-85 cursor-not-allowed animate-pulse"
                            >
                              Running…
                            </button>
                            <button
                              onClick={() => completeWorkOrder(mo.id, wo.id)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#16A34A] text-white hover:bg-[#16A34A]/90 transition-colors"
                            >
                              Mark Complete ✓
                            </button>
                          </>
                        )}
                        {wo.status === "done" && (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                            Done ✓
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {writable && (
        <div className="flex gap-2">
          {mo.status === "Draft" && <>
            <Button variant="primary" onClick={() => confirmManufacturingOrder(mo.id)}>Confirm and reserve components</Button>
            <Button variant="danger" onClick={() => { if (confirm("Cancel this draft MO?")) cancelManufacturingOrder(mo.id); }}>Cancel</Button>
          </>}
          {(mo.status === "Confirmed" || mo.status === "In Progress") && (
            <Button variant="primary" onClick={() => {
              if (confirm(`Complete ${mo.number}? This will consume components and add ${mo.qty} ${product?.name} to On Hand. This cannot be undone.`))
                completeManufacturingOrder(mo.id);
            }}>Mark as done</Button>
          )}
        </div>
      )}
    </div>
  );
}