import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  align?: "left" | "right" | "center";
}

export function DataTable<T extends { id: string }>({
  columns, rows, onRowClick, pageSize = 25, empty,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  pageSize?: number;
  empty?: React.ReactNode;
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);

  const sorted = sort
    ? [...rows].sort((a, b) => {
        const col = columns.find(c => c.key === sort.key);
        if (!col?.sortValue) return 0;
        const av = col.sortValue(a), bv = col.sortValue(b);
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ? 1 : -1;
        return 0;
      })
    : rows;

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);

  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/50 text-left text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    "select-none border-b px-3 py-2 font-medium",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.sortValue && "cursor-pointer hover:text-foreground",
                  )}
                  onClick={() => {
                    if (!col.sortValue) return;
                    setSort(s =>
                      s?.key === col.key
                        ? { key: col.key, dir: s.dir === "asc" ? "desc" : "asc" }
                        : { key: col.key, dir: "asc" },
                    );
                  }}
                >
                  {col.header}
                  {sort?.key === col.key && (sort.dir === "asc" ? " ↑" : " ↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => (
              <tr
                key={row.id}
                className={cn("border-b last:border-b-0 transition-colors", onRowClick && "cursor-pointer hover:bg-muted/40")}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-2.5 align-middle",
                      col.align === "right" && "text-right tabular",
                      col.align === "center" && "text-center",
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>{sorted.length} records · page {page + 1} of {pageCount}</span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="rounded-md border bg-background px-2 py-1 disabled:opacity-40"
            >Prev</button>
            <button
              disabled={page >= pageCount - 1}
              onClick={() => setPage(p => p + 1)}
              className="rounded-md border bg-background px-2 py-1 disabled:opacity-40"
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
}