import { useState, useCallback, useEffect } from "react";
import {
  ROLES,
  getPermissions,
  can as canPermission,
  type Role,
  type Permission,
} from "@/constants/roles";

const STORAGE_KEY = "ecom360_role";

function loadRole(): Role {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r && Object.values(ROLES).includes(r as Role)) return r as Role;
  } catch {
    // ignore
  }
  return ROLES.PROPRIETAIRE;
}

function saveRole(role: Role) {
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // ignore
  }
}

export function useAuthRole() {
  const [role, setRoleState] = useState<Role>(loadRole);

  useEffect(() => {
    setRoleState(loadRole());
  }, []);

  useEffect(() => {
    const onAuthSet = () => setRoleState(loadRole());
    window.addEventListener("ecom360:auth-set", onAuthSet);
    return () => window.removeEventListener("ecom360:auth-set", onAuthSet);
  }, []);

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
    saveRole(newRole);
  }, []);

  const permissions = getPermissions(role);
  const can = useCallback((permission: Permission) => canPermission(role, permission), [role]);

  return {
    role,
    setRole,
    permissions,
    can,
    isSuperAdmin: role === ROLES.SUPER_ADMIN,
  };
}
