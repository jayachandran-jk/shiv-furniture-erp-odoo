import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useERP, useCurrentUser, freeToUse } from "@/lib/erp/store";
import { canWrite } from "@/components/erp/AppLayout";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button, Field, Input, Select, Textarea, Sheet } from "@/components/erp/ui";
import { StatusBadge, EmptyState } from "@/components/erp/StatusBadge";
import type { Product, Strategy, ProcurementType } from "@/lib/erp/types";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/products")({
  head: () => ({ meta: [{ title: "Products — Shiv Furniture Works" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const { products, vendors, boms, createProduct, updateProduct, ledger } = useERP();
  const user = useCurrentUser();
  const writable = canWrite(user?.role);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [strategy, setStrategy] = useState<string>("");
  const [newOpen, setNewOpen] = useState(false);
  const [detail, setDetail] = useState<Product | null>(null);

  const categories = Array.from(new Set(products.map(p => p.category)));

  const filtered = useMemo(() => products.filter(p => {
    const q = query.trim().toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
    if (category && p.category !== category) return false;
    if (strategy && p.strategy !== strategy) return false;
    return true;
  }), [products, query, category, strategy]);

  const columns: Column<Product>[] = [
    { key: "sku", header: "SKU", cell: p => <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>, sortValue: p => p.sku },
    { key: "name", header: "Name", cell: p => <span className="font-medium">{p.name}</span>, sortValue: p => p.name },
    { key: "category", header: "Category", cell: p => p.category, sortValue: p => p.category },
    { key: "cost", header: "Cost", align: "right", cell: p => p.costPrice ? `₹${p.costPrice.toLocaleString("en-IN")}` : "—", sortValue: p => p.costPrice },
    { key: "sale", header: "Sale", align: "right", cell: p => p.salePrice ? `₹${p.salePrice.toLocaleString("en-IN")}` : "—", sortValue: p => p.salePrice },
    { key: "onhand", header: "On Hand", align: "right", cell: p => p.onHand, sortValue: p => p.onHand },
    { key: "reserved", header: "Reserved", align: "right", cell: p => <span className="text-muted-foreground">{p.reserved}</span>, sortValue: p => p.reserved },
    { key: "free", header: "Free", align: "right", cell: p => <span className={freeToUse(p) <= p.reorderThreshold && p.reorderThreshold > 0 ? "font-semibold text-warning" : "font-semibold"}>{freeToUse(p)}</span>, sortValue: p => freeToUse(p) },
    { key: "strategy", header: "Strategy", cell: p => <StatusBadge status={p.strategy} />, sortValue: p => p.strategy },
    { key: "status", header: "Status", cell: p => p.onHand <= p.reorderThreshold && p.reorderThreshold > 0
      ? <span className="text-xs font-medium text-warning">Low stock</span>
      : <span className="text-xs text-muted-foreground">OK</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name or SKU" value={query} onChange={e => setQuery(e.target.value)} className="w-64 pl-8" />
        </div>
        <Select value={category} onChange={e => setCategory(e.target.value)} className="w-44">
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={strategy} onChange={e => setStrategy(e.target.value)} className="w-32">
          <option value="">All strategies</option>
          <option value="MTS">MTS</option>
          <option value="MTO">MTO</option>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} of {products.length}</span>
        <div className="ml-auto" />
        {writable && <Button variant="primary" onClick={() => setNewOpen(true)}><Plus className="h-3.5 w-3.5" />New product</Button>}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        onRowClick={p => setDetail(p)}
        empty={<EmptyState title="No products match" hint="Adjust your filters, or add a new product." />}
      />

      <Sheet open={newOpen} onClose={() => setNewOpen(false)} title="New product">
        <ProductForm
          vendors={vendors}
          boms={boms}
          onSubmit={(p) => { createProduct(p); setNewOpen(false); }}
        />
      </Sheet>

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.name || ""} width={620}>
        {detail && (
          <ProductDetail
            product={detail}
            ledger={ledger.filter(l => l.productId === detail.id).slice(0, 10)}
            vendors={vendors}
            boms={boms}
            writable={writable}
            onSave={(patch) => { updateProduct(detail.id, patch); setDetail({ ...detail, ...patch }); }}
          />
        )}
      </Sheet>
    </div>
  );
}

function ProductForm({ vendors, boms, onSubmit, initial }: {
  vendors: { id: string; name: string }[];
  boms: { id: string; productId: string }[];
  onSubmit: (p: Omit<Product, "id" | "onHand" | "reserved"> & { onHand?: number }) => void;
  initial?: Product;
}) {
  const [f, setF] = useState({
    name: initial?.name || "",
    sku: initial?.sku || "",
    category: initial?.category || "Raw Material",
    description: initial?.description || "",
    costPrice: initial?.costPrice || 0,
    salePrice: initial?.salePrice || 0,
    strategy: (initial?.strategy || "MTS") as Strategy,
    procurementType: (initial?.procurementType || "Purchase") as ProcurementType,
    preferredVendorId: initial?.preferredVendorId || "",
    bomId: initial?.bomId || "",
    reorderThreshold: initial?.reorderThreshold || 0,
    onHand: initial?.onHand ?? 0,
  });
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><Input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="SKU"><Input required value={f.sku} onChange={e => setF({ ...f, sku: e.target.value })} /></Field>
        <Field label="Category"><Input value={f.category} onChange={e => setF({ ...f, category: e.target.value })} /></Field>
        <Field label="Strategy">
          <Select value={f.strategy} onChange={e => setF({ ...f, strategy: e.target.value as Strategy })}>
            <option value="MTS">Make to Stock</option>
            <option value="MTO">Make to Order</option>
          </Select>
        </Field>
        <Field label="Cost price (₹)"><Input type="number" value={f.costPrice} onChange={e => setF({ ...f, costPrice: +e.target.value })} /></Field>
        <Field label="Sale price (₹)"><Input type="number" value={f.salePrice} onChange={e => setF({ ...f, salePrice: +e.target.value })} /></Field>
        <Field label="Procurement type">
          <Select value={f.procurementType} onChange={e => setF({ ...f, procurementType: e.target.value as ProcurementType })}>
            <option value="Purchase">Purchase from vendor</option>
            <option value="Manufacturing">Manufactured in-house</option>
          </Select>
        </Field>
        <Field label="Reorder threshold"><Input type="number" value={f.reorderThreshold} onChange={e => setF({ ...f, reorderThreshold: +e.target.value })} /></Field>
        {f.procurementType === "Purchase" && (
          <Field label="Preferred vendor">
            <Select value={f.preferredVendorId} onChange={e => setF({ ...f, preferredVendorId: e.target.value })}>
              <option value="">—</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
        )}
        {f.procurementType === "Manufacturing" && (
          <Field label="Bill of Materials">
            <Select value={f.bomId} onChange={e => setF({ ...f, bomId: e.target.value })}>
              <option value="">—</option>
              {boms.map(b => <option key={b.id} value={b.id}>{b.id}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Opening stock"><Input type="number" value={f.onHand} onChange={e => setF({ ...f, onHand: +e.target.value })} /></Field>
      </div>
      <Field label="Description"><Textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" variant="primary">Save product</Button>
      </div>
    </form>
  );
}

function ProductDetail({ product, ledger, vendors, boms, writable, onSave }: {
  product: Product;
  ledger: any[];
  vendors: any[];
  boms: any[];
  writable: boolean;
  onSave: (patch: Partial<Product>) => void;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <ProductForm vendors={vendors} boms={boms} initial={product} onSubmit={(p) => { onSave(p); setEditing(false); }} />;
  }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Detail label="SKU" value={product.sku} mono />
        <Detail label="Category" value={product.category} />
        <Detail label="Strategy" value={product.strategy} />
        <Detail label="Procurement" value={product.procurementType} />
        <Detail label="Cost price" value={`₹${product.costPrice.toLocaleString("en-IN")}`} />
        <Detail label="Sale price" value={`₹${product.salePrice.toLocaleString("en-IN")}`} />
        <Detail label="On hand" value={String(product.onHand)} />
        <Detail label="Reserved" value={String(product.reserved)} />
        <Detail label="Free to use" value={String(product.onHand - product.reserved)} />
        <Detail label="Reorder at" value={String(product.reorderThreshold)} />
      </div>
      {product.description && (
        <div className="text-sm">
          <div className="mb-1 text-[12px] font-medium uppercase text-muted-foreground">Notes</div>
          <p>{product.description}</p>
        </div>
      )}
      <div>
        <div className="mb-2 text-[12px] font-medium uppercase text-muted-foreground">Recent stock movements</div>
        {ledger.length === 0 ? (
          <p className="text-xs text-muted-foreground">No movements yet for this product.</p>
        ) : (
          <div className="relative border-l-2 border-border pl-4">
            {ledger.map(l => (
              <div key={l.id} className="mb-3 last:mb-0">
                <div className="text-[11px] tabular text-muted-foreground">{format(new Date(l.ts), "dd MMM yyyy HH:mm")}</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{l.type}</span>
                  <span className={`tabular font-mono ${l.deltaQty < 0 ? "text-destructive" : l.deltaQty > 0 ? "text-success" : "text-muted-foreground"}`}>
                    {l.deltaQty > 0 ? "+" : ""}{l.deltaQty}
                  </span>
                  <span className="text-xs text-muted-foreground">on hand → {l.onHandAfter}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {writable && <Button variant="primary" onClick={() => setEditing(true)}>Edit product</Button>}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase text-muted-foreground">{label}</div>
      <div className={mono ? "font-mono text-sm" : "text-sm font-medium"}>{value}</div>
    </div>
  );
}