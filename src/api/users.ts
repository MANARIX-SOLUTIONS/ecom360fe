/**
 * User profile and business users API
 */

import { api } from "./client";
import type { StoreResponse } from "./stores";

export type UserProfile = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
};

export type BusinessUser = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: string;
  roleName?: string;
  isActive: boolean;
  storeIds?: string[];
  storeNames?: string[];
};

export async function getUserProfile(): Promise<UserProfile> {
  return api.get<UserProfile>("/users/me");
}

export async function updateUserProfile(data: {
  fullName: string;
  email: string;
  phone?: string;
}): Promise<UserProfile> {
  return api.put<UserProfile>("/users/me", data);
}

export async function listBusinessUsers(): Promise<BusinessUser[]> {
  return api.get<BusinessUser[]>("/business/users");
}

export async function inviteBusinessUser(data: {
  email: string;
  role: string;
}): Promise<BusinessUser> {
  return api.post<BusinessUser>("/business/users", data);
}

/** Retire un employé (pas le propriétaire). La place redevient disponible. */
export async function deactivateBusinessUser(businessUserId: string): Promise<void> {
  await api.delete<void>(`/business/users/${businessUserId}`);
}

/** Toutes les boutiques actives de l'entreprise, pour le formulaire d'affectation. */
export async function listAssignableStores(): Promise<StoreResponse[]> {
  return api.get<StoreResponse[]>("/business/users/assignable-stores");
}

/** Récupère les boutiques assignées à un employé (multi-store) */
export async function getAssignedStores(businessUserId: string): Promise<StoreResponse[]> {
  return api.get<StoreResponse[]>(`/business/users/${businessUserId}/stores`);
}

/** Affecte des boutiques à un employé (multi-store). Remplace les affectations existantes. */
export async function assignStores(
  businessUserId: string,
  storeIds: string[]
): Promise<StoreResponse[]> {
  return api.put<StoreResponse[]>(`/business/users/${businessUserId}/stores`, { storeIds });
}
