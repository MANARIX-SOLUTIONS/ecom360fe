import type { BackofficePermission } from "./rbac/permissions";

export type NavItemId =
  | "overview"
  | "analytics"
  | "leads"
  | "tenants"
  | "stores"
  | "payments"
  | "invoices"
  | "plans"
  | "users"
  | "roles"
  | "communications"
  | "system"
  | "audit";

export type NavGroupId = "pilotage" | "clients" | "revenus" | "plateforme";

export type NavItem = {
  id: NavItemId;
  href: string;
  permission: BackofficePermission;
  badge?: "demoRequests";
  end?: boolean;
};

export type NavGroup = {
  id: NavGroupId;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "pilotage",
    items: [{ id: "overview", href: "/backoffice", permission: "overview.read", end: true }],
  },
  {
    id: "clients",
    items: [
      { id: "tenants", href: "/backoffice/businesses", permission: "tenants.read" },
      {
        id: "leads",
        href: "/backoffice/demo-requests",
        permission: "leads.read",
        badge: "demoRequests",
      },
      { id: "users", href: "/backoffice/users", permission: "users.read" },
      { id: "stores", href: "/backoffice/stores", permission: "tenants.read" },
    ],
  },
  {
    id: "revenus",
    items: [
      { id: "analytics", href: "/backoffice/revenue", permission: "analytics.read" },
      { id: "payments", href: "/backoffice/payments", permission: "payments.read" },
      { id: "invoices", href: "/backoffice/invoices", permission: "invoices.read" },
    ],
  },
  {
    id: "plateforme",
    items: [
      { id: "system", href: "/backoffice/system", permission: "system.read" },
      { id: "audit", href: "/backoffice/audit", permission: "audit.read" },
      { id: "plans", href: "/backoffice/plans", permission: "plans.read" },
      { id: "roles", href: "/backoffice/roles", permission: "tenants.read" },
      {
        id: "communications",
        href: "/backoffice/notifications",
        permission: "communications.read",
      },
    ],
  },
];

export function visibleNav(can: (permission: BackofficePermission) => boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.permission)),
  })).filter((group) => group.items.length > 0);
}

export type QuickAction = {
  id: "suspend" | "invite";
  href: string;
  permission: BackofficePermission;
};

export const QUICK_ACTIONS: QuickAction[] = [
  { id: "suspend", href: "/backoffice/businesses", permission: "tenants.suspend" },
  { id: "invite", href: "/backoffice/users", permission: "users.invite" },
];
