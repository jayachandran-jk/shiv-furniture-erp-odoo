import type { Role } from "./types";

export type Permission =
  | "dashboard:read"
  | "sales:read" | "sales:write"
  | "purchase:read" | "purchase:write"
  | "manufacturing:read" | "manufacturing:write"
  | "inventory:read" | "inventory:write"
  | "products:read" | "products:write"
  | "bom:read" | "bom:write"
  | "audit:read"
  | "automation:read"
  | "settings:read" | "settings:write";

/** Role → set of permissions */
const MATRIX: Record<Role, Set<Permission>> = {
  admin: new Set([
    "dashboard:read",
    "sales:read", "sales:write",
    "purchase:read", "purchase:write",
    "manufacturing:read", "manufacturing:write",
    "inventory:read", "inventory:write",
    "products:read", "products:write",
    "bom:read", "bom:write",
    "audit:read",
    "automation:read",
    "settings:read", "settings:write",
  ]),
  sales: new Set([
    "dashboard:read",
    "sales:read", "sales:write",
    "inventory:read",
    "products:read",
    "audit:read",
  ]),
  purchase: new Set([
    "dashboard:read",
    "purchase:read", "purchase:write",
    "inventory:read",
    "products:read",
    "audit:read",
  ]),
  manufacturing: new Set([
    "dashboard:read",
    "manufacturing:read", "manufacturing:write",
    "inventory:read",
    "products:read",
    "bom:read", "bom:write",
    "audit:read",
  ]),
  inventory: new Set([
    "dashboard:read",
    "inventory:read", "inventory:write",
    "products:read",
    "audit:read",
  ]),
  owner: new Set([
    "dashboard:read",
    "sales:read",
    "purchase:read",
    "manufacturing:read",
    "inventory:read",
    "products:read", "products:write",
    "bom:read",
    "audit:read",
    "automation:read",
  ]),
  operations: new Set([
    "dashboard:read",
    "sales:read", "sales:write",
    "purchase:read", "purchase:write",
    "manufacturing:read", "manufacturing:write",
    "inventory:read", "inventory:write",
    "products:read", "products:write",
    "bom:read", "bom:write",
    "audit:read",
    "automation:read",
    "settings:read", "settings:write",
  ]),
};

/** Check whether a role has a specific permission */
export function hasPermission(role: Role | undefined, perm: Permission): boolean {
  if (!role) return false;
  return MATRIX[role]?.has(perm) ?? false;
}

/** Navigation items visible per role */
export interface NavItem {
  to: string;
  label: string;
  icon: string; // lucide icon name
  readPerm: Permission;
}

const ALL_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", readPerm: "dashboard:read" },
  { to: "/products",  label: "Products",  icon: "Package",         readPerm: "products:read" },
  { to: "/inventory", label: "Inventory", icon: "Warehouse",       readPerm: "inventory:read" },
  { to: "/sales",     label: "Sales",     icon: "ShoppingCart",     readPerm: "sales:read" },
  { to: "/purchase",  label: "Purchase",  icon: "Truck",           readPerm: "purchase:read" },
  { to: "/manufacturing", label: "Manufacturing", icon: "Factory", readPerm: "manufacturing:read" },
  { to: "/bom",       label: "Bill of Materials", icon: "ClipboardList", readPerm: "bom:read" },
  { to: "/audit",     label: "Audit Log", icon: "FileText",        readPerm: "audit:read" },
  { to: "/automation", label: "Automation", icon: "Zap",           readPerm: "automation:read" },
  { to: "/settings",  label: "Settings",  icon: "Settings",        readPerm: "settings:read" },
];

/** Get nav items visible for a given role */
export function getVisibleNavItems(role: Role | undefined): NavItem[] {
  if (!role) return [];
  return ALL_NAV.filter(item => hasPermission(role, item.readPerm));
}
