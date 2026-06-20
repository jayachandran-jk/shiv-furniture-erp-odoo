import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { useEffect, useState } from "react";
import { hasPermission } from "@/lib/erp/permissions";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { Button, StatusStepper, Field, Input, Select } from "@/components/erp/ui";
import { format } from "date-fns";
import { ArrowLeft, Play, Pause, Check, Pencil, X, Save, Package, ShoppingCart } from "lucide-react";
import type { WorkOrder } from "@/lib/erp/types";

export const Route = createFileRoute("/_app/manufacturing/$id")({
  component: MoDetail,
});

// Include "Waiting for Materials" so the stepper highlights it correctly
const STEPS = ["Draft", "Confirmed", "Waiting for Materials", "In Progress", "Done"];

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}h ` : ""}${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
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

  useEffect(() => {
    if (!mo) return;
    const hasActiveWO = mo.workOrders.some(wo => wo.status === "Started");
    if (mo.status !== "Done" && mo.status !== "Cancelled" && hasActiveWO) {
      const interval = setInterval(() => {
        refreshData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [mo, refreshData]);

  if (!mo) return <p>Not found. <Link to="/manufacturing" className="text-accent">Back</Link></p>;

  const product = products.find(p => p.id === mo.productId);
  const wcName = (id: string) => workCenters.find(w => w.id === id)?.name || id;
  const assignee = users.find(u => u.id === mo.assigneeId);
  const triggerSO = salesOrders.find(s => s.id === mo.triggeringSalesOrderId);
  const isDraft = mo.status === "Draft";
  const isWaitingForMaterials = mo.status === "Waiting for Materials";

  function elapsed(wo: WorkOrder) {
    const live = wo.status === "Started" && wo.startedAt ? Date.now() - wo.startedAt : 0;
    return wo.accumulatedMs + live;
  }

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
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[12px] font-medium text-transparent select-none">_</span>
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
          <ul className="space-y-2">
            {mo.workOrders.map(wo => {
              const live = wo.status === "Started";
              const ms = elapsed(wo);
              const overdue = ms > wo.plannedMinutes * 60000;
              return (
                <li key={wo.id} className="rounded-md border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{wo.name}</div>
                      <div className="text-xs text-muted-foreground">{wcName(wo.workCenterId)} · planned {wo.plannedMinutes} min</div>
                    </div>
                    <StatusBadge status={wo.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className={`font-mono tabular text-xs ${live ? "text-accent" : overdue ? "text-warning" : "text-muted-foreground"}`}>
                      Elapsed {fmtMs(ms)}{live ? " ●" : ""}
                    </div>
                    {writable && mo.status !== "Done" && mo.status !== "Cancelled" && wo.status !== "Completed" && (
                      <div className="flex gap-1">
                        {wo.status !== "Started" && (
                          <Button variant="ghost" onClick={async () => { await setWorkOrderStatus(mo.id, wo.id, "Started"); await refreshData(); }}><Play className="h-3 w-3" /> Start</Button>
                        )}
                        {wo.status === "Started" && (
                          <Button variant="ghost" onClick={async () => { await setWorkOrderStatus(mo.id, wo.id, "Paused"); await refreshData(); }}><Pause className="h-3 w-3" /> Pause</Button>
                        )}
                        <Button variant="ghost" onClick={async () => { await setWorkOrderStatus(mo.id, wo.id, "Completed"); await refreshData(); }}><Check className="h-3 w-3" /> Done</Button>
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