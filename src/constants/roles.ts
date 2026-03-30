/**
 * Rôles métier (stockage local / affichage). Le périmètre fonctionnel vient des permissions API.
 */

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  PROPRIETAIRE: "proprietaire",
  GESTIONNAIRE: "gestionnaire",
  CAISSIER: "caissier",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Clés de navigation / routes protégées par RequirePermission */
export type Permission =
  | "backoffice"
  | "dashboard"
  | "globalView"
  | "pos"
  | "products"
  | "clients"
  | "suppliers"
  | "livreurs"
  | "expenses"
  | "reports"
  | "settings"
  | "settings:stores"
  | "settings:profile"
  | "settings:subscription"
  | "settings:users"
  | "settings:roles"
  | "settings:security"
  | "settings:notifications";
