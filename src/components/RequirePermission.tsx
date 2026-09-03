import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { isPlanGatedPermission, usePlanFeatures } from "@/hooks/usePlanFeatures";
import type { Permission } from "@/constants/roles";

type Props = {
  children: ReactNode;
  permission: Permission;
  fallbackPath?: string;
};

export function RequirePermission({ children, permission, fallbackPath = "/dashboard" }: Props) {
  const { isAuthenticated } = useAuth();
  const { canAccess: canAccessBackend, loading: permissionsLoading } = usePermissions();
  const { canAccess: canAccessPlan, ready: planReady } = usePlanFeatures();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const waitsForPlan = isPlanGatedPermission(permission);
  if (permissionsLoading || (waitsForPlan && !planReady)) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 280,
          padding: 24,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const backendCan = canAccessBackend(permission as Parameters<typeof canAccessBackend>[0]);
  const hasAccess = backendCan && canAccessPlan(permission, backendCan);

  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
