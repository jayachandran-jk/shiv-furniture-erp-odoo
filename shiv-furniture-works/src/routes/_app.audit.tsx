import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
import { useERP } from "@/lib/erp/store";
import { EmptyState } from "@/components/erp/StatusBadge";
import { format } from "date-fns";
import { Filter, RotateCcw, ChevronLeft, ChevronRight, Calendar, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useRef } from "react";
import type { AuditEntry } from "@/lib/erp/types";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ title: "Audit Logs — Shiv Furniture Works" }] }),
  component: AuditPage,
});

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 10_000; // 10 seconds

/* ─────────────── helpers ─────────────── */

function parseNumeric(s?: string | null): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[₹,]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function formatAuditChanges(oldValStr: string | undefined, newValStr: string | undefined) {
  let field = "—";
  let oldValue = oldValStr || "";
  let newValue = newValStr || "";

  const cleanJsonString = (s: string) => {
    if (!s) return s;
    if (s.startsWith("\"") && s.endsWith("\"")) return s.slice(1, -1);
    return s;
  };

  const isJson = (str: string) => {
    const s = str.trim();
    return (s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"));
  };

  try {
    if (oldValStr && newValStr && isJson(oldValStr) && isJson(newValStr)) {
      const oldObj = JSON.parse(oldValStr);
      const newObj = JSON.parse(newValStr);
      
      const changedFields: string[] = [];
      const oldValues: string[] = [];
      const newValues: string[] = [];

      for (const key of Object.keys(newObj)) {
        const oldValJson = JSON.stringify(oldObj[key]);
        const newValJson = JSON.stringify(newObj[key]);
        
        if (oldValJson !== newValJson) {
          changedFields.push(key);
          oldValues.push(`${key}: ${oldObj[key] !== undefined ? oldObj[key] : 'none'}`);
          newValues.push(`${key}: ${newObj[key] !== undefined ? newObj[key] : 'none'}`);
        }
      }

      if (changedFields.length > 0) {
        field = changedFields.join(", ");
        oldValue = oldValues.join(", ");
        newValue = newValues.join(", ");
      } else {
        oldValue = cleanJsonString(oldValStr);
        newValue = cleanJsonString(newValStr);
      }
    } else if (newValStr && isJson(newValStr) && !oldValStr) {
      const newObj = JSON.parse(newValStr);
      const fields = Object.keys(newObj);
      field = fields.join(", ");
      newValue = fields.map(k => `${k}: ${newObj[k]}`).join(", ");
      oldValue = "—";
    } else {
      oldValue = cleanJsonString(oldValStr || "");
      newValue = cleanJsonString(newValStr || "");
    }
  } catch (e) {
    oldValue = cleanJsonString(oldValStr || "");
    newValue = cleanJsonString(newValStr || "");
  }

  return { field, oldValue: oldValue || "—", newValue: newValue || "—" };
}

function ActionBadge({ action }: { action: string }) {
  const lower = action.toLowerCase();
  let cls = "bg-gray-50 text-gray-700 border-gray-200";
  if (lower.includes("creat")) cls = "bg-green-50 text-green-700 border-green-200";
  else if (lower.includes("updat") || lower.includes("confirm") || lower.includes("book") || lower.includes("receiv") || lower.includes("complet") || lower.includes("status") || lower.includes("deliver")) cls = "bg-amber-50 text-amber-700 border-amber-200";
  else if (lower.includes("delet") || lower.includes("cancel")) cls = "bg-red-50 text-red-700 border-red-200";

  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium border ${cls}`}>
      {action}
    </span>
  );
}

function mapLog(a: any): AuditEntry {
  let mod = "System";
  const et = a.entityType;
  if (et === "Product") mod = "Products";
  else if (et === "SalesOrder") mod = "Sales";
  else if (et === "PurchaseOrder" || et === "Vendor") mod = "Purchase";
  else if (et === "ManufacturingOrder" || et === "WorkCenter" || et === "WorkOrder") mod = "Manufacturing";
  else if (et === "User") mod = "Settings";
  else if (et === "BoM" || et === "BILL_OF_MATERIALS") mod = "Bill of Materials";
  else if (et === "Customer") mod = "Sales";
  else if (et === "StockLedger") mod = "Inventory";

  const formatted = formatAuditChanges(a.oldValue, a.newValue);

  return {
    id: a.id,
    ts: a.ts || new Date().toISOString(),
    userId: a.userId || "system",
    module: mod,
    recordType: a.entityType,
    recordId: a.entityId,
    action: a.action,
    field: formatted.field,
    oldValue: formatted.oldValue,
    newValue: formatted.newValue,
  };
}

/* ─────────────── main page ─────────────── */

function AuditPage() {
  const { users } = useERP();

  // filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  // applied filters (only apply on Filter button click)
  const [applied, setApplied] = useState({ dateFrom: "", dateTo: "", user: "", module: "", action: "" });

  // live state
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const userName = (id: string) => users.find(u => u.id === id)?.name || (id === "system" ? "System" : id);

  const allModules = ["Sales", "Purchase", "Manufacturing", "Products", "Inventory", "Bill of Materials", "Settings"];

  // Server state
  const [kpis, setKpis] = useState({ total: 0, creates: 0, updates: 0, deletes: 0 });
  const [pageRows, setPageRows] = useState<AuditEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/audit-logs/summary`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setKpis({
          total: data.totalLogs || 0,
          creates: data.createCount || 0,
          updates: data.updateCount || 0,
          deletes: data.deleteCount || 0,
        });
      }
    } catch (err) {
      // silently fail on poll errors
    }
  }, []);

  // Fetch paginated data
  const fetchPage = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("size", PAGE_SIZE.toString());
      if (applied.dateFrom) params.append("from", applied.dateFrom);
      if (applied.dateTo) params.append("to", applied.dateTo);
      if (applied.user) params.append("user", applied.user);
      if (applied.module) params.append("module", applied.module);
      if (applied.action) params.append("action", applied.action);

      const response = await fetch(`http://localhost:4000/api/audit-logs?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const mappedLogs = (data.content || []).map(mapLog);
        setPageRows(mappedLogs);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);
        setLastUpdated(new Date());
      }
    } catch (err) {
      // silently fail on poll errors
    } finally {
      setIsRefreshing(false);
    }
  }, [page, applied]);

  // Initial load and when page/filters change
  useEffect(() => {
    fetchSummary();
    fetchPage(false);
  }, [fetchSummary, fetchPage]);

  // Auto-poll every 10 seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      fetchSummary();
      fetchPage(true); // silent refresh — no spinner
    }, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLive, fetchSummary, fetchPage]);

  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, totalElements);

  const handleFilter = () => {
    setApplied({ dateFrom, dateTo, user: userFilter, module: moduleFilter, action: actionFilter });
    setPage(1);
  };

  const handleReset = () => {
    setDateFrom(""); setDateTo(""); setUserFilter(""); setModuleFilter(""); setActionFilter("");
    setApplied({ dateFrom: "", dateTo: "", user: "", module: "", action: "" });
    setPage(1);
  };

  const handleManualRefresh = () => {
    fetchSummary();
    fetchPage(false);
  };

  // generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-5">
      {/* ── Live Header Bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Live toggle */}
          <button
            onClick={() => setIsLive(v => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
              isLive
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-gray-50 text-gray-500 border-gray-200"
            }`}
            title={isLive ? "Click to pause live updates" : "Click to resume live updates"}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {isLive ? "Live" : "Paused"}
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Last updated: {format(lastUpdated, "hh:mm:ss a")}
            </span>
          )}
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          title="Refresh now"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── SECTION 1: KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Logs" value={kpis.total} sub="All time logs" borderColor="#7C5C3E" />
        <KpiCard label="Create Actions" value={kpis.creates} sub="Records Created" borderColor="#22c55e" />
        <KpiCard label="Update Actions" value={kpis.updates} sub="Records Updated" borderColor="#f59e0b" />
        <KpiCard label="Delete Actions" value={kpis.deletes} sub="Records Deleted" borderColor="#ef4444" />
      </div>

      {/* ── SECTION 2: Filter Bar ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <FilterField label="Date Range">
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-[38px] w-[140px] rounded-md border border-gray-200 bg-white px-2.5 pr-8 text-sm text-[#2B2622] focus:outline-none focus:ring-1 focus:ring-[#7C5C3E]"
              />
              <Calendar className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
            <span className="text-xs text-gray-400">–</span>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-[38px] w-[140px] rounded-md border border-gray-200 bg-white px-2.5 pr-8 text-sm text-[#2B2622] focus:outline-none focus:ring-1 focus:ring-[#7C5C3E]"
              />
              <Calendar className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </FilterField>
        <FilterField label="User">
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="h-[38px] w-[160px] rounded-md border border-gray-200 bg-white px-2 text-sm text-[#2B2622] focus:outline-none focus:ring-1 focus:ring-[#7C5C3E]"
          >
            <option value="">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Module">
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="h-[38px] w-[160px] rounded-md border border-gray-200 bg-white px-2 text-sm text-[#2B2622] focus:outline-none focus:ring-1 focus:ring-[#7C5C3E]"
          >
            <option value="">All Modules</option>
            {allModules.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </FilterField>
        <FilterField label="Actions">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="h-[38px] w-[160px] rounded-md border border-gray-200 bg-white px-2 text-sm text-[#2B2622] focus:outline-none focus:ring-1 focus:ring-[#7C5C3E]"
          >
            <option value="">All Actions</option>
            <option value="Created">Created</option>
            <option value="Updated">Updated</option>
            <option value="Deleted">Deleted</option>
          </select>
        </FilterField>

        <button
          onClick={handleFilter}
          className="inline-flex h-[38px] items-center gap-1.5 rounded-md bg-[#7C5C3E] px-4 text-sm font-medium text-white hover:bg-[#6a4e34] transition-colors"
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
        <button
          onClick={handleReset}
          className="inline-flex h-[38px] items-center gap-1.5 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      {/* ── SECTION 3: Audit Log Table ── */}
      {totalElements === 0 ? (
        <EmptyState title="No audit entries match" hint="System actions write to this log automatically. Try refreshing if you just performed an action." />
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAF8F5] text-left">
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-44">Date &amp; Time</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-32">User</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-28">Module</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-40">Record Type</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-32">Record ID</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-28">Action</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-32">Field Changed</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-36">Old Value</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-36">New Value</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map(a => {
                  const oldNum = parseNumeric(a.oldValue);
                  const newNum = parseNumeric(a.newValue);
                  let newValueColor = "text-[#2B2622]";
                  if (oldNum !== null && newNum !== null) {
                    if (newNum > oldNum) newValueColor = "text-green-600";
                    else if (newNum < oldNum) newValueColor = "text-red-600";
                  }

                  return (
                    <tr key={a.id} className="border-b border-gray-100 hover:bg-[#FAF8F5] transition-colors">
                      <td className="px-3 py-2.5 text-sm text-[#2B2622] whitespace-nowrap">
                        {a.ts ? format(new Date(a.ts), "dd MMM yyyy, hh:mm:ss a") : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-[#2B2622]">
                        {userName(a.userId)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-[#2B2622]">
                        {a.module}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-[#2B2622]">
                        {a.recordType}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-[#2B2622]">
                        {a.recordId}
                      </td>
                      <td className="px-3 py-2.5">
                        <ActionBadge action={a.action} />
                      </td>
                      <td className="px-3 py-2.5 text-sm text-[#2B2622] max-w-[160px] truncate" title={a.field}>
                        {a.field || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-[#2B2622] max-w-[180px] truncate" title={a.oldValue}>
                        {a.oldValue || <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`px-3 py-2.5 text-sm ${newValueColor} max-w-[180px] truncate`} title={a.newValue}>
                        {a.newValue || <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── SECTION 4: Pagination ── */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-xs text-gray-400">
              Showing {totalElements === 0 ? 0 : pageStart + 1}–{pageEnd} of {totalElements} results
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageNumbers.map((pn, i) =>
                pn === "..." ? (
                  <span key={`dots-${i}`} className="px-2 text-sm text-gray-400">…</span>
                ) : (
                  <button
                    key={pn}
                    onClick={() => setPage(pn as number)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded text-sm font-medium transition-colors ${
                      pn === currentPage
                        ? "bg-[#7C5C3E] text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {pn}
                  </button>
                )
              )}
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── subcomponents ─────────────── */

function KpiCard({ label, value, sub, borderColor }: { label: string; value: number; sub: string; borderColor: string }) {
  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4 border-l-4"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="text-sm font-medium text-[#7C5C3E]">{label}</div>
      <div className="mt-1 text-3xl font-bold text-[#2B2622]">{value.toLocaleString("en-IN")}</div>
      <div className="mt-0.5 text-xs text-gray-400">{sub}</div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      {children}
    </div>
  );
}