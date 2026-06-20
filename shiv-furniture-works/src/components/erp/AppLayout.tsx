import { Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, ClipboardList,
  Factory, Layers, ScrollText, Settings as SettingsIcon, ChevronLeft, ChevronRight,
  Search, Sun, Moon, LogOut, Truck,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useERP, useCurrentUser, useHasHydrated } from "@/lib/erp/store";
import { getVisibleNavItems, hasPermission } from "@/lib/erp/permissions";
import type { Permission } from "@/lib/erp/permissions";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Package, Warehouse, ShoppingCart, ClipboardList,
  Factory, Layers, ScrollText, Settings: SettingsIcon, Truck,
  FileText: ScrollText,
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  sales: "Sales",
  purchase: "Purchase",
  manufacturing: "Manufacturing",
  inventory: "Inventory",
  owner: "Owner",
};

export function AppLayout() {
  const user = useCurrentUser();
  const hydrated = useHasHydrated();
  const navigate = useNavigate();
  const { currentUserId, theme, setTheme, sidebarCollapsed, toggleSidebar, logout, bumpTick, refreshData } = useERP();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (currentUserId) {
      refreshData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    if (hydrated && !currentUserId) navigate({ to: "/login" });
  }, [hydrated, currentUserId, navigate]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => {
    const i = setInterval(() => bumpTick(), 1000);
    return () => clearInterval(i);
  }, [bumpTick]);

  if (!hydrated || !currentUserId) return null;

  if (!user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground font-serif text-lg font-semibold animate-pulse">S</div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const visibleNav = getVisibleNavItems(user.role);
  const currentTitle = visibleNav.find(n => pathname.startsWith(n.to))?.label || "Dashboard";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-100",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground font-serif text-base font-semibold">
            S
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="truncate font-serif text-sm font-semibold leading-tight">Shiv Furniture</div>
              <div className="truncate text-[11px] text-muted-foreground leading-tight">Works · {ROLE_LABEL[user.role] || user.role}</div>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {visibleNav.map(item => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = ICON_MAP[item.icon] || Package;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={toggleSidebar}
          className="flex h-10 items-center justify-center border-t border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/60"
          aria-label="Collapse sidebar"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4">
          <h1 className="font-serif text-[22px] font-semibold leading-none">{currentTitle}</h1>
          <div className="relative ml-6 max-w-md flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              placeholder="Search   (press /)"
              className="h-8 w-full rounded-md border bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="text-right leading-tight">
                <div className="text-sm font-medium">{user.name}</div>
                <div className="text-[11px] text-muted-foreground">{user.email}</div>
              </div>
              <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {ROLE_LABEL[user.role] || user.role}
              </span>
            </div>
            <button
              onClick={() => { logout(); navigate({ to: "/login" }); }}
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1400px] p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/** @deprecated Use hasPermission from permissions.ts instead */
export function canWrite(role?: string | null) {
  if (!role) return false;
  return hasPermission(role as any, "sales:write");
}