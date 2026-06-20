import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { canWrite } from "@/components/erp/AppLayout";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { Button, StatusStepper } from "@/components/erp/ui";
import { format } from "date-fns";
import { ArrowLeft, Play, Pause, Check } from "lucide-react";
import type { WorkOrder } from "@/lib/erp/types";

export const Route = createFileRoute("/_app/manufacturing/$id")({
  component: MoDetail,
});

const STEPS = ["Draft", "Confirmed", "In Progress", "Done"];

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
  const writable = canWrite(user?.role);
  const {
    manufacturingOrders, products, workCenters, users, salesOrders,
    confirmManufacturingOrder, setWorkOrderStatus, completeManufacturingOrder, cancelManufacturingOrder, tick,
  } = useERP();
  void tick;
  const mo = manufacturingOrders.find(m => m.id === id);
  if (!mo) return <p>Not found. <Link to="/manufacturing" className="text-accent">Back</Link></p>;

  const product = products.find(p => p.id === mo.productId);
  const wcName = (id: string) => workCenters.find(w => w.id === id)?.name || id;
  const assignee = users.find(u => u.id === mo.assigneeId);
  const triggerSO = salesOrders.find(s => s.id === mo.triggeringSalesOrderId);

  function elapsed(wo: WorkOrder) {
    const live = wo.status === "Started" && wo.startedAt ? Date.now() - wo.startedAt : 0;
    return wo.accumulatedMs + live;
  }

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
          </div>
          <StatusBadge status={mo.status} />
        </div>
      </div>

      {mo.status !== "Cancelled" && (
        <div className="rounded-lg border bg-card p-4"><StatusStepper steps={STEPS} current={mo.status} /></div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-serif text-base font-semibold">Components</h2>
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-3 py-2 font-medium">Component</th><th className="px-3 py-2 text-right font-medium">Required</th><th className="px-3 py-2 text-right font-medium">Available</th></tr>
              </thead>
              <tbody>
                {mo.bomSnapshot.components.map(c => {
                  const p = products.find(x => x.id === c.productId);
                  const need = c.qty * mo.qty;
                  const free = p ? p.onHand - p.reserved : 0;
                  return (
                    <tr key={c.productId} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{p?.name} <span className="font-mono text-xs text-muted-foreground">{p?.sku}</span></td>
                      <td className="px-3 py-2 text-right tabular">{need}</td>
                      <td className={`px-3 py-2 text-right tabular ${free < need ? "text-warning font-medium" : ""}`}>{free}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                    {writable && mo.status !== "Done" && mo.status !== "Cancelled" && wo.status !== "Done" && (
                      <div className="flex gap-1">
                        {wo.status !== "Started" && (
                          <Button variant="ghost" onClick={() => setWorkOrderStatus(mo.id, wo.id, "Started")}><Play className="h-3 w-3" /> Start</Button>
                        )}
                        {wo.status === "Started" && (
                          <Button variant="ghost" onClick={() => setWorkOrderStatus(mo.id, wo.id, "Paused")}><Pause className="h-3 w-3" /> Pause</Button>
                        )}
                        <Button variant="ghost" onClick={() => setWorkOrderStatus(mo.id, wo.id, "Done")}><Check className="h-3 w-3" /> Done</Button>
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