import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useERP, useCurrentUser } from "@/lib/erp/store";
import { Button, Field, Input, Select, Sheet } from "@/components/erp/ui";
import { Plus } from "lucide-react";
import type { Role } from "@/lib/erp/types";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Shiv Furniture Works" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { users, createUser, toggleUserActive } = useERP();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== "admin") navigate({ to: "/dashboard" });
  }, [user, navigate]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">Users & roles</h2>
          <Button variant="primary" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" />Add user</Button>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Email</th><th className="px-3 py-2 font-medium">Role</th><th className="px-3 py-2 font-medium">Active</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-medium">{u.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-3 py-2"><span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase">{u.role}</span></td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={u.active} onChange={() => toggleUserActive(u.id)} />
                      {u.active ? "Active" : "Disabled"}
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Sheet open={open} onClose={() => setOpen(false)} title="Add user">
        <NewUserForm onSubmit={(u) => { createUser(u); setOpen(false); }} />
      </Sheet>
    </div>
  );
}

function NewUserForm({ onSubmit }: { onSubmit: (u: { name: string; email: string; role: Role; active: boolean; password: string }) => void }) {
  const [f, setF] = useState({ name: "", email: "", password: "", role: "operations" as Role, active: true });
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(f); }} className="space-y-3">
      <Field label="Full name"><Input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Email"><Input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Password"><Input type="text" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field>
      <Field label="Role">
        <Select value={f.role} onChange={e => setF({ ...f, role: e.target.value as Role })}>
          <option value="admin">Admin — full access</option>
          <option value="operations">Operations — full CRUD except settings</option>
          <option value="owner">Owner — read-only</option>
        </Select>
      </Field>
      <Button type="submit" variant="primary">Create user</Button>
    </form>
  );
}