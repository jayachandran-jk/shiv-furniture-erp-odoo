import { Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart, ClipboardList,
  Factory, Layers, ScrollText, Settings as SettingsIcon, ChevronLeft, ChevronRight,
  Search, Sun, Moon, LogOut, Truck, Bell, CheckCheck, Zap, AlertTriangle
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useERP, useCurrentUser, useHasHydrated } from "@/lib/erp/store";
import { getVisibleNavItems, hasPermission } from "@/lib/erp/permissions";
import type { Permission } from "@/lib/erp/permissions";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Package, Warehouse, ShoppingCart, ClipboardList,
  Factory, Layers, ScrollText, Settings: SettingsIcon, Truck, Zap,
  FileText: ScrollText,
  AlertTriangle,
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  sales: "Sales",
  purchase: "Purchase",
  manufacturing: "Manufacturing",
  inventory: "Inventory",
  owner: "Owner",
};

interface Notification {
  id: number;
  userId: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return "just now";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDays}d ago`;
  } catch (e) {
    return "some time ago";
  }
}

export function AppLayout() {
  const user = useCurrentUser();
  const hydrated = useHasHydrated();
  const navigate = useNavigate();
  const { currentUserId, theme, setTheme, sidebarCollapsed, toggleSidebar, logout, bumpTick, refreshData, searchQuery, setSearchQuery, bottlenecks } = useERP();
  const pathname = useRouterState({ select: s => s.location.pathname });
  const searchRef = useRef<HTMLInputElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);

  const activeCount = (bottlenecks || []).filter(b => b.status === "ACTIVE").length;

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:4000/api/notifications", {
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
        }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUserId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (n: Notification) => {
    setNotificationsOpen(false);
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:4000/api/notifications/${n.id}/read`, {
        method: "PUT",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
        }
      });
      fetchNotifications();
    } catch (e) {
      // Ignore
    }

    if (n.entityType && n.entityId) {
      if (n.entityType === "MANUFACTURING_ORDER") {
        navigate({ to: "/manufacturing/$id", params: { id: n.entityId } });
      } else if (n.entityType === "PURCHASE_ORDER") {
        navigate({ to: "/purchase/$id", params: { id: n.entityId } });
      } else if (n.entityType === "SALES_ORDER") {
        navigate({ to: "/sales/$id", params: { id: n.entityId } });
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:4000/api/notifications/read-all", {
        method: "PUT",
        headers: {
          "Authorization": token ? `Bearer ${token}` : "",
        }
      });
      fetchNotifications();
    } catch (e) {
      // Ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
          <svg
            width="40"
            height="40"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto mb-3 h-10 w-10 animate-pulse shrink-0"
          >
            <rect width="32" height="32" rx="8" fill="#C2623F" />
            <path
              d="M8 7H11L13.5 17H25V20H24.2L22.7 26H20.2L21.7 20H13.3L10.3 26H7.8L10.8 20L8 7Z"
              fill="#FFFFFF"
            />
          </svg>
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
          <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 shrink-0"
          >
            <rect width="32" height="32" rx="8" fill="#C2623F" />
            <path
              d="M8 7H11L13.5 17H25V20H24.2L22.7 26H20.2L21.7 20H13.3L10.3 26H7.8L10.8 20L8 7Z"
              fill="#FFFFFF"
            />
          </svg>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="truncate font-serif text-sm font-semibold leading-tight">Shiv Furniture</div>
              <div className="truncate text-[11px] text-muted-foreground leading-tight">Works · {ROLE_LABEL[user.role] || user.role}</div>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {visibleNav.map(item => {
            const active = pathname === item.to || 
                           pathname.startsWith(item.to + "/") ||
                           (item.to === "/purchase" && (pathname === "/purchase-orders" || pathname.startsWith("/purchase-orders/")));
            const Icon = ICON_MAP[item.icon] || Package;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "mx-2 relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                {!sidebarCollapsed && item.to === "/bottleneck" && activeCount > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                    {activeCount}
                  </span>
                )}
                {sidebarCollapsed && item.to === "/bottleneck" && activeCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500" />
                )}
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
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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
            <div className="relative" ref={notificationsDropdownRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-md border border-border bg-card shadow-lg ring-1 ring-black/5 focus:outline-none z-50 overflow-hidden">
                  <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/20">
                    <span className="font-serif text-sm font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-[11px] font-medium text-accent hover:text-accent/80 transition-colors"
                      >
                        <CheckCheck className="h-3 w-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No notifications
                      </div>
                    ) : (
                      notifications.map(n => (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors flex gap-2 items-start text-xs",
                            !n.isRead && "bg-muted/30 font-medium"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground truncate">{n.title}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(n.createdAt)}</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{n.message}</p>
                          </div>
                          {!n.isRead && (
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
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