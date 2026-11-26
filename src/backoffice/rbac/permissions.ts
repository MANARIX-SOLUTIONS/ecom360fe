export const BACKOFFICE_ROLES = ["super_admin", "ops", "finance", "support", "readonly"] as const;

export type BackofficeRole = (typeof BACKOFFICE_ROLES)[number];

export const BACKOFFICE_PERMISSIONS = [
  "overview.read",
  "analytics.read",
  "leads.read",
  "leads.write",
  "tenants.read",
  "tenants.write",
  "tenants.suspend",
  "tenants.notes",
  "subscriptions.read",
  "subscriptions.write",
  "payments.read",
  "payments.write",
  "invoices.read",
  "invoices.send",
  "plans.read",
  "plans.write",
  "users.read",
  "users.reset",
  "users.deactivate",
  "users.invite",
  "team.read",
  "team.write",
  "support.read",
  "support.write",
  "communications.read",
  "communications.write",
  "system.read",
  "system.write",
  "flags.read",
  "flags.write",
  "audit.read",
  "settings.read",
  "settings.write",
  "impersonate",
] as const;

export type BackofficePermission = (typeof BACKOFFICE_PERMISSIONS)[number];

const ALL = new Set<BackofficePermission>(BACKOFFICE_PERMISSIONS);

const READ_EXCEPT_SETTINGS = new Set<BackofficePermission>(
  BACKOFFICE_PERMISSIONS.filter(
    (permission) => permission.endsWith(".read") && permission !== "settings.read"
  )
);

const OPS = new Set<BackofficePermission>([
  "overview.read",
  "leads.read",
  "leads.write",
  "tenants.read",
  "tenants.write",
  "tenants.suspend",
  "tenants.notes",
  "users.read",
  "users.reset",
  "users.deactivate",
  "users.invite",
  "support.read",
  "support.write",
  "communications.read",
  "communications.write",
  "system.read",
  "system.write",
  "flags.read",
  "flags.write",
  "audit.read",
]);

const FINANCE = new Set<BackofficePermission>([
  "overview.read",
  "analytics.read",
  "subscriptions.read",
  "subscriptions.write",
  "payments.read",
  "payments.write",
  "invoices.read",
  "invoices.send",
  "plans.read",
  "audit.read",
]);

const SUPPORT = new Set<BackofficePermission>([
  "overview.read",
  "tenants.read",
  "tenants.notes",
  "users.read",
  "users.reset",
  "support.read",
  "support.write",
  "audit.read",
  "impersonate",
]);

const GRANTS: Record<BackofficeRole, Set<BackofficePermission>> = {
  super_admin: ALL,
  ops: OPS,
  finance: FINANCE,
  support: SUPPORT,
  readonly: READ_EXCEPT_SETTINGS,
};

export function resolveBackofficeRole(role: string | null | undefined): BackofficeRole {
  const value = (role ?? "").trim().toLowerCase();
  if (value === "ops") return "ops";
  if (value === "finance") return "finance";
  if (value === "support") return "support";
  if (value === "readonly" || value === "lecture" || value === "lecture_seule") return "readonly";
  if (value === "super_admin" || value === "platform_admin") return "super_admin";
  return "super_admin";
}

export function roleCan(role: BackofficeRole, permission: BackofficePermission): boolean {
  return GRANTS[role].has(permission);
}

export function roleLabelKey(role: BackofficeRole): BackofficeRole {
  return role;
}
