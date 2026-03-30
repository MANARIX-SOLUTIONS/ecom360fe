/**
 * Permissions : source API (/permissions/me) + cache local + fallback aligné backend.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { getMyPermissions } from "@/api";
import { DEFAULT_NAVIGATION_RULES } from "@/constants/defaultNavigationRules";
import { PERMISSIONS_CACHE_KEY } from "@/constants/storageKeys";
import type { Permission } from "@/constants/roles";
import {
  readPermissionsBundle,
  shouldSkipPermissionsRefetch,
  writePermissionsBundle,
} from "@/utils/permissionsCache";

/** Permission de navigation (routes / menu). */
export type NavPermission = Permission;

/** @deprecated Utiliser string pour les codes API ; conservé pour typage des appels existants. */
export type BackendPermission = string;

export function usePermissions() {
  const cached = readPermissionsBundle();
  const [permissions, setPermissions] = useState<string[]>(() => cached?.permissions ?? []);
  const [navigationRules, setNavigationRules] = useState<Record<string, string[]>>(
    () => cached?.navigationRules ?? {}
  );
  const [role, setRole] = useState<string | null>(() => cached?.role ?? null);
  const [loading, setLoading] = useState(true);

  const mergedRules = useMemo(() => {
    return Object.keys(navigationRules).length > 0 ? navigationRules : DEFAULT_NAVIGATION_RULES;
  }, [navigationRules]);

  const fetchPermissions = useCallback(async (force = false) => {
    if (!localStorage.getItem("ecom360_access_token")) {
      setPermissions([]);
      setNavigationRules({});
      setRole(null);
      try {
        localStorage.removeItem(PERMISSIONS_CACHE_KEY);
      } catch {
        // ignore
      }
      setLoading(false);
      return;
    }
    try {
      if (!force && shouldSkipPermissionsRefetch()) {
        setLoading(false);
        return;
      }
      const res = await getMyPermissions();
      const perms = res.permissions ?? [];
      const rules =
        res.navigationRules && Object.keys(res.navigationRules).length > 0
          ? res.navigationRules
          : DEFAULT_NAVIGATION_RULES;
      setPermissions(perms);
      setNavigationRules(rules);
      setRole(res.role ?? null);
      writePermissionsBundle({
        permissions: perms,
        navigationRules: rules,
        role: res.role ?? null,
      });
    } catch {
      const b = readPermissionsBundle();
      if (b) {
        setPermissions(b.permissions);
        setNavigationRules(b.navigationRules);
        setRole(b.role);
      } else {
        setPermissions([]);
        setNavigationRules({});
        setRole(null);
      }
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
      setNavigationRules({});
      setRole(null);
      try {
        localStorage.removeItem(PERMISSIONS_CACHE_KEY);
      } catch {
        // ignore
      }
    };
    const onAuthSet = () => fetchPermissions(true);
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
