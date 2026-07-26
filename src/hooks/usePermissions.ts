/**
 * Permissions : source API (/permissions/me) + cache local + fallback aligné backend.
 *
 * Les données sont partagées entre toutes les instances du hook via un store
 * unique avec déduplication des requêtes concurrentes (un seul GET /permissions/me
 * même si layout, guards et pages montent en même temps).
 */

import { useSyncExternalStore, useCallback, useEffect, useMemo } from "react";
import { getMyPermissions } from "@/api";
import { DEFAULT_NAVIGATION_RULES } from "@/constants/defaultNavigationRules";
import { PERMISSIONS_CACHE_KEY } from "@/constants/storageKeys";
import type { Permission } from "@/constants/roles";
import { createSharedStore } from "@/hooks/createSharedStore";
import {
  readPermissionsBundle,
  shouldSkipPermissionsRefetch,
  writePermissionsBundle,
} from "@/utils/permissionsCache";

/** Permission de navigation (routes / menu). */
export type NavPermission = Permission;

/** @deprecated Utiliser string pour les codes API ; conservé pour typage des appels existants. */
export type BackendPermission = string;

type PermissionsState = {
  permissions: string[];
  navigationRules: Record<string, string[]>;
  role: string | null;
  loading: boolean;
};

const initialBundle = typeof window !== "undefined" ? readPermissionsBundle() : null;

const permissionsStore = createSharedStore<PermissionsState>({
  permissions: initialBundle?.permissions ?? [],
  navigationRules: initialBundle?.navigationRules ?? {},
  role: initialBundle?.role ?? null,
  loading: true,
});

/** Un seul chargement par session ; les évènements auth/role forcent un refetch. */
let permissionsLoaded = false;

function clearPermissions() {
  try {
    localStorage.removeItem(PERMISSIONS_CACHE_KEY);
  } catch {
    // ignore
  }
  permissionsLoaded = false;
  permissionsStore.setState({
    permissions: [],
    navigationRules: {},
    role: null,
    loading: false,
  });
}

async function fetchPermissions(force = false): Promise<void> {
  if (!localStorage.getItem("ecom360_access_token")) {
    clearPermissions();
    return;
  }
  if (!force && (permissionsLoaded || shouldSkipPermissionsRefetch())) {
    permissionsStore.setState((s) => (s.loading ? { ...s, loading: false } : s));
    return;
  }
  return permissionsStore.run(async () => {
    try {
      const res = await getMyPermissions();
      const perms = res.permissions ?? [];
      const rules =
        res.navigationRules && Object.keys(res.navigationRules).length > 0
          ? res.navigationRules
          : DEFAULT_NAVIGATION_RULES;
      writePermissionsBundle({
        permissions: perms,
        navigationRules: rules,
        role: res.role ?? null,
      });
      permissionsLoaded = true;
      permissionsStore.setState({
        permissions: perms,
        navigationRules: rules,
        role: res.role ?? null,
        loading: false,
      });
    } catch {
      const b = readPermissionsBundle();
      permissionsStore.setState({
        permissions: b?.permissions ?? [],
        navigationRules: b?.navigationRules ?? {},
        role: b?.role ?? null,
        loading: false,
      });
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("ecom360:auth-expired", clearPermissions);
  window.addEventListener("ecom360:auth-set", () => {
    void fetchPermissions(true);
  });
}

export function usePermissions() {
  const state = useSyncExternalStore(
    permissionsStore.subscribe,
    permissionsStore.getSnapshot,
    permissionsStore.getSnapshot
  );

  useEffect(() => {
    void fetchPermissions();
  }, []);

  const { permissions, navigationRules, role, loading } = state;

  const mergedRules = useMemo(
    () => (Object.keys(navigationRules).length > 0 ? navigationRules : DEFAULT_NAVIGATION_RULES),
    [navigationRules]
  );

  const can = useCallback((perm: string): boolean => permissions.includes(perm), [permissions]);

  const canAccess = useCallback(
    (navPerm: NavPermission): boolean => {
      if (navPerm === "backoffice") {
        const r = role ?? localStorage.getItem("ecom360_role") ?? "";
        const rl = r.toLowerCase();
        return rl === "super_admin" || rl === "platform_admin";
      }
      const needed = mergedRules[navPerm];
      if (!needed || needed.length === 0) return false;
      return needed.some((p) => permissions.includes(p));
    },
    [permissions, mergedRules, role]
  );

  return {
    permissions,
    role,
    loading,
    can,
    canAccess,
    refetch: () => fetchPermissions(true),
    navigationRules: mergedRules,
  };
}
