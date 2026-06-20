import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useERP, useHasHydrated } from "@/lib/erp/store";
import { Button, Field, Input } from "@/components/erp/ui";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Shiv Furniture Works" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, currentUserId, theme } = useERP();
  const hydrated = useHasHydrated();
  const [email, setEmail] = useState("admin@shiv.co");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (hydrated && currentUserId) navigate({ to: "/dashboard" });
  }, [hydrated, currentUserId, navigate, theme]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const success = await login(email.trim(), password);
    if (success) {
      navigate({ to: "/dashboard" });
    } else {
      setError("Email and password didn't match an active account.");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground font-serif text-lg font-semibold">S</div>
          <h1 className="font-serif text-2xl font-semibold">Shiv Furniture Works</h1>
          <p className="mt-1 text-sm text-muted-foreground">Operations console</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-5">
          <Field label="Email">
            <Input value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
          <Button type="submit" variant="primary" className="w-full">Sign in</Button>
        </form>
        <div className="mt-4 rounded-md border border-dashed bg-card/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <div className="mb-1 font-medium text-foreground">Demo accounts</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span>admin@shiv.co / admin</span><span className="text-right opacity-60">Admin</span>
            <span>sales@shiv.co / sales</span><span className="text-right opacity-60">Sales</span>
            <span>purchase@shiv.co / purchase</span><span className="text-right opacity-60">Purchase</span>
            <span>mfg@shiv.co / mfg</span><span className="text-right opacity-60">Manufacturing</span>
            <span>inventory@shiv.co / inventory</span><span className="text-right opacity-60">Inventory</span>
            <span>owner@shiv.co / owner</span><span className="text-right opacity-60">Owner</span>
          </div>
        </div>
      </div>
    </div>
  );
}