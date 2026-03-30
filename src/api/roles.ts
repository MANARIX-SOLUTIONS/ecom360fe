/**
 * Rôles métier par entreprise (codes PROPRIETAIRE / GESTIONNAIRE / CAISSIER + rôles personnalisés).
 */

import { api } from "./client";

export type BusinessRoleDto = {
  id: string;
  businessId: string;
  code: string;
  name: string;
  system: boolean;
  permissions: string[];
};

/** Entrée catalogue — source unique pour libellés & regroupement (GET /permissions). */
export type PermissionCatalogItem = {
  code: string;
  label: string;
  category: string;
  sortOrder: number;
};

export async function listRoles(): Promise<BusinessRoleDto[]> {
  return api.get<BusinessRoleDto[]>("/roles");
}

export async function listPermissionCatalog(): Promise<PermissionCatalogItem[]> {
  return api.get<PermissionCatalogItem[]>("/permissions");
}

export async function createRole(name: string): Promise<BusinessRoleDto> {
  return api.post<BusinessRoleDto>("/roles", { name });
}

export async function assignRolePermissions(
  roleId: string,
  permissionCodes: string[]
): Promise<BusinessRoleDto> {
  return api.post<BusinessRoleDto>(`/roles/${roleId}/permissions`, {
    permissionCodes,
  });
}
