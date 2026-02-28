/**
 * Permissions par rôle — source backend.
 * Récupère le périmètre des fonctionnalités depuis l'API et fournit can() / canAccess().
 */

import { useState, useEffect, useCallback } from "react";
import { getMyPermissions } from "@/api";

/** Permissions granulaires backend (PRODUCTS_CREATE, SALES_READ, etc.) */
export type BackendPermission =
  | "PRODUCTS_CREATE"
  | "PRODUCTS_READ"
  | "PRODUCTS_UPDATE"
  | "PRODUCTS_DELETE"
  | "CATEGORIES_CREATE"
  | "CATEGORIES_READ"
  | "CATEGORIES_UPDATE"
  | "CATEGORIES_DELETE"
  | "STOCK_READ"
  | "STOCK_INIT"
  | "STOCK_ADJUST"
  | "CLIENTS_CREATE"
  | "CLIENTS_READ"
  | "CLIENTS_UPDATE"
  | "CLIENTS_DELETE"
  | "SUPPLIERS_CREATE"
  | "SUPPLIERS_READ"
  | "SUPPLIERS_UPDATE"
  | "SUPPLIERS_DELETE"
  | "PURCHASE_ORDERS_CREATE"
  | "PURCHASE_ORDERS_READ"
  | "PURCHASE_ORDERS_UPDATE"
  | "PURCHASE_ORDERS_DELETE"
  | "SALES_CREATE"
  | "SALES_READ"
  | "SALES_UPDATE"
  | "SALES_DELETE"
  | "EXPENSES_CREATE"
  | "EXPENSES_READ"
  | "EXPENSES_UPDATE"
  | "EXPENSES_DELETE"
  | "STORES_CREATE"
  | "STORES_READ"
  | "STORES_UPDATE"
  | "STORES_DELETE"
  | "SUBSCRIPTION_READ"
  | "SUBSCRIPTION_UPDATE"
  | "BUSINESS_USERS_CREATE"
  | "BUSINESS_USERS_READ"
  | "BUSINESS_USERS_UPDATE"
  | "BUSINESS_USERS_DELETE"
  | "API_KEYS_CREATE"
  | "API_KEYS_READ"
  | "API_KEYS_DELETE"
  | "WEBHOOKS_CREATE"
  | "WEBHOOKS_READ"
  | "WEBHOOKS_UPDATE"
  | "WEBHOOKS_DELETE";

/** Permission de navigation (dashboard, pos, products, etc.) */
export type NavPermission =
  | "dashboard"
  | "pos"
  | "products"
  | "clients"
  | "suppliers"
  | "expenses"
  | "reports"
  | "settings"
  | "settings:stores"
  | "settings:profile"
  | "settings:subscription"
  | "settings:users"
  | "settings:security"
  | "settings:notifications"
  | "backoffice";

/** Mapping: permission nav -> permissions backend requises (au moins une) */
const NAV_TO_BACKEND: Record<NavPermission, BackendPermission[]> = {
  dashboard: ["SALES_READ", "PRODUCTS_READ"],
  pos: ["SALES_CREATE"],
  products: ["PRODUCTS_READ"],
  clients: ["CLIENTS_READ"],
  suppliers: ["SUPPLIERS_READ"],
  expenses: ["EXPENSES_READ"],
  reports: ["SALES_READ", "PRODUCTS_READ"],
  settings: ["STORES_READ", "SUBSCRIPTION_READ", "BUSINESS_USERS_READ"],
  "settings:stores": ["STORES_READ"],
  "settings:profile": ["STORES_READ"],
  "settings:subscription": ["SUBSCRIPTION_READ"],
  "settings:users": ["BUSINESS_USERS_READ"],
  "settings:security": ["STORES_READ"],
  "settings:notifications": ["STORES_READ"],
  backoffice: [],
};

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setPermissions([]);
      setRole(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getMyPermissions();
      setPermissions(res.permissions ?? []);
      setRole(res.role ?? null);
    } catch {
      setPermissions([]);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    const onAuthExpired = () => {
      setPermissions([]);
      setRole(null);
    };
    const onAuthSet = () => fetchPermissions();
    window.addEventListener("ecom360:auth-expired", onAuthExpired);
    window.addEventListener("ecom360:auth-set", onAuthSet);
    return () => {
      window.removeEventListener("ecom360:auth-expired", onAuthExpired);
      window.removeEventListener("ecom360:auth-set", onAuthSet);
    };
  }, [fetchPermissions]);

  const can = useCallback(
    (perm: string): boolean => {
      return permissions.includes(perm);
    },
    [permissions]
  );

  const canAccess = useCallback(
    (navPerm: NavPermission): boolean => {
      // Backoffice: platform admin only (role from API or localStorage)
      if (navPerm === "backoffice") {
        const r = role ?? localStorage.getItem("ecom360_role") ?? "";
        return r.toLowerCase() === "super_admin" || r.toLowerCase() === "platform_admin";
      }
      const needed = NAV_TO_BACKEND[navPerm];
      if (!needed || needed.length === 0) return false;
      return needed.some((p) => permissions.includes(p));
    },
    [permissions, role]
  );

  return {
    permissions,
    role,
    loading,
    can,
    canAccess,
    refetch: fetchPermissions,
  };
}
