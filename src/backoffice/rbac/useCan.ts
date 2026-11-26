import { useCallback } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import {
  resolveBackofficeRole,
  roleCan,
  type BackofficePermission,
  type BackofficeRole,
} from "./permissions";

export function useBackofficeRole(): BackofficeRole {
  const { role } = usePermissions();
  return resolveBackofficeRole(role);
}

export function useCan() {
  const role = useBackofficeRole();
  return useCallback((permission: BackofficePermission) => roleCan(role, permission), [role]);
}
