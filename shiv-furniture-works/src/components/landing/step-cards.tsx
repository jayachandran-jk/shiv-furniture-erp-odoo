import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, type LucideIcon } from "lucide-react";

export type Step = {
  n: string;
  i: LucideIcon;
  t: string;
  d: string;
};

export function StepCards({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-12">
      {/* Step rail */}
      <div className="flex flex-col gap-3">
        {steps.map((s, i) => {
          const isActive = i === active;
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`group relative flex items-start gap-4 rounded-2xl border p-5 text-left transition-all ${
                isActive
                  ? "glass-card border-primary/30 shadow-[0_10px_40px_-20px_rgba(140,90,255,0.6)]"
                  : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
              }`}
            >
              <div
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition ${
                  isActive ? "" : "opacity-60 grayscale"
                }`}
                style={{ background: "var(--gradient-primary)" }}
              >
                <s.i className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
                  STEP {s.n}
                  {isActive && (
                    <span className="h-1 w-6 rounded-full" style={{ background: "var(--gradient-primary)" }} />
                  )}
                </div>
                <div className="mt-1 text-base font-semibold">{s.t}</div>
              </div>
              <ArrowRight
                className={`mt-2 h-4 w-4 shrink-0 transition ${
                  isActive ? "text-primary translate-x-1" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="glass-card relative h-full min-h-[420px] overflow-hidden rounded-3xl p-10"
          >
            <div
              className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-50 blur-3xl"
              style={{ background: "var(--gradient-primary)" }}
            />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center gap-3">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === active ? "w-10 bg-primary" : "w-4 bg-white/15"
                    }`}
                  />
                ))}
              </div>
              <div className="mt-8 inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Step {steps[active].n} of {String(steps.length).padStart(2, "0")}
              </div>
              <h3 className="mt-5 text-4xl font-semibold tracking-tight text-gradient sm:text-5xl">
                {steps[active].t}
              </h3>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
                {steps[active].d}
              </p>
              <div className="mt-auto flex items-center justify-between pt-8">
                <button
                  onClick={() => setActive((a) => Math.max(0, a - 1))}
                  disabled={active === 0}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  onClick={() => setActive((a) => Math.min(steps.length - 1, a + 1))}
                  disabled={active === steps.length - 1}
                  className="group inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(140,90,255,0.6)] transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Next step
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}