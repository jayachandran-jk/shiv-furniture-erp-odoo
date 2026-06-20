import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { hasPermission } from "@/lib/erp/permissions";
import { DataTable, type Column } from "@/components/erp/DataTable";
import { Button, Input, Select } from "@/components/erp/ui";
import { StatusBadge, EmptyState } from "@/components/erp/StatusBadge";
import type { BoM } from "@/lib/erp/types";
import { Plus, Search, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/_app/bom/")({
  head: () => ({ meta: [{ title: "Bill of Materials — Shiv Furniture ERP" }] }),
  component: BomListPage,
});

function BomListPage() {
  const { boms, products, searchQuery: query, setSearchQuery: setQuery } = useERP();
  const user = useCurrentUser();
  const writable = hasPermission(user?.role, "bom:write");
  const [status, setStatus] = useState("all");
  const [finishedProduct, setFinishedProduct] = useState("");

  const productName = (id: string) => products.find(p => p.id === id)?.name || id;
  const productSku = (id: string) => products.find(p => p.id === id)?.sku || "";

  const filtered = useMemo(() => boms.filter(bom => {
    const q = query.trim().toLowerCase();
    const prodName = productName(bom.productId).toLowerCase();
    const prodSku = productSku(bom.productId).toLowerCase();
    const ref = bom.bomReference?.toLowerCase() || "";

    // Search by product name, SKU, or BoM reference
    if (q && !prodName.includes(q) && !prodSku.includes(q) && !ref.includes(q)) return false;

    // Filter by active status
    if (status === "active" && !bom.isActive) return false;
    if (status === "inactive" && bom.isActive) return false;

    // Filter by finished product ID
    if (finishedProduct && bom.productId !== finishedProduct) return false;

    return true;
  }), [boms, query, status, finishedProduct, products]);

  const columns: Column<BoM>[] = [
    {
      key: "bomReference",
      header: "BoM Reference",
      sortValue: b => b.bomReference || "",
      cell: b => (
        <Link
          to="/bom/$id"
          params={{ id: b.id }}
          className="font-mono text-xs font-semibold text-accent hover:underline"
        >
          {b.bomReference || "BOM-NEW"}
        </Link>
      ),
    },
    {
      key: "finishedProduct",
      header: "Finished Product",
      sortValue: b => productName(b.productId),
      cell: b => (
        <div>
          <div className="font-medium">{productName(b.productId)}</div>
          <div className="text-xs text-muted-foreground">{productSku(b.productId)}</div>
        </div>
      ),
    },
    {
      key: "version",
      header: "Version",
      align: "center",
      sortValue: b => b.version || 1,
      cell: b => <span className="font-mono text-xs text-muted-foreground">v{b.version || 1}</span>,
    },
    {
      key: "componentsCount",
      header: "Components",
      align: "right",
      sortValue: b => b.components?.length || 0,
      cell: b => <span className="tabular font-medium">{b.components?.length || 0} items</span>,
    },
    {
      key: "duration",
      header: "Est. Time",
      align: "right",
      sortValue: b => b.operations?.reduce((acc, op) => acc + (op.durationMinutes || 0), 0) || 0,
      cell: b => {
        const totalMin = b.operations?.reduce((acc, op) => acc + (op.durationMinutes || 0), 0) || 0;
        return <span className="tabular text-muted-foreground">{totalMin} min</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      sortValue: b => b.isActive ? "Active" : "Inactive",
      cell: b => (
        <StatusBadge status={b.isActive ? "Active" : "Inactive"} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product or BOM reference"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-64 pl-8"
          />
        </div>
        <Select value={status} onChange={e => setStatus(e.target.value)} className="w-40">
          <option value="all">All statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </Select>
        <Select value={finishedProduct} onChange={e => setFinishedProduct(e.target.value)} className="w-48">
          <option value="">All Finished Products</option>
          {products
            .filter(p => p.procurementType === "Manufacturing")
            .map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </Select>
        <div className="ml-auto" />
        {writable && (
          <Link to="/bom/new">
            <Button variant="primary">
              <Plus className="mr-1.5 h-4 w-4" />
              New BoM
            </Button>
          </Link>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        empty={
          <EmptyState
            title="No Bills of Materials found"
            hint="Create a bill of materials to define recipes for manufactured items."
          />
        }
      />
    </div>
  );
}
