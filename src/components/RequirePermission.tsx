import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAuthRole } from "@/hooks/useAuthRole";
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
  const { canAccess } = usePlanFeatures();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!canAccess(permission, can(permission))) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
