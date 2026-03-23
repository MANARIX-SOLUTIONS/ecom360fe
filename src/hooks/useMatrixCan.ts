import { useCallback } from "react";
import { useAuthRole } from "./useAuthRole";
import { usePermissions } from "./usePermissions";
import { canAccessNav } from "@/utils/navAccess";
import type { Permission as NavPermission } from "@/constants/roles";
import type { BackendPermission } from "./usePermissions";

/**
 * Matrice écran (roles.ts) + permission API : les deux doivent être vrais pour une action.
 */
export function useMatrixCan() {
  const { can: roleCanNav } = useAuthRole();
  const {
    can: apiCan,
    canAccess: canAccessBackend,
    loading: permissionsLoading,
  } = usePermissions();

  const matrixCan = useCallback(
    (backendPerm: BackendPermission, navKey: NavPermission) => {
      return canAccessNav(roleCanNav(navKey), apiCan(backendPerm), permissionsLoading);
    },
    [roleCanNav, apiCan, permissionsLoading]
  );

  /** Accès à un écran de navigation (sans action granulaire). */
  const matrixNavAccess = useCallback(
    (navKey: NavPermission) => {
      return canAccessNav(roleCanNav(navKey), canAccessBackend(navKey), permissionsLoading);
    },
    [roleCanNav, canAccessBackend, permissionsLoading]
  );

  return { matrixCan, matrixNavAccess, permissionsLoading };
}
