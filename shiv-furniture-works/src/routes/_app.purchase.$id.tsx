import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { canWrite } from "@/components/erp/AppLayout";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { Button, Input, Modal, StatusStepper } from "@/components/erp/ui";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_app/purchase/$id")({
  component: PurchaseDetail,
});

const STEPS = ["Draft", "Confirmed", "Partially Received", "Fully Received"];

function PurchaseDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const writable = canWrite(user?.role);
  const { purchaseOrders, vendors, products, salesOrders, confirmPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder } = useERP();
  const po = purchaseOrders.find(p => p.id === id);
  const [recvOpen, setRecvOpen] = useState(false);
  const [recvs, setRecvs] = useState<Record<string, number>>({});

  if (!po) return <p>Not found. <Link to="/purchase" className="text-accent">Back</Link></p>;
  const vendor = vendors.find(v => v.id === po.vendorId);
  const total = po.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
  const triggerSO = salesOrders.find(s => s.id === po.triggeringSalesOrderId);

  return (
    <div className="space-y-5">
      <div>
        <button onClick={() => navigate({ to: "/purchase" })} className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to purchase</button>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-[26px] font-semibold leading-none">{po.number}</h1>
              {po.auto && <span className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">Auto</span>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {vendor?.name} · {format(new Date(po.date), "dd MMM yyyy")}
              {triggerSO && <> · auto-generated from <Link to="/sales/$id" params={{ id: triggerSO.id }} className="text-accent">{triggerSO.number}</Link></>}
            </p>
          </div>
          <StatusBadge status={po.status} />
        </div>
      </div>

      {po.status !== "Cancelled" && (
        <div className="rounded-lg border bg-card p-4"><StatusStepper steps={STEPS} current={po.status} /></div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2 font-medium">Product</th><th className="px-3 py-2 text-right font-medium">Ordered</th><th className="px-3 py-2 text-right font-medium">Received</th><th className="px-3 py-2 text-right font-medium">Unit ₹</th><th className="px-3 py-2 text-right font-medium">Total</th></tr>
          </thead>
          <tbody>
            {po.lines.map(l => {
              const p = products.find(x => x.id === l.productId);
              return (
                <tr key={l.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{p?.name} <span className="font-mono text-xs text-muted-foreground">{p?.sku}</span></td>
                  <td className="px-3 py-2 text-right tabular">{l.qty}</td>
                  <td className="px-3 py-2 text-right tabular">{l.receivedQty}</td>
                  <td className="px-3 py-2 text-right tabular">{l.unitPrice.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-right tabular font-medium">{(l.qty * l.unitPrice).toLocaleString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="border-t bg-muted/30"><td colSpan={4} className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">Order total</td><td className="px-3 py-2 text-right font-serif text-base font-semibold tabular">₹{total.toLocaleString("en-IN")}</td></tr></tfoot>
        </table>
      </div>

      {writable && (
        <div className="flex gap-2">
          {po.status === "Draft" && <>
            <Button variant="primary" onClick={() => confirmPurchaseOrder(po.id)}>Confirm order</Button>
            <Button variant="danger" onClick={() => { if (confirm("Cancel this draft PO?")) cancelPurchaseOrder(po.id); }}>Cancel</Button>
          </>}
          {(po.status === "Confirmed" || po.status === "Partially Received") && (
            <Button variant="primary" onClick={() => {
              const init: Record<string, number> = {};
              po.lines.forEach(l => { init[l.id] = Math.max(0, l.qty - l.receivedQty); });
              setRecvs(init); setRecvOpen(true);
            }}>Receive goods</Button>
          )}
        </div>
      )}

      <Modal
        open={recvOpen} onClose={() => setRecvOpen(false)} title="Receive goods"
        footer={<>
          <Button onClick={() => setRecvOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { receivePurchaseOrder(po.id, Object.entries(recvs).map(([lineId, qty]) => ({ lineId, qty }))); setRecvOpen(false); }}>Receive</Button>
        </>}
      >
        <p className="mb-3">On Hand will increase by the quantities you receive.</p>
        <div className="space-y-2">
          {po.lines.map(l => {
            const p = products.find(x => x.id === l.productId)!;
            const remaining = l.qty - l.receivedQty;
            return (
              <div key={l.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{p.name} <span className="text-xs text-muted-foreground">· {remaining} pending</span></span>
                <Input type="number" min={0} max={remaining} value={recvs[l.id] ?? 0}
                  onChange={e => setRecvs(r => ({ ...r, [l.id]: Math.max(0, Math.min(remaining, +e.target.value)) }))}
                  className="w-24"
                />
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}