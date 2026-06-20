import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useERP, useCurrentUser, freeToUse } from "@/lib/erp/store";
import { hasPermission } from "@/lib/erp/permissions";
import { StatusBadge } from "@/components/erp/StatusBadge";
import { Button, Input, Select, Field, StatusStepper, Sheet } from "@/components/erp/ui";
import type { SoStatus, SoLine } from "@/lib/erp/types";
import { format } from "date-fns";
import { ArrowLeft, FileText, Plus, Trash2, AlertTriangle } from "lucide-react";
import { SpreadsheetImportButton } from "@/components/erp/SpreadsheetImport";

export const Route = createFileRoute("/_app/sales/$id")({
  component: SalesDetail,
});

const STEPS = ["Draft", "Confirmed", "Ready for Delivery", "Fully Delivered"];

function SalesDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const canWrite = hasPermission(user?.role, "sales:write");
  const {
    salesOrders, customers, products, users,
    confirmSalesOrder, deliverSalesOrder, cancelSalesOrder, updateSalesOrder,
    purchaseOrders, manufacturingOrders,
  } = useERP();

  const so = salesOrders.find(s => s.id === id);
  const [delivering, setDelivering] = useState(false);
  const [deliveries, setDeliveries] = useState<Record<string, number>>({});

  // Editable draft fields (only used when status is Draft — managed locally for in-form editing)
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [editSalespersonId, setEditSalespersonId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  if (!so) {
    return (
      <div className="space-y-4">
        <p>Sales order not found.</p>
        <Link to="/sales" className="text-accent">← Back to sales</Link>
      </div>
    );
  }

  const status = so.status;
  const isDraft = status === "Draft";
  const isTerminal = status === "Fully Delivered" || status === "Cancelled";
  const isDeliverable = status === "Confirmed" || status === "Partially Delivered";
  const isCancellable = isDraft || status === "Confirmed" || status === "Partially Delivered";

  const customer = customers.find(c => c.id === (editCustomerId ?? so.customerId));
  const salesperson = users.find(u => u.id === (editSalespersonId ?? so.salespersonId ?? so.createdBy));
  const total = so.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);

  const hasShortage = useMemo(() => {
    return so.lines.some(line => {
      const p = products.find(prod => prod.id === line.productId);
      const free = p ? p.onHand - p.reserved : 0;
      return free < line.qty;
    });
  }, [so.lines, products]);

  const triggered = [
    ...purchaseOrders.filter(p => p.triggeringSalesOrderId === so.id).map(p => ({ kind: "PO" as const, id: p.id, number: p.number, status: p.status })),
    ...manufacturingOrders.filter(m => m.triggeringSalesOrderId === so.id).map(m => ({ kind: "MO" as const, id: m.id, number: m.number, status: m.status })),
  ];

  const handleConfirm = async () => {
    if (!so.customerId || so.lines.length === 0) {
      alert("Please add a customer and at least one product line before confirming.");
      return;
    }
    try {
      await confirmSalesOrder(so.id);
    } catch (err: any) {
      alert(err.message || "Failed to confirm order");
    }
  };

  const handleDeliver = async () => {
    try {
      const deliveryMap = Object.entries(deliveries)
        .filter(([, qty]) => qty > 0)
        .map(([lineId, qty]) => ({ lineId, qty }));
      if (deliveryMap.length === 0) {
        alert("Please enter delivery quantities.");
        return;
      }
      await deliverSalesOrder(so.id, deliveryMap);
      setDelivering(false);
      setDeliveries({});
    } catch (err: any) {
      alert(err.message || "Failed to record delivery");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this order? Any reserved stock will be released.")) return;
    try {
      await cancelSalesOrder(so.id);
    } catch (err: any) {
      alert(err.message || "Failed to cancel order");
    }
  };

  const startDelivering = () => {
    const init: Record<string, number> = {};
    so.lines.forEach(l => { init[l.id] = Math.max(0, l.qty - l.deliveredQty); });
    setDeliveries(init);
    setDelivering(true);
  };

  return (
    <div className={`space-y-5 ${status === "Cancelled" ? "opacity-70" : ""}`}>
      {/* ── Top action bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: "/sales" })} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          {canWrite && !isTerminal && !delivering && (
            <div className="flex items-center gap-2">
              {isDraft && (
                <>
                  <Button variant="primary" onClick={handleConfirm}>Confirm</Button>
                  <Button variant="outline" onClick={() => setEditOpen(true)}>Edit Draft</Button>
                  <Button variant="danger" onClick={handleCancel}>Cancel</Button>
                  <span title="Items not yet available for dispatch">
                    <Button variant="primary" disabled>Deliver</Button>
                  </span>
                </>
              )}
              {status === "Confirmed" && (
                <>
                  <span title="Items not yet available for dispatch">
                    <Button variant="primary" disabled>Deliver</Button>
                  </span>
                  <Button variant="danger" onClick={handleCancel}>Cancel</Button>
                </>
              )}
              {status === "Partially Delivered" && (
                <>
                  <Button variant="primary" onClick={startDelivering}>Deliver</Button>
                  <Button variant="danger" onClick={handleCancel}>Cancel</Button>
                </>
              )}
            </div>
          )}

          {delivering && (
            <div className="flex items-center gap-2">
              <Button variant="primary" onClick={handleDeliver}>Confirm Delivery</Button>
              <Button onClick={() => { setDelivering(false); setDeliveries({}); }}>Cancel</Button>
            </div>
          )}
        </div>

        <Link
          to="/audit"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <FileText className="h-3.5 w-3.5" /> Logs
        </Link>
      </div>

      {/* ── Status stepper ── */}
      {status !== "Cancelled" ? (
        <div className="rounded-lg border bg-card p-4">
          <StatusStepper steps={STEPS} current={status === "Partially Delivered" ? "Ready for Delivery" : status} />
        </div>
      ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">This order has been cancelled</span>
          </div>
        </div>
      )}

      {/* ── Fulfillment Source / Smart Routing Banner ── */}
      {!isTerminal && (
        <div className={`rounded-lg border p-4 text-sm ${
          status === "Partially Delivered" || (isDraft && !hasShortage)
            ? "border-success/30 bg-success/5 text-success"
            : "border-warning/30 bg-warning/5 text-warning"
        }`}>
          {isDraft && !hasShortage && (
            <div className="flex items-start gap-2.5">
              <div className="mt-1 h-2 w-2 rounded-full bg-success animate-pulse shrink-0" />
              <div>
                <span className="font-semibold">All items available in stock — ready to reserve.</span> Confirming this order will reserve the required quantities and move it directly to <span className="font-semibold">Ready for Delivery</span>.
              </div>
            </div>
          )}
          {isDraft && hasShortage && (
            <div className="flex items-start gap-2.5">
              <div className="mt-1 h-2 w-2 rounded-full bg-warning animate-pulse shrink-0" />
              <div>
                <span className="font-semibold">Stock shortage detected — will trigger auto-procurement.</span> Confirming this order will trigger auto-generated Manufacturing or Purchase Orders for the stock shortfall.
              </div>
            </div>
          )}
          {status === "Confirmed" && (
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <div>
                <span className="font-semibold">Fulfillment Source: Procurement & Auto-Routing.</span> One or more items in this order had insufficient stock and triggered auto-generated Manufacturing or Purchase Orders.
              </div>
            </div>
          )}
          {status === "Partially Delivered" && (
            <div className="flex items-start gap-2.5">
              <div className="mt-1 h-2 w-2 rounded-full bg-success shrink-0" />
              <div>
                <span className="font-semibold">Fulfillment Source: Current Inventory Stock.</span> All ordered items are fully reserved from current inventory stock. No manufacturing or purchasing required.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Header fields ── */}
      <div className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Reference */}
          <Field label="Reference">
            <div className="font-serif text-lg font-semibold">{so.number}</div>
          </Field>

          {/* Customer */}
          <Field label="Customer">
            {isDraft && canWrite ? (
              <Select
                value={editCustomerId ?? so.customerId}
                onChange={e => setEditCustomerId(e.target.value)}
              >
                <option value="">Select customer…</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            ) : (
              <div className="text-sm font-medium">{customer?.name || "—"}</div>
            )}
          </Field>

          {/* Sales Person */}
          <Field label="Sales Person">
            {isDraft && canWrite ? (
              <Select
                value={editSalespersonId ?? so.salespersonId ?? user?.id ?? ""}
                onChange={e => setEditSalespersonId(e.target.value)}
              >
                <option value="">Select salesperson…</option>
                {users.filter(u => u.active).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            ) : (
              <div className="text-sm font-medium">{salesperson?.name || "—"}</div>
            )}
          </Field>

          {/* Order Date */}
          <Field label="Order Date">
            <div className="text-sm">{format(new Date(so.date), "dd MMM yyyy")}</div>
          </Field>
        </div>

        {/* Customer Address */}
        {customer?.address && (
          <div className="mt-3 border-t pt-3">
            <Field label="Customer Address">
              <div className="text-sm text-muted-foreground">{customer.address}</div>
            </Field>
          </div>
        )}
      </div>

      {/* ── Product Lines ── */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Product</th>
              <th className="px-3 py-2 text-right font-medium">Ordered Qty</th>
              <th className="px-3 py-2 text-right font-medium">Delivered Qty</th>
              <th className="px-3 py-2 text-right font-medium">Sales Price</th>
              <th className="px-3 py-2 text-right font-medium">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {so.lines.map(l => {
              const p = products.find(x => x.id === l.productId);
              const free = p ? freeToUse(p) : 0;
              const overstock = l.qty > free;
              const remaining = l.qty - l.deliveredQty;

              return (
                <tr key={l.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2.5">
                    <div>
                      <span className="font-medium">{p?.name}</span>
                      <span className="ml-1 font-mono text-xs text-muted-foreground">{p?.sku}</span>
                    </div>
                    {isDraft && p && (
                      <div className={`mt-0.5 text-[11px] ${overstock ? "text-warning" : "text-muted-foreground"}`}>
                        Available: <span className="font-mono font-semibold tabular">{free}</span>
                        {overstock && <span className="ml-2 font-medium">⚠ Short by {l.qty - free}</span>}
                      </div>
                    )}
                    {!isDraft && (l.reservedQty ?? 0) < l.qty && (
                      <div className="mt-0.5 text-[11px] text-warning flex items-center gap-1.5 flex-wrap">
                        <span>{l.reservedQty ?? 0} reserved, {l.qty - (l.reservedQty ?? 0)} short</span>
                        {l.autoCreatedOrderId && (
                          <span className="inline-flex items-center gap-1 font-medium bg-warning/10 text-warning px-1.5 py-0.5 rounded text-[10px]">
                            Short by {l.qty - (l.reservedQty ?? 0)} — {
                              hasPermission(user?.role, l.autoCreatedOrderNumber?.startsWith("PO") ? "purchase:read" : "manufacturing:read") ? (
                                <Link
                                  to={l.autoCreatedOrderNumber?.startsWith("PO") ? "/purchase/$id" : "/manufacturing/$id"}
                                  params={{ id: l.autoCreatedOrderId }}
                                  className="underline hover:text-warning/80"
                                >
                                  {l.autoCreatedOrderNumber} created
                                </Link>
                              ) : (
                                <span>{l.autoCreatedOrderNumber} created</span>
                              )
                            }
                            {l.autoCreatedOrderNumber?.startsWith("MO") && (() => {
                              const mo = manufacturingOrders.find(m => m.id === l.autoCreatedOrderId);
                              if (mo && mo.workOrders && mo.workOrders.length > 0) {
                                const completed = mo.workOrders.filter(w => w.status === "Completed").length;
                                return ` — ${completed} of ${mo.workOrders.length} work orders complete`;
                              }
                              return null;
                            })()}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular">{l.qty}</td>
                  <td className="px-3 py-2.5 text-right tabular">
                    {delivering ? (
                      <Input
                        type="number"
                        min={0}
                        max={remaining}
                        value={deliveries[l.id] ?? 0}
                        onChange={e => setDeliveries(d => ({
                          ...d,
                          [l.id]: Math.max(0, Math.min(remaining, +e.target.value)),
                        }))}
                        className="w-20 ml-auto text-right"
                      />
                    ) : (
                      <span>{l.deliveredQty}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular">₹{l.unitPrice.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2.5 text-right tabular font-medium">₹{(l.qty * l.unitPrice).toLocaleString("en-IN")}</td>
                </tr>
              );
            })}
            {so.lines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  <div className="space-y-3">
                    <p>No product lines. This order was created as an empty draft.</p>
                    {canWrite && (
                      <Button variant="primary" onClick={() => setEditOpen(true)}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Customer Requirement
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30">
              <td colSpan={4} className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">Order total</td>
              <td className="px-3 py-2 text-right font-serif text-base font-semibold tabular">₹{total.toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Auto-generated orders ── */}
      {triggered.length > 0 && (
        <div className="rounded-lg border border-dashed bg-card/60 p-3 text-sm">
          <div className="mb-1 text-[12px] font-medium uppercase text-muted-foreground">Auto-generated from this order</div>
          <ul className="space-y-1">
            {triggered.map(t => (
              <li key={t.id} className="flex items-center justify-between">
                <Link to={t.kind === "PO" ? "/purchase/$id" : "/manufacturing/$id"} params={{ id: t.id }} className="text-accent hover:underline">
                  {t.kind === "PO" ? "Purchase Order" : "Manufacturing Order"} · {t.number}
                </Link>
                <StatusBadge status={t.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Meta ── */}
      <div className="text-[11px] text-muted-foreground">
        Created by {so.createdBy} · {format(new Date(so.date), "dd MMM yyyy, HH:mm")}
      </div>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title={`Edit Sales Order ${so.number}`} width={680}>
        <EditSO
          so={so}
          customers={customers}
          products={products}
          users={users}
          onClose={() => setEditOpen(false)}
          onSubmit={async (updated) => {
            await updateSalesOrder(so.id, updated);
            setEditOpen(false);
          }}
        />
      </Sheet>
    </div>
  );
}

function EditSO({
  so,
  customers,
  products,
  users,
  onClose,
  onSubmit,
}: {
  so: any;
  customers: any[];
  products: any[];
  users: any[];
  onClose: () => void;
  onSubmit: (updated: { customerId: string; salespersonId?: string; lines: { productId: string; qty: number; unitPrice: number }[] }) => void;
}) {
  const [customerId, setCustomerId] = useState(so.customerId);
  const [salespersonId, setSalespersonId] = useState(so.salespersonId || "");
  const [lines, setLines] = useState(so.lines.map((l: any) => ({ productId: l.productId, qty: l.qty, unitPrice: l.unitPrice })));

  const total = lines.reduce((a: number, l: any) => a + l.qty * l.unitPrice, 0);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit({
          customerId,
          salespersonId: salespersonId || undefined,
          lines,
        });
      }}
      className="space-y-4"
    >
      <Field label="Customer">
        <Select value={customerId} onChange={e => setCustomerId(e.target.value)} required>
          <option value="">Select customer…</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Sales Person">
        <Select value={salespersonId} onChange={e => setSalespersonId(e.target.value)}>
          <option value="">Select salesperson…</option>
          {users.filter(u => u.active).map(u => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-foreground">Customer Requirements (Line items)</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setLines((l: any) => [...l, { productId: products[0]?.id || "", qty: 1, unitPrice: products[0]?.salePrice || 0 }])}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Requirement
          </Button>
          <SpreadsheetImportButton
            onImport={(rows) => {
              const newLines = rows.map(r => {
                const match = products.find((p: any) =>
                  p.name.toLowerCase().includes(r.productName.toLowerCase()) ||
                  r.productName.toLowerCase().includes(p.name.toLowerCase()) ||
                  (p.sku && p.sku.toLowerCase() === r.productName.toLowerCase())
                );
                return {
                  productId: match?.id || products[0]?.id || "",
                  qty: r.qty,
                  unitPrice: r.unitPrice || match?.salePrice || 0,
                };
              });
              setLines((l: any) => [...l, ...newLines]);
            }}
          />
        </div>
        <div className="space-y-2">
          {lines.map((line: any, i: number) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end rounded-md border bg-muted/30 p-2.5">
              <div className="col-span-7">
                <Field label="Product">
                  <Select
                    value={line.productId}
                    onChange={e => {
                      const p = products.find((x: any) => x.id === e.target.value);
                      setLines((ls: any) =>
                        ls.map((l: any, idx: number) =>
                          idx === i ? { ...l, productId: e.target.value, unitPrice: p?.salePrice || 0 } : l
                        )
                      );
                    }}
                    required
                  >
                    <option value="">Select product…</option>
                    {products.filter((p: any) => p.isActive !== false || p.id === line.productId).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{p.sku}]
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Qty">
                  <Input
                    type="number"
                    min={1}
                    value={line.qty}
                    onChange={e =>
                      setLines((ls: any) =>
                        ls.map((l: any, idx: number) => (idx === i ? { ...l, qty: +e.target.value } : l))
                      )
                    }
                    required
                  />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Price ₹">
                  <Input
                    type="number"
                    min={0}
                    value={line.unitPrice}
                    onChange={e =>
                      setLines((ls: any) =>
                        ls.map((l: any, idx: number) => (idx === i ? { ...l, unitPrice: +e.target.value } : l))
                      )
                    }
                    required
                  />
                </Field>
              </div>
              <div className="col-span-1 flex h-8 justify-end">
                <button
                  type="button"
                  onClick={() => setLines((ls: any) => ls.filter((_: any, idx: number) => idx !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <div className="text-sm text-muted-foreground">Order total</div>
        <div className="font-serif text-xl font-semibold tabular">₹{total.toLocaleString("en-IN")}</div>
      </div>
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save Requirements</Button>
      </div>
    </form>
  );
}