import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useERP } from "@/lib/erp/store";
import { Select, Input } from "@/components/erp/ui";
import { EmptyState } from "@/components/erp/StatusBadge";
import { format } from "date-fns";
import { ChevronRight, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [{ title: "Audit log — Shiv Furniture Works" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { audit, users } = useERP();
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const userName = (id: string) => users.find(u => u.id === id)?.name || id;

  const entityTypes = Array.from(new Set(audit.map(a => a.recordType)));
  const filtered = useMemo(() => audit.filter(a => {
    if (type && a.recordType !== type) return false;
    if (from && new Date(a.ts) < new Date(from)) return false;
    return true;
  }), [audit, type, from]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onChange={e => setType(e.target.value)} className="w-56">
          <option value="">All entity types</option>
          {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-44" />
        <span className="text-xs text-muted-foreground">{filtered.length} entries</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No audit entries match" hint="System actions write to this log automatically." />
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="relative border-l-2 border-border ml-4 my-3">
            {filtered.map(a => {
              const isOpen = open[a.id];
              const hasDiff = !!(a.field || a.oldValue !== undefined || a.newValue !== undefined);
              return (
                <div key={a.id} className="border-b border-border/50 last:border-b-0">
                  <button
                    onClick={() => setOpen(o => ({ ...o, [a.id]: !o[a.id] }))}
                    className="group relative grid w-full grid-cols-12 items-center gap-3 px-4 py-2 text-left -ml-px hover:bg-muted/40"
                  >
                    <span className="absolute -left-[5px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-accent" />
                    <div className="col-span-3 font-mono tabular text-[11px] text-muted-foreground">
                      {format(new Date(a.ts), "dd MMM yyyy HH:mm:ss")}
                    </div>
                    <div className="col-span-2">
                      <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium">{a.module}</span>
                    </div>
                    <div className="col-span-3 truncate">
                      <span className="font-medium">{a.action}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{a.recordType}</span>
                    </div>
                    <div className="col-span-3 truncate text-xs text-muted-foreground">by {userName(a.userId)}</div>
                    <div className="col-span-1 text-right text-muted-foreground">
                      {hasDiff && (isOpen ? <ChevronDown className="h-3.5 w-3.5 inline" /> : <ChevronRight className="h-3.5 w-3.5 inline" />)}
                    </div>
                  </button>
                  {isOpen && hasDiff && (
                    <div className="bg-muted/30 px-6 py-2 text-xs">
                      <div className="mb-1 text-muted-foreground">Record: <span className="font-mono">{a.recordId}</span></div>
                      {a.field && <div className="mb-1">Field: <span className="font-mono">{a.field}</span></div>}
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-mono text-destructive">{a.oldValue ?? "—"}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="rounded-md border border-success/30 bg-success/15 px-1.5 py-0.5 font-mono text-success">{a.newValue ?? "—"}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}