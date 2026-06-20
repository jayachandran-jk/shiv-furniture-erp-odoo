import { cn } from "@/lib/utils";

const MAP: Record<string, string> = {
  "Draft": "bg-muted text-muted-foreground border-border",
  "Confirmed": "bg-primary/10 text-primary border-primary/20",
  "Partially Delivered": "bg-warning/15 text-warning border-warning/30",
  "Fully Delivered": "bg-success/15 text-success border-success/30",
  "Cancelled": "bg-destructive/10 text-destructive border-destructive/30",
  "Partially Received": "bg-warning/15 text-warning border-warning/30",
  "Fully Received": "bg-success/15 text-success border-success/30",
  "In Progress": "bg-accent/15 text-accent border-accent/30",
  "Done": "bg-success/15 text-success border-success/30",
  "Pending": "bg-muted text-muted-foreground border-border",
  "Started": "bg-accent/15 text-accent border-accent/30",
  "Paused": "bg-warning/15 text-warning border-warning/30",
  "Active": "bg-success/15 text-success border-success/30",
  "Inactive": "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        MAP[status] || "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {status}
    </span>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <div className="font-serif text-base font-semibold">{title}</div>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}