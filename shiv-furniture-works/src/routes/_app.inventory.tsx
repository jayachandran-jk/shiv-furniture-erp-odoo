import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useERP, freeToUse } from "@/lib/erp/store";
import { Input, Select } from "@/components/erp/ui";
import { EmptyState } from "@/components/erp/StatusBadge";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Shiv Furniture Works" }] }),
  component: InventoryPage,
});

const LEDGER_TYPES = ["Receipt", "Delivery", "Manufacturing In", "Manufacturing Out", "Reserve", "Unreserve", "Adjustment"];

function InventoryPage() {
  const { ledger, products } = useERP();
  const [tab, setTab] = useState<"ledger" | "low">("ledger");
  const [productId, setProductId] = useState("");
  const [type, setType] = useState("");

  const filtered = useMemo(() => ledger.filter(l => {
    if (productId && l.productId !== productId) return false;
    if (type && l.type !== type) return false;
    return true;
  }), [ledger, productId, type]);

  const productName = (id: string) => products.find(p => p.id === id)?.name || id;
  const productSku = (id: string) => products.find(p => p.id === id)?.sku || "";

  const lowStock = products
    .filter(p => p.reorderThreshold > 0 && p.onHand <= p.reorderThreshold)
    .sort((a, b) => (a.onHand - a.reorderThreshold) - (b.onHand - b.reorderThreshold));

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab("ledger")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === "ledger" ? "border-accent font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >Stock ledger</button>
        <button
          onClick={() => setTab("low")}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === "low" ? "border-accent font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >Low stock <span className="ml-1 rounded-md bg-warning/15 px-1.5 text-[10px] font-medium text-warning">{lowStock.length}</span></button>
      </div>

      {tab === "ledger" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={productId} onChange={e => setProductId(e.target.value)} className="w-64">
              <option value="">All products</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Select value={type} onChange={e => setType(e.target.value)} className="w-48">
              <option value="">All movement types</option>
              {LEDGER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="No movements match" hint="Receipts, deliveries, manufacturing and reservations will appear here." />
          ) : (
            <div className="rounded-lg border bg-card">
              <div className="relative border-l-2 border-border ml-4 my-3">
                {filtered.map(l => (
                  <div key={l.id} className="group relative pl-4 pr-4 py-2 -ml-px border-b border-border/50 last:border-b-0 hover:bg-muted/40">
                    <div className="absolute -left-[5px] top-3 h-2 w-2 rounded-full bg-accent" />
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-2 font-mono tabular text-[11px] text-muted-foreground">
                        {format(new Date(l.ts), "dd MMM yyyy")}
                        <div>{format(new Date(l.ts), "HH:mm:ss")}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium">{l.type}</span>
                      </div>
                      <div className="col-span-4 truncate">
                        <span className="font-medium">{productName(l.productId)}</span>
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">{productSku(l.productId)}</span>
                      </div>
                      <div className={`col-span-1 font-mono tabular text-right ${l.deltaQty < 0 ? "text-destructive" : l.deltaQty > 0 ? "text-success" : "text-muted-foreground"}`}>
                        {l.deltaQty > 0 ? "+" : ""}{l.deltaQty || "—"}
                      </div>
                      <div className="col-span-1 text-right text-xs tabular text-muted-foreground">→ {l.onHandAfter}</div>
                      <div className="col-span-2 text-right text-xs text-muted-foreground">
                        {l.referenceType && l.referenceId ? `${l.referenceType} ${l.referenceId.slice(0, 6)}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "low" && (
        lowStock.length === 0 ? (
          <EmptyState title="No items are below reorder threshold" hint="When stock drops, items show up here in order of severity." />
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">On Hand</th>
                  <th className="px-3 py-2 text-right font-medium">Reserved</th>
                  <th className="px-3 py-2 text-right font-medium">Free to Use</th>
                  <th className="px-3 py-2 text-right font-medium">Reorder at</th>
                  <th className="px-3 py-2 text-right font-medium">Short by</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2"><span className="font-medium">{p.name}</span> <span className="font-mono text-xs text-muted-foreground">{p.sku}</span></td>
                    <td className="px-3 py-2 text-muted-foreground">{p.category}</td>
                    <td className="px-3 py-2 text-right tabular">{p.onHand}</td>
                    <td className="px-3 py-2 text-right tabular text-muted-foreground">{p.reserved}</td>
                    <td className="px-3 py-2 text-right tabular font-medium">{freeToUse(p)}</td>
                    <td className="px-3 py-2 text-right tabular text-muted-foreground">{p.reorderThreshold}</td>
                    <td className="px-3 py-2 text-right tabular font-medium text-warning">{Math.max(0, p.reorderThreshold - p.onHand)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}