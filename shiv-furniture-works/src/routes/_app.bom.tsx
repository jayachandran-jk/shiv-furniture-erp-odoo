import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { canWrite } from "@/components/erp/AppLayout";
import { Button, Field, Input, Select, Sheet } from "@/components/erp/ui";
import { EmptyState } from "@/components/erp/StatusBadge";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { BoM } from "@/lib/erp/types";

export const Route = createFileRoute("/_app/bom")({
  head: () => ({ meta: [{ title: "Bill of Materials — Shiv Furniture Works" }] }),
  component: BomPage,
});

function BomPage() {
  const { boms, products, workCenters, upsertBom } = useERP();
  const user = useCurrentUser();
  const writable = canWrite(user?.role);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<BoM | null>(null);
  const [creating, setCreating] = useState(false);

  const productName = (id: string) => products.find(p => p.id === id)?.name || id;
  const wcName = (id: string) => workCenters.find(w => w.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">{boms.length} bills of materials defined.</p>
        <div className="ml-auto" />
        {writable && <Button variant="primary" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" />New BoM</Button>}
      </div>

      {boms.length === 0 ? (
        <EmptyState title="No bills of materials yet" hint="Define what components and operations build each finished product." />
      ) : (
        <div className="space-y-2">
          {boms.map(bom => {
            const isOpen = open[bom.id] ?? true;
            return (
              <div key={bom.id} className="overflow-hidden rounded-lg border bg-card">
                <button
                  onClick={() => setOpen(o => ({ ...o, [bom.id]: !isOpen }))}
                  className="flex w-full items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5 text-left"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-serif text-base font-semibold">{productName(bom.productId)}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{bom.id}</span>
                  </div>
                  {writable && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setEdit(bom); }}
                      className="text-xs text-accent hover:underline cursor-pointer"
                    >Edit</span>
                  )}
                </button>
                {isOpen && (
                  <div className="grid gap-4 p-4 md:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Components</h3>
                      <table className="w-full text-sm">
                        <tbody>
                          {bom.components.map(c => (
                            <tr key={c.productId} className="border-b last:border-b-0">
                              <td className="py-1.5">{productName(c.productId)}</td>
                              <td className="py-1.5 text-right tabular text-muted-foreground">× {c.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <h3 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Operations</h3>
                      <table className="w-full text-sm">
                        <tbody>
                          {bom.operations.map(o => (
                            <tr key={o.id} className="border-b last:border-b-0">
                              <td className="py-1.5">{o.name}</td>
                              <td className="py-1.5 text-muted-foreground">{wcName(o.workCenterId)}</td>
                              <td className="py-1.5 text-right tabular text-muted-foreground">{o.durationMinutes} min</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={!!edit || creating} onClose={() => { setEdit(null); setCreating(false); }} title={creating ? "New BoM" : "Edit BoM"} width={640}>
        <BomEditor
          initial={edit}
          products={products}
          workCenters={workCenters}
          onSave={(b) => { upsertBom(b); setEdit(null); setCreating(false); }}
        />
      </Sheet>
    </div>
  );
}

function BomEditor({ initial, products, workCenters, onSave }: { initial: BoM | null; products: any[]; workCenters: any[]; onSave: (b: BoM) => void }) {
  const [productId, setProductId] = useState(initial?.productId || products.find((p: any) => p.procurementType === "Manufacturing")?.id || "");
  const [components, setComponents] = useState(initial?.components || []);
  const [operations, setOperations] = useState(initial?.operations || []);
  const id = initial?.id || `bom-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ id, productId, components, operations }); }} className="space-y-4">
      <Field label="Finished product">
        <Select value={productId} onChange={e => setProductId(e.target.value)} required>
          {products.filter((p: any) => p.procurementType === "Manufacturing").map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-foreground">Components</span>
          <Button type="button" variant="ghost" onClick={() => setComponents(c => [...c, { productId: products[0].id, qty: 1 }])}><Plus className="h-3 w-3" />Add</Button>
        </div>
        {components.map((c, i) => (
          <div key={i} className="mb-2 grid grid-cols-12 gap-2 items-end">
            <div className="col-span-8">
              <Select value={c.productId} onChange={e => setComponents(cs => cs.map((x, idx) => idx === i ? { ...x, productId: e.target.value } : x))}>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div className="col-span-3"><Input type="number" min={1} value={c.qty} onChange={e => setComponents(cs => cs.map((x, idx) => idx === i ? { ...x, qty: +e.target.value } : x))} /></div>
            <div className="col-span-1 flex justify-end"><button type="button" onClick={() => setComponents(cs => cs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-foreground">Operations</span>
          <Button type="button" variant="ghost" onClick={() => setOperations(o => [...o, { id: `op-${Math.random().toString(36).slice(2, 5)}`, name: "", workCenterId: workCenters[0]?.id || "", durationMinutes: 30 }])}><Plus className="h-3 w-3" />Add</Button>
        </div>
        {operations.map((o, i) => (
          <div key={o.id} className="mb-2 grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5"><Input placeholder="Operation name" value={o.name} onChange={e => setOperations(os => os.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))} /></div>
            <div className="col-span-4">
              <Select value={o.workCenterId} onChange={e => setOperations(os => os.map((x, idx) => idx === i ? { ...x, workCenterId: e.target.value } : x))}>
                {workCenters.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </div>
            <div className="col-span-2"><Input type="number" min={1} value={o.durationMinutes} onChange={e => setOperations(os => os.map((x, idx) => idx === i ? { ...x, durationMinutes: +e.target.value } : x))} /></div>
            <div className="col-span-1 flex justify-end"><button type="button" onClick={() => setOperations(os => os.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
          </div>
        ))}
      </div>

      <Button type="submit" variant="primary">Save BoM</Button>
    </form>
  );
}