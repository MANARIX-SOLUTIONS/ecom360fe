/**
 * Permissions API - périmètre des fonctionnalités par rôle (backend).
 */

import { api } from "./client";

export type PermissionsResponse = {
  role: string;
  permissions: string[];
};

export async function getMyPermissions(): Promise<PermissionsResponse> {
  return api.get<PermissionsResponse>("/permissions/me");
}
