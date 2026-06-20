import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";

export function Button({
  variant = "secondary", className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const styles: Record<Variant, string> = {
    primary: "bg-accent text-accent-foreground hover:bg-accent/90 border-accent",
    secondary: "bg-card text-foreground border-border hover:bg-muted",
    ghost: "bg-transparent text-foreground border-transparent hover:bg-muted",
    outline: "bg-transparent text-foreground border-border hover:bg-muted",
    danger: "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90",
  };
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        styles[variant],
        className,
      )}
    />
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cn(
        "h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
        className,
      )}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cn(
        "h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cn(
        "min-h-[64px] w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
        className,
      )}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Sheet({ open, onClose, title, children, width = 520 }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full flex-col border-l bg-card shadow-xl" style={{ width }}>
        <div className="flex h-14 items-center justify-between border-b px-4">
          <h2 className="font-serif text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border bg-card shadow-xl">
        <div className="border-b px-4 py-3">
          <h2 className="font-serif text-base font-semibold">{title}</h2>
        </div>
        <div className="p-4 text-sm">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t bg-muted/40 px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Section({ title, actions, children, className }: { title?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-3">
          {title && <h2 className="font-serif text-lg font-semibold">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusStepper({ steps, current }: { steps: string[]; current: string }) {
  const idx = steps.indexOf(current);
  // When on the last step, show it as done too (all steps checked)
  const isLastStep = idx === steps.length - 1;
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((s, i) => {
        const done = i < idx || (isLastStep && i === idx);
        const active = i === idx && !isLastStep;
        return (
          <li key={s} className="flex items-center gap-2">
            <span className={cn(
              "grid h-5 w-5 place-items-center rounded-full border text-[10px] font-semibold",
              done && "border-success bg-success/15 text-success",
              active && "border-accent bg-accent text-accent-foreground",
              !done && !active && "border-border bg-muted text-muted-foreground",
            )}>{done ? "✓" : i + 1}</span>
            <span className={cn("font-medium", (active || done) ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 text-muted-foreground">›</span>}
          </li>
        );
      })}
    </ol>
  );
}