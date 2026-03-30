import { useCallback } from "react";
import { usePermissions } from "./usePermissions";
import type { Permission as NavPermission } from "@/constants/roles";

/**
 * Action granulaire (code API) + accès à l'écran de navigation associé.
 */
export function useMatrixCan() {
  const {
    can: apiCan,
    canAccess: canAccessBackend,
    loading: permissionsLoading,
  } = usePermissions();

  const matrixCan = useCallback(
    (backendPerm: string, navKey: NavPermission) => {
      return apiCan(backendPerm) && canAccessBackend(navKey);
    },
    [apiCan, canAccessBackend]
  );

  const matrixNavAccess = useCallback(
    (navKey: NavPermission) => canAccessBackend(navKey),
    [canAccessBackend]
  );

  return { matrixCan, matrixNavAccess, permissionsLoading };
}
