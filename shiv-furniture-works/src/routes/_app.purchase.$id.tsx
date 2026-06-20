import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { canWrite } from "@/components/erp/AppLayout";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { Button, Input, Modal, StatusStepper, Field, Select, Textarea, Sheet } from "@/components/erp/ui";
import { format } from "date-fns";
import { ArrowLeft, Calendar, FileText, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/purchase/$id")({
  component: PurchaseDetail,
});

const STEPS = ["Draft", "Booked", "Confirmed", "Partially Received", "Fully Received"];

function PurchaseDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const writable = canWrite(user?.role);
  const { purchaseOrders, vendors, products, salesOrders, bookPurchaseOrder, confirmPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder, updatePurchaseOrder } = useERP();
  const po = purchaseOrders.find(p => p.id === id);
  const [recvOpen, setRecvOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [recvs, setRecvs] = useState<Record<string, number>>({});

  if (!po) return <p className="p-4 text-muted-foreground">Not found. <Link to="/purchase" className="text-accent">Back</Link></p>;
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

      {/* Side-by-side details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vendor Card */}
        <div className="rounded-lg border bg-card p-4 shadow-sm space-y-2">
          <h3 className="font-serif font-semibold text-muted-foreground text-[12px] uppercase tracking-wider">Vendor details</h3>
          <div>
            <p className="font-medium text-foreground text-sm">{vendor?.name || po.vendorId}</p>
            {vendor?.contactPerson && <p className="text-xs text-muted-foreground mt-0.5">Contact: {vendor.contactPerson}</p>}
            {vendor?.email && <p className="text-xs text-muted-foreground">Email: {vendor.email}</p>}
            {vendor?.phone && <p className="text-xs text-muted-foreground">Phone: {vendor.phone}</p>}
            {vendor?.address && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{vendor.address}</p>}
          </div>
        </div>

        {/* Expected Delivery & Notes Card */}
        <div className="col-span-2 rounded-lg border bg-card p-4 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-serif font-semibold text-muted-foreground text-[12px] uppercase tracking-wider">Expected Delivery</h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{po.expectedDeliveryDate ? format(new Date(po.expectedDeliveryDate), "dd MMM yyyy") : "Not specified"}</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-serif font-semibold text-muted-foreground text-[12px] uppercase tracking-wider">Order Notes</h3>
            <div className="flex items-start gap-2 mt-1 text-sm text-foreground">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="whitespace-pre-line text-xs text-muted-foreground leading-relaxed">{po.notes || "No notes added."}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
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
        <div className="flex gap-2 rounded-lg border bg-card p-3 shadow-sm">
          {po.status === "Draft" && <>
            <Button variant="primary" onClick={() => bookPurchaseOrder(po.id)}>Book order</Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>Edit Draft</Button>
            <Button variant="danger" onClick={() => { if (confirm("Cancel this draft PO?")) cancelPurchaseOrder(po.id); }}>Cancel</Button>
          </>}
          {po.status === "Booked" && <>
            <Button variant="primary" onClick={() => confirmPurchaseOrder(po.id)}>Confirm order</Button>
            <Button variant="danger" onClick={() => { if (confirm("Cancel this booked PO?")) cancelPurchaseOrder(po.id); }}>Cancel</Button>
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
        <p className="mb-3 text-muted-foreground text-xs">On Hand will increase by the quantities you receive.</p>
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

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title={`Edit Purchase Order ${po.number}`} width={680}>
        <EditPO po={po} vendors={vendors} products={products} onSubmit={async (updated) => {
          await updatePurchaseOrder(po.id, updated);
          setEditOpen(false);
        }} />
      </Sheet>
    </div>
  );
}

function EditPO({ po, vendors, products, onSubmit }: {
  po: any;
  vendors: any[];
  products: any[];
  onSubmit: (po: { vendorId: string; expectedDeliveryDate?: string; notes?: string; lines: { productId: string; qty: number; unitPrice: number }[] }) => void;
}) {
  const [vendorId, setVendorId] = useState(po.vendorId);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(po.expectedDeliveryDate ? format(new Date(po.expectedDeliveryDate), "yyyy-MM-dd") : "");
  const [notes, setNotes] = useState(po.notes || "");
  const purchaseable = products.filter((p: any) => p.procurementType === "Purchase");
  const [lines, setLines] = useState(po.lines.map((l: any) => ({ productId: l.productId, qty: l.qty, unitPrice: l.unitPrice })));

  const total = lines.reduce((a: number, l: any) => a + l.qty * l.unitPrice, 0);

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ vendorId, expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate + "T12:00:00" : undefined, notes, lines }); }} className="space-y-4">
      <Field label="Vendor">
        <Select value={vendorId} onChange={e => setVendorId(e.target.value)} required>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </Field>
      <Field label="Expected Delivery Date">
        <Input type="date" value={expectedDeliveryDate} onChange={e => setExpectedDeliveryDate(e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea placeholder="Add order instructions or extra info..." value={notes} onChange={e => setNotes(e.target.value)} />
      </Field>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-foreground">Line items</span>
          <Button type="button" variant="ghost" onClick={() => setLines((l: any) => [...l, { productId: purchaseable[0]?.id || "", qty: 1, unitPrice: purchaseable[0]?.costPrice || 0 }])}><Plus className="h-3.5 w-3.5" />Add line</Button>
        </div>
        <div className="space-y-2">
          {lines.map((line: any, i: number) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-md border bg-muted/30 p-2.5">
              <div className="col-span-7">
                <Field label="Product">
                  <Select value={line.productId} onChange={e => {
                    const p = products.find((x: any) => x.id === e.target.value);
                    setLines((ls: any) => ls.map((l: any, idx: number) => idx === i ? { ...l, productId: e.target.value, unitPrice: p?.costPrice || 0 } : l));
                  }}>
                    {purchaseable.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="col-span-2"><Field label="Qty"><Input type="number" min={1} value={line.qty} onChange={e => setLines((ls: any) => ls.map((l: any, idx: number) => idx === i ? { ...l, qty: +e.target.value } : l))} /></Field></div>
              <div className="col-span-2"><Field label="Unit ₹"><Input type="number" value={line.unitPrice} onChange={e => setLines((ls: any) => ls.map((l: any, idx: number) => idx === i ? { ...l, unitPrice: +e.target.value } : l))} /></Field></div>
              <div className="col-span-1 flex h-8 justify-end"><button type="button" onClick={() => setLines((ls: any) => ls.filter((_: any, idx: number) => idx !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t pt-3">
        <div className="text-sm text-muted-foreground">Order total</div>
        <div className="font-serif text-xl font-semibold tabular">₹{total.toLocaleString("en-IN")}</div>
      </div>
      <Button type="submit" variant="primary">Save changes</Button>
    </form>
  );
}