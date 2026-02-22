import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthRole } from "@/hooks/useAuthRole";
import { usePermissions } from "@/hooks/usePermissions";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import type { Permission } from "@/constants/roles";

type Props = {
  children: ReactNode;
  permission: Permission;
  fallbackPath?: string;
};

export function RequirePermission({ children, permission, fallbackPath = "/dashboard" }: Props) {
  const { isAuthenticated } = useAuth();
  const { can } = useAuthRole();
  const { canAccess: canAccessBackend } = usePermissions();
  const { canAccess: canAccessPlan } = usePlanFeatures();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const backendCan = canAccessBackend(permission as Parameters<typeof canAccessBackend>[0]);
  const roleCan = can(permission);
  const hasAccess = (backendCan || roleCan) && canAccessPlan(permission, backendCan || roleCan);

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
