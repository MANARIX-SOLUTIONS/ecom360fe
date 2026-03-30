/**
 * Permissions API - périmètre des fonctionnalités par rôle (backend).
 */

import { api } from "./client";

export type PermissionsResponse = {
  role: string;
  permissions: string[];
  /** Matrice écran → codes requis (au moins une permission). */
  navigationRules: Record<string, string[]>;
};

export async function getMyPermissions(): Promise<PermissionsResponse> {
  return api.get<PermissionsResponse>("/permissions/me");
}
